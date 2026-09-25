/*************************************************
 * WALINET - BACKEND GOOGLE APPS SCRIPT
 * GitHub source: WaliNet-PWA
 *************************************************/

const CONFIG={
  SPREADSHEET_ID:'',
  SHEET_PENGGUNA:'Pengguna',
  SHEET_PELANGGAN:'Pelanggan',
  SHEET_PEMBAYARAN:'Pembayaran',
  SHEET_PAKET:'Paket',
  SHEET_PENGATURAN:'Pengaturan',
  SESSION_SECONDS:21600
};

function getSpreadsheet_(){
  const id=String(CONFIG.SPREADSHEET_ID||PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID')||'').trim();
  if(id)return SpreadsheetApp.openById(id);
  const active=SpreadsheetApp.getActiveSpreadsheet();
  if(active)return active;
  throw new Error('Spreadsheet belum ditentukan. Jalankan setSpreadsheetId() atau isi CONFIG.SPREADSHEET_ID.');
}

function doGet(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    const action=String(p.action||'').trim().toLowerCase();
    const prefix=String(p.prefix||p.callback||'').trim();
    if(!action)return response({success:true,app:'WaliNet',message:'WaliNet API aktif.',version:'5.0',time:new Date().toISOString()},prefix);
    if(action==='status')return response({success:true,app:'WaliNet',message:'WaliNet API aktif.',version:'5.0',time:new Date().toISOString()},prefix);
    if(action==='login')return response(loginUser(p.username,p.password),prefix);
    if(action==='dashboard')return response(getDashboard(),prefix);
    if(action==='customers'||action==='pelanggan')return response(getPelanggan(),prefix);
    if(action==='payments'||action==='pembayaran')return response(getPembayaran(),prefix);
    if(action==='packages'||action==='paket')return response(getPaket(),prefix);
    if(action==='users'||action==='pengguna')return response(getPengguna(),prefix);
    if(action==='settings'||action==='pengaturan')return response(getPengaturan(),prefix);
    if(action==='addcustomer'||action==='tambahpelanggan')return response(addPelanggan(p),prefix);
    if(action==='adduser'||action==='tambahuser')return response(addPengguna(p),prefix);
    if(action==='addpackage'||action==='tambahpaket')return response(addPaket(p),prefix);
    if(action==='bill'){
      const key=String(p.key||'').trim();
      if(!key)return response({success:false,message:'ID pelanggan atau nomor HP belum diisi.'},prefix);
      const pelanggan=getPelanggan().data||[];
      const customer=pelanggan.find(r=>String(r['ID Pelanggan']||'').trim()===key||String(r['No HP']||r['Nomor HP']||'').trim()===key);
      if(!customer)return response({success:false,message:'Pelanggan tidak ditemukan.'},prefix);
      const id=String(customer['ID Pelanggan']||'').trim();
      const payments=getSheetData(CONFIG.SHEET_PEMBAYARAN).filter(r=>String(r['ID Pelanggan']||'').trim()===id);
      return response({success:true,customer:customer,payments:payments},prefix);
    }
    return response({success:false,message:'Action tidak dikenali: '+action},prefix);
  }catch(error){return response({success:false,message:'Terjadi error: '+error.message},'');}
}

function doPost(e){
  try{
    const p=e&&e.parameter?e.parameter:{};
    const action=String(p.action||'').trim().toLowerCase();
    if(action==='login')return response(loginUser(p.username,p.password),'');
    if(action==='status')return response({success:true,message:'WaliNet API aktif.',version:'5.0',time:new Date().toISOString()},'');
    if(action==='addcustomer'||action==='tambahpelanggan')return response(addPelanggan(p),'');
    if(action==='adduser'||action==='tambahuser')return response(addPengguna(p),'');
    if(action==='addpackage'||action==='tambahpaket')return response(addPaket(p),'');
    return response({success:false,message:'POST action tidak dikenali.'},'');
  }catch(error){return response({success:false,message:'Terjadi error: '+error.message},'');}
}

