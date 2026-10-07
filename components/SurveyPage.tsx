


// "use client";

// import { useEffect, useState, useCallback, useMemo } from "react";
// import {
//   Upload,
//   Download,
//   Search,
//   Loader2,
//   FileText,
//   ChevronLeft,
//   ChevronRight,
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

// interface DaySummary {
//   date: string; // "YYYY-MM-DD" in the user's local timezone
//   count: number;
// }

// type ExportRange = "all" | "today" | "weekly" | "monthly" | "custom";

// const BULK_PLACEHOLDER = `Paste ONE record like this:
// Separte using minimum 5 dash "-----"

// Project Name -  GMS 80365 - Engineers
// Study Type - B2B
// Counts - 1
// Industry-  N/A

// TNX Project ID -  N/A
// Parent ID - 80365 
// Child ID - 80365
// Respondent ID - 45fg1erytuNGT30
// Country - United States
// IP Address - N/A
// Status - Completed
// Note - N/A

// ------

// Project Name - GMS 80365 - Engineers
// Study Type - B2B

// TNX Project ID - N/A
// Parent ID - 80365 
// Child ID - 80365
// Respondent ID - wq8et67rewtNGT30
// Country - United States
// IP Address - N/A
// Status - Completed
// Note - N/A

// ...`;

// const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {
//   B2B: "bg-blue-100 text-blue-800",
//   B2H: "bg-purple-100 text-purple-800",
//   B2C: "bg-emerald-100 text-emerald-800",
// };

// // Minutes, JS sign convention (IST = -330). Sent to the API so "day" means the user's local day.
// const getTzOffset = () => String(new Date().getTimezoneOffset());

// const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);

// const pad2 = (n: number) => String(n).padStart(2, "0");
// const toDateKey = (y: number, m: number, d: number) =>
//   `${y}-${pad2(m + 1)}-${pad2(d)}`; // m is 0-based

// const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// interface SurveyPageProps {
//   userId: string;
// }

// export default function SurveyPage({ userId }: SurveyPageProps) {
//   const [activeTab, setActiveTab] = useState<SurveyCategory | "ALL">("ALL");
//   const [items, setItems] = useState<SurveyItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const [uploadDate, setUploadDate] = useState("");

//   const [exportRange, setExportRange] = useState<ExportRange>("all");
//   const [exportStartDate, setExportStartDate] = useState("");
//   const [exportEndDate, setExportEndDate] = useState("");
//   const [showExportOptions, setShowExportOptions] = useState(false);

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
//   const [categoryCounts, setCategoryCounts] = useState({
//     B2B: 0,
//     B2H: 0,
//     B2C: 0,
//   });

//   // Day-wise browsing
//   const [days, setDays] = useState<DaySummary[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);
//   const [viewMonth, setViewMonth] = useState(() => {
//     const n = new Date();
//     return new Date(n.getFullYear(), n.getMonth(), 1);
//   });

//   // const fetchCategoryCounts = useCallback(async () => {
//   //   try {
//   //     const categories = ["B2B", "B2H", "B2C"] as const;

//   //     const results = await Promise.all(
//   //       categories.map(async (category) => {
//   //         const params = new URLSearchParams({
//   //           page: "1",
//   //           limit: "1",
//   //           sortBy: "createdAt",
//   //           sortOrder: "desc",
//   //           createdBy: userId,
//   //           category,
//   //         });

//   //         if (search.trim()) {
//   //           params.set("search", search.trim());
//   //         }

//   //         const res = await fetch(`/api/survey?${params.toString()}`);

//   //         if (!res.ok) {
//   //           throw new Error(`Failed to fetch ${category} count`);
//   //         }

//   //         const json = await res.json();

//   //         return {
//   //           category,
//   //           count: json.success ? json.pagination?.total || 0 : 0,
//   //         };
//   //       })
//   //     );

//   //     setCategoryCounts({
//   //       B2B: results.find((r) => r.category === "B2B")?.count || 0,
//   //       B2H: results.find((r) => r.category === "B2H")?.count || 0,
//   //       B2C: results.find((r) => r.category === "B2C")?.count || 0,
//   //     });
//   //   } catch (error) {
//   //     console.error("Failed to fetch category counts:", error);
//   //   }
//   // }, [userId, search]);

//   const fetchCategoryCounts = useCallback(async () => {
//     try {
//       const categories = ["B2B", "B2H", "B2C"] as const;

//       const results = await Promise.all(
//         categories.map(async (category) => {
//           const params = new URLSearchParams({
//             page: "1",
//             limit: "1",
//             sortBy: "createdAt",
//             sortOrder: "desc",
//             createdBy: userId,
//             category,
//           });

//           if (search.trim()) {
//             params.set("search", search.trim());
//           }

//           const res = await fetch(`/api/survey?${params.toString()}`);

//           if (!res.ok) {
//             throw new Error(`Failed to fetch ${category} count`);
//           }

//           const json = await res.json();

//           // Use sum of Counts field; fall back to row count
//           const count = json.success
//             ? (json.pagination?.totalCounts ??
//                json.pagination?.total ??
//                0)
//             : 0;

//           return {
//             category,
//             count,
//           };
//         })
//       );

//       setCategoryCounts({
//         B2B: results.find((r) => r.category === "B2B")?.count || 0,
//         B2H: results.find((r) => r.category === "B2H")?.count || 0,
//         B2C: results.find((r) => r.category === "B2C")?.count || 0,
//       });
//     } catch (error) {
//       console.error("Failed to fetch category counts:", error);
//     }
//   }, [userId, search]);

//   const fetchDays = useCallback(async () => {
//     try {
//       const params = new URLSearchParams({
//         createdBy: userId,
//         tzOffset: getTzOffset(),
//       });

//       if (activeTab !== "ALL") params.set("category", activeTab);
//       if (search.trim()) params.set("search", search.trim());

//       const res = await fetch(`/api/survey/days?${params.toString()}`);
//       const json = await res.json();

//       setDays(json.success ? json.data : []);
//     } catch (err) {
//       console.error("Failed to fetch days:", err);
//       setDays([]);
//     }
//   }, [userId, activeTab, search]);

//   const fetchData = useCallback(async () => {
//     try {
//       setLoading(true);

//       const params = new URLSearchParams({
//         page: selectedDate ? "1" : String(page),
//         limit: selectedDate ? "1000" : "20", // a selected day loads all its records
//         sortBy,
//         sortOrder,
//         createdBy: userId, // only this user's records
//       });

