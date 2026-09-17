 "use client";
import { useEffect, useState } from "react";
import { Check, Copy, RefreshCw, Send, X, Eye } from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

type OE = {id:string;pid:string;qNumber:string;timestamp?:string;originalOE?:string;approvedOE?:string;approvedBy?:string;status:string;aiScore?:number;relScore?:number;rejectReason?:string;dqaViewedTime?:string};

const scoreClass=(n:number)=>n>=65?"text-success":n>=50?"text-orange-600":"text-danger";
const time=(v?:string)=>v?new Date(v).toLocaleString():"";

export default function ResultsView({embedded=false}:{embedded?:boolean}) {
  const [name,setName]=useState(""); const [items,setItems]=useState<OE[]>([]);
  const [loading,setLoading]=useState(false); const [error,setError]=useState("");
  const [edit,setEdit]=useState<Record<string,string>>({}); const [editing,setEditing]=useState<string|null>(null);
  const [copied,setCopied]=useState<string|null>(null);

  const load=async()=>{ if(!name.trim()){setError("Enter your name first.");return;} setLoading(true);setError(""); try{setItems(await api<OE[]>("getMyResults",{name:name.trim()}));}catch(e:any){setError(e.message)}finally{setLoading(false)} };
  useEffect(()=>{ if(!name) return; const t=setInterval(()=>{api<OE[]>("getMyResults",{name:name.trim()}).then(setItems).catch(()=>{})},20000); return()=>clearInterval(t)},[name]);

  const copy=async(oe:OE)=>{await navigator.clipboard.writeText(oe.approvedOE||"");setCopied(oe.id); await api("markAsCopied",{oeId:oe.id});setTimeout(()=>setCopied(null),1500)};
  const resubmit=async(oe:OE)=>{const text=edit[oe.id]??oe.originalOE??""; if(!text.trim())return; setLoading(true);try{await api("updateOE",{oeId:oe.id,newText:text});setEditing(null);await load()}catch(e:any){setError(e.message)}finally{setLoading(false)}};

  return <div className="mx-auto w-full max-w-3xl">
    {!embedded && <HeaderLike/>}
    <div className="card rounded-t-none">
      <div className="flex gap-2">
        <input className="input flex-1" placeholder="Enter your name" value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&load()}/>
        <button className="btn-primary" onClick={load} disabled={loading}><RefreshCw size={16}/>{loading?"Loading":"Check OEs"}</button>
      </div>
      {error&&<div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {items.length>0&&<div className="mt-3 text-center text-xs text-brand"><RefreshCw size={12} className="mr-1 inline"/> Auto-refreshing every 20 seconds</div>}
      <div className="mt-5 space-y-4">
        {!loading&&name&&items.length===0&&<div className="py-10 text-center text-slate-400">📭 No OEs found.<br/><small>Submit an OE first.</small></div>}
        {items.map(oe=><div key={oe.id} className={`rounded-xl border-l-4 p-4 ${oe.status==="REJECTED"?"border-danger bg-red-50":oe.status==="APPROVED"||oe.status==="AUTO_APPROVED"?"border-success bg-green-50":"border-warning bg-amber-50"}`}>
          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">{oe.pid}</span><StatusBadge status={oe.status}/></div>
          <div className="mt-2 text-xs font-bold text-slate-600">{oe.qNumber}</div>
          {oe.timestamp&&<div className="mt-1 text-[11px] text-slate-400">🕐 {time(oe.timestamp)}</div>}
          <div className="mt-3 text-[11px] font-bold uppercase text-slate-500">Your OE</div>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-6">{oe.originalOE}</p>
          <div className="mt-1 text-right text-[11px] text-slate-400">{(oe.originalOE||"").length} chars</div>
          {(oe.aiScore||oe.relScore)&&<div className="mt-2 grid grid-cols-2 gap-2">{oe.aiScore&&<Score label="Human" value={oe.aiScore}/>} {oe.relScore&&<Score label="Relevancy" value={oe.relScore}/>}</div>}
          {oe.status==="APPROVED"||oe.status==="AUTO_APPROVED" ? <><div className="mt-3 text-[11px] font-bold uppercase text-slate-500">Approved OE</div><div className="mt-1 rounded-lg border-2 border-success bg-white p-3 text-sm leading-6 text-green-800">{oe.approvedOE}</div><button className="btn-primary mt-2 w-full" onClick={()=>copy(oe)}>{copied===oe.id?<><Check size={16}/>Copied</>:<><Copy size={16}/>Copy Approved OE</>}</button><div className="mt-1 text-xs text-slate-500">Approved by: {oe.approvedBy||"DQA"}</div></>
          :oe.status==="REJECTED" ? <><div className="mt-3 rounded-lg border border-danger bg-red-50 p-3 text-sm text-red-700"><b>Reason:</b> {oe.rejectReason||"Please improve and resubmit."}</div>{editing===oe.id?<div className="mt-3"><textarea className="input h-28 resize-y border-warning" value={edit[oe.id]??oe.originalOE??""} onChange={e=>setEdit({...edit,[oe.id]:e.target.value})}/><button className="btn-primary mt-2 w-full" onClick={()=>resubmit(oe)}><Send size={16}/>Resubmit for DQA</button></div>:<div className="mt-2 flex gap-2"><button className="btn-primary flex-1" onClick={()=>{setEditing(oe.id);setEdit({...edit,[oe.id]:oe.originalOE||""})}}><Send size={15}/>Edit & Resubmit</button><button className="btn-muted" onClick={()=>setItems(items.filter(x=>x.id!==oe.id))}><X size={16}/></button></div>}</>
          :<div className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-center text-sm text-amber-800">{oe.dqaViewedTime?<><Eye className="mr-1 inline" size={18}/><b>DQA has seen your OE</b><div className="text-xs">Viewed at {time(oe.dqaViewedTime)}</div></>:<>⏳ DQA is reviewing your response. You can edit before they act.</>}</div>}
        </div>)}
      </div>
    </div>
  </div>
}
function Score({label,value}:{label:string,value:number}){return <div className="rounded-lg bg-white p-2 text-center shadow-sm"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className={`text-xl font-bold ${scoreClass(Number(value))}`}>{value}/100</div></div>}
function HeaderLike(){return <div className="rounded-t-2xl bg-brand p-5 text-center text-white"><h1 className="text-xl font-bold">✅ My OE Results</h1><p className="text-xs opacity-85">Check your approved, pending, and rejected responses</p></div>}