function loginUser(username,password){
  username=String(username||'').trim();
  password=String(password||'');
  if(!username||!password)return {success:false,message:'Username dan password wajib diisi.'};
  const users=getSheetData(CONFIG.SHEET_PENGGUNA);
  const user=users.find(row=>String(row['Username']||'').trim().toLowerCase()===username.toLowerCase()&&String(row['Status']||'').trim().toLowerCase()==='aktif');
  if(!user)return {success:false,message:'Username atau password salah.'};
  const storedHash=String(user['Password Hash']||'').trim();
  if(!storedHash||storedHash!==sha256(password))return {success:false,message:'Username atau password salah.'};
  const userData={id:user['ID User']||'',name:user['Nama']||'',username:user['Username']||'',role:user['Role']||'',permissions:String(user['Hak Akses']||'').split(',').map(x=>x.trim()).filter(Boolean)};
  const token=Utilities.getUuid();
  CacheService.getScriptCache().put('walinet_session_'+token,JSON.stringify(userData),CONFIG.SESSION_SECONDS);
  userData.token=token;
  return {success:true,message:'Login berhasil.',user:userData};
}

function requireAdminToken(token){
  token=String(token||'').trim();
  if(!token)return {success:false,message:'Sesi admin tidak ditemukan. Silakan login kembali.'};
  const raw=CacheService.getScriptCache().get('walinet_session_'+token);
  if(!raw)return {success:false,message:'Sesi admin sudah berakhir. Silakan login kembali.'};
  const user=JSON.parse(raw);
  const role=String(user.role||'').trim().toLowerCase();
  if(role!=='admin'&&role!=='administrator')return {success:false,message:'Akses hanya untuk Admin.'};
  return {success:true,user:user};
}

function sha256(text){
  const digest=Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8);
  return digest.map(byte=>{const value=byte<0?byte+256:byte;return ('0'+value.toString(16)).slice(-2)}).join('');
}

function getDashboard(){
  const pelanggan=getPelanggan().data||[];
  const pembayaran=getSheetData(CONFIG.SHEET_PEMBAYARAN);
  const paket=getSheetData(CONFIG.SHEET_PAKET);
  let totalPembayaran=0;
  pembayaran.forEach(row=>{const nominal=Number(String(row['Nominal']||row['Jumlah']||0).replace(/[^\d.-]/g,''));if(!isNaN(nominal))totalPembayaran+=nominal});
  return {success:true,data:{totalPelanggan:pelanggan.length,pelangganAktif:pelanggan.filter(r=>String(r['Status']||'').trim().toLowerCase()==='aktif').length,pelangganNonaktif:pelanggan.filter(r=>String(r['Status']||'').trim().toLowerCase()!=='aktif').length,totalPaket:paket.length,totalPembayaran:totalPembayaran,waktu:new Date().toISOString()}};
}

function getPelanggan(){
  const raw=getSheetData(CONFIG.SHEET_PELANGGAN);
  const packages=getSheetData(CONFIG.SHEET_PAKET);
  const packageMap={};
  packages.forEach(p=>{const id=String(p['ID Paket']||p['Paket']||'').trim();if(id)packageMap[id]=p});
  const data=raw.map(r=>{
    const packageId=String(r['ID Paket']||r['Paket']||'').trim();
    const pkg=packageMap[packageId]||{};
    return Object.assign({},r,{'ID Pelanggan':r['ID Pelanggan']||r['ID']||'','No HP':r['No HP']||r['Nomor HP']||'','Nomor HP':r['Nomor HP']||r['No HP']||'','ID Paket':packageId,'Nama Paket':r['Nama Paket']||pkg['Nama Paket']||packageId,'Harga':r['Harga']||pkg['Harga']||0,'Jatuh Tempo':r['Jatuh Tempo']||r['Tanggal Jatuh Tempo']||'','Status':r['Status']||'Aktif'});
  });
  return {success:true,data:data,total:data.length};
}

function getPembayaran(){const data=getSheetData(CONFIG.SHEET_PEMBAYARAN);return {success:true,data:data,total:data.length};}
function getPaket(){const data=getSheetData(CONFIG.SHEET_PAKET);return {success:true,data:data,total:data.length};}
function getPengguna(){const data=getSheetData(CONFIG.SHEET_PENGGUNA);return {success:true,data:data,total:data.length};}
function getPengaturan(){const data=getSheetData(CONFIG.SHEET_PENGATURAN);return {success:true,data:data,total:data.length};}