//       if (activeTab !== "ALL") {
//         params.set("category", activeTab);
//       }

//       if (search.trim()) {
//         params.set("search", search.trim());
//       }

//       if (selectedDate) {
//         params.set("date", selectedDate);
//         params.set("tzOffset", getTzOffset());
//       }

//       const res = await fetch(`/api/survey?${params.toString()}`);
//       const json = await res.json();

//       if (json.success) {
//         setItems(json.data);
//         setTotalPages(json.pagination.totalPages);
//         setTotal(json.pagination.total);
//       } else {
//         console.error("Survey API error:", json.message);
//         setItems([]);
//         setTotalPages(1);
//         setTotal(0);
//       }
//     } catch (err) {
//       console.error("Failed to fetch survey data:", err);
//       setItems([]);
//       setTotalPages(1);
//       setTotal(0);
//     } finally {
//       setLoading(false);
//     }
//   }, [userId, activeTab, page, sortBy, sortOrder, search, selectedDate]);

//   useEffect(() => {
//     fetchData();
//     fetchCategoryCounts();
//     fetchDays();
//   }, [fetchData, fetchCategoryCounts, fetchDays]);

//   // date -> submitted count, used by the calendar
//   const dayCountMap = useMemo(() => {
//     const map: Record<string, number> = {};
//     days.forEach((d) => {
//       map[d.date] = d.count;
//     });
//     return map;
//   }, [days]);

//   // Calendar cells for the visible month (null = leading blank cell)
//   const calendarCells = useMemo(() => {
//     const y = viewMonth.getFullYear();
//     const m = viewMonth.getMonth();
//     const firstWeekday = new Date(y, m, 1).getDay();
//     const daysInMonth = new Date(y, m + 1, 0).getDate();

//     const cells: ({ day: number; key: string; count: number } | null)[] = [];
//     for (let i = 0; i < firstWeekday; i++) cells.push(null);
//     for (let d = 1; d <= daysInMonth; d++) {
//       const key = toDateKey(y, m, d);
//       cells.push({ day: d, key, count: dayCountMap[key] || 0 });
//     }
//     return cells;
//   }, [viewMonth, dayCountMap]);

//   const monthTotal = useMemo(
//     () => calendarCells.reduce((sum, c) => sum + (c?.count || 0), 0),
//     [calendarCells]
//   );

//   const todayKey = useMemo(() => {
//     const n = new Date();
//     return toDateKey(n.getFullYear(), n.getMonth(), n.getDate());
//   }, []);

//   const changeMonth = (delta: number) =>
//     setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));

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
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           paste,
//           surveyDate: uploadDate || undefined,
//         }),
//       });

//       const json = await res.json();

//       // if (json.success) {
//       //   setMessage({
//       //     type: "success",
//       //     text: `${json.message}${
//       //       json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
//       //     }`,
//       //   });
//       //   setPaste("");
//       //   fetchData();
//       //   fetchCategoryCounts();
//       //   fetchDays();
//       // } 
//       if (json.success) {
//   setMessage({
//     type: "success",
//     text: `${json.message}${
//       uploadDate ? ` for ${uploadDate}` : ""
//     }${json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""}`,
//   });

//   if (uploadDate) {
//     const [y, m] = uploadDate.split("-").map(Number);
//     setViewMonth(new Date(y, m - 1, 1));
//   }

//   setPaste("");
//   setUploadDate("");
//   fetchData();
//   fetchCategoryCounts();
//   fetchDays();
// }
      
//       else {
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
//       if (exportRange === "custom") {
//         if (!exportStartDate || !exportEndDate) {
//           alert("Please select both start date and end date.");
//           return;
//         }

//         if (exportStartDate > exportEndDate) {
//           alert("Start date cannot be after end date.");
//           return;
//         }
//       }

//       setExporting(true);

//       const params = new URLSearchParams();

//       if (activeTab !== "ALL") {
//         params.set("category", activeTab);
//       }

//       params.set("range", exportRange);

//       if (exportRange === "custom") {
//         params.set("startDate", exportStartDate);
//         params.set("endDate", exportEndDate);
//       }

//       const res = await fetch(`/api/survey/export?${params.toString()}`, {
//         method: "GET",
//         cache: "no-store",
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("Export error:", errorText);
//         throw new Error("Export failed");
//       }

//       const blob = await res.blob();
//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");

//       const rangeName =
//         exportRange === "custom"
//           ? `${exportStartDate}-to-${exportEndDate}`
//           : exportRange;

//       a.href = url;
//       a.download = `survey-${activeTab.toLowerCase()}-${rangeName}.xlsx`;

//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);

//       setShowExportOptions(false);
//     } catch (error) {
//       console.error(error);
//       alert("Failed to download Excel. Please try again.");
//     } finally {
//       setExporting(false);
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
//           <h4 className="text-2xl font-bold text-gray-900">Survey Data Module</h4>
//           <p className="text-gray-500 mt-1">
//             Paste one record, or many at once — category is detected automatically • Export to Excel
//           </p>
//         </div>

//         <div className="relative">
//           <button
//             onClick={() => setShowExportOptions((prev) => !prev)}
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

//           {showExportOptions && (
//             <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4">
//               <div className="mb-4">
//                 <h3 className="text-sm font-semibold text-gray-900">
//                   Export Data
//                 </h3>
//                 <p className="text-xs text-gray-500 mt-1">
//                   Select the data period you want to export.
//                 </p>
//               </div>

//               {/* Range */}
//               <div className="space-y-2">
//                 <label className="text-xs font-medium text-gray-700">
//                   Date Range
//                 </label>

//                 <select
//                   value={exportRange}
//                   onChange={(e) => setExportRange(e.target.value as ExportRange)}
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
//                 >
//                   <option value="all">All Data</option>
//                   <option value="today">Today</option>
//                   <option value="weekly">This Week</option>
//                   <option value="monthly">This Month</option>
//                   <option value="custom">Custom Date Range</option>
//                 </select>
//               </div>

//               {/* Custom dates */}
//               {exportRange === "custom" && (
//                 <div className="grid grid-cols-2 gap-3 mt-4">
//                   <div>
//                     <label className="block text-xs font-medium text-gray-700 mb-1">
//                       From
//                     </label>
//                     <input
//                       type="date"
//                       value={exportStartDate}
//                       onChange={(e) => setExportStartDate(e.target.value)}
//                       className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
//                     />
//                   </div>

