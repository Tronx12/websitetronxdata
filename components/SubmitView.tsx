 "use client";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ImagePlus, Lightbulb, Loader2, Search, Send, Sparkles, X } from "lucide-react";
import { api } from "@/lib/api";
import ResultsView from "./ResultsView";

export default function SubmitView(){
 const [tab,setTab]=useState<"submit"|"results">("submit");
 const [names,setNames]=useState<string[]>([]),[pids,setPids]=useState<string[]>([]);
 const [name,setName]=useState(""),[pid,setPid]=useState(""),[qNo,setQNo]=useState("Q1"),[qText,setQText]=useState("");
 const [oe,setOe]=useState(""),[related,setRelated]=useState(false),[image,setImage]=useState<string|null>(null);
 const [quality,setQuality]=useState<any>(null),[checking,setChecking]=useState(false),[message,setMessage]=useState("");
 const [showPID,setShowPID]=useState(false),[approved,setApproved]=useState<any[]>([]);
 const [nameOpen,setNameOpen]=useState(false),[pidOpen,setPidOpen]=useState(false);

 useEffect(()=>{api<any>("getInitialData").then(d=>{setNames(d?.names||[]);setPids(d?.pids||[])}).catch(e=>setMessage(e.message))},[]);
 const filteredNames=useMemo(()=>names.filter(x=>x.toLowerCase().includes(name.toLowerCase())).slice(0,12),[names,name]);
 const filteredPids=useMemo(()=>pids.filter(x=>x.toLowerCase().includes(pid.toLowerCase())).slice(0,12),[pids,pid]);

 const check=async()=>{if(!oe.trim()||!qNo||!qText.trim()){setMessage("Enter the question and OE response first.");return} setChecking(true);setQuality(null);try{const r=await api("checkOEQuality",{oeResponse:oe,qNumber:qNo,isRelatedToPrevious:related});setQuality(r)}catch(e:any){setMessage(e.message)}finally{setChecking(false)}};
 const submit=async()=>{if(!name||!pid||!oe.trim()||!qText.trim()){setMessage("Please complete Name, PID, Question and OE.");return}setChecking(true);try{let imageUrl="";if(image) imageUrl=await api<string>("uploadImageToDrive",{base64Data:image,fileName:`oe-${Date.now()}.jpg`});const r=await api("submitOE",{memberName:name,pid,qNumber:qNo,qText,oeResponse:oe,isRelatedToPrevious:related,imageUrl,qualityResult:quality});setMessage(`Submitted successfully. ID: ${r?.id||""}`);setOe("");setQuality(null)}catch(e:any){setMessage(e.message)}finally{setChecking(false)}};
 const approvedSearch=async()=>{if(!pid)return;try{setApproved(await api("getApprovedOEsByPID",{pid}))}catch(e:any){setMessage(e.message)}};
 return <div className="mx-auto w-full max-w-3xl">
   <div className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white"><h3 className="text-xl font-bold">📋 Open-End Team Portal</h3><p className="mt-1 text-xs opacity-85">Submit responses and check approvals</p></div>
   <div className="flex bg-[#3a76d8] text-white"><Tab active={tab==="submit"} onClick={()=>setTab("submit")} icon={<Send size={15}/>} text="Submit OE"/><Tab active={tab==="results"} onClick={()=>setTab("results")} icon={<CheckCircle2 size={15}/>} text="My Results"/></div>
   {tab==="results"?<ResultsView embedded/>:<div className="card rounded-t-none">
     <Field label="Your Name"><div className="relative"><input className="input" value={name} placeholder="Search your name..." onFocus={()=>setNameOpen(true)} onChange={e=>{setName(e.target.value);setNameOpen(true)}}/>{nameOpen&&filteredNames.length>0&&<Dropdown items={filteredNames} onSelect={v=>{setName(v);setNameOpen(false)}}/>}</div></Field>
     <Field label="PID"><div className="relative"><input className="input" value={pid} placeholder="Search or type PID..." onFocus={()=>setPidOpen(true)} onChange={e=>{setPid(e.target.value);setPidOpen(true)}}/>{pidOpen&&filteredPids.length>0&&<Dropdown items={filteredPids} onSelect={v=>{setPid(v);setPidOpen(false)}}/>}</div></Field>
     <Field label="Question"><div className="flex gap-2"><select className="input w-24" value={qNo} onChange={e=>{setQNo(e.target.value);setQuality(null)}}>{Array.from({length:20},(_,i)=><option key={i}>Q{i+1}</option>)}</select><input className="input" value={qText} onChange={e=>setQText(e.target.value)} placeholder="What do you enjoy most about working?"/></div></Field>
     <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-100 bg-slate-50 p-3 text-sm"><input type="checkbox" checked={related} onChange={e=>setRelated(e.target.checked)}/><span><b className="text-brand">Related to previous question</b> — my answer continues or relates to the previous question</span></label>
     <div className="mb-4 rounded-lg border-l-4 border-brand bg-blue-50 p-3 text-sm"><b><Lightbulb className="mr-1 inline" size={16}/>Tips</b><ul className="mt-1 list-disc pl-5 leading-7"><li>Write like you're talking to a friend</li><li>Use a different starting phrase each time</li><li>Focus on ONE main point</li><li>Avoid bullet points or structured answers</li><li>Make sure your answer matches the question</li></ul></div>
     <Field label={`OE Response (${oe.length} chars)`}><textarea className="input h-32 resize-y" value={oe} onChange={e=>setOe(e.target.value)} placeholder="Write your open-ended response here..." spellCheck/></Field>
     {oe.length>0&&<div className={`mb-3 text-xs font-semibold ${oe.length>=100&&oe.length<=300?"text-success":"text-orange-600"}`}>{oe.length>=100&&oe.length<=300?"✓":"⚠"} Recommended length: 100–300 characters</div>}
     <div className="mb-4 flex gap-2"><label className="btn-muted flex-1 cursor-pointer"><ImagePlus size={16}/>Attach screenshot<input hidden type="file" accept="image/*" onChange={e=>{const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>setImage(String(r.result));r.readAsDataURL(f)}}/></label>{image&&<button className="btn-muted" onClick={()=>setImage(null)}><X size={16}/></button>}</div>
     {image&&<img src={image} alt="preview" className="mb-4 max-h-36 rounded-lg border-2 border-brand object-contain"/>}
     <div className="mb-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-3"><button className="flex w-full items-center justify-between text-sm font-bold text-brand" onClick={()=>setShowPID(!showPID)}><span><Search size={15} className="mr-1 inline"/>Check Approved OEs for this PID</span>{showPID?<ChevronUp size={16}/>:<ChevronDown size={16}/>}</button>{showPID&&<div className="mt-3"><div className="flex gap-2"><input className="input" value={pid} onChange={e=>setPid(e.target.value)} placeholder="PID"/><button className="btn-primary" onClick={approvedSearch}><Search size={16}/></button></div><div className="mt-2 max-h-52 overflow-auto space-y-2">{approved.map((x:any)=><div key={x.id||Math.random()} className="rounded-lg border border-green-200 bg-white p-3 text-sm"><b className="text-brand">{x.qNumber}</b><p className="mt-1 text-green-800">{x.approvedOE||x.oeResponse}</p></div>)}</div></div>}</div>
     {quality&&<Quality data={quality}/>}
     {message&&<div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</div>}
     <div className="flex gap-2"><button className="btn-muted flex-1" onClick={check} disabled={checking}><Sparkles size={16}/>{checking?"Checking...":"Check Quality"}</button><button className="btn-primary flex-1" onClick={submit} disabled={checking||!quality}><Send size={16}/>{checking?"Submitting...":"Submit OE"}</button></div>
   </div>}
 </div>
}
function Tab({active,onClick,icon,text}:{active:boolean;onClick:()=>void;icon:React.ReactNode;text:string}){return <button onClick={onClick} className={`flex flex-1 items-center justify-center gap-1 border-b-2 py-3 text-sm font-bold ${active?"border-white bg-white/10 text-white":"border-transparent text-white/70"}`}>{icon}{text}</button>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <div className="field"><label className="label">{label}</label>{children}</div>}
function Dropdown({items,onSelect}:{items:string[];onSelect:(v:string)=>void}){return <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border-2 border-brand bg-white shadow-lg">{items.map(x=><button type="button" key={x} className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50" onMouseDown={()=>onSelect(x)}>{x}</button>)}</div>}
function Quality({data}:{data:any}){const a=Number(data.ai_score??data.aiScore??0),r=Number(data.relevancy_score??data.relScore??0);return <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4"><div className="mb-3 font-bold">Quality check</div><div className="grid grid-cols-2 gap-3"><Score label="Human" value={a}/><Score label="Relevancy" value={r}/></div>{(data.ai_reason||data.aiReason)&&<p className="mt-2 text-xs text-slate-600">{data.ai_reason||data.aiReason}</p>}</div>}
function Score({label,value}:{label:string,value:number}){return <div className="rounded-lg bg-white p-3 text-center shadow-sm"><div className="text-[10px] font-bold uppercase text-slate-400">{label}</div><div className={`text-2xl font-bold ${value>=65?"text-success":value>=50?"text-orange-600":"text-danger"}`}>{value}/100</div></div>}