function addPaket(p){
  const auth=requireAdminToken(p.token);
  if(!auth.success)return auth;
  const id=String(p.id||'').trim();
  const name=String(p.name||'').trim();
  const speed=String(p.speed||'').trim();
  const price=Number(String(p.price||0).replace(/[^\d.-]/g,''));
  const duration=String(p.duration||'30 hari').trim();
  const status=String(p.status||'Aktif').trim()||'Aktif';
  if(!id)return {success:false,message:'ID Paket wajib diisi.'};
  if(!name)return {success:false,message:'Nama Paket wajib diisi.'};
  if(!speed)return {success:false,message:'Kecepatan wajib diisi.'};
  if(isNaN(price)||price<0)return {success:false,message:'Harga Paket tidak valid.'};
  const sheet=getSpreadsheet_().getSheetByName(CONFIG.SHEET_PAKET);
  if(!sheet)return {success:false,message:'Sheet Paket tidak ditemukan.'};
  const existing=getSheetData(CONFIG.SHEET_PAKET);
  if(existing.some(r=>String(r['ID Paket']||r['Paket']||'').trim().toLowerCase()===id.toLowerCase()))return {success:false,message:'ID Paket sudah digunakan.'};
  if(existing.some(r=>String(r['Nama Paket']||'').trim().toLowerCase()===name.toLowerCase()))return {success:false,message:'Nama Paket sudah digunakan.'};
  const headers=sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getDisplayValues()[0];
  const row=Array(headers.length).fill('');
  const values={'ID Paket':id,'Nama Paket':name,'Kecepatan':speed,'Harga':price,'Durasi':duration,'Status':status};
  headers.forEach((h,i)=>{if(Object.prototype.hasOwnProperty.call(values,h))row[i]=values[h]});
  sheet.appendRow(row);
  return {success:true,message:'Paket WiFi berhasil ditambahkan.',id:id};
}

function addPelanggan(p){
  const auth=requireAdminToken(p.token);
  if(!auth.success)return auth;
  const name=String(p.name||'').trim(),phone=String(p.phone||'').trim(),address=String(p.address||'').trim(),packageId=String(p.packageId||'').trim(),mikrotik=String(p.mikrotik||'').trim(),type=String(p.type||'PPPoE').trim(),due=String(p.due||'').trim(),status=String(p.status||'Aktif').trim()||'Aktif';
  if(!name)return {success:false,message:'Nama pelanggan wajib diisi.'};
  if(!phone)return {success:false,message:'Nomor HP wajib diisi.'};
  if(!packageId)return {success:false,message:'Paket WiFi wajib dipilih.'};
  const sheet=getSpreadsheet_().getSheetByName(CONFIG.SHEET_PELANGGAN);
  if(!sheet)return {success:false,message:'Sheet Pelanggan tidak ditemukan.'};
  const existing=getSheetData(CONFIG.SHEET_PELANGGAN);
  if(existing.some(r=>String(r['Nomor HP']||r['No HP']||'').trim()===phone))return {success:false,message:'Nomor HP tersebut sudah terdaftar.'};
  const id=String(p.id||'').trim()||generateCustomerId(existing);
  if(existing.some(r=>String(r['ID Pelanggan']||r['ID']||'').trim()===id))return {success:false,message:'ID Pelanggan sudah digunakan.'};
  const headers=sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getDisplayValues()[0];
  const row=Array(headers.length).fill('');
  const values={'ID Pelanggan':id,'ID':id,'Nama':name,'Nomor HP':phone,'No HP':phone,'Alamat':address,'Paket':packageId,'ID Paket':packageId,'Username MikroTik':mikrotik,'Tipe':type,'Tanggal Daftar':new Date(),'Tanggal Jatuh Tempo':due,'Jatuh Tempo':due,'Status':status};
  headers.forEach((h,i)=>{if(Object.prototype.hasOwnProperty.call(values,h))row[i]=values[h]});
  sheet.appendRow(row);
  return {success:true,message:'Pelanggan berhasil ditambahkan.',id:id};
}

function addPengguna(p){
  const auth=requireAdminToken(p.token);
  if(!auth.success)return auth;
  const name=String(p.name||'').trim(),username=String(p.username||'').trim(),password=String(p.password||''),role=String(p.role||'operator').trim().toLowerCase()==='admin'?'admin':'operator',permissions=String(p.permissions||'dashboard,pelanggan,pembayaran,laporan').trim(),status=String(p.status||'Aktif').trim()||'Aktif';
  if(!name)return {success:false,message:'Nama pengguna wajib diisi.'};
  if(!username)return {success:false,message:'Username wajib diisi.'};
  if(!/^[A-Za-z0-9._-]{3,40}$/.test(username))return {success:false,message:'Username hanya boleh berisi huruf, angka, titik, garis bawah, atau tanda hubung (3-40 karakter).'};
  if(password.length<6)return {success:false,message:'Password minimal 6 karakter.'};
  const sheet=getSpreadsheet_().getSheetByName(CONFIG.SHEET_PENGGUNA);
  if(!sheet)return {success:false,message:'Sheet Pengguna tidak ditemukan.'};
  const existing=getSheetData(CONFIG.SHEET_PENGGUNA);
  if(existing.some(r=>String(r['Username']||'').trim().toLowerCase()===username.toLowerCase()))return {success:false,message:'Username tersebut sudah digunakan.'};
  const id=generateUserId(existing);
  const headers=sheet.getRange(1,1,1,Math.max(1,sheet.getLastColumn())).getDisplayValues()[0];
  const row=Array(headers.length).fill('');
  const values={'ID User':id,'Nama':name,'Username':username,'Password Hash':sha256(password),'Role':role,'Hak Akses':permissions,'Status':status};
  headers.forEach((h,i)=>{if(Object.prototype.hasOwnProperty.call(values,h))row[i]=values[h]});
  sheet.appendRow(row);
  return {success:true,message:'User berhasil ditambahkan.',user:{id:id,name:name,username:username,role:role,status:status}};
}