//                   <div>
//                     <label className="block text-xs font-medium text-gray-700 mb-1">
//                       To
//                     </label>
//                     <input
//                       type="date"
//                       value={exportEndDate}
//                       onChange={(e) => setExportEndDate(e.target.value)}
//                       className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"
//                     />
//                   </div>
//                 </div>
//               )}

//               {/* Current selection */}
//               <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">
//                 <div className="text-xs text-gray-500">Exporting</div>

//                 <div className="text-sm font-medium text-gray-900 mt-1">
//                   {activeTab === "ALL" ? "All Categories" : activeTab}
//                 </div>

//                 <div className="text-xs text-gray-500 mt-1">
//                   {exportRange === "all" && "All available records"}
//                   {exportRange === "today" && "Today's records"}
//                   {exportRange === "weekly" && "Current week's records"}
//                   {exportRange === "monthly" && "Current month's records"}
//                   {exportRange === "custom" &&
//                     exportStartDate &&
//                     exportEndDate &&
//                     `${exportStartDate} → ${exportEndDate}`}
//                 </div>
//               </div>

//               {/* Buttons */}
//               <div className="flex gap-2 mt-4">
//                 <button
//                   type="button"
//                   onClick={() => setShowExportOptions(false)}
//                   className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="button"
//                   onClick={handleExport}
//                   disabled={exporting}
//                   className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"
//                 >
//                   {exporting && <Loader2 className="w-4 h-4 animate-spin" />}
//                   Export
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>

//       <div className="flex flex-wrap items-end gap-3 mb-4">
//   <div>
//     <label className="block text-sm font-medium text-gray-700 mb-1">
//       Upload for date
//     </label>
//     <input
//       type="date"
//       value={uploadDate}
//       max={todayKey}
//       onChange={(e) => setUploadDate(e.target.value)}
//       className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
//     />
//   </div>

//   {uploadDate ? (
//     <>
//       <button
//         type="button"
//         onClick={() => setUploadDate("")}
//         className="text-xs text-blue-600 hover:underline pb-2.5"
//       >
//         Reset to today
//       </button>
//       <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
//         Records will be saved under{" "}
//         <strong>
//           {parseLocalDate(uploadDate).toLocaleDateString("en-GB", {
//             day: "2-digit",
//             month: "short",
//             year: "numeric",
//           })}
//         </strong>
//       </span>
//     </>
//   ) : (
//     <span className="text-xs text-gray-500 pb-2.5">
//       Leave empty to save under today's date
//     </span>
//   )}
// </div>

//       {/* Paste Section — no category picker; every block carries its own B2B/B2H/B2C line */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
//         <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
//           <FileText className="w-5 h-5" />
//           Paste Survey Data
//         </h2>

//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">
//             Paste data — Separte data using minimum 5 dash "-----"
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

//       {/* Count Summary — record totals by survey category */}
//       <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
//         {[
//           { label: "Total Records", value: categoryCounts.B2B + categoryCounts.B2H + categoryCounts.B2C },
//           { label: "B2B Records", value: categoryCounts.B2B },
//           { label: "B2H Records", value: categoryCounts.B2H },
//           { label: "B2C Records", value: categoryCounts.B2C },
//         ].map((card) => (
//           <div
//             key={card.label}
//             className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"
//           >
//             <p className="text-xs font-medium text-gray-500">{card.label}</p>
//             <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
//           </div>
//         ))}
//       </div>

//       {/* Tabs + Records */}
//       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//         {/* Tabs */}
//         <div className="flex border-b border-gray-200 overflow-x-auto">
//           {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
//             const count =
//               tab === "ALL"
//                 ? categoryCounts.B2B + categoryCounts.B2H + categoryCounts.B2C
//                 : categoryCounts[tab];

//             return (
//               <button
//                 key={tab}
//                 onClick={() => {
//                   setActiveTab(tab);
//                   setPage(1);
//                 }}
//                 className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
//                   activeTab === tab
//                     ? "border-blue-600 text-blue-600"
//                     : "border-transparent text-gray-500 hover:text-gray-700"
//                 }`}
//               >
//                 {tab}
//                 <span
//                   className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${
//                     activeTab === tab
//                       ? "bg-blue-100 text-blue-700"
//                       : "bg-gray-100 text-gray-600"
//                   }`}
//                 >
//                   {count}
//                 </span>
//               </button>
//             );
//           })}
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

//         {/* Calendar: month view with total submitted per date */}
//         <div className="px-4 py-4 border-b border-gray-100">
//           <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
//             <div className="flex items-center gap-2">
//               <button
//                 type="button"
//                 onClick={() => changeMonth(-1)}
//                 className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
//                 aria-label="Previous month"
//               >
//                 <ChevronLeft className="w-4 h-4" />
//               </button>

//               <h3 className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">
//                 {viewMonth.toLocaleDateString("en-GB", {
//                   month: "long",
//                   year: "numeric",
//                 })}
//               </h3>

//               <button
//                 type="button"
//                 onClick={() => changeMonth(1)}
//                 className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
//                 aria-label="Next month"
//               >
//                 <ChevronRight className="w-4 h-4" />
//               </button>

//               <button
//                 type="button"
//                 onClick={() => {
//                   const n = new Date();
//                   setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));
//                 }}
//                 className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
//               >
//                 This month
//               </button>
//             </div>

//             <div className="flex items-center gap-3">
//               <span className="text-xs text-gray-500">
//                 Month total:{" "}
//                 <span className="font-semibold text-black">{monthTotal}</span>
//               </span>
//               {selectedDate && (
//                 <button
//                   onClick={() => {
//                     setSelectedDate(null);
//                     setPage(1);
//                   }}
//                   className="text-xs text-blue-600 hover:underline"
//                 >
//                   Clear day filter
//                 </button>
//               )}
//             </div>
//           </div>

//           <div className="overflow-x-auto">
//             <div className="min-w-[480px]">
//               <div className="grid grid-cols-7 gap-1 mb-1">
//                 {WEEKDAYS.map((w) => (
//                   <div
//                     key={w}
//                     className="text-center text-xs font-medium text-black py-1"
//                   >
//                     {w}
//                   </div>
//                 ))}
//               </div>

//               <div className="grid grid-cols-7 gap-1">
//                 {/* {calendarCells.map((cell, i) => {
//                   if (!cell) return <div key={`blank-${i}`} />;

//                   const active = selectedDate === cell.key;
//                   const isToday = cell.key === todayKey;
//                   const hasData = cell.count > 0;

