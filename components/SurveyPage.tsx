// "use client";

// import { useEffect, useState, useCallback, useMemo } from "react";
// import {
//   Upload,
//   Download,
//   Search,
//   Loader2,
//   FileText,
//   FileSpreadsheet,
// } from "lucide-react";
// import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

// interface SurveyItem {
//   _id: string;
//   category: SurveyCategory;
//   accountType?: string;
//   projectNo?: string;
//   panelCode?: string;
//   description?: string;
//   pid?: string;
//   supplierId?: string;
//   country?: string;
//   ip?: string;
//   status?: string;
//   data: Record<string, string>;
//   createdAt: string;
//   updatedAt: string;
// }

// const BULK_PLACEHOLDER = `Paste ONE record like this:
// Age: 34
// Gender: Male
// Company: Acme Inc

// ...or paste MANY records at once, separated by a line of =====:

// GMS 79053 - Contact lenses
// B2C
// Age -32
// Gender -F
// Education-Bachelor degree
// 79054   yi90i90day00ksh South Korea     112.155.135.194 Completed
// ==============================================================================================
// GMS 79053 - Contact lenses
// B2C
// Age -40
// ...`;

// const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {
//   B2B: "bg-blue-100 text-blue-800",
//   B2H: "bg-purple-100 text-purple-800",
//   B2C: "bg-emerald-100 text-emerald-800",
// };

// export default function SurveyPage() {
//   const [activeTab, setActiveTab] = useState<SurveyCategory | "ALL">("ALL");
//   const [items, setItems] = useState<SurveyItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(
//     null
//   );

//   const [paste, setPaste] = useState("");
//   const [message, setMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);

//   const [search, setSearch] = useState("");
//   const [sortBy, setSortBy] = useState("createdAt");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [total, setTotal] = useState(0);

//   const fetchData = useCallback(async () => {
//     try {
//       setLoading(true);
//       const params = new URLSearchParams({
//         page: String(page),
//         limit: "20",
//         sortBy,
//         sortOrder,
//       });
//       if (activeTab !== "ALL") params.set("category", activeTab);
//       if (search.trim()) params.set("search", search.trim());

//       const res = await fetch(`/api/survey?${params}`);
//       const json = await res.json();

//       if (json.success) {
//         setItems(json.data);
//         setTotalPages(json.pagination.totalPages);
//         setTotal(json.pagination.total);
//       }
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setLoading(false);
//     }
//   }, [activeTab, page, sortBy, sortOrder, search]);

//   useEffect(() => {
//     fetchData();
//   }, [fetchData]);

//   // Quick record-count preview so the user can see "this will create N rows"
//   // before hitting save.
//   const blockPreviewCount = useMemo(() => {
//     if (!paste.trim()) return 0;
//     const hasDelimiter = /^\s*=+\s*$/m.test(paste);
//     if (!hasDelimiter) return 1;
//     return paste
//       .split(/^\s*=+\s*$/m)
//       .map((b) => b.trim())
//       .filter(Boolean).length;
//   }, [paste]);

//   const handlePasteSubmit = async () => {
//     if (!paste.trim()) {
//       setMessage({ type: "error", text: "Please paste some data" });
//       return;
//     }

//     try {
//       setSaving(true);
//       setMessage(null);

//       const res = await fetch("/api/survey", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ paste }), // category is auto-detected per block server-side
//       });

//       const json = await res.json();

//       if (json.success) {
//         setMessage({
//           type: "success",
//           text: `${json.message}${
//             json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
//           }`,
//         });
//         setPaste("");
//         fetchData();
//       } else {
//         setMessage({ type: "error", text: json.message || "Save failed" });
//       }
//     } catch (err: any) {
//       setMessage({
//         type: "error",
//         text: err.message || "Something went wrong",
//       });
//     } finally {
//       setSaving(false);
//     }
//   };

//   const handleExport = async () => {
//     try {
//       setExporting(true);
//       const params = new URLSearchParams();
//       if (activeTab !== "ALL") params.set("category", activeTab);

