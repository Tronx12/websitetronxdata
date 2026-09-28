// "use client";

// import { useEffect, useMemo, useState } from "react";
// import {
//   BarChart3,
//   CheckCircle2,
//   ChevronDown,
//   ChevronUp,
//   Loader2,
//   RefreshCw,
//   Target,
//   TrendingUp,
//   XCircle,
// } from "lucide-react";

// import { api } from "@/lib/api";

// type SubmitViewProps = {
//   memberName: string;
// };

// type OEItem = {
//   id?: string;
//   _id?: string;
//   pid?: string;
//   qNumber?: string;
//   qText?: string;
//   oeResponse?: string;
//   approvedOE?: string;
//   isRelatedToPrevious?: boolean;
//   imageUrl?: string;
//   submittedAt?: string;
//   createdAt?: string;
//   qualityResult?: {
//     ai_score?: number;
//     aiScore?: number;
//     relevancy_score?: number;
//     relScore?: number;
//     ai_reason?: string;
//     aiReason?: string;
//   };
//   status?: string; // e.g. "approved" | "pending" | "rejected"
// };

// type PerformanceData = {
//   total: number;
//   approved: number;
//   pending: number;
//   rejected: number;
//   avgHumanScore: number;
//   avgRelevancyScore: number;
//   items: OEItem[];
// };

// export default function OEPerformancePage({
//   memberName,
// }: SubmitViewProps) {
//   const name = memberName.trim();

//   const [data, setData] = useState<PerformanceData | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [message, setMessage] = useState("");
//   const [filterPid, setFilterPid] = useState("");
//   const [filterStatus, setFilterStatus] = useState<
//     "all" | "approved" | "pending" | "rejected"
//   >("all");
//   const [expandedId, setExpandedId] = useState<string | null>(null);

//   // =========================================================
//   // LOAD PERFORMANCE
//   // =========================================================

//   const load = async () => {
//     if (!name) {
//       setMessage("Unable to identify the logged-in user.");
//       setLoading(false);
//       return;
//     }

//     setLoading(true);
//     setMessage("");

//     try {
//       const result = await api<any>("getOEPerformance", {
//         memberName: name,
//       });

//       const items: OEItem[] = result?.items || result?.oes || [];

//       const total = items.length;
//       const approved = items.filter(
//         (i) => (i.status || "").toLowerCase() === "approved"
//       ).length;
//       const pending = items.filter(
//         (i) => (i.status || "").toLowerCase() === "pending"
//       ).length;
//       const rejected = items.filter(
//         (i) => (i.status || "").toLowerCase() === "rejected"
//       ).length;

//       const humanScores = items
//         .map(
//           (i) =>
//             Number(
//               i.qualityResult?.ai_score ??
//                 i.qualityResult?.aiScore ??
//                 0
//             )
//         )
//         .filter((n) => n > 0);

//       const relScores = items
//         .map(
//           (i) =>
//             Number(
//               i.qualityResult?.relevancy_score ??
//                 i.qualityResult?.relScore ??
//                 0
//             )
//         )
//         .filter((n) => n > 0);

//       const avgHumanScore =
//         humanScores.length > 0
//           ? Math.round(
//               humanScores.reduce((a, b) => a + b, 0) /
//                 humanScores.length
//             )
//           : 0;

//       const avgRelevancyScore =
//         relScores.length > 0
//           ? Math.round(
//               relScores.reduce((a, b) => a + b, 0) /
//                 relScores.length
//             )
//           : 0;

//       setData({
//         total: result?.total ?? total,
//         approved: result?.approved ?? approved,
//         pending: result?.pending ?? pending,
//         rejected: result?.rejected ?? rejected,
//         avgHumanScore:
//           result?.avgHumanScore ?? avgHumanScore,
//         avgRelevancyScore:
//           result?.avgRelevancyScore ?? avgRelevancyScore,
//         items,
//       });
//     } catch (error: any) {
//       setMessage(
//         error?.message || "Failed to load OE performance."
//       );
//       setData(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     load();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [name]);

//   // =========================================================
//   // FILTERED LIST
//   // =========================================================

//   const filteredItems = useMemo(() => {
//     if (!data?.items) return [];

//     return data.items.filter((item) => {
//       const pidMatch =
//         !filterPid.trim() ||
//         (item.pid || "")
//           .toLowerCase()
//           .includes(filterPid.toLowerCase().trim());

//       const status = (item.status || "").toLowerCase();
//       const statusMatch =
//         filterStatus === "all" || status === filterStatus;

