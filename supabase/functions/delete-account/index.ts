import { createClient } from "npm:@supabase/supabase-js@2.119.1";
Deno.serve(async req=>{
 if(req.method!=="POST")return Response.json({error:"POST required"},{status:405});
 const auth=req.headers.get("authorization"),url=Deno.env.get("SUPABASE_URL"),service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if(!auth||!url||!service)return Response.json({error:"Authentication required"},{status:401});
 const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";const caller=createClient(url,anon,{global:{headers:{Authorization:auth}}});
 const {data:{user},error}=await caller.auth.getUser();if(error||!user)return Response.json({error:"Invalid authentication"},{status:401});
 let body:any;try{body=await req.json()}catch{return Response.json({error:"Invalid JSON"},{status:400})}
 if(body.confirmation!=="DELETE")return Response.json({error:"Account deletion was not confirmed."},{status:400});
 const admin=createClient(url,service);const r=await admin.auth.admin.deleteUser(user.id);
 if(r.error)return Response.json({error:"Account deletion failed."},{status:500});
 return Response.json({deleted:true});
});