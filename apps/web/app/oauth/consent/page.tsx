import Link from "next/link";
import {redirect} from "next/navigation";
import {getSupabaseServerClient} from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function ConsentPage({searchParams}:{searchParams:Promise<{authorization_id?:string}>}){
 const {authorization_id:id}=await searchParams;if(!id||id.length>512)return <main className="auth-page"><section className="auth-card"><h1>Invalid authorization request</h1><Link href="/">Back</Link></section></main>;
 const supabase=await getSupabaseServerClient(),{data:claims}=await supabase.auth.getClaims();if(!claims?.claims?.sub)redirect(`/login?next=${encodeURIComponent(`/oauth/consent?authorization_id=${id}`)}`);
 const {data,error}=await supabase.auth.oauth.getAuthorizationDetails(id);if(error||!data)return <main className="auth-page"><section className="auth-card"><h1>Authorization unavailable</h1><p>This request may have expired. Reconnect from the requesting app.</p></section></main>;
 if(!("authorization_id" in data))redirect(data.redirect_url);const scopes=data.scope?.split(" ").filter(Boolean)??[];
 return <main className="auth-page"><section className="auth-card consent-card"><Link className="auth-brand" href="/"><span className="brand-mark">VI</span><span>VI COMPANION</span></Link><span className="eyebrow">ACCOUNT AUTHORIZATION</span><h1>Connect your player workspace?</h1><p><strong>{data.client.name}</strong> is requesting access to your account.</p>
 <div className="consent-detail"><strong>Access requested</strong><ul><li>Read player preferences, platform labels, sessions, objectives, collections and private notes.</li><li>Create and update your personal tracking records at your request.</li><li>Export your records when requested.</li><li>Delete your account only after a separate explicit confirmation.</li></ul><strong>OAuth scopes</strong><p>{scopes.join(", ")||"Profile"}</p><strong>Redirect destination</strong><p className="break-all">{data.redirect_uri}</p></div>
 <p className="consent-warning">No console access, game-memory inspection, network inspection, screenshot/media collection or gameplay automation.</p><form action="/api/oauth/decision" method="POST" className="consent-actions"><input type="hidden" name="authorization_id" value={id}/><button className="primary-button" name="decision" value="approve">Approve</button><button className="secondary-button" name="decision" value="deny">Deny</button></form><Link className="auth-footnote" href="/privacy">Privacy policy</Link></section></main>;
}
