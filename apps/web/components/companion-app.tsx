"use client";
import {useCallback,useEffect,useMemo,useState} from "react";
import Link from "next/link";
import {BookOpen,Check,CheckCircle2,Gamepad2,Layers3,LogOut,Plus,Settings2,ShieldCheck,Sparkles,Target,Download,RefreshCw,Trash2} from "lucide-react";
import {getSupabaseBrowserClient} from "@/lib/supabase/client";
import type {Tables} from "@/lib/supabase/database.types";
type Platform="ps5"|"xbox";
type Tab="overview"|"sessions"|"objectives"|"platforms"|"collections"|"notes"|"settings";
type ObjectiveRecord=Pick<Tables<"objectives">,"id"|"title"|"description"|"progress"|"status"|"priority"|"due_at">;
type CollectionItemRecord=Pick<Tables<"collection_items">,"id"|"collection_id"|"label"|"status"|"sort_order">&{done:boolean};
type CollectionRecord=Pick<Tables<"collections">,"id"|"title"|"description"|"category">&{items:CollectionItemRecord[]};
type SessionRecord={id:string;title:string;desc:string|null;platform:Platform;started:string;ended:string|null;status:"active"|"completed"|"cancelled"};
type PlatformRecord={id:string;name:string;platform:Platform};
type NoteRecord=Pick<Tables<"personal_notes">,"id"|"title"|"body"|"tags"|"created_at">;
type OAuthGrant={id:string;client_id:string;client_name:string;scopes:string[];created_at:string;updated_at:string};
type Data={sessions:SessionRecord[];objectives:ObjectiveRecord[];platforms:PlatformRecord[];collections:CollectionRecord[];notes:NoteRecord[];displayName:string;preferredPlatform:Platform;spoilerPreference:Tables<"player_profiles">["spoiler_preference"]};
const empty:Data={sessions:[],objectives:[],platforms:[],collections:[],notes:[],displayName:"",preferredPlatform:"ps5",spoilerPreference:"avoid"};
const platformName=(p:Platform)=>p==="ps5"?"PlayStation 5":"Xbox Series X|S";
const date=(x:string)=>new Date(x).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
const errorText=(e:unknown)=>e instanceof Error?e.message:"Something went wrong. Try again.";

