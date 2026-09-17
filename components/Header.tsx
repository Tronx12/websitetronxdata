import { ClipboardList, ShieldCheck } from "lucide-react";

export function Header({dqa=false}:{dqa?:boolean}) {
  return <header className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white">
    <div className="flex items-center justify-center gap-2">
      {dqa ? <ShieldCheck size={22}/> : <ClipboardList size={22}/>}
      <h1 className="text-xl font-bold">{dqa ? "DQA Review Panel" : "Open-End Team Portal"}</h1>
    </div>
    <p className="mt-1 text-xs opacity-85">{dqa ? "Review, correct, approve or reject team OE submissions" : "Submit responses and check approvals"}</p>
  </header>
}
