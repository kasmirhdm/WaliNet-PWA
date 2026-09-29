import { createClient } from "npm:@supabase/supabase-js@2";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};

function json(data:unknown,status=200){return new Response(JSON.stringify(data),{status,headers:{...cors,"Content-Type":"application/json"}})}
function makeCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";const part=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),x=>chars[x%chars.length]).join("");return "WB-"+part()+"-"+part()+"-"+part()}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:cors});
  if(req.method!=="POST")return json({message:"Method not allowed"},405);
  try{
    const auth=req.headers.get("Authorization")||"";
    const token=auth.startsWith("Bearer ")?auth.slice(7):"";
    if(!token)return json({message:"Login diperlukan."},401);

    const base=Deno.env.get("SUPABASE_URL")!;
    const publishable=Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||Deno.env.get("SUPABASE_ANON_KEY")!;
    const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminEmail=(Deno.env.get("WALIBELL_ADMIN_EMAIL")||"").trim().toLowerCase();
    const userClient=createClient(base,publishable,{global:{headers:{Authorization:"Bearer "+token}}});
    const {data:{user},error:userError}=await userClient.auth.getUser(token);
    if(userError||!user)return json({message:"Sesi login tidak valid."},401);
    if(!adminEmail || (user.email||"").toLowerCase()!==adminEmail)return json({message:"Akun ini bukan admin WaliBell."},403);

    const admin=createClient(base,service);
    const body=await req.json();
    const action=String(body.action||"");

    if(action==="create"){
      const buyerName=String(body.buyer_name||"").trim();
      const buyerPhone=String(body.buyer_phone||"").trim();
      const buyerEmail=String(body.buyer_email||"").trim();
      const days=Math.max(0,Number(body.validity_days||0));
      if(!buyerName)return json({message:"Nama pembeli wajib diisi."},400);

      let code="",row=null;
      for(let i=0;i<5;i++){
        code=makeCode();
        const expires=days>0?new Date(Date.now()+days*86400000).toISOString():null;
        const {data,error}=await admin.from("licenses").insert({license_code:code,buyer_name:buyerName,buyer_email:buyerEmail||null,status:"active",expires_at:expires}).select().single();
        if(!error){row=data;break}
      }
      if(!row)return json({message:"Gagal membuat kode lisensi. Coba lagi."},500);
      return json({success:true,license_code:row.license_code,expires_at:row.expires_at});
    }

    if(action==="list"){
      const {data,error}=await admin.from("licenses").select("license_code,buyer_name,buyer_email,status,device_id,activated_at,expires_at,created_at").order("created_at",{ascending:false}).limit(100);
      if(error)return json({message:error.message},500);
      return json({licenses:data||[]});
    }

    if(action==="disable"){
      const code=String(body.license_code||"").trim().toUpperCase();
      const {error}=await admin.from("licenses").update({status:"inactive"}).eq("license_code",code);
      if(error)return json({message:error.message},500);
      return json({success:true});
    }

    return json({message:"Aksi tidak dikenal."},400);
  }catch(e){return json({message:e instanceof Error?e.message:"Server error"},500)}
});