//                   return (
//                     <button
//                       key={cell.key}
//                       type="button"
//                       disabled={!hasData}
//                       onClick={() => {
//                         setSelectedDate(active ? null : cell.key);
//                         setPage(1);
//                       }}
//                       className={`h-16 rounded-lg border p-1.5 text-left flex flex-col justify-between transition-colors ${
//                         active
//                           ? "bg-blue-600 border-blue-600 text-white"
//                           : hasData
//                           ? "bg-blue-50 border-blue-100 text-gray-800 hover:bg-blue-100"
//                           : "bg-white border-gray-100 text-black cursor-default"
//                       } ${isToday && !active ? "ring-2 ring-blue-400" : ""}`}
//                     >
//                       <span className="text-xs font-medium">{cell.day}</span>
//                       {hasData && (
//                         <span
//                           className={`self-end text-xs font-semibold rounded-full px-1.5 ${
//                             active
//                               ? "bg-white text-blue-700"
//                               : "bg-blue-600 text-white"
//                           }`}
//                         >
//                           {cell.count}
//                         </span>
//                       )}
//                     </button>
//                   );
//                 })} */}
//                 {calendarCells.map((cell, i) => {
//   if (!cell) return <div key={`blank-${i}`} />;

//   const active = selectedDate === cell.key;
//   const isToday = cell.key === todayKey;
//   const hasData = cell.count > 0;
//   const isPastOrToday = cell.key <= todayKey; // "YYYY-MM-DD" strings compare correctly
//   const notSubmitted = !hasData && isPastOrToday;

//   return (
//     <button
//       key={cell.key}
//       type="button"
//       disabled={!hasData}
//       onClick={() => {
//         setSelectedDate(active ? null : cell.key);
//         setPage(1);
//       }}
//       className={`h-16 rounded-lg border p-1.5 text-left flex flex-col justify-between transition-colors ${
//         active
//           ? "bg-blue-600 border-blue-600 text-white"
//           : hasData
//           ? "bg-blue-50 border-blue-100 text-gray-800 hover:bg-blue-100"
//           : notSubmitted
//           ? "bg-red-50 border-red-100 text-gray-800 cursor-default"
//           : "bg-white border-gray-100 text-gray-400 cursor-default"
//       } ${isToday && !active ? "ring-2 ring-blue-400" : ""}`}
//     >
//       <span className="text-xs font-medium">{cell.day}</span>

//       {hasData && (
//         <span
//           className={`self-end text-xs font-semibold rounded-full px-1.5 ${
//             active ? "bg-white text-blue-700" : "bg-blue-600 text-white"
//           }`}
//         >
//           {cell.count}
//         </span>
//       )}

//       {notSubmitted && (
//         <span className="text-[10px] leading-tight font-medium text-red-600">
//           Not submitted
//         </span>
//       )}
//     </button>
//   );
// })}
//               </div>
//             </div>
//           </div>
//         </div>

//         {selectedDate && (
//           <div className="px-4 py-2 bg-blue-50 text-sm text-blue-800 border-b border-blue-100">
//             Showing all {total} records for{" "}
//             <strong>
//               {parseLocalDate(selectedDate).toLocaleDateString("en-GB", {
//                 weekday: "long",
//                 day: "2-digit",
//                 month: "long",
//                 year: "numeric",
//               })}
//             </strong>
//           </div>
//         )}

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
//                 const hasHeader =
//                   item.accountType || item.projectNo || item.description;

//                 // The pasted field "Counts" is the data-count value for this record.
//                 // Keep it separate from category/record totals so "Counts: 1"
//                 // is shown exactly as the source data provides it.
//                 const countsEntry = Object.entries(item.data || {}).find(
//                   ([key]) => key.trim().toLowerCase() === "counts"
//                 );
//                 const recordCounts = countsEntry?.[1];
//                 const hasMeta =
//                   item.pid ||
//                   item.supplierId ||
//                   item.country ||
//                   item.ip ||
//                   item.status;

//                 return (
//                   <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
//                     {/* Top: category + project header */}
//                     <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
//                       <div className="flex items-center gap-2 flex-wrap">
//                         <span
//                           className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
//                         >
//                           {item.category}
//                         </span>
//                         {hasHeader && (
//                           <span className="text-sm font-medium text-gray-800">
//                             {[item.accountType, item.projectNo]
//                               .filter(Boolean)
//                               .join(" ")}
//                             {item.description ? ` - ${item.description}` : ""}
//                             {item.panelCode ? ` || ${item.panelCode}` : ""}
//                           </span>
//                         )}
//                       </div>
//                       <span className="text-xs text-gray-400 whitespace-nowrap">
//                         {new Date(item.createdAt).toLocaleDateString("en-GB", {
//                           weekday: "short",
//                           day: "2-digit",
//                           month: "short",
//                           year: "numeric",
//                         })}
//                         {", "}
//                         {new Date(item.createdAt).toLocaleTimeString("en-GB", {
//                           hour: "2-digit",
//                           minute: "2-digit",
//                         })}
//                       </span>
//                     </div>

//                     {/* The source "Counts" field for this record */}
//                     {recordCounts !== undefined && (
//                       <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm">
//                         <span className="font-medium text-blue-700">Data Count:</span>
//                         <span className="font-bold text-blue-900">{recordCounts}</span>
//                       </div>
//                     )}

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

//                     {/* Bottom: response metadata */}
//                     {hasMeta && (
//                       <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
//                         {item.pid && (
//                           <span>
//                             <span className="text-gray-400">PID:</span> {item.pid}
//                           </span>
//                         )}
//                         {item.supplierId && (
//                           <span>
//                             <span className="text-gray-400">Supplier ID:</span>{" "}
//                             {item.supplierId}
//                           </span>
//                         )}
//                         {item.country && (
//                           <span>
//                             <span className="text-gray-400">Location:</span>{" "}
//                             {item.country}
//                           </span>
//                         )}
//                         {item.ip && (
//                           <span>
//                             <span className="text-gray-400">IP:</span> {item.ip}
//                           </span>
//                         )}
//                         {item.status && (
//                           <span>
//                             <span className="text-gray-400">Status:</span>{" "}
//                             {item.status}
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

//         {/* Pagination — hidden when a single day is selected (all its records are shown) */}
//         {!selectedDate && totalPages > 1 && (
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

  ChevronLeft,

  ChevronRight,
  Trash2

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

  surveyDate?: string;

  date?: string;

  submittedDate?: string;

}



