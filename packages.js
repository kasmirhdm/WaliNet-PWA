function packagePage(s){
  const draw=()=>{
    const list=data.packages||[];
    s.innerHTML=`<div class="section-head"><h1 class="title">Paket WiFi</h1><button class="btn" id="addPackageBtn">+ Tambah Paket</button></div>
      <div id="packageFormBox" class="card hidden"></div>
      <div id="packageList">${list.length?list.map(p=>`<div class="card"><div class="customer"><div class="customer-main"><b>${esc(p["Nama Paket"]||p["Paket"]||p["ID Paket"]||"-")}</b><small>${esc(p["ID Paket"]||"-")} · ${esc(p["Kecepatan"]||"-")} · ${money(p["Harga"]||0)} · ${esc(p["Durasi"]||"-")}</small></div>${badge(p["Status"]||"Aktif")}</div></div>`).join(""):`<div class="empty">Belum ada paket WiFi.</div>`}</div>`;
    document.getElementById("addPackageBtn").onclick=()=>showPackageForm();
  };
  const showPackageForm=()=>{
    const box=document.getElementById("packageFormBox");
    box.classList.remove("hidden");
    box.innerHTML=`<h3>Tambah Paket WiFi</h3><form id="packageForm">
      <div class="field"><label>ID Paket *</label><input id="pId" placeholder="Contoh: P001" required></div>
      <div class="field"><label>Nama Paket *</label><input id="pName" placeholder="Contoh: WiFi 10 Mbps" required></div>
      <div class="field"><label>Kecepatan *</label><input id="pSpeed" placeholder="Contoh: 10 Mbps" required></div>
      <div class="field"><label>Harga / Bulan *</label><input id="pPrice" type="number" min="0" required></div>
      <div class="field"><label>Durasi</label><input id="pDuration" value="30 hari"></div>
      <div class="field"><label>Status</label><select id="pStatus"><option>Aktif</option><option>Nonaktif</option></select></div>
      <div id="packageFormMessage"></div>
      <div class="form-actions"><button type="button" class="btn secondary" id="cancelPackage">Batal</button><button type="submit" class="btn">Simpan Paket</button></div>
    </form>`;
    document.getElementById("cancelPackage").onclick=()=>box.classList.add("hidden");
    document.getElementById("packageForm").onsubmit=async e=>{
      e.preventDefault();
      const btn=e.target.querySelector('button[type="submit"]'),msg=document.getElementById("packageFormMessage");
      if(!currentUser?.token){msg.innerHTML='<div class="error">Sesi admin belum memiliki token. Silakan logout lalu login kembali.</div>';return}
      btn.disabled=true;btn.textContent="Menyimpan...";
      try{
        const r=await api("addpackage",{token:currentUser.token,id:document.getElementById("pId").value.trim(),name:document.getElementById("pName").value.trim(),speed:document.getElementById("pSpeed").value.trim(),price:document.getElementById("pPrice").value,duration:document.getElementById("pDuration").value.trim(),status:document.getElementById("pStatus").value});
        if(!r.success){msg.innerHTML=`<div class="error">${esc(r.message||"Gagal menyimpan paket.")}</div>`;btn.disabled=false;btn.textContent="Simpan Paket";return}
        await loadRemoteData();
        packagePage(s);
      }catch(err){msg.innerHTML=`<div class="error">${esc(err.message||"Gagal menyimpan paket.")}</div>`;btn.disabled=false;btn.textContent="Simpan Paket"}
    };
  };
  draw();
}

window.more=function(s){
  s.innerHTML=`<h1 class="title">Lainnya</h1><div class="card">
    <button id="billMenu" class="row" style="width:100%;border:0;background:none;text-align:left"><b>Cek Tagihan Pelanggan</b><span>›</span></button>
    <button id="addMenu" class="row" style="width:100%;border:0;background:none;text-align:left"><b>Tambah Pelanggan</b><span>›</span></button>
    <button id="packagesMenu" class="row" style="width:100%;border:0;background:none;text-align:left"><b>Paket WiFi</b><span>›</span></button>
    ${isAdmin()?`<button id="accountsBtn" class="row" style="width:100%;border:0;background:none;text-align:left"><b>Akun Pengguna</b><span>›</span></button>`:""}
    <div class="row"><b>Pengaturan</b><span>›</span></div>
  </div><div class="card"><b>${esc(currentUser.name)}</b><div class="muted">${esc(currentUser.role)} · @${esc(currentUser.username)}</div><button id="logout" class="btn danger logout">Keluar</button></div>`;
  document.getElementById("billMenu").onclick=showPublicBill;
  document.getElementById("addMenu").onclick=()=>{route="addCustomer";render()};
  document.getElementById("packagesMenu").onclick=()=>{route="packages";render()};
  if(document.getElementById("accountsBtn"))document.getElementById("accountsBtn").onclick=()=>{route="accounts";render()};
  document.getElementById("logout").onclick=logout;
};

const _waliNetRender=window.render;
window.render=function(){
  if(!currentUser)return showLogin();
  nav();
  const s=document.getElementById("screen");
  if(route==="packages")return packagePage(s);
  return _waliNetRender();
};