//       return pidMatch && statusMatch;
//     });
//   }, [data, filterPid, filterStatus]);

//   // =========================================================
//   // HELPERS
//   // =========================================================

//   const getHumanScore = (item: OEItem) =>
//     Number(
//       item.qualityResult?.ai_score ??
//         item.qualityResult?.aiScore ??
//         0
//     );

//   const getRelScore = (item: OEItem) =>
//     Number(
//       item.qualityResult?.relevancy_score ??
//         item.qualityResult?.relScore ??
//         0
//     );

//   const getReason = (item: OEItem) =>
//     item.qualityResult?.ai_reason ||
//     item.qualityResult?.aiReason ||
//     "";

//   const formatDate = (value?: string) => {
//     if (!value) return "—";
//     try {
//       return new Date(value).toLocaleString();
//     } catch {
//       return value;
//     }
//   };

//   const scoreColor = (value: number) => {
//     if (value >= 65) return "text-success";
//     if (value >= 50) return "text-orange-600";
//     return "text-danger";
//   };

//   const statusBadge = (status?: string) => {
//     const s = (status || "pending").toLowerCase();

//     if (s === "approved") {
//       return (
//         <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
//           <CheckCircle2 size={12} />
//           Approved
//         </span>
//       );
//     }

//     if (s === "rejected") {
//       return (
//         <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
//           <XCircle size={12} />
//           Rejected
//         </span>
//       );
//     }

//     return (
//       <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
//         Pending
//       </span>
//     );
//   };

//   // =========================================================
//   // UI
//   // =========================================================

//   return (
//     <div className="mx-auto w-full max-w-3xl">
//       {/* HEADER */}
//       <div className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white">
//         <h3 className="text-xl font-bold">
//           📊 OE Performance
//         </h3>
//         <p className="mt-1 text-xs opacity-85">
//           Your open-end submission history and quality scores
//         </p>
//       </div>

//       <div className="card rounded-t-none">
//         {/* USER NAME (LOCKED) */}
//         <div className="field mb-4">
//           <label className="label">Your Name</label>
//           <input
//             className="input cursor-not-allowed bg-slate-100 text-slate-600"
//             value={name}
//             disabled
//             readOnly
//           />
//           <div className="mt-1 flex items-center justify-between">
//             <p className="text-xs text-slate-400">
//               Name is linked to your account.
//             </p>
//             <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
//               🔒 Locked
//             </span>
//           </div>
//         </div>

//         {/* REFRESH */}
//         <div className="mb-4 flex justify-end">
//           <button
//             type="button"
//             className="btn-muted"
//             onClick={load}
//             disabled={loading}
//           >
//             {loading ? (
//               <Loader2 size={16} className="animate-spin" />
//             ) : (
//               <RefreshCw size={16} />
//             )}
//             {loading ? "Loading..." : "Refresh"}
//           </button>
//         </div>

//         {/* MESSAGE */}
//         {message && (
//           <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
//             {message}
//           </div>
//         )}

//         {/* LOADING */}
//         {loading && !data && (
//           <div className="flex flex-col items-center justify-center py-12 text-slate-500">
//             <Loader2 size={28} className="mb-2 animate-spin" />
//             <p className="text-sm">Loading performance...</p>
//           </div>
//         )}

//         {/* SUMMARY CARDS */}
//         {data && (
//           <>
//             <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
//               <StatCard
//                 icon={<BarChart3 size={18} />}
//                 label="Total OEs"
//                 value={String(data.total)}
//               />
//               <StatCard
//                 icon={<CheckCircle2 size={18} />}
//                 label="Approved"
//                 value={String(data.approved)}
//                 accent="text-success"
//               />
//               <StatCard
//                 icon={<TrendingUp size={18} />}
//                 label="Avg Human"
//                 value={`${data.avgHumanScore}/100`}
//                 accent={scoreColor(data.avgHumanScore)}
//               />
//               <StatCard
//                 icon={<Target size={18} />}
//                 label="Avg Relevancy"
//                 value={`${data.avgRelevancyScore}/100`}
//                 accent={scoreColor(data.avgRelevancyScore)}
//               />
//             </div>

//             {/* FILTERS */}
//             <div className="mb-4 flex flex-col gap-2 sm:flex-row">
//               <input
//                 className="input flex-1"
//                 value={filterPid}
//                 onChange={(e) => setFilterPid(e.target.value)}
//                 placeholder="Filter by PID..."
//               />

