"use client";
import {useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {getSupabaseBrowserClient} from "@/lib/supabase/client";
const safeNext=(value:string|null)=>value&&value.startsWith("/")&&!value.startsWith("//")?value:"/";
export default function LoginPage(){
 const [mode,setMode]=useState<"signin"|"signup">("signin"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();setBusy(true);setError("");setNotice("");
  const supabase=getSupabaseBrowserClient();
  if(!supabase){setError("Account sign-in is not configured.");setBusy(false);return;}
  const params=new URLSearchParams(window.location.search);
  const next=safeNext(params.get("next")??params.get("redirect"));
  const callback=new URL("/auth/callback",window.location.origin);callback.searchParams.set("next",next);
  try{
   if(mode==="signin"){
    const {error:authError}=await supabase.auth.signInWithPassword({email,password});
    if(authError)throw authError;
    window.location.assign(next);return;
   }
   const {data,error:authError}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callback.toString()}});
   if(authError)throw authError;
   if(data.session){window.location.assign(next);return;}
   setNotice("Check your email to confirm your account, then return here to sign in.");
   setMode("signin");
  }catch(err){setError(err instanceof Error?err.message:"Could not complete sign-in.");}
  finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="auth-card">
  <Link className="auth-brand" href="/"><span className="brand-mark">VI</span><span>VI COMPANION</span></Link>
  <span className="eyebrow">PLAYER ACCOUNT</span>
  <h1>{mode==="signin"?"Welcome back.":"Create your account."}</h1>
  <p>Keep sessions, objectives, collections and notes synced across devices.</p>
  <form onSubmit={submit} className="auth-form">
   <label>Email address<input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
   <label>Password<input type="password" minLength={10} autoComplete={mode==="signin"?"current-password":"new-password"} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
   {error?<p className="auth-error" role="alert">{error}</p>:null}
   {notice?<p className="auth-success" role="status">{notice}</p>:null}
   <button className="primary-button" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button>
  </form>
  <button className="auth-switch" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNotice("");}}>
   {mode==="signin"?"New to VI Companion? Create an account":"Already registered? Sign in"}
  </button>
  <p className="auth-footnote">No console passwords are requested. No console or game state is accessed.</p>
 </section></main>;
}
