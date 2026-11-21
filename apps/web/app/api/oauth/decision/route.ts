import {NextResponse} from "next/server";
import {getSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export async function POST(request:Request){
 const origin=request.headers.get("origin");if(!origin||origin!==new URL(request.url).origin)return NextResponse.json({error:"Invalid request origin."},{status:403});
 const type=request.headers.get("content-type")??"";if(!type.includes("application/x-www-form-urlencoded")&&!type.includes("multipart/form-data"))return NextResponse.json({error:"Unsupported request type."},{status:415});
 const f=await request.formData(),decision=f.get("decision"),id=f.get("authorization_id");if((decision!=="approve"&&decision!=="deny")||typeof id!=="string"||id.length<1||id.length>512)return NextResponse.json({error:"Invalid authorization decision."},{status:400});
 const supabase=await getSupabaseServerClient(),{data:user,error:userError}=await supabase.auth.getUser();if(userError||!user.user)return NextResponse.redirect(new URL("/login",request.url),303);
 const {data,error}=decision==="approve"?await supabase.auth.oauth.approveAuthorization(id):await supabase.auth.oauth.denyAuthorization(id);if(error||!data?.redirect_url)return NextResponse.json({error:"Authorization request expired or could not be completed."},{status:400});
 const target=new URL(data.redirect_url);if(target.protocol!=="https:"&&target.hostname!=="localhost")return NextResponse.json({error:"Unsafe authorization redirect."},{status:400});return NextResponse.redirect(target,303);
}