//               <select
//                 className="input w-full sm:w-40"
//                 value={filterStatus}
//                 onChange={(e) =>
//                   setFilterStatus(
//                     e.target.value as
//                       | "all"
//                       | "approved"
//                       | "pending"
//                       | "rejected"
//                   )
//                 }
//               >
//                 <option value="all">All statuses</option>
//                 <option value="approved">Approved</option>
//                 <option value="pending">Pending</option>
//                 <option value="rejected">Rejected</option>
//               </select>
//             </div>

//             {/* LIST */}
//             <div className="space-y-3">
//               {filteredItems.length === 0 ? (
//                 <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
//                   No OE submissions found.
//                 </p>
//               ) : (
//                 filteredItems.map((item, index) => {
//                   const id =
//                     item.id ||
//                     item._id ||
//                     `${item.qNumber}-${item.pid}-${index}`;
//                   const isOpen = expandedId === id;
//                   const human = getHumanScore(item);
//                   const rel = getRelScore(item);
//                   const reason = getReason(item);

//                   return (
//                     <div
//                       key={id}
//                       className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
//                     >
//                       {/* ROW HEADER */}
//                       <button
//                         type="button"
//                         className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"
//                         onClick={() =>
//                           setExpandedId(isOpen ? null : id)
//                         }
//                       >
//                         <div className="min-w-0 flex-1">
//                           <div className="flex flex-wrap items-center gap-2">
//                             <span className="font-bold text-brand">
//                               {item.qNumber || "—"}
//                             </span>
//                             <span className="text-xs text-slate-500">
//                               PID: {item.pid || "—"}
//                             </span>
//                             {statusBadge(item.status)}
//                           </div>
//                           <p className="mt-1 truncate text-xs text-slate-500">
//                             {item.qText || "No question text"}
//                           </p>
//                         </div>

//                         <div className="flex shrink-0 items-center gap-3">
//                           <div className="hidden text-right sm:block">
//                             <div
//                               className={`text-sm font-bold ${scoreColor(
//                                 human
//                               )}`}
//                             >
//                               H {human}
//                             </div>
//                             <div
//                               className={`text-xs ${scoreColor(
//                                 rel
//                               )}`}
//                             >
//                               R {rel}
//                             </div>
//                           </div>
//                           {isOpen ? (
//                             <ChevronUp size={18} />
//                           ) : (
//                             <ChevronDown size={18} />
//                           )}
//                         </div>
//                       </button>

//                       {/* EXPANDED */}
//                       {isOpen && (
//                         <div className="border-t border-slate-100 bg-slate-50 p-4 text-sm">
//                           <div className="mb-3 grid grid-cols-2 gap-3">
//                             <ScoreBox
//                               label="Human"
//                               value={human}
//                             />
//                             <ScoreBox
//                               label="Relevancy"
//                               value={rel}
//                             />
//                           </div>

//                           {reason && (
//                             <p className="mb-3 rounded-lg bg-white p-2 text-xs text-slate-600">
//                               {reason}
//                             </p>
//                           )}

//                           <div className="mb-2">
//                             <div className="text-[10px] font-bold uppercase text-slate-400">
//                               Your OE
//                             </div>
//                             <p className="mt-1 whitespace-pre-wrap text-slate-800">
//                               {item.oeResponse || "—"}
//                             </p>
//                           </div>

//                           {item.approvedOE &&
//                             item.approvedOE !==
//                               item.oeResponse && (
//                               <div className="mb-2">
//                                 <div className="text-[10px] font-bold uppercase text-green-600">
//                                   Approved OE
//                                 </div>
//                                 <p className="mt-1 whitespace-pre-wrap text-green-800">
//                                   {item.approvedOE}
//                                 </p>
//                               </div>
//                             )}

//                           {item.imageUrl && (
//                             <div className="mb-2">
//                               <div className="text-[10px] font-bold uppercase text-slate-400">
//                                 Screenshot
//                               </div>
//                               <a
//                                 href={item.imageUrl}
//                                 target="_blank"
//                                 rel="noreferrer"
//                                 className="mt-1 inline-block text-xs font-semibold text-brand underline"
//                               >
//                                 Open image
//                               </a>
//                             </div>
//                           )}

//                           <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
//                             <span>
//                               Related:{" "}
//                               {item.isRelatedToPrevious
//                                 ? "Yes"
//                                 : "No"}
//                             </span>
//                             <span>
//                               Submitted:{" "}
//                               {formatDate(
//                                 item.submittedAt ||
//                                   item.createdAt
//                               )}
//                             </span>
//                           </div>
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })
//               )}
//             </div>
//           </>
//         )}
//       </div>
//     </div>
//   );
// }

