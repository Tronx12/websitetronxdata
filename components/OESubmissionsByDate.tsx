// "use client";

// import { useEffect, useMemo, useState, useCallback } from "react";
// import {
//   Calendar,
//   ChevronDown,
//   ChevronUp,
//   RefreshCw,
//   Search,
//   User,
//   ImageIcon,
// } from "lucide-react";
// import { api } from "@/lib/api";
// import { StatusBadge } from "./StatusBadge";

// /* ============================================================
//    TYPES
//    Reuses the same OE record shape returned by "getPerformanceOEs"
//    (see OEPerformancePage) so this view talks to the backend the
//    same way the rest of the app does.
// ============================================================ */

// interface OERecord {
//   rowIndex: number;
//   id: string;
//   timestamp: string;
//   date: string; // YYYY-MM-DD
//   memberName: string;
//   pid: string;
//   projectId: string;
//   qNumber: string;
//   oeResponse: string;
//   dqaCorrection: string;
//   status: "APPROVED" | "REJECTED" | "PENDING";
//   approvedBy: string;
//   actionTime: string;
//   rejectReason: string;
//   imageUrl: string;
// }

// interface DateGroup {
//   date: string;
//   entries: OERecord[];
//   approved: number;
//   rejected: number;
//   pending: number;
// }

// /* ============================================================
//    HELPERS
// ============================================================ */