//       const res = await fetch(`/api/survey/export?${params}`);
//       if (!res.ok) throw new Error("Export failed");

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `survey-${activeTab.toLowerCase()}-${Date.now()}.xlsx`;
//       a.click();
//       window.URL.revokeObjectURL(url);
//     } catch (err) {
//       alert("Failed to download Excel");
//     } finally {
//       setExporting(false);
//     }
//   };

//   const handleWorkReport = async (range: "weekly" | "monthly") => {
//     try {
//       setReportLoading(range);
//       const res = await fetch(`/api/survey/work-report?range=${range}`);
//       if (!res.ok) throw new Error("Report generation failed");

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");
//       a.href = url;
//       a.download = `work-report-${range}-${Date.now()}.xlsx`;
//       a.click();
//       window.URL.revokeObjectURL(url);
//     } catch (err) {
//       alert("Failed to generate work report");
//     } finally {
//       setReportLoading(null);
//     }
//   };

//   const insertField = (field: string) => {
//     setPaste((prev) =>
//       prev.trim() ? `${prev.trim()}\n${field}: ` : `${field}: `
//     );
//   };

//   return (
//     <div className="max-w-7xl mx-auto p-6 space-y-8">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-bold text-gray-900">Survey Data Module</h1>
//           <p className="text-gray-500 mt-1">
//             Paste one record, or many at once — category is detected automatically • Export to Excel
//           </p>
//         </div>
//         <div className="flex gap-2">
//           <button
//             onClick={() => handleWorkReport("weekly")}
//             disabled={reportLoading !== null}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
//           >
//             {reportLoading === "weekly" ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <FileSpreadsheet className="w-4 h-4" />
//             )}
//             Weekly Work Report
//           </button>
//           <button
//             onClick={() => handleWorkReport("monthly")}
//             disabled={reportLoading !== null}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
//           >
//             {reportLoading === "monthly" ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <FileSpreadsheet className="w-4 h-4" />
//             )}
//             Monthly Work Report
//           </button>
//           <button
//             onClick={handleExport}
//             disabled={exporting || total === 0}
//             className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
//           >
//             {exporting ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <Download className="w-4 h-4" />
//             )}
//             Download Excel
//           </button>
//         </div>
//       </div>

//       {/* Paste Section — no category picker; every block carries its own B2B/B2H/B2C line */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
//         <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
//           <FileText className="w-5 h-5" />
//           Paste Survey Data
//         </h2>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Paste data — one record, or many separated by a "=====" line
//           </label>
//           <textarea
//             value={paste}
//             onChange={(e) => setPaste(e.target.value)}
//             rows={14}
//             placeholder={BULK_PLACEHOLDER}
//             className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
//           />
//         </div>

//         <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
//           <p className="text-xs text-gray-500">
//             Supported: <code>Key: Value</code> • <code>Key = Value</code> •{" "}
//             <code>Key - Value</code>
//             {blockPreviewCount > 0 && (
//               <span className="ml-2 font-medium text-blue-600">
//                 Will create {blockPreviewCount} record
//                 {blockPreviewCount === 1 ? "" : "s"}
//               </span>
//             )}
//           </p>
//           <button
//             onClick={handlePasteSubmit}
//             disabled={saving}
//             className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
//           >
//             {saving ? (
//               <Loader2 className="w-4 h-4 animate-spin" />
//             ) : (
//               <Upload className="w-4 h-4" />
//             )}
//             Save Data
//           </button>
//         </div>

//         {message && (
//           <div
//             className={`mt-4 p-3 rounded-lg text-sm ${
//               message.type === "success"
//                 ? "bg-green-50 text-green-800"
//                 : "bg-red-50 text-red-800"
//             }`}
//           >
//             {message.text}
//           </div>
//         )}