// /* =========================================================
//    STAT CARD
// ========================================================= */

// function StatCard({
//   icon,
//   label,
//   value,
//   accent,
// }: {
//   icon: React.ReactNode;
//   label: string;
//   value: string;
//   accent?: string;
// }) {
//   return (
//     <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
//       <div className="mb-1 flex items-center gap-1.5 text-slate-400">
//         {icon}
//         <span className="text-[10px] font-bold uppercase">
//           {label}
//         </span>
//       </div>
//       <div
//         className={`text-xl font-bold ${
//           accent || "text-slate-800"
//         }`}
//       >
//         {value}
//       </div>
//     </div>
//   );
// }

// /* =========================================================
//    SCORE BOX
// ========================================================= */

// function ScoreBox({
//   label,
//   value,
// }: {
//   label: string;
//   value: number;
// }) {
//   const color =
//     value >= 65
//       ? "text-success"
//       : value >= 50
//         ? "text-orange-600"
//         : "text-danger";

//   return (
//     <div className="rounded-lg bg-white p-3 text-center shadow-sm">
//       <div className="text-[10px] font-bold uppercase text-slate-400">
//         {label}
//       </div>
//       <div className={`text-2xl font-bold ${color}`}>
//         {value}/100
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Target,
  TrendingUp,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";

type SubmitViewProps = {
  memberName: string;
};

type OEItem = {
  id?: string;
  _id?: string;
  pid?: string;
  qNumber?: string;
  qText?: string;
  oeResponse?: string;
  approvedOE?: string;
  isRelatedToPrevious?: boolean;
  imageUrl?: string;
  submittedAt?: string;
  createdAt?: string;
  qualityResult?: {
    ai_score?: number;
    aiScore?: number;
    relevancy_score?: number;
    relScore?: number;
    ai_reason?: string;
    aiReason?: string;
  };
  status?: string; // e.g. "approved" | "pending" | "rejected"
};

type PerformanceData = {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avgHumanScore: number;
  avgRelevancyScore: number;
  items: OEItem[];
};