interface DaySummary {

  date: string; // "YYYY-MM-DD" in the user's local timezone

  count: number;

}



type ExportRange = "all" | "today" | "weekly" | "monthly" | "custom";



const BULK_PLACEHOLDER = `Paste ONE record like this:

Separte using minimum 5 dash "-----"



Project Name -  GMS 80365 - Engineers

Study Type - B2B

Counts - 1

Industry-  N/A



TNX Project ID -  N/A

Parent ID - 80365 

Child ID - 80365

Respondent ID - 45fg1erytuNGT30

Country - United States

IP Address - N/A

Status - Completed

Note - N/A



------



Project Name - GMS 80365 - Engineers

Study Type - B2B



TNX Project ID - N/A

Parent ID - 80365 

Child ID - 80365

Respondent ID - wq8et67rewtNGT30

Country - United States

IP Address - N/A

Status - Completed

Note - N/A



...`;



const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {

  B2B: "bg-blue-100 text-blue-800",

  B2H: "bg-purple-100 text-purple-800",

  B2C: "bg-emerald-100 text-emerald-800",

};



// Minutes, JS sign convention (IST = -330). Sent to the API so "day" means the user's local day.

const getTzOffset = () => String(new Date().getTimezoneOffset());



const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);



const pad2 = (n: number) => String(n).padStart(2, "0");

const toDateKey = (y: number, m: number, d: number) =>

  `${y}-${pad2(m + 1)}-${pad2(d)}`; // m is 0-based



const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];



interface SurveyPageProps {

  userId: string;

}