// function todayISO(): string {
//   const d = new Date();
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${d.getFullYear()}-${mm}-${dd}`;
// }

// function daysAgoISO(n: number): string {
//   const d = new Date();
//   d.setDate(d.getDate() - n);
//   const mm = String(d.getMonth() + 1).padStart(2, "0");
//   const dd = String(d.getDate()).padStart(2, "0");
//   return `${d.getFullYear()}-${mm}-${dd}`;
// }

// function formatDateLabel(date: string): string {
//   if (!date) return "Unknown date";
//   const d = new Date(date);
//   if (isNaN(d.getTime())) return date;
//   return d.toLocaleDateString("en-US", {
//     weekday: "short",
//     day: "numeric",
//     month: "short",
//     year: "numeric",
//   });
// }

// function formatTime(ts: string): string {
//   const d = new Date(ts);
//   if (isNaN(d.getTime())) return ts || "";
//   return d.toLocaleTimeString("en-US", {
//     hour: "2-digit",
//     minute: "2-digit",
//     hour12: true,
//   });
// }

// /* ============================================================
//    PAGE
// ============================================================ */

// export default function OESubmissionsByDate() {
//   const [fromDate, setFromDate] = useState(daysAgoISO(6));
//   const [toDate, setToDate] = useState(todayISO());
//   const [search, setSearch] = useState("");
//   const [statusFilter, setStatusFilter] = useState("ALL");
//   const [userFilter, setUserFilter] = useState("ALL");
//   const [records, setRecords] = useState<OERecord[]>([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
//   const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});

//   const load = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     try {
//       const rows = await api<OERecord[]>("getPerformanceOEs", {
//         fromDate,
//         toDate,
//         projectId: "",
//         employee: "",
//         status: "",
//       });
//       setRecords(Array.isArray(rows) ? rows : []);
//     } catch (e: any) {
//       setError(e?.message || "Failed to load submissions.");
//       setRecords([]);
//     } finally {
//       setLoading(false);
//     }
//   }, [fromDate, toDate]);

//   useEffect(() => {
//     load();
//   }, [load]);

//   /* ---------------- group by date ---------------- */

//   const groups = useMemo<DateGroup[]>(() => {
//     const q = search.trim().toLowerCase();

//     const filtered = records.filter((r) => {
//       if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
//       if (userFilter !== "ALL" && r.memberName !== userFilter) return false;
//       if (!q) return true;
//       return (
//         r.memberName?.toLowerCase().includes(q) ||
//         r.pid?.toLowerCase().includes(q) ||
//         r.qNumber?.toLowerCase().includes(q) ||
//         r.oeResponse?.toLowerCase().includes(q)
//       );
//     });

//     const byDate = new Map<string, OERecord[]>();
//     for (const r of filtered) {
//       const key = r.date || (r.timestamp || "").slice(0, 10) || "unknown";
//       if (!byDate.has(key)) byDate.set(key, []);
//       byDate.get(key)!.push(r);
//     }

//     const result: DateGroup[] = [];
//     for (const [date, entries] of byDate.entries()) {
//       entries.sort(
//         (a, b) =>
//           new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
//       );
//       result.push({
//         date,
//         entries,
//         approved: entries.filter((e) => e.status === "APPROVED").length,
//         rejected: entries.filter((e) => e.status === "REJECTED").length,
//         pending: entries.filter((e) => e.status === "PENDING").length,
//       });
//     }

//     // most recent date first
//     result.sort((a, b) => (a.date < b.date ? 1 : -1));
//     return result;
//   }, [records, search, statusFilter, userFilter]);

//   const uniqueUsers = useMemo(() => {
//     const users = new Set<string>();
//     for (const r of records) {
//       if (r.memberName) users.add(r.memberName);
//     }
//     return Array.from(users).sort();
//   }, [records]);

//   const totalCount = useMemo(
//     () => groups.reduce((sum, g) => sum + g.entries.length, 0),
//     [groups]
//   );

//   const toggleCollapsed = (date: string) =>
//     setCollapsed((p) => ({ ...p, [date]: !p[date] }));

//   const toggleText = (key: string) =>
//     setExpandedText((p) => ({ ...p, [key]: !p[key] }));

//   /* ============================================================
//      RENDER
//   ============================================================ */

//   return (
//     <div className="min-h-screen bg-slate-50 text-slate-900">
//       <div className="mx-auto max-w-5xl p-6">
//         {/* Header */}
//         <div className="mb-6">
//           <h4 className="flex items-center gap-2 text-2xl font-bold">
//             <Calendar size={22} /> OE Submissions — Date Wise
//           </h4>
//           <p className="mt-1 text-sm text-slate-500">
//             Every OE submitted, grouped by date, showing who submitted it and
//             what was submitted.
//           </p>
//         </div>

//         {/* Filters */}
//         <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
//           <div>
//             <label className="mb-1.5 block text-xs font-semibold text-slate-600">
//               From Date
//             </label>
//             <input
//               type="date"
//               value={fromDate}
//               onChange={(e) => setFromDate(e.target.value)}
//               className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
//             />
//           </div>
//           <div>
//             <label className="mb-1.5 block text-xs font-semibold text-slate-600">
//               To Date
//             </label>
//             <input
//               type="date"
//               value={toDate}
//               onChange={(e) => setToDate(e.target.value)}
//               className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
//             />
//           </div>
//           <div>
//             <label className="mb-1.5 block text-xs font-semibold text-slate-600">
//               Status
//             </label>
//             <select
//               value={statusFilter}
//               onChange={(e) => setStatusFilter(e.target.value)}
//               className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
//             >
//               <option value="ALL">All Status</option>
//               <option value="PENDING">Pending</option>
//               <option value="APPROVED">Approved</option>
//               <option value="REJECTED">Rejected</option>
//             </select>
//           </div>
//           <div>
//             <label className="mb-1.5 block text-xs font-semibold text-slate-600">
//               User
//             </label>
//             <select
//               value={userFilter}
//               onChange={(e) => setUserFilter(e.target.value)}
//               className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
//             >
//               <option value="ALL">All Users</option>
//               {uniqueUsers.map((u) => (
//                 <option key={u} value={u}>
//                   {u}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="flex items-end gap-2">
//             <button
//               onClick={load}
//               disabled={loading}
//               className="h-10 flex-1 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:opacity-60"
//             >
//               <RefreshCw
//                 size={14}
//                 className={`mr-1.5 inline ${loading ? "animate-spin" : ""}`}
//               />
//               {loading ? "Loading..." : "Refresh"}
//             </button>
//           </div>
//         </div>

//         {/* Search */}
//         <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
//           <div className="relative">
//             <Search
//               className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
//               size={16}
//             />
//             <input
//               type="text"
//               value={search}
//               onChange={(e) => setSearch(e.target.value)}
//               placeholder="Search by employee, PID, question number, or response text..."
//               className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 outline-none focus:border-blue-600"
//             />
//           </div>
//         </div>

//         {error && (
//           <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
//             {error}
//           </div>
//         )}

//         <div className="mb-3 text-sm font-semibold text-slate-500">
//           {totalCount} submission{totalCount === 1 ? "" : "s"} across{" "}
//           {groups.length} day{groups.length === 1 ? "" : "s"}
//         </div>

//         {/* Date groups */}
//         <div className="space-y-4">
//           {groups.length === 0 && !loading && (
//             <div className="rounded-xl bg-white p-10 text-center text-slate-400 shadow-sm">
//               No submissions found for this range.
//             </div>
//           )}

//           {groups.map((g) => {
//             const isCollapsed = !!collapsed[g.date];
//             return (
//               <div
//                 key={g.date}
//                 className="overflow-hidden rounded-xl bg-white shadow-sm"
//               >
//                 {/* Date header */}
//                 <button
//                   onClick={() => toggleCollapsed(g.date)}
//                   className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50"
//                 >
//                   <div className="flex items-center gap-3">
//                     <span className="text-base font-bold">
//                       {formatDateLabel(g.date)}
//                     </span>
//                     <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
//                       {g.entries.length} submitted
//                     </span>
//                     <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
//                       {g.approved} approved
//                     </span>
//                     <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
//                       {g.rejected} rejected
//                     </span>
//                     <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
//                       {g.pending} pending
//                     </span>
//                   </div>
//                   {isCollapsed ? (
//                     <ChevronDown size={18} />
//                   ) : (
//                     <ChevronUp size={18} />
//                   )}
//                 </button>

//                 {/* Entries */}
//                 {!isCollapsed && (
//                   <div className="divide-y divide-slate-100">
//                     {g.entries.map((oe) => {
//                       const key = `${g.date}-${oe.rowIndex}`;
//                       const isLong = (oe.oeResponse || "").length > 220;
//                       const isOpen = !!expandedText[key];
//                       const text =
//                         isLong && !isOpen
//                           ? oe.oeResponse.slice(0, 220) + "…"
//                           : oe.oeResponse;
//                       return (
//                         <div key={key} className="px-5 py-4">
//                           <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
//                             <div className="flex items-center gap-2 text-sm">
//                               <User size={14} className="text-slate-400" />
//                               <span className="font-bold">
//                                 {oe.memberName || "Unknown"}
//                               </span>
//                               <span className="text-slate-400">·</span>
//                               <span className="text-slate-500">
//                                 {oe.pid}
//                               </span>
//                               <span className="text-slate-400">·</span>
//                               <span className="font-semibold text-[#e06666]">
//                                 {oe.qNumber}
//                               </span>
//                             </div>
//                             <div className="flex items-center gap-2">
//                               <span className="text-xs text-slate-400">
//                                 {formatTime(oe.timestamp)}
//                               </span>
//                               <StatusBadge status={oe.status} />
//                             </div>
//                           </div>

//                           <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed">
//                             {text}
//                           </div>
//                           {isLong && (
//                             <button
//                               className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
//                               onClick={() => toggleText(key)}
//                             >
//                               {isOpen ? "Show less" : "Show full response"}
//                             </button>
//                           )}

//                           {oe.imageUrl && (
//                             <a
//                               href={oe.imageUrl}
//                               target="_blank"
//                               rel="noreferrer"
//                               className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
//                             >
//                               <ImageIcon size={12} /> View screenshot
//                             </a>
//                           )}

//                           {oe.status === "REJECTED" && oe.rejectReason && (
//                             <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
//                               <b>Rejection reason:</b> {oe.rejectReason}
//                             </div>
//                           )}

//                           {oe.dqaCorrection?.trim() && (
//                             <div className="mt-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
//                               <b>DQA correction:</b> {oe.dqaCorrection}
//                             </div>
//                           )}
//                         </div>
//                       );
//                     })}
//                   </div>
//                 )}
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  User,
  ImageIcon,
  Users,
} from "lucide-react";
import { api } from "@/lib/api";
import { StatusBadge } from "./StatusBadge";

/* ============================================================
   TYPES
============================================================ */

interface OERecord {
  rowIndex: number;
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  memberName: string;
  pid: string;
  projectId: string;
  qNumber: string;
  oeResponse: string;
  dqaCorrection: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  approvedBy: string;
  actionTime: string;
  rejectReason: string;
  imageUrl: string;
}

interface DateGroup {
  date: string;
  entries: OERecord[];
  approved: number;
  rejected: number;
  pending: number;
}

/* ============================================================
   HELPERS
============================================================ */

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function daysAgoISO(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDateLabel(date: string): string {
  if (!date) return "Unknown date";
  const d = new Date(date);
  if (isNaN(d.getTime())) return date;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts || "";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

/* ============================================================
   PAGE
============================================================ */

export default function OESubmissionsByDate() {
  const [fromDate, setFromDate] = useState(daysAgoISO(6));
  const [toDate, setToDate] = useState(todayISO());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [userFilter, setUserFilter] = useState("ALL"); // 👈 user tab selection
  const [records, setRecords] = useState<OERecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedText, setExpandedText] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await api<OERecord[]>("getPerformanceOEs", {
        fromDate,
        toDate,
        projectId: "",
        employee: "",
        status: "",
      });
      setRecords(Array.isArray(rows) ? rows : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load submissions.");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------------- user list with counts (from date range) ---------------- */

  const userCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of records) {
      const name = r.memberName || "Unknown";
      counts.set(name, (counts.get(name) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count); // highest first
  }, [records]);

  const totalFromRange = records.length;

  /* ---------------- group by date (with filters) ---------------- */

  const groups = useMemo<DateGroup[]>(() => {
    const q = search.trim().toLowerCase();

    const filtered = records.filter((r) => {
      if (statusFilter !== "ALL" && r.status !== statusFilter) return false;
      if (userFilter !== "ALL" && (r.memberName || "Unknown") !== userFilter)
        return false;
      if (!q) return true;
      return (
        r.memberName?.toLowerCase().includes(q) ||
        r.pid?.toLowerCase().includes(q) ||
        r.qNumber?.toLowerCase().includes(q) ||
        r.oeResponse?.toLowerCase().includes(q)
      );
    });

    const byDate = new Map<string, OERecord[]>();
    for (const r of filtered) {
      const key = r.date || (r.timestamp || "").slice(0, 10) || "unknown";
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key)!.push(r);
    }

    const result: DateGroup[] = [];
    for (const [date, entries] of byDate.entries()) {
      entries.sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      result.push({
        date,
        entries,
        approved: entries.filter((e) => e.status === "APPROVED").length,
        rejected: entries.filter((e) => e.status === "REJECTED").length,
        pending: entries.filter((e) => e.status === "PENDING").length,
      });
    }

    result.sort((a, b) => (a.date < b.date ? 1 : -1));
    return result;
  }, [records, search, statusFilter, userFilter]);

  const totalCount = useMemo(
    () => groups.reduce((sum, g) => sum + g.entries.length, 0),
    [groups]
  );

  const toggleCollapsed = (date: string) =>
    setCollapsed((p) => ({ ...p, [date]: !p[date] }));

  const toggleText = (key: string) =>
    setExpandedText((p) => ({ ...p, [key]: !p[key] }));

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-5xl p-6">
        {/* Header */}
        <div className="mb-6">
          <h4 className="flex items-center gap-2 text-2xl font-bold">
            <Calendar size={22} /> OE Submissions — Date Wise
          </h4>
          <p className="mt-1 text-sm text-slate-500">
            Every OE submitted, grouped by date, showing who submitted it and
            what was submitted.
          </p>
        </div>

        {/* ============ USER TABS (date-wise filtered) ============ */}
        <div className="mb-5 rounded-xl bg-white shadow-sm">
          <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
            <Users size={16} className="text-slate-500" />
            <span className="text-sm font-semibold text-slate-700">
              Filter by User
            </span>
            <span className="text-xs text-slate-400">
              • {totalFromRange} total in date range
            </span>
          </div>

          <div className="flex gap-2 overflow-x-auto p-3">
            {/* All Users tab */}
            <button
              onClick={() => setUserFilter("ALL")}
              className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                userFilter === "ALL"
                  ? "border-blue-600 bg-blue-600 text-white shadow"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span>All Users</span>
              <span
                className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                  userFilter === "ALL"
                    ? "bg-white/25 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {totalFromRange}
              </span>
            </button>

            {/* Individual user tabs */}
            {userCounts.map(({ name, count }) => {
              const isActive = userFilter === name;
              const initial = (name || "U").charAt(0).toUpperCase();
              return (
                <button
                  key={name}
                  onClick={() => setUserFilter(name)}
                  className={`flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-blue-600 bg-blue-600 text-white shadow"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    {initial}
                  </span>
                  <span className="max-w-[140px] truncate">{name}</span>
                  <span
                    className={`inline-flex min-w-[24px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${
                      isActive
                        ? "bg-white/25 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}

            {userCounts.length === 0 && !loading && (
              <span className="px-3 py-2 text-sm text-slate-400">
                No users in this date range
              </span>
            )}
          </div>

          {/* Active filter chip */}
          {userFilter !== "ALL" && (
            <div className="flex items-center gap-2 border-t border-slate-100 px-4 py-2 text-xs">
              <span className="text-slate-500">Showing only:</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 font-semibold text-blue-700">
                {userFilter}
                <button
                  onClick={() => setUserFilter("ALL")}
                  className="ml-0.5 rounded-full px-1 text-blue-700 hover:bg-blue-200"
                  title="Clear filter"
                >
                  ×
                </button>
              </span>
            </div>
          )}
        </div>

        {/* Filters */}
        <div className="mb-5 grid grid-cols-1 gap-3 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              To Date
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
            >
              <option value="ALL">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={load}
              disabled={loading}
              className="h-10 flex-1 rounded-lg bg-blue-600 px-4 font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw
                size={14}
                className={`mr-1.5 inline ${loading ? "animate-spin" : ""}`}
              />
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={16}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by employee, PID, question number, or response text..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-3 text-sm font-semibold text-slate-500">
          {totalCount} submission{totalCount === 1 ? "" : "s"} across{" "}
          {groups.length} day{groups.length === 1 ? "" : "s"}
          {userFilter !== "ALL" && (
            <span className="ml-1 text-blue-600">• filtered by {userFilter}</span>
          )}
        </div>

        {/* Date groups */}
        <div className="space-y-4">
          {groups.length === 0 && !loading && (
            <div className="rounded-xl bg-white p-10 text-center text-slate-400 shadow-sm">
              No submissions found for this range.
            </div>
          )}

          {groups.map((g) => {
            const isCollapsed = !!collapsed[g.date];
            return (
              <div
                key={g.date}
                className="overflow-hidden rounded-xl bg-white shadow-sm"
              >
                {/* Date header */}
                <button
                  onClick={() => toggleCollapsed(g.date)}
                  className="flex w-full items-center justify-between border-b border-slate-100 px-5 py-4 text-left hover:bg-slate-50"
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-base font-bold">
                      {formatDateLabel(g.date)}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
                      {g.entries.length} submitted
                    </span>
                    <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                      {g.approved} approved
                    </span>
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
                      {g.rejected} rejected
                    </span>
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      {g.pending} pending
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronDown size={18} />
                  ) : (
                    <ChevronUp size={18} />
                  )}
                </button>

                {/* Entries */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {g.entries.map((oe) => {
                      const key = `${g.date}-${oe.rowIndex}`;
                      const isLong = (oe.oeResponse || "").length > 220;
                      const isOpen = !!expandedText[key];
                      const text =
                        isLong && !isOpen
                          ? oe.oeResponse.slice(0, 220) + "…"
                          : oe.oeResponse;
                      return (
                        <div key={key} className="px-5 py-4">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 text-sm">
                              <User size={14} className="text-slate-400" />
                              <span className="font-bold">
                                {oe.memberName || "Unknown"}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="text-slate-500">
                                {oe.pid}
                              </span>
                              <span className="text-slate-400">·</span>
                              <span className="font-semibold text-[#e06666]">
                                {oe.qNumber}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-400">
                                {formatTime(oe.timestamp)}
                              </span>
                              <StatusBadge status={oe.status} />
                            </div>
                          </div>

                          <div className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed">
                            {text}
                          </div>
                          {isLong && (
                            <button
                              className="mt-1 text-xs font-semibold text-blue-600 hover:underline"
                              onClick={() => toggleText(key)}
                            >
                              {isOpen ? "Show less" : "Show full response"}
                            </button>
                          )}

                          {oe.imageUrl && (
                            <a
                              href={oe.imageUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
                            >
                              <ImageIcon size={12} /> View screenshot
                            </a>
                          )}

                          {oe.status === "REJECTED" && oe.rejectReason && (
                            <div className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-700">
                              <b>Rejection reason:</b> {oe.rejectReason}
                            </div>
                          )}

                          {oe.dqaCorrection?.trim() && (
                            <div className="mt-2 rounded-md border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs text-purple-700">
                              <b>DQA correction:</b> {oe.dqaCorrection}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}