export default function OEPerformancePage({
  memberName,
}: SubmitViewProps) {
  const name = memberName.trim();

  const [data, setData] = useState<PerformanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [filterPid, setFilterPid] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "approved" | "pending" | "rejected"
  >("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // =========================================================
  // LOAD PERFORMANCE
  // =========================================================

  const load = async () => {
    if (!name) {
      setMessage("Unable to identify the logged-in user.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const result = await api<any>("getOEPerformance", {
        memberName: name,
      });

      const items: OEItem[] = result?.items || result?.oes || [];

      const total = items.length;
      const approved = items.filter(
        (i) => (i.status || "").toLowerCase() === "approved"
      ).length;
      const pending = items.filter(
        (i) => (i.status || "").toLowerCase() === "pending"
      ).length;
      const rejected = items.filter(
        (i) => (i.status || "").toLowerCase() === "rejected"
      ).length;

      const humanScores = items
        .map(
          (i) =>
            Number(
              i.qualityResult?.ai_score ??
                i.qualityResult?.aiScore ??
                0
            )
        )
        .filter((n) => n > 0);

      const relScores = items
        .map(
          (i) =>
            Number(
              i.qualityResult?.relevancy_score ??
                i.qualityResult?.relScore ??
                0
            )
        )
        .filter((n) => n > 0);

      const avgHumanScore =
        humanScores.length > 0
          ? Math.round(
              humanScores.reduce((a, b) => a + b, 0) /
                humanScores.length
            )
          : 0;

      const avgRelevancyScore =
        relScores.length > 0
          ? Math.round(
              relScores.reduce((a, b) => a + b, 0) /
                relScores.length
            )
          : 0;

      setData({
        total: result?.total ?? total,
        approved: result?.approved ?? approved,
        pending: result?.pending ?? pending,
        rejected: result?.rejected ?? rejected,
        avgHumanScore:
          result?.avgHumanScore ?? avgHumanScore,
        avgRelevancyScore:
          result?.avgRelevancyScore ?? avgRelevancyScore,
        items,
      });
    } catch (error: any) {
      setMessage(
        error?.message || "Failed to load OE performance."
      );
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name]);

  // =========================================================
  // FILTERED LIST
  // =========================================================

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((item) => {
      const pidMatch =
        !filterPid.trim() ||
        (item.pid || "")
          .toLowerCase()
          .includes(filterPid.toLowerCase().trim());

      const status = (item.status || "").toLowerCase();

      const statusMatch =
        filterStatus === "all" || status === filterStatus;

      const itemDate = item.submittedAt || item.createdAt;

      const dateMatch =
        !selectedDate ||
        (itemDate &&
          new Date(itemDate).toLocaleDateString("en-CA") === selectedDate);

      return pidMatch && statusMatch && dateMatch;
    });
  }, [data, filterPid, filterStatus, selectedDate]);

  // =========================================================
  // HELPERS
  // =========================================================

  const getHumanScore = (item: OEItem) =>
    Number(
      item.qualityResult?.ai_score ??
        item.qualityResult?.aiScore ??
        0
    );

  const getRelScore = (item: OEItem) =>
    Number(
      item.qualityResult?.relevancy_score ??
        item.qualityResult?.relScore ??
        0
    );

  const getReason = (item: OEItem) =>
    item.qualityResult?.ai_reason ||
    item.qualityResult?.aiReason ||
    "";

  const formatDate = (value?: string) => {
    if (!value) return "—";
    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  };

  const scoreColor = (value: number) => {
    if (value >= 65) return "text-success";
    if (value >= 50) return "text-orange-600";
    return "text-danger";
  };

  const statusBadge = (status?: string) => {
    const s = (status || "pending").toLowerCase();

    if (s === "approved") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700">
          <CheckCircle2 size={12} />
          Approved
        </span>
      );
    }

    if (s === "rejected") {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
          <XCircle size={12} />
          Rejected
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        Pending
      </span>
    );
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* HEADER */}
      <div className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white">
        <h3 className="text-xl font-bold">
          📊 OE Performance
        </h3>
        <p className="mt-1 text-xs opacity-85">
          Your open-end submission history and quality scores
        </p>
      </div>

      <div className="card rounded-t-none">
        {/* USER NAME (LOCKED) */}
        <div className="field mb-4">
          <label className="label">Your Name</label>
          <input
            className="input cursor-not-allowed bg-slate-100 text-slate-600"
            value={name}
            disabled
            readOnly
          />
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-slate-400">
              Name is linked to your account.
            </p>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
              🔒 Locked
            </span>
          </div>
        </div>

        {/* REFRESH */}
        <div className="mb-4 flex justify-end">
          <button
            type="button"
            className="btn-muted"
            onClick={load}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <RefreshCw size={16} />
            )}
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        {/* LOADING */}
        {loading && !data && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500">
            <Loader2 size={28} className="mb-2 animate-spin" />
            <p className="text-sm">Loading performance...</p>
          </div>
        )}

        {/* SUMMARY CARDS */}
        {data && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatCard
                icon={<BarChart3 size={18} />}
                label="Total OEs"
                value={String(data.total)}
              />
              <StatCard
                icon={<CheckCircle2 size={18} />}
                label="Approved"
                value={String(data.approved)}
                accent="text-success"
              />
              <StatCard
                icon={<TrendingUp size={18} />}
                label="Avg Human"
                value={`${data.avgHumanScore}/100`}
                accent={scoreColor(data.avgHumanScore)}
              />
              <StatCard
                icon={<Target size={18} />}
                label="Avg Relevancy"
                value={`${data.avgRelevancyScore}/100`}
                accent={scoreColor(data.avgRelevancyScore)}
              />
            </div>

            {/* FILTERS */}
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <input
                className="input flex-1"
                value={filterPid}
                onChange={(e) => setFilterPid(e.target.value)}
                placeholder="Filter by PID..."
              />

              <select
                className="input w-full sm:w-40"
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(
                    e.target.value as
                      | "all"
                      | "approved"
                      | "pending"
                      | "rejected"
                  )
                }
              >
                <option value="all">All statuses</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            {/* DATE FILTER */}
            <div className="mb-5">
              <div className="mb-2 flex items-center justify-between">
                <h4 className="text-sm font-bold text-slate-700">
                  Performance Date
                </h4>

                {selectedDate && (
                  <button
                    type="button"
                    onClick={() => setSelectedDate(null)}
                    className="text-xs font-semibold text-brand hover:underline"
                  >
                    Show All Dates
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {Array.from(
                  new Set(
                    (data?.items || [])
                      .map((item) => item.submittedAt || item.createdAt)
                      .filter(Boolean)
                      .map((date) =>
                        new Date(date as string).toLocaleDateString("en-CA")
                      )
                  )
                )
                  .sort((a, b) => b.localeCompare(a))
                  .map((date) => {
                    const count = (data?.items || []).filter((item) => {
                      const itemDate = item.submittedAt || item.createdAt;

                      return (
                        itemDate &&
                        new Date(itemDate).toLocaleDateString("en-CA") === date
                      );
                    }).length;

                    const active = selectedDate === date;

                    return (
                      <button
                        key={date}
                        type="button"
                        onClick={() => setSelectedDate(date)}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                          active
                            ? "border-brand bg-brand text-white"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {new Date(`${date}T00:00:00`).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )}

                        <span
                          className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                            active
                              ? "bg-white/20 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* LIST */}
            <div className="space-y-3">
              {filteredItems.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-6 text-center text-sm text-slate-500">
                  No OE submissions found.
                </p>
              ) : (
                filteredItems.map((item, index) => {
                  const id =
                    item.id ||
                    item._id ||
                    `${item.qNumber}-${item.pid}-${index}`;
                  const isOpen = expandedId === id;
                  const human = getHumanScore(item);
                  const rel = getRelScore(item);
                  const reason = getReason(item);

                  return (
                    <div
                      key={id}
                      className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
                    >
                      {/* ROW HEADER */}
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"
                        onClick={() =>
                          setExpandedId(isOpen ? null : id)
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-brand">
                              {item.qNumber || "—"}
                            </span>
                            <span className="text-xs text-slate-500">
                              PID: {item.pid || "—"}
                            </span>
                            {statusBadge(item.status)}
                          </div>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {item.qText || "No question text"}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          <div className="hidden text-right sm:block">
                            <div
                              className={`text-sm font-bold ${scoreColor(
                                human
                              )}`}
                            >
                              H {human}
                            </div>
                            <div
                              className={`text-xs ${scoreColor(
                                rel
                              )}`}
                            >
                              R {rel}
                            </div>
                          </div>
                          {isOpen ? (
                            <ChevronUp size={18} />
                          ) : (
                            <ChevronDown size={18} />
                          )}
                        </div>
                      </button>

                      {/* EXPANDED */}
                      {isOpen && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 text-sm">
                          <div className="mb-3 grid grid-cols-2 gap-3">
                            <ScoreBox
                              label="Human"
                              value={human}
                            />
                            <ScoreBox
                              label="Relevancy"
                              value={rel}
                            />
                          </div>

                          {reason && (
                            <p className="mb-3 rounded-lg bg-white p-2 text-xs text-slate-600">
                              {reason}
                            </p>
                          )}

                          <div className="mb-2">
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              Your OE
                            </div>
                            <p className="mt-1 whitespace-pre-wrap text-slate-800">
                              {item.oeResponse || "—"}
                            </p>
                          </div>

                          {item.approvedOE &&
                            item.approvedOE !==
                              item.oeResponse && (
                              <div className="mb-2">
                                <div className="text-[10px] font-bold uppercase text-green-600">
                                  Approved OE
                                </div>
                                <p className="mt-1 whitespace-pre-wrap text-green-800">
                                  {item.approvedOE}
                                </p>
                              </div>
                            )}

                          {item.imageUrl && (
                            <div className="mb-2">
                              <div className="text-[10px] font-bold uppercase text-slate-400">
                                Screenshot
                              </div>
                              <a
                                href={item.imageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-xs font-semibold text-brand underline"
                              >
                                Open image
                              </a>
                            </div>
                          )}

                          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                            <span>
                              Related:{" "}
                              {item.isRelatedToPrevious
                                ? "Yes"
                                : "No"}
                            </span>
                            <span>
                              Submitted:{" "}
                              {formatDate(
                                item.submittedAt ||
                                  item.createdAt
                              )}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   STAT CARD
========================================================= */

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-1 flex items-center gap-1.5 text-slate-400">
        {icon}
        <span className="text-[10px] font-bold uppercase">
          {label}
        </span>
      </div>
      <div
        className={`text-xl font-bold ${
          accent || "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   SCORE BOX
========================================================= */

function ScoreBox({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  const color =
    value >= 65
      ? "text-success"
      : value >= 50
        ? "text-orange-600"
        : "text-danger";

  return (
    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
      <div className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </div>
      <div className={`text-2xl font-bold ${color}`}>
        {value}/100
      </div>
    </div>
  );
}