//         {/* Quick-insert helpers for a single manual entry — B2C fields shown since that
//             covers your live data; swap SUGGESTED_FIELDS.B2C for another category if needed. */}
//         <div className="mt-4 pt-4 border-t">
//           <p className="text-xs font-medium text-gray-500 mb-2">
//             Common fields (click to insert):
//           </p>
//           <div className="flex flex-wrap gap-2">
//             {SUGGESTED_FIELDS.B2C.map((f) => (
//               <button
//                 key={f}
//                 type="button"
//                 onClick={() => insertField(f)}
//                 className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-1 rounded transition-colors"
//               >
//                 {f}
//               </button>
//             ))}
//           </div>
//         </div>
//       </div>

//       {/* Tabs + Records */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 overflow-x-auto">
//           {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => (
//             <button
//               key={tab}
//               onClick={() => {
//                 setActiveTab(tab);
//                 setPage(1);
//               }}
//               className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
//                 activeTab === tab
//                   ? "border-blue-600 text-blue-600"
//                   : "border-transparent text-gray-500 hover:text-gray-700"
//               }`}
//             >
//               {tab}
//             </button>
//           ))}
//         </div>

//         {/* Search + Sort */}
//         <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
//           <div className="relative flex-1">
//             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//             <input
//               type="text"
//               placeholder="Search PID, project no, supplier ID, country, raw text..."
//               value={search}
//               onChange={(e) => {
//                 setSearch(e.target.value);
//                 setPage(1);
//               }}
//               className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div className="flex gap-2">
//             <select
//               value={sortBy}
//               onChange={(e) => setSortBy(e.target.value)}
//               className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//             >
//               <option value="createdAt">Created Date</option>
//               <option value="updatedAt">Updated Date</option>
//               <option value="category">Category</option>
//             </select>
//             <select
//               value={sortOrder}
//               onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
//               className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//             >
//               <option value="desc">Newest first</option>
//               <option value="asc">Oldest first</option>
//             </select>
//           </div>
//         </div>

//         {/* Record cards — every field is shown, nothing truncated */}
//         <div>
//           {loading ? (
//             <div className="flex justify-center py-16">
//               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//             </div>
//           ) : items.length === 0 ? (
//             <div className="text-center py-16 text-gray-500">
//               No records found. Paste some data above.
//             </div>
//           ) : (
//             <div className="divide-y divide-gray-100">
//               {items.map((item) => {
//                 const hasHeader = item.accountType || item.projectNo || item.description;
//                 const hasMeta =
//                   item.pid || item.supplierId || item.country || item.ip || item.status;

//                 return (
//                   <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
//                     {/* Top: category + project header (e.g. "TRN 21382 - TV category") */}
//                     <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <span
//                           className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
//                         >
//                           {item.category}
//                         </span>
//                         {hasHeader && (
//                           <span className="text-sm font-medium text-gray-800">
//                             {[item.accountType, item.projectNo].filter(Boolean).join(" ")}
//                             {item.description ? ` - ${item.description}` : ""}
//                             {item.panelCode ? ` || ${item.panelCode}` : ""}
//                           </span>
//                         )}
//                       </div>
//                       <span className="text-xs text-gray-400 whitespace-nowrap">
//                         {new Date(item.createdAt).toLocaleDateString()}
//                       </span>
//                     </div>

//                     {/* Middle: every data field, unabridged */}
//                     {Object.keys(item.data).length > 0 && (
//                       <div className="flex flex-wrap gap-1.5 mb-2">
//                         {Object.entries(item.data).map(([k, v]) => (
//                           <span
//                             key={k}
//                             className="text-xs bg-gray-100 px-1.5 py-0.5 rounded"
//                           >
//                             <span className="text-gray-500">{k}:</span> {v}
//                           </span>
//                         ))}
//                       </div>
//                     )}

//                     {/* Bottom: response metadata, clearly labeled */}
//                     {hasMeta && (
//                       <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
//                         {item.pid && (
//                           <span>
//                             <span className="text-gray-400">PID:</span> {item.pid}
//                           </span>
//                         )}
//                         {item.supplierId && (
//                           <span>
//                             <span className="text-gray-400">Supplier ID:</span> {item.supplierId}
//                           </span>
//                         )}
//                         {item.country && (
//                           <span>
//                             <span className="text-gray-400">Location:</span> {item.country}
//                           </span>
//                         )}
//                         {item.ip && (
//                           <span>
//                             <span className="text-gray-400">IP:</span> {item.ip}
//                           </span>
//                         )}
//                         {item.status && (
//                           <span>
//                             <span className="text-gray-400">Status:</span> {item.status}
//                           </span>
//                         )}
//                       </div>
//                     )}
//                   </div>
//                 );
//               })}
//             </div>
//           )}
//         </div>

