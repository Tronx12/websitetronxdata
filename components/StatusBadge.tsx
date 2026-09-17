import { CheckCircle2, Clock3, XCircle } from "lucide-react";
export function StatusBadge({status}:{status:string}) {
  const s=status==="APPROVED"||status==="AUTO_APPROVED" ? "approved" : status==="REJECTED" ? "rejected" : "pending";
  const map:any={approved:["APPROVED","bg-success text-white",CheckCircle2],rejected:["REJECTED","bg-danger text-white",XCircle],pending:["Pending","bg-warning text-slate-800",Clock3]};
  const [label,cls,Icon]=map[s];
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${cls}`}><Icon size={13}/>{label}</span>
}