export default function CompanionApp(){
 const supabase=useMemo(()=>getSupabaseBrowserClient(),[]);
 const [user,setUser]=useState<{id:string;email:string|null}|null>(null);
 const [d,setD]=useState<Data>(empty),[tab,setTab]=useState<Tab>("overview"),[ready,setReady]=useState(()=>!supabase);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [grants,setGrants]=useState<OAuthGrant[]>([]);
 const [grantsStatus,setGrantsStatus]=useState<"idle"|"loading"|"ready"|"unavailable">("idle");
 const [grantsError,setGrantsError]=useState("");
 const [title,setTitle]=useState(""),[desc,setDesc]=useState(""),[platform,setPlatform]=useState<Platform>("ps5"),[name,setName]=useState(""),[collection,setCollection]=useState(""),[noteTitle,setNoteTitle]=useState(""),[note,setNote]=useState("");
 const refresh=useCallback(async(uid?:string)=>{
  if(!supabase)return;
  const id=uid??user?.id;if(!id)return;
  const [s,o,p,c,n,pf]=await Promise.all([
   supabase.from("play_sessions").select("id,platform,label,focus,status,started_at,ended_at").eq("user_id",id).order("started_at",{ascending:false}).limit(100),
   supabase.from("objectives").select("id,title,description,progress,status,priority,due_at").eq("user_id",id).order("created_at",{ascending:false}).limit(200),
   supabase.from("platform_profiles").select("id,platform,label,connection_status").eq("user_id",id).order("created_at",{ascending:false}).limit(100),
   supabase.from("collections").select("id,title,description,category").eq("user_id",id).order("created_at",{ascending:false}).limit(100),
   supabase.from("personal_notes").select("id,title,body,tags,created_at").eq("user_id",id).order("created_at",{ascending:false}).limit(100),
   supabase.from("player_profiles").select("display_name,preferred_platform,spoiler_preference").eq("user_id",id).maybeSingle()
  ]);
  for(const q of [s,o,p,c,n,pf])if(q.error)throw q.error;
  const cs=c.data??[],ids=cs.map(x=>x.id);
  const ci=ids.length?await supabase.from("collection_items").select("id,collection_id,label,status,sort_order").eq("user_id",id).in("collection_id",ids).order("sort_order",{ascending:true}):{data:[],error:null};
  if(ci.error)throw ci.error;
  setD({
   sessions:(s.data??[]).map(x=>({id:x.id,title:x.label,desc:x.focus,platform:x.platform,started:x.started_at,status:x.status,ended:x.ended_at})),
   objectives:o.data??[],platforms:(p.data??[]).map(x=>({id:x.id,name:x.label,platform:x.platform})),
   collections:cs.map(x=>({...x,items:(ci.data??[]).filter(i=>i.collection_id===x.id).map(i=>({...i,done:i.status==="completed"}))})),
   notes:n.data??[],displayName:pf.data?.display_name??"",preferredPlatform:pf.data?.preferred_platform??"ps5",spoilerPreference:pf.data?.spoiler_preference??"avoid"
  });
 },[supabase,user?.id]);
 useEffect(()=>{
  let mounted=true;
  if(!supabase)return;
  supabase.auth.getUser().then(async({data,error:e})=>{
   if(!mounted)return;
   if(e){setError("Could not verify your account. Please sign in again.");setReady(true);return;}
   if(!data.user){setUser(null);setReady(true);return;}
   setUser({id:data.user.id,email:data.user.email??null});
   try{await refresh(data.user.id);}catch(err){if(mounted)setError(errorText(err));}
   if(mounted)setReady(true);
  });
  const {data:{subscription}}=supabase.auth.onAuthStateChange((_event,session)=>{
   if(!mounted)return;
   if(!session){setUser(null);setD(empty);setReady(true);return;}
   setUser({id:session.user.id,email:session.user.email??null});
   setReady(false);
   setTimeout(()=>{if(mounted)refresh(session.user.id).catch(err=>mounted&&setError(errorText(err))).finally(()=>mounted&&setReady(true));},0);
  });
  return()=>{mounted=false;subscription.unsubscribe();};
 },[supabase,refresh]);
 const loadGrants=useCallback(async()=>{
  if(!supabase||!user)return;
  setGrantsStatus("loading");setGrantsError("");
  const {data,error}=await supabase.auth.oauth.getUserGrants();
  if(error){setGrants([]);setGrantsError(error.message);setGrantsStatus("unavailable");return;}
  setGrants((data??[]) as OAuthGrant[]);setGrantsStatus("ready");
 },[supabase,user?.id]);
 useEffect(()=>{
  if(tab==="settings"&&user&&grantsStatus==="idle")void loadGrants();
 },[tab,user?.id,grantsStatus,loadGrants]);
 const revokeGrant=async(grant:OAuthGrant)=>{
  if(!supabase||busy)return;
  if(!window.confirm("Disconnect "+grant.client_name+" from your VI Companion account? Its active sessions and refresh tokens will be revoked."))return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:revokeError}=await supabase.auth.oauth.revokeGrant(grant.client_id);
   if(revokeError)throw revokeError;
   setNotice(grant.client_name+" has been disconnected.");
   setGrants((current)=>current.filter((item)=>item.client_id!==grant.client_id));
  }catch(err){setError(errorText(err));}
  finally{setBusy(false);}
 };
 const run=async(fn:()=>Promise<{error:unknown|null}> ):Promise<boolean>=>{
  if(!supabase||!user)return false;setBusy(true);setError("");setNotice("");
  try{const result=await fn();if(result.error)throw result.error;await refresh();return true;}
  catch(e){setError(errorText(e));return false;}
  finally{setBusy(false);}
 };
 const nav:[Tab,string,React.ReactNode][]=[["overview","Overview",<Sparkles key="overview" size={16}/>],["sessions","Sessions",<Gamepad2 key="sessions" size={16}/>],["objectives","Objectives",<Target key="objectives" size={16}/>],["platforms","Platforms",<Gamepad2 key="platforms" size={16}/>],["collections","Collections",<Layers3 key="collections" size={16}/>],["notes","Notes",<BookOpen key="notes" size={16}/>],["settings","Settings",<Settings2 key="settings" size={16}/>]];
 const active=d.sessions.filter(x=>x.status==="active").length;
 const page=(k:string,t:string,c:string)=><div className="page-title"><span className="eyebrow"><i/>{k}</span><h1>{t}</h1><p>{c}</p></div>;
 const panel=(k:string,t:string,body:React.ReactNode)=><section className="panel"><div className="panel-heading"><div><span>{k}</span><h3>{t}</h3></div></div>{body}</section>;
 const addSession=async(e:React.FormEvent)=>{e.preventDefault();if(!title.trim())return;const ok=await run(async()=>supabase!.from("play_sessions").insert({user_id:user!.id,platform,label:title.trim(),focus:desc.trim()||null}));if(ok){setTitle("");setDesc("");}};
 const addObjective=async(e:React.FormEvent)=>{e.preventDefault();if(!title.trim())return;const ok=await run(async()=>supabase!.from("objectives").insert({user_id:user!.id,title:title.trim(),description:desc.trim()||null}));if(ok){setTitle("");setDesc("");}};
 const addPlatform=async(e:React.FormEvent)=>{e.preventDefault();if(!name.trim())return;const ok=await run(async()=>supabase!.from("platform_profiles").insert({user_id:user!.id,platform,label:name.trim()}));if(ok)setName("");};
 const addCollection=async(e:React.FormEvent)=>{e.preventDefault();if(!collection.trim())return;const ok=await run(async()=>supabase!.from("collections").insert({user_id:user!.id,title:collection.trim()}));if(ok)setCollection("");};
 const addItem=async(id:string)=>{const value=window.prompt("Checklist item");if(!value?.trim())return;await run(async()=>supabase!.from("collection_items").insert({user_id:user!.id,collection_id:id,label:value.trim()}));};
 const toggleItem=async(item:CollectionItemRecord)=>{await run(async()=>supabase!.from("collection_items").update({status:item.done?"not_started":"completed"}).eq("id",item.id).eq("user_id",user!.id));};
 const addNote=async(e:React.FormEvent)=>{e.preventDefault();if(!noteTitle.trim()||!note.trim())return;const ok=await run(async()=>supabase!.from("personal_notes").insert({user_id:user!.id,title:noteTitle.trim(),body:note.trim()}));if(ok){setNoteTitle("");setNote("");}};
 const advance=async(o:ObjectiveRecord)=>{const progress=Math.min(100,(o.progress??0)+25);await run(async()=>supabase!.from("objectives").update({progress,status:progress===100?"completed":o.status==="completed"?"active":o.status,completed_at:progress===100?new Date().toISOString():null}).eq("id",o.id).eq("user_id",user!.id));};
 const savePrefs=async(e:React.FormEvent)=>{e.preventDefault();await run(async()=>supabase!.from("player_profiles").upsert({user_id:user!.id,display_name:d.displayName,preferred_platform:d.preferredPlatform,spoiler_preference:d.spoilerPreference},{onConflict:"user_id"}));setNotice("Your player preferences have been saved.");};
 const exportData=async()=>{if(!supabase||!user)return;setBusy(true);setError("");try{const tables=["player_profiles","platform_profiles","play_sessions","objectives","objective_updates","collections","collection_items","personal_notes","user_consents"] as const;const rows=await Promise.all(tables.map(async table=>{const {data,error}=await supabase.from(table).select("*").eq("user_id",user.id).limit(5000);if(error)throw error;return [table,data] as const;}));const blob=new Blob([JSON.stringify({exported_at:new Date().toISOString(),records:Object.fromEntries(rows)},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob),a=document.createElement("a");a.href=url;a.download="vi-companion-export.json";a.click();URL.revokeObjectURL(url);setNotice("Your data export has been prepared.");}catch(e){setError(errorText(e));}finally{setBusy(false);}};
 const deleteAccount=async()=>{
  if(!supabase||!user||busy)return;
  if(!window.confirm("Permanently delete your VI Companion account and all personal records? This cannot be undone."))return;
  const confirmation=window.prompt('Type DELETE to confirm account deletion.');
  if(confirmation!=="DELETE")return;
  setBusy(true);setError("");setNotice("");
  try{
   const {error:deleteError}=await supabase.functions.invoke("delete-account",{body:{confirmation:"DELETE"}});
   if(deleteError)throw deleteError;
   await supabase.auth.signOut();
   setUser(null);setD(empty);setTab("overview");
   setNotice("Your VI Companion account and associated player records have been deleted.");
  }catch(err){setError(errorText(err));}
  finally{setBusy(false);}
 };
 const signOut=async()=>{if(!supabase)return;setBusy(true);const {error:e}=await supabase.auth.signOut();setBusy(false);if(e)setError(e.message);};
 if(!ready)return <main className="loading-shell"><Sparkles size={18}/> Loading your VI Companion workspace…</main>;
 if(!user)return <main className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/"><span className="brand-mark">VI</span><span>VI COMPANION</span></Link><span className="eyebrow">PLAYER WORKSPACE</span><h1>Your progress, in one place.</h1><p>Sign in to sync manually recorded sessions, objectives, collections and private notes across devices.</p>{error?<p className="auth-error">{error}</p>:null}<Link className="primary-button" href="/login">Sign in or create an account</Link><p className="auth-footnote">No console credentials are requested. No live game state is accessed.</p><div className="auth-footnote"><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · <Link href="/support">Support</Link></div></section></main>;
 return <main className="app-shell"><aside className="sidebar"><div className="brand"><span className="brand-mark">VI</span><div><strong>VI COMPANION</strong><small>PLAYER WORKSPACE</small></div></div><span className="sidebar-label">WORKSPACE</span><nav>{nav.map(([k,l,icon])=><button key={k} className={tab===k?"nav-item nav-active":"nav-item"} onClick={()=>setTab(k)}>{icon}<span>{l}</span></button>)}</nav><div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={16}/><div><strong>Private by design</strong><span>Player records stay scoped.</span></div></div><div className="sidebar-foot">INDEPENDENT PLAYER TOOL<br/>CONNECTED WORKSPACE</div></div></aside>
 <section className="main-area"><header className="topbar"><div className="breadcrumb">VI COMPANION <b>·</b> {nav.find(x=>x[0]===tab)?.[1]}</div><span className="connection-pill"><i/> SUPABASE SYNC</span><button className="quiet-button" onClick={signOut} disabled={busy}><LogOut size={13}/> Sign out</button></header><div className="account-strip"><span>{d.displayName||user.email||"Player account"}</span><button className="quiet-button" onClick={()=>refresh()} disabled={busy}><RefreshCw size={13}/> Refresh</button></div>{error?<div className="error-banner" role="alert">{error}</div>:null}{notice?<div className="success-banner" role="status">{notice}</div>:null}<div className="content-wrap">
 {tab==="overview"&&<div className="page">{page("PLAYER WORKSPACE","Your game, your context.","A private workspace for the play you choose to record — without pretending to have console access.")}<section className="hero-panel"><div><span>VI COMPANION / PLAYER PROFILE</span><h2>Play with a plan.</h2><p>Keep sessions, objectives, personal collections and notes in one synced workspace. PS5 and Xbox profiles are labels only.</p><button className="primary-button" onClick={()=>setTab("sessions")}><Plus size={15}/> Start a session</button></div><div className="hero-orbit">VI</div></section><div className="stats-grid"><Stat label="Active sessions" value={active} note="Manually recorded"/><Stat label="Objectives" value={d.objectives.length} note="Personal goals"/><Stat label="Platform profiles" value={d.platforms.length} note="Manual labels"/><Stat label="Collections" value={d.collections.length} note="Personal library"/></div><div className="two-col">{panel("RECENT","Sessions",d.sessions.length?<div className="list">{d.sessions.slice(0,4).map(s=><Row key={s.id} icon={<Gamepad2 size={16}/>} title={s.title} sub={platformName(s.platform)+" · "+date(s.started)} status={s.status}/>)}</div>:<Empty title="Nothing logged yet" copy="Start a session to create a private play log."/>) }{panel("NEXT UP","Objectives",d.objectives.filter(x=>x.status==="active").length?<div className="list">{d.objectives.filter(x=>x.status==="active").slice(0,4).map(o=><Objective key={o.id} item={o} onAdvance={()=>advance(o)}/>)}</div>:<Empty title="No active objectives" copy="Create a personal goal from Objectives."/>)}</div></div>}
 {tab==="sessions"&&<div className="page">{page("PLAY HISTORY","Sessions","Keep a lightweight record of the sessions you choose to log.")}<div className="two-col"><form className="panel form-panel" onSubmit={addSession}>{panel("NEW SESSION","Start a session",<><label>Name<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tonight's session" maxLength={100} required/></label><label>Platform<select value={platform} onChange={e=>setPlatform(e.target.value as Platform)}><option value="ps5">PlayStation 5</option><option value="xbox">Xbox Series X|S</option></select></label><label>Focus<input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Optional focus" maxLength={300}/></label><button className="primary-button" disabled={busy}><Plus size={15}/> Start session</button></>)}</form>{panel("RECENT","Session history",d.sessions.length?<div className="list">{d.sessions.map(s=><Row key={s.id} icon={<Gamepad2 size={16}/>} title={s.title} sub={platformName(s.platform)+" · "+date(s.started)} status={s.status} action={s.status==="active"?<button className="quiet-button" disabled={busy} onClick={()=>run(async()=>supabase!.from("play_sessions").update({status:"completed",ended_at:new Date().toISOString()}).eq("id",s.id).eq("user_id",user.id))}>End session</button>:null}/>)}</div>:<Empty title="No sessions yet" copy="Start your first session."/>)}</div></div>}
 {tab==="objectives"&&<div className="page">{page("PERSONAL GOALS","Objectives","Turn what you want to do next into small, trackable goals.")}<div className="two-col"><form className="panel form-panel" onSubmit={addObjective}>{panel("NEW OBJECTIVE","Create an objective",<><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="A personal goal" maxLength={120} required/></label><label>Context<textarea value={desc} onChange={e=>setDesc(e.target.value)} rows={4} maxLength={1000}/></label><button className="primary-button" disabled={busy}><Plus size={15}/> Create objective</button></>)}</form>{panel("YOUR QUEUE","Objectives",d.objectives.length?<div className="list">{d.objectives.map(o=><Objective key={o.id} item={o} onAdvance={()=>advance(o)}/>)}</div>:<Empty title="No objectives" copy="Create a personal goal."/>)}</div></div>}
 {tab==="platforms"&&<div className="page">{page("CONSOLE SETUP","Platforms","Manual profiles organize your workspace; they are not console account connections.")}<div className="two-col"><form className="panel form-panel" onSubmit={addPlatform}>{panel("ADD PROFILE","Save a platform",<><label>Console<select value={platform} onChange={e=>setPlatform(e.target.value as Platform)}><option value="ps5">PlayStation 5</option><option value="xbox">Xbox Series X|S</option></select></label><label>Profile label<input value={name} onChange={e=>setName(e.target.value)} placeholder="My main profile" maxLength={60} required/></label><button className="primary-button" disabled={busy}><Plus size={15}/> Save profile</button><p className="form-footnote">No Sony, Microsoft or Rockstar credentials are collected.</p></>)}</form>{panel("SAVED","Platform profiles",d.platforms.length?<div className="list">{d.platforms.map(p=><Row key={p.id} icon={<Gamepad2 size={16}/>} title={p.name} sub={platformName(p.platform)} status="manual"/>)}</div>:<Empty title="No profiles" copy="Add a console profile label."/>)}</div></div>}
 {tab==="collections"&&<div className="page">{page("PERSONAL LIBRARY","Collections","Group your own checklist items into reusable sets.")}<div className="two-col"><form className="panel form-panel" onSubmit={addCollection}>{panel("NEW COLLECTION","Create a collection",<><label>Name<input value={collection} onChange={e=>setCollection(e.target.value)} placeholder="Places to revisit" maxLength={100} required/></label><button className="primary-button" disabled={busy}><Plus size={15}/> Create collection</button></>)}</form>{panel("YOUR LIBRARY","Collections",d.collections.length?<div className="list">{d.collections.map(c=><div className="collection-card" key={c.id}><strong>{c.title}</strong><span>{c.items.filter(i=>i.done).length}/{c.items.length} complete</span>{c.items.map((i)=><button className="check-row" key={i.id} onClick={()=>toggleItem(i)} disabled={busy}>{i.done?<CheckCircle2 size={14}/>:<span className="empty-circle"/>}{i.label}</button>)}<button className="secondary-button" disabled={busy} onClick={()=>addItem(c.id)}><Plus size={13}/> Add item</button></div>)}</div>:<Empty title="Library is empty" copy="Create a collection."/>)}</div></div>}
 {tab==="notes"&&<div className="page">{page("PRIVATE JOURNAL","Notes","A private place for your own planning thoughts.")}<div className="two-col"><form className="panel form-panel" onSubmit={addNote}>{panel("NEW NOTE","Write something",<><label>Title<input value={noteTitle} onChange={e=>setNoteTitle(e.target.value)} placeholder="A thought to remember" maxLength={120} required/></label><label>Note<textarea value={note} onChange={e=>setNote(e.target.value)} rows={5} maxLength={4000} required/></label><button className="primary-button" disabled={busy}><Plus size={15}/> Save note</button></>)}</form>{panel("RECENT","Your notes",d.notes.length?<div className="note-list">{d.notes.map(n=><article className="note-card" key={n.id}><span>{date(n.created_at)}</span><strong>{n.title}</strong><p>{n.body}</p></article>)}</div>:<Empty title="No notes yet" copy="Your first note will appear here."/>)}</div></div>}
 {tab==="settings"&&<div className="page">{page("ACCOUNT & PRIVACY","Settings","Control the preferences and data stored in your account.")}<div className="two-col"><form className="panel form-panel" onSubmit={savePrefs}>{panel("PREFERENCES","Player settings",<><label>Display name<input value={d.displayName} onChange={e=>setD(x=>({...x,displayName:e.target.value}))} placeholder="How should we address you?" maxLength={60}/></label><label>Preferred platform<select value={d.preferredPlatform} onChange={e=>setD(x=>({...x,preferredPlatform:e.target.value as Platform}))}><option value="ps5">PlayStation 5</option><option value="xbox">Xbox Series X|S</option></select></label><label>Spoilers<select value={d.spoilerPreference} onChange={e=>setD(x=>({...x,spoilerPreference:e.target.value}))}><option value="avoid">Avoid spoilers</option><option value="ask_first">Ask before spoilers</option><option value="all_ok">Spoilers are okay</option></select></label><button className="primary-button" disabled={busy}>Save preferences</button></>)}</form>{panel("DATA & SAFETY","Connection and privacy",<><div className="status-grid"><div><span>Storage</span><strong>Supabase account</strong></div><div><span>Console access</span><strong>Not connected</strong></div><div><span>Game media</span><strong>Not collected</strong></div><div><span>Knowledge</span><strong>Rights review required</strong></div></div>
          <section className="authorized-apps"><div className="grant-heading"><strong>Authorized apps</strong><button type="button" className="quiet-button" disabled={grantsStatus==="loading"||busy} onClick={()=>{setGrantsStatus("idle");void loadGrants();}}><RefreshCw size={12}/> Refresh</button></div>
          {grantsStatus==="idle"||grantsStatus==="loading"?<p className="form-footnote">Loading connected applications…</p>:null}
          {grantsStatus==="unavailable"?<p className="form-footnote">Authorized-app management is unavailable until the VI Companion OAuth server is enabled. {grantsError}</p>:null}
          {grantsStatus==="ready"&&grants.length===0?<p className="form-footnote">No third-party applications currently have an active grant.</p>:null}
          {grantsStatus==="ready"&&grants.length>0?<div className="grant-list">{grants.map(grant=><div className="grant-row" key={grant.client_id}><div><strong>{grant.client_name}</strong><span>Scopes: {grant.scopes.join(", ")||"none"} · Authorized {date(grant.created_at)}</span></div><button type="button" className="quiet-button" disabled={busy} onClick={()=>revokeGrant(grant)}>Disconnect</button></div>)}</div>:null}
          </section><button className="secondary-button" disabled={busy} onClick={exportData}><Download size={14}/> Export my data</button><p className="form-footnote">Export includes your profile, sessions, objectives, collections, platform labels, notes and consent records.</p><button className="danger-button" disabled={busy} onClick={deleteAccount}><Trash2 size={14}/> Delete account</button><p className="form-footnote">Permanently deletes your account and personal records. Requires a separate confirmation and typing DELETE.</p></>)}</div></div>}
 <footer className="main-footer"><span>VI COMPANION · INDEPENDENT PLAYER TOOL</span><div><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link><Link href="/support">Support</Link></div></footer></div></section></main>;
}
function Stat({label,value,note}:{label:string;value:number;note:string}){return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>}
function Row({icon,title,sub,status,action}:{icon:React.ReactNode;title:string;sub:string;status:string;action?:React.ReactNode}){return <div className="session-row"><div className="platform-symbol ps5">{icon}</div><div className="row-main"><strong>{title}</strong><span>{sub}</span></div>{action||<span className="done">{status}</span>}</div>}
function Objective({item,onAdvance}:{item:ObjectiveRecord;onAdvance:()=>void}){return <div className="objective-row"><div className="objective-head"><div><span>{String(item.priority??"normal").toUpperCase()}</span><strong>{item.title}</strong></div><button className="advance-button" onClick={onAdvance}>{item.progress===100?<Check size={13}/>:"+25%"}</button></div>{item.description&&<p>{item.description}</p>}<div className="progress-meta"><span>PROGRESS</span><b>{item.progress??0}%</b></div><div className="progress-track"><i style={{width:(item.progress??0)+"%"}}/></div></div>}
function Empty({title,copy}:{title:string;copy:string}){return <div className="empty"><Sparkles size={17}/><strong>{title}</strong><p>{copy}</p></div>}