//         {/* Pagination */}
//         {totalPages > 1 && (
//           <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
//             <p className="text-sm text-gray-500">
//               Page {page} of {totalPages} ({total} records)
//             </p>
//             <div className="flex gap-2">
//               <button
//                 disabled={page === 1}
//                 onClick={() => setPage((p) => p - 1)}
//                 className="px-3 py-1 border rounded disabled:opacity-40"
//               >
//                 Previous
//               </button>
//               <button
//                 disabled={page === totalPages}
//                 onClick={() => setPage((p) => p + 1)}
//                 className="px-3 py-1 border rounded disabled:opacity-40"
//               >
//                 Next
//               </button>
//             </div>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Upload,
  Download,
  Search,
  Loader2,
  FileText,
  FileSpreadsheet,
} from "lucide-react";
import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

interface SurveyItem {
  _id: string;
  category: SurveyCategory;
  accountType?: string;
  projectNo?: string;
  panelCode?: string;
  description?: string;
  pid?: string;
  supplierId?: string;
  country?: string;
  ip?: string;
  status?: string;
  data: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

const BULK_PLACEHOLDER = `Paste ONE record like this:
Age: 34
Gender: Male
Company: Acme Inc

...or paste MANY records at once, separated by a line of =====:

GMS 79053 - Contact lenses
B2C
Age -32
Gender -F
Education-Bachelor degree
79054   yi90i90day00ksh South Korea     112.155.135.194 Completed
==============================================================================================
GMS 79053 - Contact lenses
B2C
Age -40
...`;

const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {
  B2B: "bg-blue-100 text-blue-800",
  B2H: "bg-purple-100 text-purple-800",
  B2C: "bg-emerald-100 text-emerald-800",
};

export default function SurveyPage() {
  const [activeTab, setActiveTab] = useState<SurveyCategory | "ALL">("ALL");
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(
    null
  );

  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        sortOrder,
      });
      if (activeTab !== "ALL") params.set("category", activeTab);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/survey?${params}`);
      const json = await res.json();

      if (json.success) {
        setItems(json.data);
        setTotalPages(json.pagination.totalPages);
        setTotal(json.pagination.total);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page, sortBy, sortOrder, search]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Quick record-count preview so the user can see "this will create N rows"
  // before hitting save.
  const blockPreviewCount = useMemo(() => {
    if (!paste.trim()) return 0;
    const hasDelimiter = /^\s*=+\s*$/m.test(paste);
    if (!hasDelimiter) return 1;
    return paste
      .split(/^\s*=+\s*$/m)
      .map((b) => b.trim())
      .filter(Boolean).length;
  }, [paste]);

  const handlePasteSubmit = async () => {
    if (!paste.trim()) {
      setMessage({ type: "error", text: "Please paste some data" });
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const res = await fetch("/api/survey", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paste }), // category is auto-detected per block server-side
      });

      const json = await res.json();

      if (json.success) {
        setMessage({
          type: "success",
          text: `${json.message}${
            json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
          }`,
        });
        setPaste("");
        fetchData();
      } else {
        setMessage({ type: "error", text: json.message || "Save failed" });
      }
    } catch (err: any) {
      setMessage({
        type: "error",
        text: err.message || "Something went wrong",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("category", activeTab);

      const res = await fetch(`/api/survey/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-${activeTab.toLowerCase()}-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to download Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleWorkReport = async (range: "weekly" | "monthly") => {
    try {
      setReportLoading(range);
      const res = await fetch(`/api/survey/work-report?range=${range}`);
      if (!res.ok) throw new Error("Report generation failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-report-${range}-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to generate work report");
    } finally {
      setReportLoading(null);
    }
  };

  const insertField = (field: string) => {
    setPaste((prev) =>
      prev.trim() ? `${prev.trim()}\n${field}: ` : `${field}: `
    );
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Survey Data Module</h1>
          <p className="text-gray-500 mt-1">
            Paste one record, or many at once — category is detected automatically • Export to Excel
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleWorkReport("weekly")}
            disabled={reportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            {reportLoading === "weekly" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Weekly Work Report
          </button>
          <button
            onClick={() => handleWorkReport("monthly")}
            disabled={reportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            {reportLoading === "monthly" ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" />
            )}
            Monthly Work Report
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || total === 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download Excel
          </button>
        </div>
      </div>

      {/* Paste Section — no category picker; every block carries its own B2B/B2H/B2C line */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Paste Survey Data
        </h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Paste data — one record, or many separated by a "=====" line
          </label>
          <textarea
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={14}
            placeholder={BULK_PLACEHOLDER}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
          <p className="text-xs text-gray-500">
            Supported: <code>Key: Value</code> • <code>Key = Value</code> •{" "}
            <code>Key - Value</code>
            {blockPreviewCount > 0 && (
              <span className="ml-2 font-medium text-blue-600">
                Will create {blockPreviewCount} record
                {blockPreviewCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
          <button
            onClick={handlePasteSubmit}
            disabled={saving}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Save Data
          </button>
        </div>

        {message && (
          <div
            className={`mt-4 p-3 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Quick-insert helpers for a single manual entry — B2C fields shown since that
            covers your live data; swap SUGGESTED_FIELDS.B2C for another category if needed. */}
        <div className="mt-4 pt-4 border-t">
          <p className="text-xs font-medium text-gray-500 mb-2">
            Common fields (click to insert):
          </p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_FIELDS.B2C.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => insertField(f)}
                className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-1 rounded transition-colors"
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs + Records */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setPage(1);
              }}
              className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search + Sort */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search PID, project no, supplier ID, country, raw text..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="createdAt">Created Date</option>
              <option value="updatedAt">Updated Date</option>
              <option value="category">Category</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>

        {/* Record cards — every field is shown, nothing truncated */}
        <div>
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No records found. Paste some data above.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map((item) => {
                const hasHeader = item.accountType || item.projectNo || item.description;
                const hasMeta =
                  item.pid || item.supplierId || item.country || item.ip || item.status;

                return (
                  <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
                    {/* Top: category + project header (e.g. "TRN 21382 - TV category") */}
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
                        >
                          {item.category}
                        </span>
                        {hasHeader && (
                          <span className="text-sm font-medium text-gray-800">
                            {[item.accountType, item.projectNo].filter(Boolean).join(" ")}
                            {item.description ? ` - ${item.description}` : ""}
                            {item.panelCode ? ` || ${item.panelCode}` : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Middle: every data field, unabridged */}
                    {Object.keys(item.data).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {Object.entries(item.data).map(([k, v]) => (
                          <span
                            key={k}
                            className="text-xs bg-gray-100 px-1.5 py-0.5 rounded"
                          >
                            <span className="text-gray-500">{k}:</span> {v}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom: response metadata, clearly labeled */}
                    {hasMeta && (
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
                        {item.pid && (
                          <span>
                            <span className="text-gray-400">PID:</span> {item.pid}
                          </span>
                        )}
                        {item.supplierId && (
                          <span>
                            <span className="text-gray-400">Supplier ID:</span> {item.supplierId}
                          </span>
                        )}
                        {item.country && (
                          <span>
                            <span className="text-gray-400">Location:</span> {item.country}
                          </span>
                        )}
                        {item.ip && (
                          <span>
                            <span className="text-gray-400">IP:</span> {item.ip}
                          </span>
                        )}
                        {item.status && (
                          <span>
                            <span className="text-gray-400">Status:</span> {item.status}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Page {page} of {totalPages} ({total} records)
            </p>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border rounded disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
