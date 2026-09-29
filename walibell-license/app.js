const SUPABASE_URL="https://lfcecurviullknwsejgi.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_hxHQr4DjHk5z4IjuDm2i2Q_md0te6F3";
const sb=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
const $=id=>document.getElementById(id);
let lastCode="",lastPhone="";

function setMsg(id,msg){$(id).textContent=msg||""}
function waUrl(phone,code){let p=String(phone||"").replace(/\D/g,"");if(p.startsWith("0"))p="62"+p.slice(1);return "https://wa.me/"+p+"?text="+encodeURIComponent("Halo, berikut kode lisensi WaliBell Anda:\n\n"+code+"\n\nMasukkan kode tersebut di aplikasi WaliBell untuk mengaktifkan lisensi.");}

async function callManage(action,payload={}){
  const {data:{session}}=await sb.auth.getSession();
  if(!session) throw new Error("Sesi login tidak ditemukan.");
  const r=await fetch(SUPABASE_URL+"/functions/v1/manage-licenses",{
    method:"POST",
    headers:{"Content-Type":"application/json","apikey":SUPABASE_PUBLISHABLE_KEY,"Authorization":"Bearer "+session.access_token},
    body:JSON.stringify({action,...payload})
  });
  const body=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(body.message||"Permintaan gagal.");
  return body;
}

async function refresh(){
  try{
    const body=await callManage("list");
    const items=body.licenses||[];
    $("licenses").innerHTML=items.length?items.map(x=>`<div class="list-item"><div class="row"><span class="code">${x.license_code}</span><span class="badge">${x.status}</span></div><div class="muted">${x.buyer_name||"-"} · ${x.device_id?"Sudah digunakan":"Belum digunakan"}</div></div>`).join(""):"<div class='muted'>Belum ada lisensi.</div>";
  }catch(e){setMsg("createMsg",e.message)}
}

async function init(){
  const {data:{session}}=await sb.auth.getSession();
  if(session){$("loginCard").classList.add("hidden");$("dashboard").classList.remove("hidden");$("logout").classList.remove("hidden");refresh()}
}
$("login").onclick=async()=>{
  setMsg("loginMsg","");
  const email=$("email").value.trim(),password=$("password").value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  if(error){setMsg("loginMsg",error.message);return}
  init();
};
$("logout").onclick=async()=>{await sb.auth.signOut();location.reload()};
$("refresh").onclick=refresh;
$("create").onclick=async()=>{
  setMsg("createMsg","");
  const name=$("buyerName").value.trim();
  const phone=$("buyerPhone").value.trim();
  const email=$("buyerEmail").value.trim();

  if(!name){
    setMsg("createMsg","Nama pembeli wajib diisi.");
    $("buyerName").focus();
    return;
  }

  const digits=phone.replace(/\D/g,"");
  if(digits.length < 10 || digits.length > 15){
    setMsg("createMsg","Nomor WhatsApp tidak valid. Contoh: 0812-1234-5678.");
    $("buyerPhone").focus();
    return;
  }

  const btn=$("create");btn.disabled=true;btn.textContent="MEMBUAT...";
  try{
    const body=await callManage("create",{
      buyer_name:name,
      buyer_phone:phone,
      buyer_email:email,
      validity_days:Number($("validity").value)
    });
    lastCode=body.license_code;
    lastPhone=phone;
    $("code").textContent=lastCode;
    $("created").classList.remove("hidden");
    refresh();
  }catch(e){setMsg("createMsg",e.message)}
  btn.disabled=false;btn.textContent="BUAT LISENSI";
};
$("copy").onclick=async()=>{await navigator.clipboard.writeText(lastCode);$("copy").textContent="Tersalin ✓";setTimeout(()=>$("copy").textContent="Salin Kode",1500)};
$("wa").onclick=()=>{
  if(lastPhone) location.href=waUrl(lastPhone,lastCode);
  else setMsg("createMsg","Nomor WhatsApp pembeli belum diisi.");
};
init();