function generateUserId(existing){let max=0;existing.forEach(r=>{const m=String(r['ID User']||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0)});return 'USR'+String(max+1).padStart(3,'0')}
function generateCustomerId(existing){let max=0;existing.forEach(r=>{const m=String(r['ID Pelanggan']||r['ID']||'').match(/(\d+)$/);if(m)max=Math.max(max,Number(m[1])||0)});return 'PLG'+String(max+1).padStart(3,'0')}

function getSheetData(sheetName){
  const sheet=getSpreadsheet_().getSheetByName(sheetName);
  if(!sheet)return [];
  const lastRow=sheet.getLastRow(),lastColumn=sheet.getLastColumn();
  if(lastRow<2||lastColumn<1)return [];
  const values=sheet.getRange(1,1,lastRow,lastColumn).getDisplayValues(),headers=values[0];
  return values.slice(1).filter(row=>row.some(cell=>String(cell).trim()!=='')).map(row=>{const obj={};headers.forEach((header,index)=>{if(String(header).trim())obj[header]=row[index]});return obj});
}

function response(data,prefix){
  const json=JSON.stringify(data);
  if(prefix&&/^[A-Za-z_$][0-9A-Za-z_$]*$/.test(prefix))return ContentService.createTextOutput(prefix+'('+json+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
  return ContentService.createTextOutput(json).setMimeType(ContentService.MimeType.JSON);
}

function setupWaliNet(){
  const ss=getSpreadsheet_();
  createSheetIfNotExists(ss,CONFIG.SHEET_PENGGUNA,['ID User','Nama','Username','Password Hash','Role','Hak Akses','Status']);
  createSheetIfNotExists(ss,CONFIG.SHEET_PELANGGAN,['ID Pelanggan','Nama','Nomor HP','Alamat','Paket','Username MikroTik','Tipe','Tanggal Daftar','Tanggal Jatuh Tempo','Status']);
  createSheetIfNotExists(ss,CONFIG.SHEET_PEMBAYARAN,['ID Pembayaran','ID Pelanggan','Nama','Tanggal','Nominal','Metode','Keterangan','Status']);
  createSheetIfNotExists(ss,CONFIG.SHEET_PAKET,['ID Paket','Nama Paket','Kecepatan','Harga','Durasi','Status']);
  createSheetIfNotExists(ss,CONFIG.SHEET_PENGATURAN,['Key','Value']);
  const users=getSheetData(CONFIG.SHEET_PENGGUNA);
  if(!users.some(row=>String(row['Username']||'').trim().toLowerCase()==='admin'))ss.getSheetByName(CONFIG.SHEET_PENGGUNA).appendRow(['USR001','Administrator','admin',sha256('admin123'),'admin','dashboard,pelanggan,pembayaran,paket,pengguna,pengaturan','Aktif']);
  return {success:true,message:'WaliNet berhasil disiapkan.'};
}

function createSheetIfNotExists(ss,name,headers){
  let sheet=ss.getSheetByName(name);
  if(!sheet)sheet=ss.insertSheet(name);
  if(sheet.getLastRow()===0)sheet.appendRow(headers);
  return sheet;
}

function setSpreadsheetId(id){
  id=String(id||'').trim();
  if(!id)throw new Error('ID Spreadsheet wajib diisi.');
  SpreadsheetApp.openById(id);
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID',id);
  return {success:true,message:'SPREADSHEET_ID tersimpan.'};
}

function testLogin(){
  const result=loginUser('admin','admin123');
  Logger.log(JSON.stringify(result,null,2));
  return result;
}

function testPaket(){
  const result=getPaket();
  Logger.log(JSON.stringify(result,null,2));
  return result;
}