export default function SurveyPage({ userId }: SurveyPageProps) {

  const [activeTab, setActiveTab] = useState<SurveyCategory | "ALL">("ALL");

  const [items, setItems] = useState<SurveyItem[]>([]);

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [exporting, setExporting] = useState(false);

  const [uploadDate, setUploadDate] = useState("");



  const [exportRange, setExportRange] = useState<ExportRange>("all");

  const [exportStartDate, setExportStartDate] = useState("");

  const [exportEndDate, setExportEndDate] = useState("");

  const [showExportOptions, setShowExportOptions] = useState(false);



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
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [categoryCounts, setCategoryCounts] = useState({

    B2B: 0,

    B2H: 0,

    B2C: 0,

  });



  // Day-wise browsing

  const [days, setDays] = useState<DaySummary[]>([]);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const [viewMonth, setViewMonth] = useState(() => {

    const n = new Date();

    return new Date(n.getFullYear(), n.getMonth(), 1);

  });



  // const fetchCategoryCounts = useCallback(async () => {

  //   try {

  //     const categories = ["B2B", "B2H", "B2C"] as const;



  //     const results = await Promise.all(

  //       categories.map(async (category) => {

  //         const params = new URLSearchParams({

  //           page: "1",

  //           limit: "1",

  //           sortBy: "createdAt",

  //           sortOrder: "desc",

  //           createdBy: userId,

  //           category,

  //         });



  //         if (search.trim()) {

  //           params.set("search", search.trim());

  //         }



  //         const res = await fetch(`/api/survey?${params.toString()}`);



  //         if (!res.ok) {

  //           throw new Error(`Failed to fetch ${category} count`);

  //         }



  //         const json = await res.json();



  //         return {

  //           category,

  //           count: json.success ? json.pagination?.total || 0 : 0,

  //         };

  //       })

  //     );



  //     setCategoryCounts({

  //       B2B: results.find((r) => r.category === "B2B")?.count || 0,

  //       B2H: results.find((r) => r.category === "B2H")?.count || 0,

  //       B2C: results.find((r) => r.category === "B2C")?.count || 0,

  //     });

  //   } catch (error) {

  //     console.error("Failed to fetch category counts:", error);

  //   }

  // }, [userId, search]);



  const fetchCategoryCounts = useCallback(async () => {

    try {

      const categories = ["B2B", "B2H", "B2C"] as const;



      const results = await Promise.all(

        categories.map(async (category) => {

          const params = new URLSearchParams({

            page: "1",

            limit: "1",

            sortBy: "createdAt",

            sortOrder: "desc",

            createdBy: userId,

            category,

          });



          if (search.trim()) {

            params.set("search", search.trim());

          }



          const res = await fetch(`/api/survey?${params.toString()}`);



          if (!res.ok) {

            throw new Error(`Failed to fetch ${category} count`);

          }



          const json = await res.json();



          // Use sum of Counts field; fall back to row count

          const count = json.success

            ? (json.pagination?.totalCounts ??

               json.pagination?.total ??

               0)

            : 0;



          return {

            category,

            count,

          };

        })

      );



      setCategoryCounts({

        B2B: results.find((r) => r.category === "B2B")?.count || 0,

        B2H: results.find((r) => r.category === "B2H")?.count || 0,

        B2C: results.find((r) => r.category === "B2C")?.count || 0,

      });

    } catch (error) {

      console.error("Failed to fetch category counts:", error);

    }

  }, [userId, search]);



  const fetchDays = useCallback(async () => {

    try {

      const params = new URLSearchParams({

        createdBy: userId,

        tzOffset: getTzOffset(),

      });



      if (activeTab !== "ALL") params.set("category", activeTab);

      if (search.trim()) params.set("search", search.trim());



      const res = await fetch(`/api/survey/days?${params.toString()}`);

      const json = await res.json();



      setDays(json.success ? json.data : []);

    } catch (err) {

      console.error("Failed to fetch days:", err);

      setDays([]);

    }

  }, [userId, activeTab, search]);



  const fetchData = useCallback(async () => {

    try {

      setLoading(true);



      const params = new URLSearchParams({

        page: selectedDate ? "1" : String(page),

        limit: selectedDate ? "1000" : "20", // a selected day loads all its records

        sortBy,

        sortOrder,

        createdBy: userId, // only this user's records

      });



      if (activeTab !== "ALL") {

        params.set("category", activeTab);

      }



      if (search.trim()) {

        params.set("search", search.trim());

      }



      if (selectedDate) {

        params.set("date", selectedDate);

        params.set("tzOffset", getTzOffset());

      }



      const res = await fetch(`/api/survey?${params.toString()}`);

      const json = await res.json();



      if (json.success) {
        let nextItems: SurveyItem[] = Array.isArray(json.data) ? json.data : [];

        // Always enforce the selected calendar day on the client as a safety net.
        // This prevents records from another day from appearing if the API date
        // filter is missing/incorrect.
        if (selectedDate) {
          const getItemDateKey = (item: SurveyItem): string => {
            const explicitDate =
              item.surveyDate || item.date || item.submittedDate;

            if (explicitDate) {
              const value = String(explicitDate);
              if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

              const parsed = new Date(value);
              if (!Number.isNaN(parsed.getTime())) {
                return toDateKey(
                  parsed.getFullYear(),
                  parsed.getMonth(),
                  parsed.getDate()
                );
              }
            }

            const created = new Date(item.createdAt);
            if (Number.isNaN(created.getTime())) return "";

            return toDateKey(
              created.getFullYear(),
              created.getMonth(),
              created.getDate()
            );
          };

          nextItems = nextItems.filter(
            (item) => getItemDateKey(item) === selectedDate
          );
        }

        setItems(nextItems);
        setTotal(
          selectedDate
            ? nextItems.length
            : (json.pagination?.total ?? nextItems.length)
        );
        setTotalPages(
          selectedDate ? 1 : (json.pagination?.totalPages ?? 1)
        );
      } else {

        console.error("Survey API error:", json.message);

        setItems([]);

        setTotalPages(1);

        setTotal(0);

      }

    } catch (err) {

      console.error("Failed to fetch survey data:", err);

      setItems([]);

      setTotalPages(1);

      setTotal(0);

    } finally {

      setLoading(false);

    }

  }, [userId, activeTab, page, sortBy, sortOrder, search, selectedDate]);



  useEffect(() => {

    fetchData();

    fetchCategoryCounts();

    fetchDays();

  }, [fetchData, fetchCategoryCounts, fetchDays]);



  // date -> submitted count, used by the calendar

  const dayCountMap = useMemo(() => {

    const map: Record<string, number> = {};

    days.forEach((d) => {

      map[d.date] = d.count;

    });

    return map;

  }, [days]);



  // Calendar cells for the visible month (null = leading blank cell)

  const calendarCells = useMemo(() => {

    const y = viewMonth.getFullYear();

    const m = viewMonth.getMonth();

    const firstWeekday = new Date(y, m, 1).getDay();

    const daysInMonth = new Date(y, m + 1, 0).getDate();



    const cells: ({ day: number; key: string; count: number } | null)[] = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);

    for (let d = 1; d <= daysInMonth; d++) {

      const key = toDateKey(y, m, d);

      cells.push({ day: d, key, count: dayCountMap[key] || 0 });

    }

    return cells;

  }, [viewMonth, dayCountMap]);



  const monthTotal = useMemo(

    () => calendarCells.reduce((sum, c) => sum + (c?.count || 0), 0),

    [calendarCells]

  );



  const todayKey = useMemo(() => {

    const n = new Date();

    return toDateKey(n.getFullYear(), n.getMonth(), n.getDate());

  }, []);



  const changeMonth = (delta: number) =>

    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));



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

        headers: {

          "Content-Type": "application/json",

        },

        body: JSON.stringify({

          paste,

          surveyDate: uploadDate || undefined,

        }),

      });



      const json = await res.json();



      // if (json.success) {

      //   setMessage({

      //     type: "success",

      //     text: `${json.message}${

      //       json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""

      //     }`,

      //   });

      //   setPaste("");

      //   fetchData();

      //   fetchCategoryCounts();

      //   fetchDays();

      // } 

      if (json.success) {

  setMessage({

    type: "success",

    text: `${json.message}${

      uploadDate ? ` for ${uploadDate}` : ""

    }${json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""}`,

  });



  if (uploadDate) {

    const [y, m] = uploadDate.split("-").map(Number);

    setViewMonth(new Date(y, m - 1, 1));

  }



  setPaste("");

  setUploadDate("");

  fetchData();

  fetchCategoryCounts();

  fetchDays();

}



      else {

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



  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this survey record? This action cannot be undone."
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);

      const res = await fetch(
        `/api/survey?id=${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          cache: "no-store",
        }
      );

      const json = await res.json().catch(() => ({}));

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to delete survey record");
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
      setTotal((prev) => Math.max(0, prev - 1));

      await Promise.all([fetchCategoryCounts(), fetchDays()]);
    } catch (err: any) {
      console.error("Delete survey error:", err);
      setMessage({
        type: "error",
        text: err.message || "Failed to delete survey record",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const handleExport = async () => {

    try {

      if (exportRange === "custom") {

        if (!exportStartDate || !exportEndDate) {

          alert("Please select both start date and end date.");

          return;

        }



        if (exportStartDate > exportEndDate) {

          alert("Start date cannot be after end date.");

          return;

        }

      }



      setExporting(true);



      const params = new URLSearchParams();



      if (activeTab !== "ALL") {

        params.set("category", activeTab);

      }



      params.set("range", exportRange);



      if (exportRange === "custom") {

        params.set("startDate", exportStartDate);

        params.set("endDate", exportEndDate);

      }



      const res = await fetch(`/api/survey/export?${params.toString()}`, {

        method: "GET",

        cache: "no-store",

      });



      if (!res.ok) {

        const errorText = await res.text();

        console.error("Export error:", errorText);

        throw new Error("Export failed");

      }



      const blob = await res.blob();

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");



      const rangeName =

        exportRange === "custom"

          ? `${exportStartDate}-to-${exportEndDate}`

          : exportRange;



      a.href = url;

      a.download = `survey-${activeTab.toLowerCase()}-${rangeName}.xlsx`;



      document.body.appendChild(a);

      a.click();

      a.remove();

      window.URL.revokeObjectURL(url);



      setShowExportOptions(false);

    } catch (error) {

      console.error(error);

      alert("Failed to download Excel. Please try again.");

    } finally {

      setExporting(false);

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

          <h4 className="text-2xl font-bold text-gray-900">Survey Data Module</h4>

          <p className="text-gray-500 mt-1">

            Paste one record, or many at once — category is detected automatically • Export to Excel

          </p>

        </div>



        <div className="relative">

          <button

            onClick={() => setShowExportOptions((prev) => !prev)}

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



          {showExportOptions && (

            <div className="absolute right-0 top-full mt-2 z-50 w-80 bg-white border border-gray-200 rounded-xl shadow-xl p-4">

              <div className="mb-4">

                <h3 className="text-sm font-semibold text-gray-900">

                  Export Data

                </h3>

                <p className="text-xs text-gray-500 mt-1">

                  Select the data period you want to export.

                </p>

              </div>



              {/* Range */}

              <div className="space-y-2">

                <label className="text-xs font-medium text-gray-700">

                  Date Range

                </label>



                <select

                  value={exportRange}

                  onChange={(e) => setExportRange(e.target.value as ExportRange)}

                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"

                >

                  <option value="all">All Data</option>

                  <option value="today">Today</option>

                  <option value="weekly">This Week</option>

                  <option value="monthly">This Month</option>

                  <option value="custom">Custom Date Range</option>

                </select>

              </div>



              {/* Custom dates */}

              {exportRange === "custom" && (

                <div className="grid grid-cols-2 gap-3 mt-4">

                  <div>

                    <label className="block text-xs font-medium text-gray-700 mb-1">

                      From

                    </label>

                    <input

                      type="date"

                      value={exportStartDate}

                      onChange={(e) => setExportStartDate(e.target.value)}

                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"

                    />

                  </div>



                  <div>

                    <label className="block text-xs font-medium text-gray-700 mb-1">

                      To

                    </label>

                    <input

                      type="date"

                      value={exportEndDate}

                      onChange={(e) => setExportEndDate(e.target.value)}

                      className="w-full border border-gray-300 rounded-lg px-2 py-2 text-sm"

                    />

                  </div>

                </div>

              )}



              {/* Current selection */}

              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-3">

                <div className="text-xs text-gray-500">Exporting</div>



                <div className="text-sm font-medium text-gray-900 mt-1">

                  {activeTab === "ALL" ? "All Categories" : activeTab}

                </div>



                <div className="text-xs text-gray-500 mt-1">

                  {exportRange === "all" && "All available records"}

                  {exportRange === "today" && "Today's records"}

                  {exportRange === "weekly" && "Current week's records"}

                  {exportRange === "monthly" && "Current month's records"}

                  {exportRange === "custom" &&

                    exportStartDate &&

                    exportEndDate &&

                    `${exportStartDate} → ${exportEndDate}`}

                </div>

              </div>



              {/* Buttons */}

              <div className="flex gap-2 mt-4">

                <button

                  type="button"

                  onClick={() => setShowExportOptions(false)}

                  className="flex-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"

                >

                  Cancel

                </button>



                <button

                  type="button"

                  onClick={handleExport}

                  disabled={exporting}

                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm disabled:opacity-50"

                >

                  {exporting && <Loader2 className="w-4 h-4 animate-spin" />}

                  Export

                </button>

              </div>

            </div>

          )}

        </div>

      </div>



      <div className="flex flex-wrap items-end gap-3 mb-4">

  <div>

    <label className="block text-sm font-medium text-gray-700 mb-1">

      Upload for date

    </label>

    <input

      type="date"

      value={uploadDate}

      max={todayKey}

      onChange={(e) => setUploadDate(e.target.value)}

      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"

    />

  </div>



  {uploadDate ? (

    <>

      <button

        type="button"

        onClick={() => setUploadDate("")}

        className="text-xs text-blue-600 hover:underline pb-2.5"

      >

        Reset to today

      </button>

      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">

        Records will be saved under{" "}

        <strong>

          {parseLocalDate(uploadDate).toLocaleDateString("en-GB", {

            day: "2-digit",

            month: "short",

            year: "numeric",

          })}

        </strong>

      </span>

    </>

  ) : (

    <span className="text-xs text-gray-500 pb-2.5">

      Leave empty to save under today's date

    </span>

  )}

</div>



      {/* Paste Section — no category picker; every block carries its own B2B/B2H/B2C line */}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">

        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">

          <FileText className="w-5 h-5" />

          Paste Survey Data

        </h2>



        <div>

          <label className="block text-sm font-medium text-gray-700 mb-1">

            Paste data — Separte data using minimum 5 dash "-----"

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



      {/* Count Summary — record totals by survey category */}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

        {[

          { label: "Total Records", value: categoryCounts.B2B + categoryCounts.B2H + categoryCounts.B2C },

          { label: "B2B Records", value: categoryCounts.B2B },

          { label: "B2H Records", value: categoryCounts.B2H },

          { label: "B2C Records", value: categoryCounts.B2C },

        ].map((card) => (

          <div

            key={card.label}

            className="bg-white rounded-xl border border-gray-200 shadow-sm p-4"

          >

            <p className="text-xs font-medium text-gray-500">{card.label}</p>

            <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>

          </div>

        ))}

      </div>



      {/* Tabs + Records */}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

        {/* Tabs */}

        <div className="flex border-b border-gray-200 overflow-x-auto">

          {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {

            const count =

              tab === "ALL"

                ? categoryCounts.B2B + categoryCounts.B2H + categoryCounts.B2C

                : categoryCounts[tab];



            return (

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

                <span

                  className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${

                    activeTab === tab

                      ? "bg-blue-100 text-blue-700"

                      : "bg-gray-100 text-gray-600"

                  }`}

                >

                  {count}

                </span>

              </button>

            );

          })}

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



        {/* Calendar: month view with total submitted per date */}

        <div className="px-4 py-4 border-b border-gray-100">

          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">

            <div className="flex items-center gap-2">

              <button

                type="button"

                onClick={() => changeMonth(-1)}

                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"

                aria-label="Previous month"

              >

                <ChevronLeft className="w-4 h-4" />

              </button>



              <h3 className="text-sm font-semibold text-gray-900 min-w-[140px] text-center">

                {viewMonth.toLocaleDateString("en-GB", {

                  month: "long",

                  year: "numeric",

                })}

              </h3>



              <button

                type="button"

                onClick={() => changeMonth(1)}

                className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"

                aria-label="Next month"

              >

                <ChevronRight className="w-4 h-4" />

              </button>



              <button

                type="button"

                onClick={() => {

                  const n = new Date();

                  setViewMonth(new Date(n.getFullYear(), n.getMonth(), 1));

                }}

                className="text-xs px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"

              >

                This month

              </button>

            </div>



            <div className="flex items-center gap-3">

              <span className="text-xs text-gray-500">

                Month total:{" "}

                <span className="font-semibold text-black">{monthTotal}</span>

              </span>

              {selectedDate && (

                <button

                  onClick={() => {

                    setSelectedDate(null);

                    setPage(1);

                  }}

                  className="text-xs text-blue-600 hover:underline"

                >

                  Clear day filter

                </button>

              )}

            </div>

          </div>



          <div className="overflow-x-auto">

            <div className="min-w-[480px]">

              <div className="grid grid-cols-7 gap-1 mb-1">

                {WEEKDAYS.map((w) => (

                  <div

                    key={w}

                    className="text-center text-xs font-medium text-black py-1"

                  >

                    {w}

                  </div>

                ))}

              </div>



              <div className="grid grid-cols-7 gap-1">

                {/* {calendarCells.map((cell, i) => {

                  if (!cell) return <div key={`blank-${i}`} />;



                  const active = selectedDate === cell.key;

                  const isToday = cell.key === todayKey;

                  const hasData = cell.count > 0;



                  return (

                    <button

                      key={cell.key}

                      type="button"

                      disabled={!hasData}

                      onClick={() => {

                        setSelectedDate(active ? null : cell.key);

                        setPage(1);

                      }}

                      className={`h-16 rounded-lg border p-1.5 text-left flex flex-col justify-between transition-colors ${

                        active

                          ? "bg-blue-600 border-blue-600 text-white"

                          : hasData

                          ? "bg-blue-50 border-blue-100 text-gray-800 hover:bg-blue-100"

                          : "bg-white border-gray-100 text-black cursor-default"

                      } ${isToday && !active ? "ring-2 ring-blue-400" : ""}`}

                    >

                      <span className="text-xs font-medium">{cell.day}</span>

                      {hasData && (

                        <span

                          className={`self-end text-xs font-semibold rounded-full px-1.5 ${

                            active

                              ? "bg-white text-blue-700"

                              : "bg-blue-600 text-white"

                          }`}

                        >

                          {cell.count}

                        </span>

                      )}

                    </button>

                  );

                })} */}

                {calendarCells.map((cell, i) => {

  if (!cell) return <div key={`blank-${i}`} />;



  const active = selectedDate === cell.key;

  const isToday = cell.key === todayKey;

  const hasData = cell.count > 0;

  const isPastOrToday = cell.key <= todayKey; // "YYYY-MM-DD" strings compare correctly

  const notSubmitted = !hasData && isPastOrToday;



  return (

    <button

      key={cell.key}

      type="button"

      onClick={() => {

        setSelectedDate(active ? null : cell.key);

        setPage(1);

      }}

      className={`h-16 rounded-lg border p-1.5 text-left flex flex-col justify-between transition-colors ${

        active

          ? "bg-blue-600 border-blue-600 text-white"

          : hasData

          ? "bg-blue-50 border-blue-100 text-gray-800 hover:bg-blue-100"

          : notSubmitted

          ? "bg-red-50 border-red-100 text-gray-800 cursor-default"

          : "bg-white border-gray-100 text-gray-400 cursor-default"

      } ${isToday && !active ? "ring-2 ring-blue-400" : ""}`}

    >

      <span className="text-xs font-medium">{cell.day}</span>



      {hasData && (

        <span

          className={`self-end text-xs font-semibold rounded-full px-1.5 ${

            active ? "bg-white text-blue-700" : "bg-blue-600 text-white"

          }`}

        >

          {cell.count}

        </span>

      )}



      {notSubmitted && !active && (

        <span className="text-[10px] leading-tight font-medium text-red-600">

          Not submitted

        </span>

      )}

    </button>

  );

})}

              </div>

            </div>

          </div>

        </div>



        {selectedDate && (

          <div className="px-4 py-2 bg-blue-50 text-sm text-blue-800 border-b border-blue-100">

            Showing {total} records for{" "}

            <strong>

              {parseLocalDate(selectedDate).toLocaleDateString("en-GB", {

                weekday: "long",

                day: "2-digit",

                month: "long",

                year: "numeric",

              })}

            </strong>

          </div>

        )}



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

                const hasHeader =

                  item.accountType || item.projectNo || item.description;



                // The pasted field "Counts" is the data-count value for this record.

                // Keep it separate from category/record totals so "Counts: 1"

                // is shown exactly as the source data provides it.

                const countsEntry = Object.entries(item.data || {}).find(

                  ([key]) => key.trim().toLowerCase() === "counts"

                );

                const recordCounts = countsEntry?.[1];

                const hasMeta =

                  item.pid ||

                  item.supplierId ||

                  item.country ||

                  item.ip ||

                  item.status;



                return (

                  <div key={item._id} className="px-4 py-4 hover:bg-gray-50">

                    {/* Top: category + project header */}

                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">

                      <div className="flex items-center gap-2 flex-wrap">

                        <span

                          className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}

                        >

                          {item.category}

                        </span>

                        {hasHeader && (

                          <span className="text-sm font-medium text-gray-800">

                            {[item.accountType, item.projectNo]

                              .filter(Boolean)

                              .join(" ")}

                            {item.description ? ` - ${item.description}` : ""}

                            {item.panelCode ? ` || ${item.panelCode}` : ""}

                          </span>

                        )}

                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 whitespace-nowrap">
                          {new Date(item.createdAt).toLocaleDateString("en-GB", {
                            weekday: "short",
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                          {", "}
                          {new Date(item.createdAt).toLocaleTimeString("en-GB", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDelete(item._id)}
                          disabled={deletingId === item._id}
                          title="Delete record"
                          aria-label="Delete record"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {deletingId === item._id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                    </div>



                    {/* The source "Counts" field for this record */}

                    {recordCounts !== undefined && (

                      <div className="mb-2 inline-flex items-center gap-2 rounded-lg bg-blue-50 border border-blue-100 px-3 py-1.5 text-sm">

                        <span className="font-medium text-blue-700">Data Count:</span>

                        <span className="font-bold text-blue-900">{recordCounts}</span>

                      </div>

                    )}



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



                    {/* Bottom: response metadata */}

                    {hasMeta && (

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">

                        {item.pid && (

                          <span>

                            <span className="text-gray-400">PID:</span> {item.pid}

                          </span>

                        )}

                        {item.supplierId && (

                          <span>

                            <span className="text-gray-400">Supplier ID:</span>{" "}

                            {item.supplierId}

                          </span>

                        )}

                        {item.country && (

                          <span>

                            <span className="text-gray-400">Location:</span>{" "}

                            {item.country}

                          </span>

                        )}

                        {item.ip && (

                          <span>

                            <span className="text-gray-400">IP:</span> {item.ip}

                          </span>

                        )}

                        {item.status && (

                          <span>

                            <span className="text-gray-400">Status:</span>{" "}

                            {item.status}

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



        {/* Pagination — hidden when a single day is selected (all its records are shown) */}

        {!selectedDate && totalPages > 1 && (

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