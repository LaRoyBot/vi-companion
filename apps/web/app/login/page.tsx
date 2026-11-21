"use client";
import "../auth.css";
import {useEffect,useState} from "react";
import type {FormEvent} from "react";
import Link from "next/link";
import {getSupabaseBrowserClient} from "@/lib/supabase/client";
const safeNext=(s:string|null)=>s&&s.startsWith("/")&&!s.startsWith("//")?s:"/";
export default function LoginPage(){
 const [mode,setMode]=useState<"signin"|"signup">("signin"),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[next,setNext]=useState("/"),[busy,setBusy]=useState(false),[note,setNote]=useState(""),[error,setError]=useState("");
 useEffect(()=>{const p=new URLSearchParams(location.search);setNext(safeNext(p.get("next")??p.get("redirect")));},[]);
 async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError("");setNote("");const supabase=getSupabaseBrowserClient();if(!supabase){setError("Sign-in is not configured.");setBusy(false);return;}
  const callback=new URL("/auth/callback",location.origin);callback.searchParams.set("next",next);
  try{if(mode==="signin"){const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;location.assign(next);return;}
   const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:callback.toString()}});if(error)throw error;if(data.session){location.assign(next);return;}setNote("Check your email to confirm your account, then sign in.");setMode("signin");
  }catch(err){setError(err instanceof Error?err.message:"Could not complete sign-in.");}finally{setBusy(false);}
 }
 return <main className="auth-page"><section className="auth-card"><Link className="auth-brand" href="/"><span className="brand-mark">VI</span><span>VI COMPANION</span></Link><span className="eyebrow">PLAYER ACCOUNT</span><h1>{mode==="signin"?"Welcome back.":"Create your account."}</h1><p>Keep your sessions, objectives, collections and notes synced across devices.</p>
 <form onSubmit={submit} className="auth-form"><label>Email address<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Password<input type="password" minLength={10} required autoComplete={mode==="signin"?"current-password":"new-password"} value={password} onChange={e=>setPassword(e.target.value)}/></label>
 {error?<p className="auth-error" role="alert">{error}</p>:null}{note?<p className="auth-success" role="status">{note}</p>:null}<button className="primary-button" disabled={busy}>{busy?"Please wait…":mode==="signin"?"Sign in":"Create account"}</button></form>
 <button className="auth-switch" onClick={()=>{setMode(mode==="signin"?"signup":"signin");setError("");setNote("");}}>{mode==="signin"?"New? Create an account":"Already registered? Sign in"}</button><p className="auth-footnote">No console passwords are requested. No console or game state is accessed.</p></section></main>;
}
