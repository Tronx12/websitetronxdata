// // "use client";

// // import { useEffect, useState, useCallback, useMemo, useRef } from "react";
// // import {
// //   Upload,
// //   Download,
// //   Search,
// //   Loader2,
// //   FileText,
// //   FileSpreadsheet,
// //   Pencil,
// //   Trash2,
// //   Users,
// //   User,
// //   X,
// //   Save,
// //   RefreshCw,
// // } from "lucide-react";
// // import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

// // interface SurveyItem {
// //   _id: string;
// //   category: SurveyCategory;
// //   accountType?: string;
// //   projectNo?: string;
// //   panelCode?: string;
// //   description?: string;
// //   pid?: string;
// //   supplierId?: string;
// //   country?: string;
// //   ip?: string;
// //   status?: string;
// //   data: Record<string, string>;
// //   createdAt: string;
// //   updatedAt: string;
// //   createdBy?: any; // id string, or populated { _id, name, email }
// // }

// // interface TeamMemberSummary {
// //   _id: string;
// //   name: string;
// //   email: string;
// //   role: string;
// //   totalRecords: number;
// //   lastSubmitted: string;
// //   categories: string[];
// // }

// // type MainTab = "MY_DATA" | "TEAM_DATA";
// // type CategoryTab = SurveyCategory | "ALL";

// // const BULK_PLACEHOLDER = `Paste ONE record like this:
// // Age: 34
// // Gender: Male
// // Company: Acme Inc

// // ...or paste MANY records at once, separated by a line of =====:

// // GMS 79053 - Contact lenses
// // B2C
// // Age -32
// // Gender -F
// // Education-Bachelor degree
// // 79054   yi90i90day00ksh South Korea     112.155.135.194 Completed
// // ==============================================================================================
// // GMS 79053 - Contact lenses
// // B2C
// // Age -40
// // ...`;

// // const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {
// //   B2B: "bg-blue-100 text-blue-800",
// //   B2H: "bg-purple-100 text-purple-800",
// //   B2C: "bg-emerald-100 text-emerald-800",
// // };

// // const slug = (s: string) =>
// //   s
// //     .toLowerCase()
// //     .replace(/[^a-z0-9]+/g, "-")
// //     .replace(/^-+|-+$/g, "") || "member";

// // interface SurveyPageTeamLeadProps {
// //   currentUserId: string;
// //   currentUserName?: string;
// // }
// // // Same "business date" rule as the backend (IST, rollover at 06:30 AM)
// // const getBusinessTodayKey = () => {
// //   const parts = new Intl.DateTimeFormat("en-CA", {
// //     timeZone: "Asia/Kolkata",
// //     year: "numeric",
// //     month: "2-digit",
// //     day: "2-digit",
// //     hour: "2-digit",
// //     minute: "2-digit",
// //     hourCycle: "h23",
// //   }).formatToParts(new Date());

// //   const get = (t: string) =>
// //     Number(parts.find((p) => p.type === t)?.value);

// //   const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
// //   if (get("hour") * 60 + get("minute") < 6 * 60 + 30) {
// //     d.setUTCDate(d.getUTCDate() - 1);
// //   }
// //   return d.toISOString().slice(0, 10);
// // };

// // const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);

// // export default function SurveyPageTeamLead({
// //   currentUserId,
// //   currentUserName = "Team Lead",
// // }: SurveyPageTeamLeadProps) {
// //   const [mainTab, setMainTab] = useState<MainTab>("MY_DATA");

// //   const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
// //   const [items, setItems] = useState<SurveyItem[]>([]);
// //   const [loading, setLoading] = useState(true);
// //   const [saving, setSaving] = useState(false);
// //   const [exporting, setExporting] = useState(false);
// //   const todayKey = useMemo(() => getBusinessTodayKey(), []);
// //   const [uploadDate, setUploadDate] = useState(""); // "" = today (default)
// //   const [dateFrom, setDateFrom] = useState("");
// // const [dateTo, setDateTo] = useState("");
// //   const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(null);

// //   const [paste, setPaste] = useState("");
// //   const [message, setMessage] = useState<{
// //     type: "success" | "error";
// //     text: string;
// //   } | null>(null);
// //   const [searchInput, setSearchInput] = useState("");
// //   const [search, setSearch] = useState("");
// //   const [searchLoading, setSearchLoading] = useState(false);
// //   const [sortBy, setSortBy] = useState("createdAt");
// //   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
// //   const [page, setPage] = useState(1);
// //   const [totalPages, setTotalPages] = useState(1);
// //   const [total, setTotal] = useState(0);
// //   const [totalCounts, setTotalCounts] = useState(0);
// //   const [categoryCounts, setCategoryCounts] = useState({
// //     B2B: 0,
// //     B2H: 0,
// //     B2C: 0,
// //   });


// //   // Team
// //   const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
// //   const [teamLoading, setTeamLoading] = useState(false);
// //   // null = whole team
// //   const [selectedMember, setSelectedMember] = useState<TeamMemberSummary | null>(null);

// //   const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
// //   const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
// //   const [editSaving, setEditSaving] = useState(false);
// //   const [deletingId, setDeletingId] = useState<string | null>(null);

// //   // Bulk selection & deletion
// //   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
// //   const [bulkDeleting, setBulkDeleting] = useState(false);
// //   /* ==================================================
// //      SEARCH
// //   ================================================== */
// //   // useEffect(() => {
// //   //   const value = searchInput.trim();

// //   //   // Do not request the API for every keystroke.
// //   //   const timer = window.setTimeout(() => {
// //   //     setSearchLoading(value !== search);

// //   //     setSearch((current) => {
// //   //       if (current === value) {
// //   //         setSearchLoading(false);
// //   //         return current;
// //   //       }

// //   //       setPage(1);
// //   //       return value;
// //   //     });
// //   //   }, 350);

// //   //   return () => window.clearTimeout(timer);
// //   // }, [searchInput, search]);

// //   // Keep the visible input in sync when the active screen changes.
// //   /* ==================================================
// //    SEARCH (debounced)
// // ================================================== */
// //   useEffect(() => {
// //     const value = searchInput.trim();

// //     // Already applied: nothing to wait for.
// //     if (value === search) {
// //       setSearchLoading(false);
// //       return;
// //     }

// //     setSearchLoading(true);

// //     const timer = window.setTimeout(() => {
// //       setPage(1);
// //       setSearch(value);
// //     }, 350);

// //     return () => window.clearTimeout(timer);
// //   }, [searchInput, search]);

// //   // useEffect(() => {
// //   //   setSearchInput(search);
// //   // }, [mainTab]);


// //   // Ignore responses from outdated requests (fast tab / member switching).
// //   const dataRequestId = useRef(0);

// //   const memberNameById = useMemo(() => {
// //     const map = new Map<string, string>();
// //     teamMembers.forEach((m) => map.set(String(m._id), m.name));
// //     return map;
// //   }, [teamMembers]);

// //   const teamTotalRecords = useMemo(
// //     () => teamMembers.reduce((sum, m) => sum + (m.totalRecords || 0), 0),
// //     [teamMembers]
// //   );

// //   /**
// //    * One place that decides WHOSE data every request (records, counts, days,
// //    * export) is about, so the screen and the Excel file can never disagree.
// //    *
// //    *  My Survey Data            -> createdBy = me
// //    *  Team, one member picked   -> createdBy = that member
// //    *  Team, nobody picked       -> scope = team  (server resolves the team)
// //    */
// //   const applyScope = useCallback(
// //     (params: URLSearchParams) => {
// //       if (mainTab === "MY_DATA") {
// //         params.set("createdBy", String(currentUserId));
// //         return;
// //       }

// //       if (selectedMember?._id) {
// //         params.set("createdBy", String(selectedMember._id));
// //         return;
// //       }

// //       params.set("scope", "team");
// //     },
// //     [mainTab, selectedMember, currentUserId]
// //   );

// //   // ---------- Category counts ----------
// //   // const fetchCategoryCounts = useCallback(async () => {
// //   //   try {
// //   //     const categories = ["B2B", "B2H", "B2C"] as const;

// //   //     const results = await Promise.all(
// //   //       categories.map(async (category) => {
// //   //         const params = new URLSearchParams();
// //   //         params.set("page", "1");
// //   //         params.set("limit", "1");
// //   //         params.set("sortBy", "createdAt");
// //   //         params.set("sortOrder", "desc");
// //   //         params.set("category", category);

// //   //         applyScope(params);

// //   //         const cleanSearch = search.trim();
// //   //         if (cleanSearch) {
// //   //           params.set("search", cleanSearch);
// //   //         }

// //   //         const res = await fetch(`/api/survey?${params.toString()}`, {
// //   //           method: "GET",
// //   //           cache: "no-store",
// //   //         });

// //   //         if (!res.ok) {
// //   //           throw new Error(`Failed to fetch ${category} count`);
// //   //         }

// //   //         const json = await res.json();

// //   //         return {
// //   //           category,
// //   //           count: json.success ? Number(json.pagination?.totalCounts ?? json.pagination?.total) || 0 : 0,
// //   //         };
// //   //       })
// //   //     );

// //   //     setCategoryCounts({
// //   //       B2B: results.find((r) => r.category === "B2B")?.count || 0,
// //   //       B2H: results.find((r) => r.category === "B2H")?.count || 0,
// //   //       B2C: results.find((r) => r.category === "B2C")?.count || 0,
// //   //     });
// //   //   } catch (error) {
// //   //     console.error("Failed to fetch category counts:", error);
// //   //   }
// //   // }, [applyScope, search]);

// //   const fetchCategoryCounts = useCallback(async () => {
// //   try {
// //     const categories = ["B2B", "B2H", "B2C"] as const;

// //     const results = await Promise.all(
// //       categories.map(async (category) => {
// //         const params = new URLSearchParams();

// //         params.set("page", "1");
// //         params.set("limit", "1");
// //         params.set("sortBy", "createdAt");
// //         params.set("sortOrder", "desc");
// //         params.set("category", category);

// //         applyScope(params);

// //         if (dateFrom) {
// //           params.set("dateFrom", dateFrom);
// //         }

// //         if (dateTo) {
// //           params.set("dateTo", dateTo);
// //         }

// //         const cleanSearch = search.trim();

// //         if (cleanSearch) {
// //           params.set("search", cleanSearch);
// //         }

// //         const res = await fetch(`/api/survey?${params.toString()}`, {
// //           method: "GET",
// //           cache: "no-store",
// //         });

// //         if (!res.ok) {
// //           throw new Error(`Failed to fetch ${category} count`);
// //         }

// //         const json = await res.json();

// //         return {
// //           category,
// //           count: json.success
// //             ? Number(
// //                 json.pagination?.totalCounts ??
// //                   json.pagination?.total
// //               ) || 0
// //             : 0,
// //         };
// //       })
// //     );

// //     setCategoryCounts({
// //       B2B: results.find((r) => r.category === "B2B")?.count || 0,
// //       B2H: results.find((r) => r.category === "B2H")?.count || 0,
// //       B2C: results.find((r) => r.category === "B2C")?.count || 0,
// //     });
// //   } catch (error) {
// //     console.error("Failed to fetch category counts:", error);
// //   }
// // }, [applyScope, search, dateFrom, dateTo]);

// //   // ---------- Fetch records ----------
// // //   const fetchData = useCallback(async () => {
// // //     const requestId = ++dataRequestId.current;

// // //     try {
// // //       setLoading(true);

// // //       const params = new URLSearchParams();
// // //       params.set("page", String(page));
// // //       params.set("limit", "20");
// // //       params.set("sortBy", sortBy);
// // //       params.set("sortOrder", sortOrder);

// // //       applyScope(params);

// // //       if (activeTab !== "ALL") {
// // //         params.set("category", activeTab);
// // //       }

// // //       const cleanSearch = search.trim();
// // //       if (cleanSearch) {
// // //         params.set("search", cleanSearch);
// // //       }

// // //       const res = await fetch(`/api/survey?${params.toString()}`, {
// // //         method: "GET",
// // //         cache: "no-store",
// // //       });

// // //       const json = await res.json();

// // //       if (requestId !== dataRequestId.current) return;

// // //       if (!res.ok || !json.success) {
// // //         throw new Error(json.message || "Failed to fetch survey data");
// // //       }

// // //       const pagination = json.pagination || {};

// // //       setItems(Array.isArray(json.data) ? json.data : []);

// // // // Number of saved survey rows
// // // setTotal(Number(pagination.total) || 0);

// // // // SUM of Counts field
// // // setTotalCounts(Number(pagination.totalCounts) || 0);

// // // setTotalPages(
// // //   Math.max(1, Number(pagination.totalPages) || 1)
// // // );

// // //       // setItems(Array.isArray(json.data) ? json.data : []);
// // //       // setTotal(Number(pagination.total) || 0);
// // //       // setTotalPages(Math.max(1, Number(pagination.totalPages) || 1));
// // //     } catch (err) {
// // //       if (requestId !== dataRequestId.current) return;

// // //       console.error("Survey fetch error:", err);
// // //       setItems([]);
// // //       setTotalPages(1);
// // //       setTotal(0);
// // //     } finally {
// // //       if (requestId === dataRequestId.current) {
// // //         setLoading(false);
// // //         setSearchLoading(false);
// // //       }
// // //     }
// // //   }, [applyScope, activeTab, page, sortBy, sortOrder, search]);

// // const fetchData = useCallback(async () => {
// //   const requestId = ++dataRequestId.current;

// //   try {
// //     setLoading(true);

// //     const params = new URLSearchParams();

// //     params.set("page", String(page));
// //     params.set("limit", "20");
// //     params.set("sortBy", sortBy);
// //     params.set("sortOrder", sortOrder);

// //     applyScope(params);

// //     if (activeTab !== "ALL") {
// //       params.set("category", activeTab);
// //     }

// //     const cleanSearch = search.trim();

// //     if (cleanSearch) {
// //       params.set("search", cleanSearch);
// //     }

// //     // DATE-WISE FILTER
// //     if (dateFrom) {
// //       params.set("dateFrom", dateFrom);
// //     }

// //     if (dateTo) {
// //       params.set("dateTo", dateTo);
// //     }

// //     const res = await fetch(`/api/survey?${params.toString()}`, {
// //       method: "GET",
// //       cache: "no-store",
// //     });

// //     const json = await res.json();

// //     if (requestId !== dataRequestId.current) return;

// //     if (!res.ok || !json.success) {
// //       throw new Error(
// //         json.message || "Failed to fetch survey data"
// //       );
// //     }

// //     const pagination = json.pagination || {};

// //     setItems(Array.isArray(json.data) ? json.data : []);

// //     setTotal(Number(pagination.total) || 0);

// //     // SUM OF COUNTS
// //     setTotalCounts(Number(pagination.totalCounts) || 0);

// //     setTotalPages(
// //       Math.max(1, Number(pagination.totalPages) || 1)
// //     );
// //   } catch (err) {
// //     if (requestId !== dataRequestId.current) return;

// //     console.error("Survey fetch error:", err);

// //     setItems([]);
// //     setTotalPages(1);
// //     setTotal(0);
// //     setTotalCounts(0);
// //   } finally {
// //     if (requestId === dataRequestId.current) {
// //       setLoading(false);
// //       setSearchLoading(false);
// //     }
// //   }
// // }, [
// //   applyScope,
// //   activeTab,
// //   page,
// //   sortBy,
// //   sortOrder,
// //   search,
// //   dateFrom,
// //   dateTo,
// // ]);

// //   // ---------- Fetch team members (scoped to this team lead only) ----------
// //   const fetchTeamMembers = useCallback(async () => {
// //     try {
// //       setTeamLoading(true);
// //       const params = new URLSearchParams({
// //         teamLeadId: currentUserId, // restrict results to members reporting to this team lead
// //       });

// //       const res = await fetch(`/api/survey/team-members?${params}`);
// //       const json = await res.json();

// //       if (json.success) {
// //         setTeamMembers(json.data);
// //       }
// //     } catch (err) {
// //       console.error(err);
// //     } finally {
// //       setTeamLoading(false);
// //     }
// //   }, [currentUserId]);

// //   const refreshAll = () => {
// //     fetchData();
// //     fetchCategoryCounts();
// //     if (mainTab === "TEAM_DATA") fetchTeamMembers();
// //   };

// //   useEffect(() => {
// //     fetchData();
// //     fetchCategoryCounts();
// //   }, [fetchData, fetchCategoryCounts]);

// //   useEffect(() => {
// //     if (mainTab === "TEAM_DATA") {
// //       fetchTeamMembers();
// //     }
// //   }, [mainTab, fetchTeamMembers]);

// //   const blockPreviewCount = useMemo(() => {
// //     if (!paste.trim()) return 0;
// //     const hasDelimiter = /^\s*=+\s*$/m.test(paste);
// //     if (!hasDelimiter) return 1;
// //     return paste
// //       .split(/^\s*=+\s*$/m)
// //       .map((b) => b.trim())
// //       .filter(Boolean).length;
// //   }, [paste]);

// //   // ---------- Paste / Save ----------
// //   const handlePasteSubmit = async () => {
// //     if (!paste.trim()) {
// //       setMessage({ type: "error", text: "Please paste some data" });
// //       return;
// //     }

// //     try {
// //       setSaving(true);
// //       setMessage(null);

// //       const res = await fetch("/api/survey", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({
// //           paste,
// //            surveyDate: uploadDate || undefined,
// //         }),
// //       });

// //       const json = await res.json();

// //       // if (json.success) {
// //       //   setMessage({
// //       //     type: "success",
// //       //     text: `${json.message}${json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
// //       //       }`,
// //       //   });
// //       //   setPaste("");
// //       //   refreshAll();
// //       // }
// //       if (json.success) {
// //   setMessage({
// //     type: "success",
// //     text: `${json.message}${uploadDate ? ` for ${uploadDate}` : ""}${
// //       json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
// //     }`,
// //   });
// //   setPaste("");
// //   setUploadDate("");
// //   refreshAll();
// // } 
// //        else {
// //         setMessage({ type: "error", text: json.message || "Save failed" });
// //       }
// //     } catch (err: any) {
// //       setMessage({
// //         type: "error",
// //         text: err.message || "Something went wrong",
// //       });
// //     } finally {
// //       setSaving(false);
// //     }
// //   };
// //   const searchPending = searchInput.trim() !== search;
// //   // ---------- Export (follows the current selection) ----------
// //   const exportScopeLabel =
// //     mainTab === "MY_DATA"
// //       ? "My data"
// //       : selectedMember
// //         ? selectedMember.name
// //         : "All team members";

// //   const exportLabel = [
// //     exportScopeLabel,
// //     activeTab === "ALL" ? "All categories" : activeTab,
// //     search.trim() ? `Search: "${search.trim()}"` : "All matching records",
// //   ].join(" • ");

// //   // const handleExport = async () => {
// //   //   try {
// //   //     if (searchPending) {
// //   //       alert("Search is still updating. Please wait a moment and try again.");
// //   //       return;
// //   //     }
// //   //     if (total <= 0) {
// //   //       alert("No records available for the current filters.");
// //   //       return;
// //   //     }

// //   //     setExporting(true);

// //   //     const params = new URLSearchParams();
// //   //     applyScope(params);

// //   //     if (activeTab !== "ALL") {
// //   //       params.set("category", activeTab);
// //   //     }

// //   //     const cleanSearch = search.trim();
// //   //     if (cleanSearch) {
// //   //       params.set("search", cleanSearch);
// //   //     }

// //   //     // Export all matching records, not only the current page.
// //   //     params.set("range", "all");

// //   //     const res = await fetch(`/api/survey/export?${params.toString()}`, {
// //   //       method: "GET",
// //   //       cache: "no-store",
// //   //     });

// //   //     if (!res.ok) {
// //   //       const errorText = await res.text();
// //   //       console.error("Survey export error:", errorText);
// //   //       throw new Error("Export failed");
// //   //     }

// //   //     const blob = await res.blob();
// //   //     const url = window.URL.createObjectURL(blob);
// //   //     const a = document.createElement("a");

// //   //     const scopeSlug =
// //   //       mainTab === "MY_DATA"
// //   //         ? "mine"
// //   //         : selectedMember
// //   //           ? slug(selectedMember.name)
// //   //           : "team";

// //   //     const searchSlug = cleanSearch ? `-${slug(cleanSearch).slice(0, 50)}` : "";

// //   //     a.href = url;
// //   //     a.download = `survey-${scopeSlug}-${activeTab.toLowerCase()}${searchSlug}-all.xlsx`;

// //   //     document.body.appendChild(a);
// //   //     a.click();
// //   //     a.remove();

// //   //     window.URL.revokeObjectURL(url);
// //   //   } catch (error) {
// //   //     console.error(error);
// //   //     alert("Failed to download Excel");
// //   //   } finally {
// //   //     setExporting(false);
// //   //   }
// //   // };

// //   const handleExport = async () => {
// //   try {
// //     const cleanSearch = search.trim();

// //     if (searchPending) {
// //       alert("Search is still updating. Please wait a moment.");
// //       return;
// //     }

// //     if (total <= 0) {
// //       alert(
// //         cleanSearch
// //           ? `No records found for search: "${cleanSearch}"`
// //           : "No records available for the current filters."
// //       );
// //       return;
// //     }

// //     setExporting(true);

// //     const params = new URLSearchParams();

// //     // IMPORTANT:
// //     // Use exactly the same scope currently displayed on screen.
// //     applyScope(params);
// //     if (dateFrom) {
// //   params.set("dateFrom", dateFrom);
// // }

// // if (dateTo) {
// //   params.set("dateTo", dateTo);
// // }

// //     // Current category filter
// //     if (activeTab !== "ALL") {
// //       params.set("category", activeTab);
// //     }

// //     // Current search filter
// //     if (cleanSearch) {
// //       params.set("search", cleanSearch);
// //     }

// //     /*
// //      * IMPORTANT:
// //      * Do NOT send page or limit.
// //      *
// //      * The export API must download ALL records
// //      * matching the current search/filter.
// //      */
// //     params.set("range", "all");

// //     console.log(
// //       "EXPORT FILTER:",
// //       Object.fromEntries(params.entries())
// //     );

// //     const res = await fetch(
// //       `/api/survey/export?${params.toString()}`,
// //       {
// //         method: "GET",
// //         cache: "no-store",
// //       }
// //     );

// //     if (!res.ok) {
// //       const errorText = await res.text();

// //       console.error(
// //         "Survey export failed:",
// //         res.status,
// //         errorText
// //       );

// //       throw new Error(
// //         `Export failed (${res.status})`
// //       );
// //     }

// //     const blob = await res.blob();

// //     if (!blob.size) {
// //       throw new Error("Downloaded Excel file is empty.");
// //     }

// //     const url = window.URL.createObjectURL(blob);

// //     const a = document.createElement("a");

// //     const scopeSlug =
// //       mainTab === "MY_DATA"
// //         ? "mine"
// //         : selectedMember
// //           ? slug(selectedMember.name)
// //           : "team";

// //     const searchSlug = cleanSearch
// //       ? `-${slug(cleanSearch).slice(0, 50)}`
// //       : "";

// //     const categorySlug =
// //       activeTab === "ALL"
// //         ? "all"
// //         : activeTab.toLowerCase();

// //     a.href = url;

// //     a.download =
// //       `survey-${scopeSlug}-${categorySlug}` +
// //       `${searchSlug}-full-data.xlsx`;

// //     document.body.appendChild(a);
// //     a.click();
// //     a.remove();

// //     window.URL.revokeObjectURL(url);

// //     console.log(
// //       `Excel downloaded successfully. ` +
// //       `Expected matching records: ${total}`
// //     );

// //   } catch (error) {
// //     console.error(
// //       "Excel download error:",
// //       error
// //     );

// //     alert(
// //       error instanceof Error
// //         ? error.message
// //         : "Failed to download Excel"
// //     );
// //   } finally {
// //     setExporting(false);
// //   }
// // };
// //   const handleWorkReport = async (range: "weekly" | "monthly") => {
// //     try {
// //       setReportLoading(range);
// //       // Scope the report to this team lead + their team only.
// //       const res = await fetch(
// //         `/api/survey/work-report?range=${range}&teamLeadId=${currentUserId}`
// //       );
// //       if (!res.ok) throw new Error("Report generation failed");

// //       const blob = await res.blob();
// //       const url = window.URL.createObjectURL(blob);
// //       const a = document.createElement("a");
// //       a.href = url;
// //       a.download = `work-report-${range}-${Date.now()}.xlsx`;
// //       a.click();
// //       window.URL.revokeObjectURL(url);
// //     } catch (err) {
// //       alert("Failed to generate work report");
// //     } finally {
// //       setReportLoading(null);
// //     }
// //   };

// //   const insertField = (field: string) => {
// //     setPaste((prev) =>
// //       prev.trim() ? `${prev.trim()}\n${field}: ` : `${field}: `
// //     );
// //   };

// //   // ---------- Edit ----------
// //   const openEdit = (item: SurveyItem) => {
// //     setEditingItem(item);
// //     setEditForm({
// //       category: item.category,
// //       accountType: item.accountType || "",
// //       projectNo: item.projectNo || "",
// //       panelCode: item.panelCode || "",
// //       description: item.description || "",
// //       pid: item.pid || "",
// //       supplierId: item.supplierId || "",
// //       country: item.country || "",
// //       ip: item.ip || "",
// //       status: item.status || "",
// //       data: { ...item.data },
// //     });
// //   };

// //   const handleEditSave = async () => {
// //     if (!editingItem) return;

// //     try {
// //       setEditSaving(true);
// //       const res = await fetch(`/api/survey/${editingItem._id}`, {
// //         method: "PUT",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify(editForm),
// //       });

// //       const json = await res.json();

// //       if (json.success) {
// //         setEditingItem(null);
// //         refreshAll();
// //         setMessage({ type: "success", text: "Record updated successfully" });
// //       } else {
// //         setMessage({ type: "error", text: json.message || "Update failed" });
// //       }
// //     } catch (err: any) {
// //       setMessage({ type: "error", text: err.message || "Update failed" });
// //     } finally {
// //       setEditSaving(false);
// //     }
// //   };

// //   // ---------- Delete ----------
// //   const handleDelete = async (id: string) => {
// //     if (!confirm("Are you sure you want to delete this survey record? This cannot be undone.")) {
// //       return;
// //     }

// //     try {
// //       setDeletingId(id);
// //       const res = await fetch(`/api/survey/${id}`, {
// //         method: "DELETE",
// //       });

// //       const json = await res.json();

// //       if (json.success) {
// //         setSelectedIds((prev) => {
// //           const next = new Set(prev);
// //           next.delete(id);
// //           return next;
// //         });
// //         refreshAll();
// //         setMessage({ type: "success", text: "Record deleted successfully" });
// //       } else {
// //         setMessage({ type: "error", text: json.message || "Delete failed" });
// //       }
// //     } catch (err: any) {
// //       setMessage({ type: "error", text: err.message || "Delete failed" });
// //     } finally {
// //       setDeletingId(null);
// //     }
// //   };

// //   // ---------- Bulk Selection & Delete ----------
// //   const toggleSelect = (id: string) => {
// //     setSelectedIds((prev) => {
// //       const next = new Set(prev);
// //       if (next.has(id)) next.delete(id);
// //       else next.add(id);
// //       return next;
// //     });
// //   };

// //   const toggleSelectAllVisible = () => {
// //     const visibleIds = items.map((i) => i._id);
// //     const allSelected =
// //       visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
// //     setSelectedIds((prev) => {
// //       const next = new Set(prev);
// //       if (allSelected) {
// //         visibleIds.forEach((id) => next.delete(id));
// //       } else {
// //         visibleIds.forEach((id) => next.add(id));
// //       }
// //       return next;
// //     });
// //   };

// //   const clearSelection = () => setSelectedIds(new Set());

// //   const handleBulkDelete = async () => {
// //     if (selectedIds.size === 0) return;
// //     const count = selectedIds.size;
// //     if (
// //       !confirm(
// //         `Are you sure you want to permanently delete ${count} selected survey record${
// //           count > 1 ? "s" : ""
// //         }? This cannot be undone.`
// //       )
// //     ) {
// //       return;
// //     }

// //     try {
// //       setBulkDeleting(true);
// //       const res = await fetch("/api/survey/bulk-delete", {
// //         method: "POST",
// //         headers: { "Content-Type": "application/json" },
// //         body: JSON.stringify({ ids: Array.from(selectedIds) }),
// //       });
// //       const json = await res.json();
// //       if (json.success) {
// //         setSelectedIds(new Set());
// //         refreshAll();
// //         setMessage({
// //           type: "success",
// //           text:
// //             json.message ||
// //             `Successfully deleted ${count} survey record${
// //               count > 1 ? "s" : ""
// //             }`,
// //         });
// //       } else {
// //         setMessage({
// //           type: "error",
// //           text: json.message || "Bulk delete failed",
// //         });
// //       }
// //     } catch (err: any) {
// //       setMessage({
// //         type: "error",
// //         text: err?.message || "Bulk delete failed",
// //       });
// //     } finally {
// //       setBulkDeleting(false);
// //     }
// //   };

// //   const updateDataField = (key: string, value: string) => {
// //     setEditForm((prev) => ({
// //       ...prev,
// //       data: { ...(prev.data || {}), [key]: value },
// //     }));
// //   };

// //   const addDataField = () => {
// //     const key = prompt("Enter field name:");
// //     if (!key?.trim()) return;
// //     updateDataField(key.trim(), "");
// //   };

// //   const removeDataField = (key: string) => {
// //     setEditForm((prev) => {
// //       const next = { ...(prev.data || {}) };
// //       delete next[key];
// //       return { ...prev, data: next };
// //     });
// //   };

// //   // Who submitted this record. Show it for every record.
// //   const getSubmitterInfo = (
// //     item: SurveyItem
// //   ): { name: string; email?: string } => {
// //     const raw = item.createdBy;

// //     if (raw && typeof raw === "object") {
// //       const id = String(raw._id || "");
// //       return {
// //         name:
// //           raw.name ||
// //           raw.fullName ||
// //           raw.username ||
// //           memberNameById.get(id) ||
// //           (id === String(currentUserId) ? currentUserName : "") ||
// //           "Unknown user",
// //         email: raw.email || undefined,
// //       };
// //     }

// //     const id = String(raw || "");

// //     if (id === String(currentUserId)) {
// //       return { name: currentUserName || "Me" };
// //     }

// //     const member = teamMembers.find((m) => String(m._id) === id);

// //     if (member) {
// //       return {
// //         name: member.name || member.email || "Unknown user",
// //         email: member.email || undefined,
// //       };
// //     }

// //     return { name: id ? `User ${id.slice(-6)}` : "Unknown user" };
// //   };

// //   // ---------- Record card ----------
// //   const renderRecordCard = (item: SurveyItem) => {
// //     const isSelected = selectedIds.has(item._id);
// //     const hasHeader = item.accountType || item.projectNo || item.description;
// //     const hasMeta =
// //       item.pid || item.supplierId || item.country || item.ip || item.status;
// //     const submitter = getSubmitterInfo(item);

// //     return (
// //       <div
// //         key={item._id}
// //         className={`px-4 py-4 transition-colors ${
// //           isSelected
// //             ? "bg-blue-50/80 border-l-4 border-l-blue-600 pl-3"
// //             : "hover:bg-gray-50"
// //         }`}
// //       >
// //         <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
// //           <div className="flex items-center gap-2.5 flex-wrap">
// //             <input
// //               type="checkbox"
// //               checked={isSelected}
// //               onChange={() => toggleSelect(item._id)}
// //               className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
// //               aria-label={`Select record ${item._id}`}
// //             />
// //             <span
// //               className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
// //             >
// //               {item.category}
// //             </span>
// //             <span
// //               className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
// //               title={submitter.email || "Submitted by user"}
// //             >
// //               <User className="w-3.5 h-3.5" />
// //               <span>{submitter.name}</span>
// //               {submitter.email && (
// //                 <span className="font-normal text-indigo-500">
// //                   • {submitter.email}
// //                 </span>
// //               )}
// //             </span>
// //             {hasHeader && (
// //               <span className="text-sm font-medium text-gray-800">
// //                 {[item.accountType, item.projectNo].filter(Boolean).join(" ")}
// //                 {item.description ? ` - ${item.description}` : ""}
// //                 {item.panelCode ? ` || ${item.panelCode}` : ""}
// //               </span>
// //             )}
// //           </div>

// //           <div className="flex items-center gap-2">
// //             <span className="text-xs text-gray-400 whitespace-nowrap">
// //               {new Date(item.createdAt).toLocaleDateString("en-GB", {
// //                 weekday: "short",
// //                 day: "2-digit",
// //                 month: "short",
// //                 year: "numeric",
// //               })}
// //               {", "}
// //               {new Date(item.createdAt).toLocaleTimeString("en-GB", {
// //                 hour: "2-digit",
// //                 minute: "2-digit",
// //               })}
// //             </span>

// //             <button
// //               onClick={() => openEdit(item)}
// //               className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
// //               title="Edit"
// //             >
// //               <Pencil className="w-4 h-4" />
// //             </button>
// //             <button
// //               onClick={() => handleDelete(item._id)}
// //               disabled={deletingId === item._id}
// //               className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
// //               title="Delete"
// //             >
// //               {deletingId === item._id ? (
// //                 <Loader2 className="w-4 h-4 animate-spin" />
// //               ) : (
// //                 <Trash2 className="w-4 h-4" />
// //               )}
// //             </button>
// //           </div>
// //         </div>

// //         {Object.keys(item.data || {}).length > 0 && (
// //           <div className="flex flex-wrap gap-1.5 mb-2">
// //             {Object.entries(item.data).map(([k, v]) => (
// //               <span key={k} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
// //                 <span className="text-gray-500">{k}:</span> {v}
// //               </span>
// //             ))}
// //           </div>
// //         )}

// //         {hasMeta && (
// //           <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
// //             {item.pid && (
// //               <span>
// //                 <span className="text-gray-400">PID:</span> {item.pid}
// //               </span>
// //             )}
// //             {item.supplierId && (
// //               <span>
// //                 <span className="text-gray-400">Supplier ID:</span> {item.supplierId}
// //               </span>
// //             )}
// //             {item.country && (
// //               <span>
// //                 <span className="text-gray-400">Location:</span> {item.country}
// //               </span>
// //             )}
// //             {item.ip && (
// //               <span>
// //                 <span className="text-gray-400">IP:</span> {item.ip}
// //               </span>
// //             )}
// //             {item.status && (
// //               <span>
// //                 <span className="text-gray-400">Status:</span> {item.status}
// //               </span>
// //             )}
// //           </div>
// //         )}
// //       </div>
// //     );
// //   };

// //   return (
// //     <div className="max-w-7xl mx-auto p-6 space-y-8">
// //       {/* Header */}
// //       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
// //         <div>
// //           <h4 className="text-2xl font-bold text-gray-900">
// //             Survey Data Module – Team Lead
// //           </h4>
// //           <p className="text-gray-500 mt-1">
// //             Welcome, {currentUserName}. Manage your own survey data and your team&apos;s data • Edit & Delete enabled
// //           </p>
// //         </div>
// //         <div className="flex flex-col items-start sm:items-end gap-1">
// //           <div className="flex gap-2 flex-wrap">
// //             <button
// //               onClick={() => handleWorkReport("weekly")}
// //               disabled={reportLoading !== null}
// //               className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
// //             >
// //               {reportLoading === "weekly" ? (
// //                 <Loader2 className="w-4 h-4 animate-spin" />
// //               ) : (
// //                 <FileSpreadsheet className="w-4 h-4" />
// //               )}
// //               Weekly Work Report
// //             </button>
// //             <button
// //               onClick={() => handleWorkReport("monthly")}
// //               disabled={reportLoading !== null}
// //               className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
// //             >
// //               {reportLoading === "monthly" ? (
// //                 <Loader2 className="w-4 h-4 animate-spin" />
// //               ) : (
// //                 <FileSpreadsheet className="w-4 h-4" />
// //               )}
// //               Monthly Work Report
// //             </button>
// //             {/* <button
// //               onClick={handleExport}
// //               disabled={exporting || total === 0}
// //               title={`Exports: ${exportLabel}`}
// //               className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
// //             > */}
// //             {selectedIds.size > 0 && (
// //               <button
// //                 onClick={handleBulkDelete}
// //                 disabled={bulkDeleting}
// //                 className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg disabled:opacity-50 text-sm font-semibold shadow-sm transition"
// //               >
// //                 {bulkDeleting ? (
// //                   <Loader2 className="w-4 h-4 animate-spin" />
// //                 ) : (
// //                   <Trash2 className="w-4 h-4" />
// //                 )}
// //                 Delete Selected ({selectedIds.size})
// //               </button>
// //             )}
// //             <button
// //               onClick={handleExport}
// //               disabled={exporting || total === 0 || searchPending || loading}
// //               title={
// //                 searchPending
// //                   ? "Search is still updating..."
// //                   : `Exports: ${exportLabel}`
// //               }
// //               className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
// //             >
// //               {exporting ? (
// //                 <Loader2 className="w-4 h-4 animate-spin" />
// //               ) : (
// //                 <Download className="w-4 h-4" />
// //               )}
// //               Download Excel
// //             </button>
// //           </div>
// //           <p className="text-xs text-gray-500">
// //             Excel will contain: <span className="font-medium">{exportLabel}</span>
// //           </p>
// //         </div>
// //       </div>

// //       {/* Main Tabs */}
// //       <div className="flex border-b border-gray-200">
// //         <button
// //           onClick={() => {
// //             setMainTab("MY_DATA");
// //             setSelectedMember(null);
// //             setPage(1);
// //             setActiveTab("ALL");
// //             setSelectedIds(new Set());
// //           }}
// //           className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === "MY_DATA"
// //               ? "border-blue-600 text-blue-600"
// //               : "border-transparent text-gray-500 hover:text-gray-700"
// //             }`}
// //         >
// //           <User className="w-4 h-4" />
// //           My Survey Data
// //         </button>
// //         <button
// //           onClick={() => {
// //             setMainTab("TEAM_DATA");
// //             setSelectedMember(null);
// //             setPage(1);
// //             setActiveTab("ALL");
// //             setSelectedIds(new Set());
// //             setSearchInput(search);
// //             setSearch(search);
// //           }}
// //           className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === "TEAM_DATA"
// //               ? "border-blue-600 text-blue-600"
// //               : "border-transparent text-gray-500 hover:text-gray-700"
// //             }`}
// //         >
// //           <Users className="w-4 h-4" />
// //           My Team&apos;s Survey Data
// //         </button>
// //       </div>

// //       {/* Paste Section (only on My Data — team lead submits their own survey data) */}
// //       {mainTab === "MY_DATA" && (

// //         <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
// //           <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
// //             <FileText className="w-5 h-5" />
// //             Paste Survey Data
// //           </h2>

// //           <div className="flex flex-wrap items-end gap-3 mb-4">
// //   <div>
// //     <label className="block text-sm font-medium text-gray-700 mb-1">
// //       Upload for date
// //     </label>
// //     <input
// //       type="date"
// //       value={uploadDate}
// //       max={todayKey}
// //       onChange={(e) => setUploadDate(e.target.value)}
// //       className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
// //     />
// //   </div>

// //   {uploadDate ? (
// //     <>
// //       <button
// //         type="button"
// //         onClick={() => setUploadDate("")}
// //         className="text-xs text-blue-600 hover:underline pb-2.5"
// //       >
// //         Reset to today
// //       </button>
// //       <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
// //         Records will be saved under{" "}
// //         <strong>
// //           {parseLocalDate(uploadDate).toLocaleDateString("en-GB", {
// //             day: "2-digit",
// //             month: "short",
// //             year: "numeric",
// //           })}
// //         </strong>
// //       </span>
// //     </>
// //   ) : (
// //     <span className="text-xs text-gray-500 pb-2.5">
// //       Leave empty to save under today's date
// //     </span>
// //   )}
// // </div>

// //           <div>
// //             <label className="block text-sm font-medium text-gray-700 mb-1">
// //               Paste data — one record, or many separated by a &quot;=====&quot; line
// //             </label>
// //             <textarea
// //               value={paste}
// //               onChange={(e) => setPaste(e.target.value)}
// //               rows={10}
// //               placeholder={BULK_PLACEHOLDER}
// //               className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
// //             />
// //           </div>

// //           <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
// //             <p className="text-xs text-gray-500">
// //               Supported: <code>Key: Value</code> • <code>Key = Value</code> •{" "}
// //               <code>Key - Value</code>
// //               {blockPreviewCount > 0 && (
// //                 <span className="ml-2 font-medium text-blue-600">
// //                   Will create {blockPreviewCount} record
// //                   {blockPreviewCount === 1 ? "" : "s"}
// //                 </span>
// //               )}
// //             </p>
// //             <button
// //               onClick={handlePasteSubmit}
// //               disabled={saving}
// //               className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
// //             >
// //               {saving ? (
// //                 <Loader2 className="w-4 h-4 animate-spin" />
// //               ) : (
// //                 <Upload className="w-4 h-4" />
// //               )}
// //               Save Data
// //             </button>
// //           </div>

// //           {message && (
// //             <div
// //               className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success"
// //                   ? "bg-green-50 text-green-800"
// //                   : "bg-red-50 text-red-800"
// //                 }`}
// //             >
// //               {message.text}
// //             </div>
// //           )}

// //           <div className="mt-4 pt-4 border-t">
// //             <p className="text-xs font-medium text-gray-500 mb-2">
// //               Common fields (click to insert):
// //             </p>
// //             <div className="flex flex-wrap gap-2">
// //               {SUGGESTED_FIELDS.B2C.map((f) => (
// //                 <button
// //                   key={f}
// //                   type="button"
// //                   onClick={() => insertField(f)}
// //                   className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-1 rounded transition-colors"
// //                 >
// //                   {f}
// //                 </button>
// //               ))}
// //             </div>
// //           </div>
// //         </div>
// //       )}

// //       {/* Content */}
// //       <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
// //         {/* Team: member filter (all team data is already showing) */}
// //         {mainTab === "TEAM_DATA" && (
// //           <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
// //             <label
// //               htmlFor="team-member-filter"
// //               className="text-sm font-medium text-gray-700"
// //             >
// //               Team member
// //             </label>

// //             <select
// //               id="team-member-filter"
// //               value={selectedMember?._id || ""}
// //               onChange={(e) => {
// //                 const member =
// //                   teamMembers.find(
// //                     (m) => String(m._id) === String(e.target.value)
// //                   ) || null;

// //                 setSelectedMember(member);
// //                 setPage(1);
// //                 setSelectedIds(new Set());
// //               }}
// //               className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
// //             >
// //               <option value="">
// //                 All team members ({teamTotalRecords})
// //               </option>
// //               {teamMembers.map((member) => (
// //                 <option key={member._id} value={member._id}>
// //                   {member.name || member.email || "Unknown"} (
// //                   {member.totalRecords})
// //                 </option>
// //               ))}
// //             </select>

// //             {selectedMember && (
// //               <button
// //                 onClick={() => {
// //                   setSelectedMember(null);
// //                   setPage(1);
// //                   setSelectedIds(new Set());
// //                 }}
// //                 className="text-sm text-blue-600 hover:underline"
// //               >
// //                 Show all team
// //               </button>
// //             )}

// //             <button
// //               onClick={fetchTeamMembers}
// //               disabled={teamLoading}
// //               className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 rounded-lg disabled:opacity-50"
// //             >
// //               <RefreshCw
// //                 className={`w-4 h-4 ${teamLoading ? "animate-spin" : ""}`}
// //               />
// //               Refresh
// //             </button>

// //             <span className="text-sm text-gray-600 sm:ml-auto">
// //               Viewing{" "}
// //               <strong>
// //                 {selectedMember ? selectedMember.name : "all team members"}
// //               </strong>
// //               {selectedMember?.email && (
// //                 <span className="ml-1 text-gray-400">
// //                   ({selectedMember.email})
// //                 </span>
// //               )}
// //             </span>
// //           </div>
// //         )}

// //         {/* Category tabs */}
// //         <div className="flex border-b border-gray-200 overflow-x-auto">
// //           {/* {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
// //             const count = tab === "ALL" ? total : categoryCounts[tab]; */}
// //             {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
// //   const count =
// //     tab === "ALL"
// //       ? totalCounts
// //       : categoryCounts[tab];

// //             return (
// //               <button
// //                 key={tab}
// //                 onClick={() => {
// //                   setActiveTab(tab);
// //                   setPage(1);
// //                   setSelectedIds(new Set());
// //                 }}
// //                 className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab
// //                     ? "border-blue-600 text-blue-600"
// //                     : "border-transparent text-gray-500 hover:text-gray-700"
// //                   }`}
// //               >
// //                 <span>{tab}</span>

// //                 <span
// //                   className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${activeTab === tab
// //                       ? "bg-blue-100 text-blue-700"
// //                       : "bg-gray-100 text-gray-600"
// //                     }`}
// //                 >
// //                   {count}
// //                 </span>
// //               </button>
// //             );
// //           })}
// //         </div>

// //         {/* DATE-WISE FILTER */}
// // <div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
// //   <div className="flex flex-wrap items-end gap-3">

// //     <div>
// //       <label className="block text-xs font-medium text-gray-600 mb-1">
// //         From Date
// //       </label>

// //       <input
// //         type="date"
// //         value={dateFrom}
// //         max={dateTo || todayKey}
// //         onChange={(e) => {
// //           setDateFrom(e.target.value);
// //           setPage(1);
// //           setSelectedIds(new Set());
// //         }}
// //         className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
// //       />
// //     </div>

// //     <div>
// //       <label className="block text-xs font-medium text-gray-600 mb-1">
// //         To Date
// //       </label>

// //       <input
// //         type="date"
// //         value={dateTo}
// //         min={dateFrom || undefined}
// //         max={todayKey}
// //         onChange={(e) => {
// //           setDateTo(e.target.value);
// //           setPage(1);
// //           setSelectedIds(new Set());
// //         }}
// //         className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
// //       />
// //     </div>

// //     {(dateFrom || dateTo) && (
// //       <button
// //         type="button"
// //         onClick={() => {
// //           setDateFrom("");
// //           setDateTo("");
// //           setPage(1);
// //           setSelectedIds(new Set());
// //         }}
// //         className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
// //       >
// //         Clear Date
// //       </button>
// //     )}

// //     <div className="text-xs text-gray-500 pb-2">
// //       {dateFrom && dateTo
// //         ? `Showing data from ${dateFrom} to ${dateTo}`
// //         : dateFrom
// //         ? `Showing data from ${dateFrom}`
// //         : dateTo
// //         ? `Showing data until ${dateTo}`
// //         : "Showing all dates"}
// //     </div>

// //   </div>
// // </div>

// //         {/* Search + Sort */}
// //         <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
// //           <div className="relative flex-1">
// //             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

// //             <input
// //               type="search"
// //               value={searchInput}
// //               onChange={(e) => setSearchInput(e.target.value)}
// //               onKeyDown={(e) => {
// //                 if (e.key === "Escape") {
// //                   setSearchInput("");
// //                   setSearch("");
// //                   setPage(1);
// //                   setSearchLoading(false);
// //                 }
// //               }}
// //               placeholder="Search user name, email, PID, project, supplier, country, IP, status, TNX, parent, child, respondent or survey fields..."
// //               className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
// //               aria-label="Search survey data"
// //             />

// //             <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
// //               {searchLoading && (
// //                 <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
// //               )}

// //               {searchInput && (
// //                 <button
// //                   type="button"
// //                   onClick={() => {
// //                     setSearchInput("");
// //                     setSearch("");
// //                     setPage(1);
// //                     setSearchLoading(false);
// //                   }}
// //                   className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
// //                   title="Clear search"
// //                   aria-label="Clear search"
// //                 >
// //                   <X className="w-4 h-4" />
// //                 </button>
// //               )}
// //             </div>
// //           </div>

// //           <div className="flex gap-2">
// //             <select
// //               value={sortBy}
// //               onChange={(e) => {
// //                 setSortBy(e.target.value);
// //                 setPage(1);
// //               }}
// //               className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
// //             >
// //               <option value="createdAt">Created Date</option>
// //               <option value="updatedAt">Updated Date</option>
// //               <option value="category">Category</option>
// //             </select>

// //             <select
// //               value={sortOrder}
// //               onChange={(e) => {
// //                 setSortOrder(e.target.value as "asc" | "desc");
// //                 setPage(1);
// //               }}
// //               className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
// //             >
// //               <option value="desc">Newest first</option>
// //               <option value="asc">Oldest first</option>
// //             </select>
// //           </div>
// //         </div>

// //         {/* Search fields hint */}
// //         <div className="px-4 pb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
// //           <span className="font-medium text-gray-600">Search:</span>
// //           {[
// //             "User name",
// //             "Email",
// //             "IP address",
// //             "Location",
// //             "PID",
// //             "Project",
// //             "Supplier ID",
// //             "Status",
// //             "Survey fields",
// //           ].map((label) => (
// //             <span
// //               key={label}
// //               className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200"
// //             >
// //               {label}
// //             </span>
// //           ))}
// //           {search && (
// //             <span className="ml-auto text-blue-600 font-medium">
// //               Searching: "{search}"
// //             </span>
// //           )}
// //         </div>


// //         {/* Selection and Bulk Action Bar */}
// //         {items.length > 0 && (
// //           <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-gray-200">
// //             <div className="flex items-center gap-3">
// //               <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-700">
// //                 <input
// //                   type="checkbox"
// //                   checked={
// //                     items.length > 0 &&
// //                     items.every((i) => selectedIds.has(i._id))
// //                   }
// //                   ref={(el) => {
// //                     if (el) {
// //                       const some = items.some((i) => selectedIds.has(i._id));
// //                       const all = items.every((i) => selectedIds.has(i._id));
// //                       el.indeterminate = some && !all;
// //                     }
// //                   }}
// //                   onChange={toggleSelectAllVisible}
// //                   className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
// //                 />
// //                 <span>
// //                   {items.length > 0 && items.every((i) => selectedIds.has(i._id))
// //                     ? "Deselect all visible"
// //                     : `Select all visible (${items.length})`}
// //                 </span>
// //               </label>

// //               {selectedIds.size > 0 && (
// //                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
// //                   {selectedIds.size} selected
// //                 </span>
// //               )}
// //             </div>

// //             {selectedIds.size > 0 && (
// //               <div className="flex items-center gap-2">
// //                 <button
// //                   type="button"
// //                   onClick={clearSelection}
// //                   className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-white transition"
// //                 >
// //                   Clear selection
// //                 </button>
// //                 <button
// //                   type="button"
// //                   onClick={handleBulkDelete}
// //                   disabled={bulkDeleting}
// //                   className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
// //                 >
// //                   {bulkDeleting ? (
// //                     <Loader2 className="w-3.5 h-3.5 animate-spin" />
// //                   ) : (
// //                     <Trash2 className="w-3.5 h-3.5" />
// //                   )}
// //                   Delete Selected ({selectedIds.size})
// //                 </button>
// //               </div>
// //             )}
// //           </div>
// //         )}

// //         {/* Records */}
// //         <div>
// //           {loading ? (
// //             <div className="flex justify-center py-16">
// //               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
// //             </div>
// //           ) : items.length === 0 ? (
// //             <div className="text-center py-16 text-gray-500">
// //               No records found.
// //               {mainTab === "MY_DATA" && " Paste some data above."}
// //             </div>
// //           ) : (
// //             <div className="divide-y divide-gray-100">
// //               {items.map(renderRecordCard)}
// //             </div>
// //           )}
// //         </div>

// //         {/* Pagination */}
// //         {totalPages > 1 && (
// //           <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
// //             <p className="text-sm text-gray-500">
// //               Page {page} of {totalPages} ({total} records)
// //             </p>
// //             <div className="flex gap-2">
// //               <button
// //                 disabled={page === 1}
// //                 onClick={() => {
// //                   setPage((p) => p - 1);
// //                   setSelectedIds(new Set());
// //                 }}
// //                 className="px-3 py-1 border rounded disabled:opacity-40"
// //               >
// //                 Previous
// //               </button>
// //               <button
// //                 disabled={page === totalPages}
// //                 onClick={() => {
// //                   setPage((p) => p + 1);
// //                   setSelectedIds(new Set());
// //                 }}
// //                 className="px-3 py-1 border rounded disabled:opacity-40"
// //               >
// //                 Next
// //               </button>
// //             </div>
// //           </div>
// //         )}
// //       </div>

// //       {/* ========== EDIT MODAL ========== */}
// //       {editingItem && (
// //         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
// //           <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
// //             <div className="flex items-center justify-between px-6 py-4 border-b">
// //               <h3 className="text-lg font-semibold">Edit Survey Record</h3>
// //               <button
// //                 onClick={() => setEditingItem(null)}
// //                 className="p-1 rounded hover:bg-gray-100"
// //               >
// //                 <X className="w-5 h-5" />
// //               </button>
// //             </div>

// //             <div className="p-6 space-y-4">
// //               {/* Category */}
// //               <div>
// //                 <label className="block text-sm font-medium text-gray-700 mb-1">
// //                   Category
// //                 </label>
// //                 <select
// //                   value={editForm.category || "B2C"}
// //                   onChange={(e) =>
// //                     setEditForm((p) => ({
// //                       ...p,
// //                       category: e.target.value as SurveyCategory,
// //                     }))
// //                   }
// //                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
// //                 >
// //                   <option value="B2B">B2B</option>
// //                   <option value="B2H">B2H</option>
// //                   <option value="B2C">B2C</option>
// //                 </select>
// //               </div>

// //               {/* Header fields */}
// //               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
// //                 {[
// //                   { key: "accountType", label: "Account Type" },
// //                   { key: "projectNo", label: "Project No" },
// //                   { key: "panelCode", label: "Panel Code" },
// //                   { key: "description", label: "Description" },
// //                   { key: "pid", label: "PID" },
// //                   { key: "supplierId", label: "Supplier ID" },
// //                   { key: "country", label: "Country / Location" },
// //                   { key: "ip", label: "IP" },
// //                   { key: "status", label: "Status" },
// //                 ].map(({ key, label }) => (
// //                   <div key={key}>
// //                     <label className="block text-sm font-medium text-gray-700 mb-1">
// //                       {label}
// //                     </label>
// //                     <input
// //                       type="text"
// //                       value={(editForm as any)[key] || ""}
// //                       onChange={(e) =>
// //                         setEditForm((p) => ({ ...p, [key]: e.target.value }))
// //                       }
// //                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
// //                     />
// //                   </div>
// //                 ))}
// //               </div>

// //               {/* Dynamic data fields */}
// //               <div>
// //                 <div className="flex items-center justify-between mb-2">
// //                   <label className="block text-sm font-medium text-gray-700">
// //                     Survey Data Fields
// //                   </label>
// //                   <button
// //                     type="button"
// //                     onClick={addDataField}
// //                     className="text-xs text-blue-600 hover:underline"
// //                   >
// //                     + Add field
// //                   </button>
// //                 </div>
// //                 <div className="space-y-2 max-h-48 overflow-y-auto">
// //                   {Object.entries(editForm.data || {}).map(([k, v]) => (
// //                     <div key={k} className="flex gap-2 items-center">
// //                       <input
// //                         type="text"
// //                         value={k}
// //                         disabled
// //                         className="w-1/3 border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50"
// //                       />
// //                       <input
// //                         type="text"
// //                         value={v}
// //                         onChange={(e) => updateDataField(k, e.target.value)}
// //                         className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
// //                       />
// //                       <button
// //                         type="button"
// //                         onClick={() => removeDataField(k)}
// //                         className="p-1 text-red-500 hover:bg-red-50 rounded"
// //                       >
// //                         <Trash2 className="w-4 h-4" />
// //                       </button>
// //                     </div>
// //                   ))}
// //                   {Object.keys(editForm.data || {}).length === 0 && (
// //                     <p className="text-xs text-gray-400">No data fields</p>
// //                   )}
// //                 </div>
// //               </div>
// //             </div>

// //             <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
// //               <button
// //                 onClick={() => setEditingItem(null)}
// //                 className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
// //               >
// //                 Cancel
// //               </button>
// //               <button
// //                 onClick={handleEditSave}
// //                 disabled={editSaving}
// //                 className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
// //               >
// //                 {editSaving ? (
// //                   <Loader2 className="w-4 h-4 animate-spin" />
// //                 ) : (
// //                   <Save className="w-4 h-4" />
// //                 )}
// //                 Save Changes
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// "use client";

// import { useEffect, useState, useCallback, useMemo, useRef } from "react";
// import {
//   Upload,
//   Download,
//   Search,
//   Loader2,
//   FileText,
//   FileSpreadsheet,
//   Pencil,
//   Trash2,
//   Users,
//   User,
//   X,
//   Save,
//   RefreshCw,
//   ArrowLeft,
//   ChevronRight,
//   Calendar,
//   List,
// } from "lucide-react";
// import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

// /* ==================================================
//    TYPES
// ================================================== */
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
//   createdBy?: any; // id string, or populated { _id, name, email }
// }

// interface TeamMemberSummary {
//   _id: string;
//   name: string;
//   email: string;
//   role: string;
//   totalRecords: number;
//   lastSubmitted: string;
//   categories: string[];
// }

// interface DateGroup {
//   date: string; // YYYY-MM-DD (business date)
//   dayLabel: string; // Today / Yesterday / Mon, 15 Jan 2026
//   totalSubmit: number;
//   items: SurveyItem[];
// }

// type MainTab = "MY_DATA" | "TEAM_DATA";
// type CategoryTab = SurveyCategory | "ALL";
// type ViewLayout = "DATE_GROUPED" | "FLAT";

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

// const slug = (s: string) =>
//   s
//     .toLowerCase()
//     .replace(/[^a-z0-9]+/g, "-")
//     .replace(/^-+|-+$/g, "") || "member";

// interface SurveyPageTeamLeadProps {
//   currentUserId: string;
//   currentUserName?: string;
// }

// /* ==================================================
//    HELPERS
// ================================================== */

// // Business date rule (same as backend): IST, day rolls over at 06:30 AM
// const getBusinessDateKey = (input: Date | string = new Date()) => {
//   const parts = new Intl.DateTimeFormat("en-CA", {
//     timeZone: "Asia/Kolkata",
//     year: "numeric",
//     month: "2-digit",
//     day: "2-digit",
//     hour: "2-digit",
//     minute: "2-digit",
//     hourCycle: "h23",
//   }).formatToParts(typeof input === "string" ? new Date(input) : input);

//   const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);

//   const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
//   if (get("hour") * 60 + get("minute") < 6 * 60 + 30) {
//     d.setUTCDate(d.getUTCDate() - 1);
//   }
//   return d.toISOString().slice(0, 10);
// };

// const getBusinessTodayKey = () => getBusinessDateKey(new Date());

// const getBusinessYesterdayKey = () => {
//   const d = new Date(`${getBusinessTodayKey()}T00:00:00Z`);
//   d.setUTCDate(d.getUTCDate() - 1);
//   return d.toISOString().slice(0, 10);
// };

// const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);

// // One saved row can represent several submissions through its Counts field.
// function getSurveyCount(item: SurveyItem): number {
//   const raw =
//     item?.data?.Counts ??
//     item?.data?.counts ??
//     (item as SurveyItem & { counts?: unknown })?.counts ??
//     1;
//   const count = Number(raw);
//   return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
// }

// /* ==================================================
//    COMPONENT
// ================================================== */
// export default function SurveyPageTeamLead({
//   currentUserId,
//   currentUserName = "Team Lead",
// }: SurveyPageTeamLeadProps) {
//   const [mainTab, setMainTab] = useState<MainTab>("MY_DATA");

//   // Team navigation: members list  ->  records (one member, or whole team)
//   const [teamOpen, setTeamOpen] = useState(false);
//   const [selectedMember, setSelectedMember] =
//     useState<TeamMemberSummary | null>(null);
//   const [teamSearch, setTeamSearch] = useState("");

//   const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
//   const [items, setItems] = useState<SurveyItem[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [exporting, setExporting] = useState(false);
//   const todayKey = useMemo(() => getBusinessTodayKey(), []);
//   const [uploadDate, setUploadDate] = useState(""); // "" = today
//   const [dateFrom, setDateFrom] = useState("");
//   const [dateTo, setDateTo] = useState("");
//   const [reportLoading, setReportLoading] = useState<
//     "weekly" | "monthly" | null
//   >(null);

//   const [paste, setPaste] = useState("");
//   const [message, setMessage] = useState<{
//     type: "success" | "error";
//     text: string;
//   } | null>(null);
//   const [searchInput, setSearchInput] = useState("");
//   const [search, setSearch] = useState("");
//   const [searchLoading, setSearchLoading] = useState(false);
//   const [sortBy, setSortBy] = useState("createdAt");
//   const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
//   const [page, setPage] = useState(1);
//   const [totalPages, setTotalPages] = useState(1);
//   const [total, setTotal] = useState(0); // saved rows
//   const [totalCounts, setTotalCounts] = useState(0); // SUM(Counts)
//   const [categoryCounts, setCategoryCounts] = useState({
//     B2B: 0,
//     B2H: 0,
//     B2C: 0,
//   });

//   // Layout + date grouping
//   const [viewLayout, setViewLayout] = useState<ViewLayout>("DATE_GROUPED");
//   const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

//   // Team
//   const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
//   const [teamLoading, setTeamLoading] = useState(false);

//   // Edit / Delete
//   const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
//   const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
//   const [editSaving, setEditSaving] = useState(false);
//   const [deletingId, setDeletingId] = useState<string | null>(null);

//   // Bulk selection & deletion
//   const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
//   const [bulkDeleting, setBulkDeleting] = useState(false);

//   // Records are visible on "My data", or inside the team drill-down.
//   const showRecords = mainTab === "MY_DATA" || teamOpen;

//   /* ==================================================
//      SEARCH (debounced)
//   ================================================== */
//   useEffect(() => {
//     const value = searchInput.trim();

//     if (value === search) {
//       setSearchLoading(false);
//       return;
//     }

//     setSearchLoading(true);

//     const timer = window.setTimeout(() => {
//       setPage(1);
//       setSearch(value);
//     }, 350);

//     return () => window.clearTimeout(timer);
//   }, [searchInput, search]);

//   // Ignore responses from outdated requests (fast tab / member switching).
//   const dataRequestId = useRef(0);

//   const memberNameById = useMemo(() => {
//     const map = new Map<string, string>();
//     teamMembers.forEach((m) => map.set(String(m._id), m.name));
//     return map;
//   }, [teamMembers]);

//   const teamTotalRecords = useMemo(
//     () => teamMembers.reduce((sum, m) => sum + (m.totalRecords || 0), 0),
//     [teamMembers]
//   );

//   const filteredMembers = useMemo(() => {
//     const q = teamSearch.trim().toLowerCase();
//     if (!q) return teamMembers;
//     return teamMembers.filter(
//       (m) =>
//         m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
//     );
//   }, [teamMembers, teamSearch]);

//   /**
//    * One place that decides WHOSE data every request is about, so the screen
//    * and the Excel file can never disagree.
//    *
//    *  My Survey Data            -> createdBy = me
//    *  Team, one member picked   -> createdBy = that member
//    *  Team, whole team          -> scope = team  (server resolves the team)
//    */
//   const applyScope = useCallback(
//     (params: URLSearchParams) => {
//       if (mainTab === "MY_DATA") {
//         params.set("createdBy", String(currentUserId));
//         return;
//       }

//       if (selectedMember?._id) {
//         params.set("createdBy", String(selectedMember._id));
//         return;
//       }

//       params.set("scope", "team");
//     },
//     [mainTab, selectedMember, currentUserId]
//   );

//   const applyDates = useCallback(
//     (params: URLSearchParams) => {
//       if (dateFrom) params.set("dateFrom", dateFrom);
//       if (dateTo) params.set("dateTo", dateTo);
//     },
//     [dateFrom, dateTo]
//   );

//   /* ==================================================
//      FETCH: category counts
//   ================================================== */
//   const fetchCategoryCounts = useCallback(async () => {
//     if (!showRecords) return;

//     try {
//       const categories = ["B2B", "B2H", "B2C"] as const;

//       const results = await Promise.all(
//         categories.map(async (category) => {
//           const params = new URLSearchParams();
//           params.set("page", "1");
//           params.set("limit", "1");
//           params.set("sortBy", "createdAt");
//           params.set("sortOrder", "desc");
//           params.set("category", category);

//           applyScope(params);
//           applyDates(params);

//           const cleanSearch = search.trim();
//           if (cleanSearch) params.set("search", cleanSearch);

//           const res = await fetch(`/api/survey?${params.toString()}`, {
//             method: "GET",
//             cache: "no-store",
//           });

//           if (!res.ok) throw new Error(`Failed to fetch ${category} count`);

//           const json = await res.json();

//           return {
//             category,
//             count: json.success
//               ? Number(json.pagination?.totalCounts ?? json.pagination?.total) ||
//                 0
//               : 0,
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
//   }, [applyScope, applyDates, search, showRecords]);

//   /* ==================================================
//      FETCH: records
//      DATE_GROUPED -> every matching row (limit=0), grouped client-side
//      FLAT         -> 20 rows per page
//   ================================================== */
//   const fetchData = useCallback(async () => {
//     if (!showRecords) return;

//     const requestId = ++dataRequestId.current;

//     try {
//       setLoading(true);

//       const params = new URLSearchParams();

//       if (viewLayout === "DATE_GROUPED") {
//         params.set("page", "1");
//         params.set("limit", "0");
//         params.set("sortBy", "createdAt");
//         params.set("sortOrder", "desc");
//       } else {
//         params.set("page", String(page));
//         params.set("limit", "20");
//         params.set("sortBy", sortBy);
//         params.set("sortOrder", sortOrder);
//       }

//       applyScope(params);
//       applyDates(params);

//       if (activeTab !== "ALL") params.set("category", activeTab);

//       const cleanSearch = search.trim();
//       if (cleanSearch) params.set("search", cleanSearch);

//       const res = await fetch(`/api/survey?${params.toString()}`, {
//         method: "GET",
//         cache: "no-store",
//       });

//       const json = await res.json();

//       if (requestId !== dataRequestId.current) return;

//       if (!res.ok || !json.success) {
//         throw new Error(json.message || "Failed to fetch survey data");
//       }

//       const pagination = json.pagination || {};

//       setItems(Array.isArray(json.data) ? json.data : []);
//       setTotal(Number(pagination.total) || 0);
//       setTotalCounts(Number(pagination.totalCounts) || 0);
//       setTotalPages(Math.max(1, Number(pagination.totalPages) || 1));
//     } catch (err) {
//       if (requestId !== dataRequestId.current) return;

//       console.error("Survey fetch error:", err);
//       setItems([]);
//       setTotalPages(1);
//       setTotal(0);
//       setTotalCounts(0);
//     } finally {
//       if (requestId === dataRequestId.current) {
//         setLoading(false);
//         setSearchLoading(false);
//       }
//     }
//   }, [
//     showRecords,
//     viewLayout,
//     applyScope,
//     applyDates,
//     activeTab,
//     page,
//     sortBy,
//     sortOrder,
//     search,
//   ]);

//   /* ==================================================
//      FETCH: team members (this team lead's team only)
//   ================================================== */
//   const fetchTeamMembers = useCallback(async () => {
//     try {
//       setTeamLoading(true);
//       const params = new URLSearchParams({ teamLeadId: currentUserId });

//       const res = await fetch(`/api/survey/team-members?${params}`);
//       const json = await res.json();

//       if (json.success) setTeamMembers(json.data);
//     } catch (err) {
//       console.error(err);
//     } finally {
//       setTeamLoading(false);
//     }
//   }, [currentUserId]);

//   const refreshAll = () => {
//     fetchData();
//     fetchCategoryCounts();
//     if (mainTab === "TEAM_DATA") fetchTeamMembers();
//   };

//   useEffect(() => {
//     fetchData();
//     fetchCategoryCounts();
//   }, [fetchData, fetchCategoryCounts]);

//   useEffect(() => {
//     if (mainTab === "TEAM_DATA") fetchTeamMembers();
//   }, [mainTab, fetchTeamMembers]);

//   /* ==================================================
//      DATE GROUPS (business-date, IST 06:30 rollover)
//   ================================================== */
//   const dateGroups = useMemo<DateGroup[]>(() => {
//     const map = new Map<string, SurveyItem[]>();

//     items.forEach((item) => {
//       const key = getBusinessDateKey(item.createdAt);
//       if (!map.has(key)) map.set(key, []);
//       map.get(key)!.push(item);
//     });

//     const yesterdayKey = getBusinessYesterdayKey();

//     return Array.from(map.entries())
//       .map(([date, dayItems]) => {
//         let dayLabel: string;
//         if (date === todayKey) dayLabel = "Today";
//         else if (date === yesterdayKey) dayLabel = "Yesterday";
//         else
//           dayLabel = parseLocalDate(date).toLocaleDateString("en-GB", {
//             weekday: "short",
//             day: "2-digit",
//             month: "short",
//             year: "numeric",
//           });

//         return {
//           date,
//           dayLabel,
//           totalSubmit: dayItems.reduce((s, i) => s + getSurveyCount(i), 0),
//           items: [...dayItems].sort(
//             (a, b) =>
//               new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//           ),
//         };
//       })
//       .sort((a, b) => (a.date < b.date ? 1 : -1));
//   }, [items, todayKey]);

//   // Auto-expand today's group when nothing is expanded yet
//   useEffect(() => {
//     if (dateGroups.length > 0 && expandedDates.size === 0) {
//       const todayGroup = dateGroups.find((g) => g.dayLabel === "Today");
//       if (todayGroup) setExpandedDates(new Set([todayGroup.date]));
//     }
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [dateGroups]);

//   const toggleDate = (date: string) => {
//     setExpandedDates((prev) => {
//       const next = new Set(prev);
//       if (next.has(date)) next.delete(date);
//       else next.add(date);
//       return next;
//     });
//   };

//   /* ==================================================
//      NAVIGATION
//   ================================================== */
//   const resetFilters = () => {
//     setPage(1);
//     setActiveTab("ALL");
//     setSearchInput("");
//     setSearch("");
//     setDateFrom("");
//     setDateTo("");
//     setExpandedDates(new Set());
//     setSelectedIds(new Set());
//   };

//   const openMember = (member: TeamMemberSummary | null) => {
//     setSelectedMember(member);
//     setTeamOpen(true);
//     resetFilters();
//   };

//   const backToMembers = () => {
//     setTeamOpen(false);
//     setSelectedMember(null);
//     resetFilters();
//   };

//   /* ==================================================
//      PASTE / SAVE
//   ================================================== */
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
//         body: JSON.stringify({
//           paste,
//           surveyDate: uploadDate || undefined,
//         }),
//       });

//       const json = await res.json();

//       if (json.success) {
//         setMessage({
//           type: "success",
//           text: `${json.message}${uploadDate ? ` for ${uploadDate}` : ""}${
//             json.errors?.length
//               ? ` (${json.errors.length} block(s) skipped)`
//               : ""
//           }`,
//         });
//         setPaste("");
//         setUploadDate("");
//         refreshAll();
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

//   /* ==================================================
//      EXPORT (follows the current selection)
//   ================================================== */
//   const searchPending = searchInput.trim() !== search;

//   const exportScopeLabel =
//     mainTab === "MY_DATA"
//       ? "My data"
//       : selectedMember
//         ? selectedMember.name
//         : "All team members";

//   const exportLabel = [
//     exportScopeLabel,
//     activeTab === "ALL" ? "All categories" : activeTab,
//     search.trim() ? `Search: "${search.trim()}"` : "All matching records",
//   ].join(" • ");

//   const handleExport = async () => {
//     try {
//       const cleanSearch = search.trim();

//       if (searchPending) {
//         alert("Search is still updating. Please wait a moment.");
//         return;
//       }

//       if (total <= 0) {
//         alert(
//           cleanSearch
//             ? `No records found for search: "${cleanSearch}"`
//             : "No records available for the current filters."
//         );
//         return;
//       }

//       setExporting(true);

//       const params = new URLSearchParams();

//       // Exactly the same scope as the screen.
//       applyScope(params);
//       applyDates(params);

//       if (activeTab !== "ALL") params.set("category", activeTab);
//       if (cleanSearch) params.set("search", cleanSearch);

//       // All matching records, not only the current page.
//       params.set("range", "all");

//       const res = await fetch(`/api/survey/export?${params.toString()}`, {
//         method: "GET",
//         cache: "no-store",
//       });

//       if (!res.ok) {
//         const errorText = await res.text();
//         console.error("Survey export failed:", res.status, errorText);
//         throw new Error(`Export failed (${res.status})`);
//       }

//       const blob = await res.blob();
//       if (!blob.size) throw new Error("Downloaded Excel file is empty.");

//       const url = window.URL.createObjectURL(blob);
//       const a = document.createElement("a");

//       const scopeSlug =
//         mainTab === "MY_DATA"
//           ? "mine"
//           : selectedMember
//             ? slug(selectedMember.name)
//             : "team";
//       const searchSlug = cleanSearch
//         ? `-${slug(cleanSearch).slice(0, 50)}`
//         : "";
//       const categorySlug = activeTab === "ALL" ? "all" : activeTab.toLowerCase();

//       a.href = url;
//       a.download = `survey-${scopeSlug}-${categorySlug}${searchSlug}-full-data.xlsx`;

//       document.body.appendChild(a);
//       a.click();
//       a.remove();
//       window.URL.revokeObjectURL(url);
//     } catch (error) {
//       console.error("Excel download error:", error);
//       alert(
//         error instanceof Error ? error.message : "Failed to download Excel"
//       );
//     } finally {
//       setExporting(false);
//     }
//   };

//   const handleWorkReport = async (range: "weekly" | "monthly") => {
//     try {
//       setReportLoading(range);
//       const res = await fetch(
//         `/api/survey/work-report?range=${range}&teamLeadId=${currentUserId}`
//       );
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

//   /* ==================================================
//      EDIT
//   ================================================== */
//   const openEdit = (item: SurveyItem) => {
//     setEditingItem(item);
//     setEditForm({
//       category: item.category,
//       accountType: item.accountType || "",
//       projectNo: item.projectNo || "",
//       panelCode: item.panelCode || "",
//       description: item.description || "",
//       pid: item.pid || "",
//       supplierId: item.supplierId || "",
//       country: item.country || "",
//       ip: item.ip || "",
//       status: item.status || "",
//       data: { ...item.data },
//     });
//   };

//   const handleEditSave = async () => {
//     if (!editingItem) return;

//     try {
//       setEditSaving(true);
//       const res = await fetch(`/api/survey/${editingItem._id}`, {
//         method: "PUT",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(editForm),
//       });

//       const json = await res.json();

//       if (json.success) {
//         setEditingItem(null);
//         refreshAll();
//         setMessage({ type: "success", text: "Record updated successfully" });
//       } else {
//         setMessage({ type: "error", text: json.message || "Update failed" });
//       }
//     } catch (err: any) {
//       setMessage({ type: "error", text: err.message || "Update failed" });
//     } finally {
//       setEditSaving(false);
//     }
//   };

//   /* ==================================================
//      DELETE
//   ================================================== */
//   const handleDelete = async (id: string) => {
//     if (
//       !confirm(
//         "Are you sure you want to delete this survey record? This cannot be undone."
//       )
//     ) {
//       return;
//     }

//     try {
//       setDeletingId(id);
//       const res = await fetch(`/api/survey/${id}`, { method: "DELETE" });
//       const json = await res.json();

//       if (json.success) {
//         setSelectedIds((prev) => {
//           const next = new Set(prev);
//           next.delete(id);
//           return next;
//         });
//         refreshAll();
//         setMessage({ type: "success", text: "Record deleted successfully" });
//       } else {
//         setMessage({ type: "error", text: json.message || "Delete failed" });
//       }
//     } catch (err: any) {
//       setMessage({ type: "error", text: err.message || "Delete failed" });
//     } finally {
//       setDeletingId(null);
//     }
//   };

//   /* ==================================================
//      BULK SELECT / DELETE
//   ================================================== */
//   const toggleSelect = (id: string) => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   };

//   const toggleSelectMany = (list: SurveyItem[]) => {
//     const ids = list.map((i) => i._id);
//     const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
//       return next;
//     });
//   };

//   const clearSelection = () => setSelectedIds(new Set());

//   const handleBulkDelete = async () => {
//     if (selectedIds.size === 0) return;
//     const count = selectedIds.size;
//     if (
//       !confirm(
//         `Are you sure you want to permanently delete ${count} selected survey record${
//           count > 1 ? "s" : ""
//         }? This cannot be undone.`
//       )
//     ) {
//       return;
//     }

//     try {
//       setBulkDeleting(true);
//       const res = await fetch("/api/survey/bulk-delete", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ ids: Array.from(selectedIds) }),
//       });
//       const json = await res.json();
//       if (json.success) {
//         setSelectedIds(new Set());
//         refreshAll();
//         setMessage({
//           type: "success",
//           text:
//             json.message ||
//             `Successfully deleted ${count} survey record${count > 1 ? "s" : ""}`,
//         });
//       } else {
//         setMessage({
//           type: "error",
//           text: json.message || "Bulk delete failed",
//         });
//       }
//     } catch (err: any) {
//       setMessage({ type: "error", text: err?.message || "Bulk delete failed" });
//     } finally {
//       setBulkDeleting(false);
//     }
//   };

//   const updateDataField = (key: string, value: string) => {
//     setEditForm((prev) => ({
//       ...prev,
//       data: { ...(prev.data || {}), [key]: value },
//     }));
//   };

//   const addDataField = () => {
//     const key = prompt("Enter field name:");
//     if (!key?.trim()) return;
//     updateDataField(key.trim(), "");
//   };

//   const removeDataField = (key: string) => {
//     setEditForm((prev) => {
//       const next = { ...(prev.data || {}) };
//       delete next[key];
//       return { ...prev, data: next };
//     });
//   };

//   // Who submitted this record.
//   const getSubmitterInfo = (
//     item: SurveyItem
//   ): { name: string; email?: string } => {
//     const raw = item.createdBy;

//     if (raw && typeof raw === "object") {
//       const id = String(raw._id || "");
//       return {
//         name:
//           raw.name ||
//           raw.fullName ||
//           raw.username ||
//           memberNameById.get(id) ||
//           (id === String(currentUserId) ? currentUserName : "") ||
//           "Unknown user",
//         email: raw.email || undefined,
//       };
//     }

//     const id = String(raw || "");

//     if (id === String(currentUserId)) {
//       return { name: currentUserName || "Me" };
//     }

//     const member = teamMembers.find((m) => String(m._id) === id);

//     if (member) {
//       return {
//         name: member.name || member.email || "Unknown user",
//         email: member.email || undefined,
//       };
//     }

//     return { name: id ? `User ${id.slice(-6)}` : "Unknown user" };
//   };

//   /* ==================================================
//      RECORD CARD
//   ================================================== */
//   const renderRecordCard = (item: SurveyItem, indented = false) => {
//     const isSelected = selectedIds.has(item._id);
//     const hasHeader = item.accountType || item.projectNo || item.description;
//     const hasMeta =
//       item.pid || item.supplierId || item.country || item.ip || item.status;

//     // Name chip only where the owner isn't already obvious from the screen.
//     const showSubmitter =
//       mainTab === "TEAM_DATA" && !selectedMember;
//     const submitter = showSubmitter ? getSubmitterInfo(item) : null;

//     return (
//       <div
//         key={item._id}
//         className={`px-4 py-4 transition-colors ${
//           isSelected
//             ? "bg-blue-50/80 border-l-4 border-l-blue-600 pl-3"
//             : indented
//               ? "pl-16 bg-gray-50/50 hover:bg-gray-50"
//               : "hover:bg-gray-50"
//         }`}
//       >
//         <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
//           <div className="flex items-center gap-2.5 flex-wrap">
//             <input
//               type="checkbox"
//               checked={isSelected}
//               onChange={() => toggleSelect(item._id)}
//               className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
//               aria-label={`Select record ${item._id}`}
//             />
//             <span
//               className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
//             >
//               {item.category}
//             </span>
//             {submitter && (
//               <span
//                 className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
//                 title={submitter.email || "Submitted by user"}
//               >
//                 <User className="w-3.5 h-3.5" />
//                 <span>{submitter.name}</span>
//                 {submitter.email && (
//                   <span className="font-normal text-indigo-500">
//                     • {submitter.email}
//                   </span>
//                 )}
//               </span>
//             )}
//             {hasHeader && (
//               <span className="text-sm font-medium text-gray-800">
//                 {[item.accountType, item.projectNo].filter(Boolean).join(" ")}
//                 {item.description ? ` - ${item.description}` : ""}
//                 {item.panelCode ? ` || ${item.panelCode}` : ""}
//               </span>
//             )}
//           </div>

//           <div className="flex items-center gap-2">
//             <span className="text-xs text-gray-400 whitespace-nowrap">
//               {indented
//                 ? new Date(item.createdAt).toLocaleTimeString("en-GB", {
//                     hour: "2-digit",
//                     minute: "2-digit",
//                   })
//                 : `${new Date(item.createdAt).toLocaleDateString("en-GB", {
//                     weekday: "short",
//                     day: "2-digit",
//                     month: "short",
//                     year: "numeric",
//                   })}, ${new Date(item.createdAt).toLocaleTimeString("en-GB", {
//                     hour: "2-digit",
//                     minute: "2-digit",
//                   })}`}
//             </span>

//             <button
//               onClick={() => openEdit(item)}
//               className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
//               title="Edit"
//             >
//               <Pencil className="w-4 h-4" />
//             </button>
//             <button
//               onClick={() => handleDelete(item._id)}
//               disabled={deletingId === item._id}
//               className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
//               title="Delete"
//             >
//               {deletingId === item._id ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <Trash2 className="w-4 h-4" />
//               )}
//             </button>
//           </div>
//         </div>

//         {Object.keys(item.data || {}).length > 0 && (
//           <div className="flex flex-wrap gap-1.5 mb-2">
//             {Object.entries(item.data).map(([k, v]) => (
//               <span key={k} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
//                 <span className="text-gray-500">{k}:</span> {v}
//               </span>
//             ))}
//           </div>
//         )}

//         {hasMeta && (
//           <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2">
//             {item.pid && (
//               <span>
//                 <span className="text-gray-400">PID:</span> {item.pid}
//               </span>
//             )}
//             {item.supplierId && (
//               <span>
//                 <span className="text-gray-400">Supplier ID:</span>{" "}
//                 {item.supplierId}
//               </span>
//             )}
//             {item.country && (
//               <span>
//                 <span className="text-gray-400">Location:</span> {item.country}
//               </span>
//             )}
//             {item.ip && (
//               <span>
//                 <span className="text-gray-400">IP:</span> {item.ip}
//               </span>
//             )}
//             {item.status && (
//               <span>
//                 <span className="text-gray-400">Status:</span> {item.status}
//               </span>
//             )}
//           </div>
//         )}
//       </div>
//     );
//   };

//   /* ==================================================
//      RENDER
//   ================================================== */
//   const allVisibleSelected =
//     items.length > 0 && items.every((i) => selectedIds.has(i._id));
//   const someVisibleSelected = items.some((i) => selectedIds.has(i._id));

//   const viewingName =
//     mainTab === "MY_DATA"
//       ? currentUserName
//       : selectedMember
//         ? selectedMember.name
//         : "All team members";

//   return (
//     <div className="max-w-7xl mx-auto p-6 space-y-6">
//       {/* Header */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
//         <div>
//           <h4 className="text-2xl font-bold text-gray-900">
//             Survey Data Module – Team Lead
//           </h4>
//           <p className="text-gray-500 mt-1">
//             Welcome, {currentUserName}. Manage your own survey data and your
//             team&apos;s data • Edit & Delete enabled
//           </p>
//         </div>
//         <div className="flex flex-col items-start sm:items-end gap-1">
//           <div className="flex gap-2 flex-wrap">
//             <button
//               onClick={() => handleWorkReport("weekly")}
//               disabled={reportLoading !== null}
//               className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
//             >
//               {reportLoading === "weekly" ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <FileSpreadsheet className="w-4 h-4" />
//               )}
//               Weekly Work Report
//             </button>
//             <button
//               onClick={() => handleWorkReport("monthly")}
//               disabled={reportLoading !== null}
//               className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
//             >
//               {reportLoading === "monthly" ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <FileSpreadsheet className="w-4 h-4" />
//               )}
//               Monthly Work Report
//             </button>
//             {showRecords && selectedIds.size > 0 && (
//               <button
//                 onClick={handleBulkDelete}
//                 disabled={bulkDeleting}
//                 className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg disabled:opacity-50 text-sm font-semibold shadow-sm transition"
//               >
//                 {bulkDeleting ? (
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                 ) : (
//                   <Trash2 className="w-4 h-4" />
//                 )}
//                 Delete Selected ({selectedIds.size})
//               </button>
//             )}
//             {showRecords && (
//               <button
//                 onClick={handleExport}
//                 disabled={exporting || total === 0 || searchPending || loading}
//                 title={
//                   searchPending
//                     ? "Search is still updating..."
//                     : `Exports: ${exportLabel}`
//                 }
//                 className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 text-sm"
//               >
//                 {exporting ? (
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                 ) : (
//                   <Download className="w-4 h-4" />
//                 )}
//                 Download Excel
//               </button>
//             )}
//           </div>
//           {showRecords && (
//             <p className="text-xs text-gray-500">
//               Excel will contain:{" "}
//               <span className="font-medium">{exportLabel}</span>
//             </p>
//           )}
//         </div>
//       </div>

//       {/* Main Tabs */}
//       <div className="flex border-b border-gray-200">
//         <button
//           onClick={() => {
//             setMainTab("MY_DATA");
//             setTeamOpen(false);
//             setSelectedMember(null);
//             resetFilters();
//           }}
//           className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//             mainTab === "MY_DATA"
//               ? "border-blue-600 text-blue-600"
//               : "border-transparent text-gray-500 hover:text-gray-700"
//           }`}
//         >
//           <User className="w-4 h-4" />
//           My Survey Data
//         </button>
//         <button
//           onClick={() => {
//             setMainTab("TEAM_DATA");
//             setTeamOpen(false);
//             setSelectedMember(null);
//             resetFilters();
//           }}
//           className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
//             mainTab === "TEAM_DATA"
//               ? "border-blue-600 text-blue-600"
//               : "border-transparent text-gray-500 hover:text-gray-700"
//           }`}
//         >
//           <Users className="w-4 h-4" />
//           My Team&apos;s Survey Data
//         </button>
//       </div>

//       {/* Breadcrumb (team drill-down) */}
//       {mainTab === "TEAM_DATA" && (
//         <div className="flex items-center gap-2 text-sm text-gray-600">
//           <button
//             onClick={backToMembers}
//             className="hover:text-blue-600 font-medium"
//           >
//             My Team
//           </button>
//           {teamOpen && (
//             <>
//               <ChevronRight className="w-4 h-4" />
//               <span className="text-gray-900 font-medium">{viewingName}</span>
//             </>
//           )}
//         </div>
//       )}

//       {message && mainTab === "TEAM_DATA" && (
//         <div
//           className={`p-3 rounded-lg text-sm ${
//             message.type === "success"
//               ? "bg-green-50 text-green-800"
//               : "bg-red-50 text-red-800"
//           }`}
//         >
//           {message.text}
//         </div>
//       )}

//       {/* ===================== TEAM: MEMBERS LIST ===================== */}
//       {mainTab === "TEAM_DATA" && !teamOpen && (
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//           <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
//             <div className="relative flex-1">
//               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//               <input
//                 type="text"
//                 placeholder="Search team members..."
//                 value={teamSearch}
//                 onChange={(e) => setTeamSearch(e.target.value)}
//                 className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//             <button
//               onClick={fetchTeamMembers}
//               disabled={teamLoading}
//               className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
//             >
//               <RefreshCw
//                 className={`w-4 h-4 ${teamLoading ? "animate-spin" : ""}`}
//               />
//               Refresh
//             </button>
//           </div>

//           {/* Whole team row */}
//           <button
//             onClick={() => openMember(null)}
//             className="w-full text-left px-5 py-4 bg-blue-50/50 hover:bg-blue-50 border-b border-gray-100 transition flex items-center justify-between gap-4"
//           >
//             <div className="flex items-center gap-3 min-w-0">
//               <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
//                 <Users className="w-5 h-5" />
//               </div>
//               <div className="min-w-0">
//                 <p className="font-semibold text-gray-900">
//                   All team members
//                 </p>
//                 <p className="text-xs text-gray-500">
//                   {teamMembers.length} member
//                   {teamMembers.length !== 1 ? "s" : ""} • combined records
//                 </p>
//               </div>
//             </div>
//             <div className="flex items-center gap-3 shrink-0">
//               <div className="text-right">
//                 <p className="text-lg font-bold text-blue-600">
//                   {teamTotalRecords}
//                 </p>
//                 <p className="text-xs text-gray-400">records</p>
//               </div>
//               <ChevronRight className="w-5 h-5 text-gray-400" />
//             </div>
//           </button>

//           {teamLoading && teamMembers.length === 0 ? (
//             <div className="flex justify-center py-16">
//               <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//             </div>
//           ) : filteredMembers.length === 0 ? (
//             <div className="text-center py-16 text-gray-500">
//               No team members found
//             </div>
//           ) : (
//             <div className="divide-y divide-gray-100">
//               {filteredMembers.map((member) => (
//                 <button
//                   key={member._id}
//                   onClick={() => openMember(member)}
//                   className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4"
//                 >
//                   <div className="flex items-center gap-3 min-w-0">
//                     <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm shrink-0">
//                       {(member.name || "U").charAt(0).toUpperCase()}
//                     </div>
//                     <div className="min-w-0">
//                       <p className="font-medium text-gray-900 truncate">
//                         {member.name || member.email || "Unknown"}
//                       </p>
//                       <p className="text-xs text-gray-500 truncate">
//                         {member.email}
//                         {member.lastSubmitted &&
//                           ` • Last submitted ${new Date(
//                             member.lastSubmitted
//                           ).toLocaleDateString("en-GB", {
//                             day: "2-digit",
//                             month: "short",
//                             year: "numeric",
//                           })}`}
//                       </p>
//                     </div>
//                   </div>
//                   <div className="flex items-center gap-3 shrink-0">
//                     <div className="text-right">
//                       <p className="text-lg font-bold text-blue-600">
//                         {member.totalRecords}
//                       </p>
//                       <p className="text-xs text-gray-400">records</p>
//                     </div>
//                     <ChevronRight className="w-5 h-5 text-gray-400" />
//                   </div>
//                 </button>
//               ))}
//             </div>
//           )}
//         </div>
//       )}

//       {/* Paste Section (only on My Data) */}
//       {mainTab === "MY_DATA" && (
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
//           <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
//             <FileText className="w-5 h-5" />
//             Paste Survey Data
//           </h2>

//           <div className="flex flex-wrap items-end gap-3 mb-4">
//             <div>
//               <label className="block text-sm font-medium text-gray-700 mb-1">
//                 Upload for date
//               </label>
//               <input
//                 type="date"
//                 value={uploadDate}
//                 max={todayKey}
//                 onChange={(e) => setUploadDate(e.target.value)}
//                 className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
//               />
//             </div>

//             {uploadDate ? (
//               <>
//                 <button
//                   type="button"
//                   onClick={() => setUploadDate("")}
//                   className="text-xs text-blue-600 hover:underline pb-2.5"
//                 >
//                   Reset to today
//                 </button>
//                 <span className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 mb-1">
//                   Records will be saved under{" "}
//                   <strong>
//                     {parseLocalDate(uploadDate).toLocaleDateString("en-GB", {
//                       day: "2-digit",
//                       month: "short",
//                       year: "numeric",
//                     })}
//                   </strong>
//                 </span>
//               </>
//             ) : (
//               <span className="text-xs text-gray-500 pb-2.5">
//                 Leave empty to save under today&apos;s date
//               </span>
//             )}
//           </div>

//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">
//               Paste data — one record, or many separated by a &quot;=====&quot;
//               line
//             </label>
//             <textarea
//               value={paste}
//               onChange={(e) => setPaste(e.target.value)}
//               rows={10}
//               placeholder={BULK_PLACEHOLDER}
//               className="w-full border border-gray-300 rounded-lg px-3 py-2 font-mono text-sm focus:ring-2 focus:ring-blue-500"
//             />
//           </div>

//           <div className="flex items-center justify-between flex-wrap gap-3 mt-4">
//             <p className="text-xs text-gray-500">
//               Supported: <code>Key: Value</code> • <code>Key = Value</code> •{" "}
//               <code>Key - Value</code>
//               {blockPreviewCount > 0 && (
//                 <span className="ml-2 font-medium text-blue-600">
//                   Will create {blockPreviewCount} record
//                   {blockPreviewCount === 1 ? "" : "s"}
//                 </span>
//               )}
//             </p>
//             <button
//               onClick={handlePasteSubmit}
//               disabled={saving}
//               className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
//             >
//               {saving ? (
//                 <Loader2 className="w-4 h-4 animate-spin" />
//               ) : (
//                 <Upload className="w-4 h-4" />
//               )}
//               Save Data
//             </button>
//           </div>

//           {message && (
//             <div
//               className={`mt-4 p-3 rounded-lg text-sm ${
//                 message.type === "success"
//                   ? "bg-green-50 text-green-800"
//                   : "bg-red-50 text-red-800"
//               }`}
//             >
//               {message.text}
//             </div>
//           )}

//           <div className="mt-4 pt-4 border-t">
//             <p className="text-xs font-medium text-gray-500 mb-2">
//               Common fields (click to insert):
//             </p>
//             <div className="flex flex-wrap gap-2">
//               {SUGGESTED_FIELDS.B2C.map((f) => (
//                 <button
//                   key={f}
//                   type="button"
//                   onClick={() => insertField(f)}
//                   className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 px-2 py-1 rounded transition-colors"
//                 >
//                   {f}
//                 </button>
//               ))}
//             </div>
//           </div>
//         </div>
//       )}

//       {/* ===================== RECORDS (My data / one member / whole team) ===================== */}
//       {showRecords && (
//         <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
//           {/* Person header (team drill-down) */}
//           {mainTab === "TEAM_DATA" && (
//             <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between flex-wrap gap-3">
//               <div className="flex items-center gap-3">
//                 <button
//                   onClick={backToMembers}
//                   className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
//                 >
//                   <ArrowLeft className="w-4 h-4" />
//                   Back
//                 </button>
//                 <div>
//                   <p className="font-semibold text-gray-900">{viewingName}</p>
//                   <p className="text-xs text-gray-500">
//                     {selectedMember
//                       ? `${selectedMember.email} • ${selectedMember.totalRecords} records`
//                       : `${teamMembers.length} members • ${teamTotalRecords} records`}
//                   </p>
//                 </div>
//               </div>

//               <select
//                 value={selectedMember?._id || ""}
//                 onChange={(e) => {
//                   const member =
//                     teamMembers.find(
//                       (m) => String(m._id) === String(e.target.value)
//                     ) || null;
//                   setSelectedMember(member);
//                   setPage(1);
//                   setExpandedDates(new Set());
//                   setSelectedIds(new Set());
//                 }}
//                 className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
//                 aria-label="Switch team member"
//               >
//                 <option value="">All team members ({teamTotalRecords})</option>
//                 {teamMembers.map((member) => (
//                   <option key={member._id} value={member._id}>
//                     {member.name || member.email || "Unknown"} (
//                     {member.totalRecords})
//                   </option>
//                 ))}
//               </select>
//             </div>
//           )}

//           {/* Summary stats */}
//           <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
//             <div className="bg-white rounded-lg p-3 border border-blue-100">
//               <p className="text-xs text-gray-500">Total Records</p>
//               <p className="text-xl font-bold text-blue-700">{totalCounts}</p>
//             </div>
//             <div className="bg-white rounded-lg p-3 border border-emerald-100">
//               <p className="text-xs text-gray-500">Active Days</p>
//               <p className="text-xl font-bold text-emerald-700">
//                 {viewLayout === "DATE_GROUPED" ? dateGroups.length : "—"}
//               </p>
//             </div>
//             <div className="bg-white rounded-lg p-3 border border-purple-100">
//               <p className="text-xs text-gray-500">Today</p>
//               <p className="text-xl font-bold text-purple-700">
//                 {viewLayout === "DATE_GROUPED"
//                   ? dateGroups.find((g) => g.dayLabel === "Today")
//                       ?.totalSubmit || 0
//                   : "—"}
//               </p>
//             </div>
//             <div className="bg-white rounded-lg p-3 border border-amber-100">
//               <p className="text-xs text-gray-500">Avg / Day</p>
//               <p className="text-xl font-bold text-amber-700">
//                 {viewLayout === "DATE_GROUPED" && dateGroups.length
//                   ? Math.round(totalCounts / dateGroups.length)
//                   : "—"}
//               </p>
//             </div>
//           </div>

//           {/* Category tabs */}
//           <div className="flex border-b border-gray-200 overflow-x-auto">
//             {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
//               const count = tab === "ALL" ? totalCounts : categoryCounts[tab];
//               const isActive = activeTab === tab;

//               return (
//                 <button
//                   key={tab}
//                   onClick={() => {
//                     setActiveTab(tab);
//                     setPage(1);
//                     setExpandedDates(new Set());
//                     setSelectedIds(new Set());
//                   }}
//                   className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
//                     isActive
//                       ? "border-blue-600 text-blue-600"
//                       : "border-transparent text-gray-500 hover:text-gray-700"
//                   }`}
//                 >
//                   <span>{tab}</span>
//                   <span
//                     className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${
//                       isActive
//                         ? "bg-blue-100 text-blue-700"
//                         : "bg-gray-100 text-gray-600"
//                     }`}
//                   >
//                     {count}
//                   </span>
//                 </button>
//               );
//             })}
//           </div>

//           {/* Search + dates + sort + layout */}
//           <div className="p-4 space-y-3 border-b border-gray-100">
//             <div className="flex flex-col sm:flex-row gap-3">
//               {/* Search */}
//               <div className="relative flex-1">
//                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
//                 <input
//                   type="search"
//                   value={searchInput}
//                   onChange={(e) => setSearchInput(e.target.value)}
//                   onKeyDown={(e) => {
//                     if (e.key === "Escape") {
//                       setSearchInput("");
//                       setSearch("");
//                       setPage(1);
//                       setSearchLoading(false);
//                     }
//                   }}
//                   placeholder="Search user name, email, PID, project, supplier, country, IP, status or survey fields..."
//                   className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
//                   aria-label="Search survey data"
//                 />
//                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
//                   {searchLoading && (
//                     <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
//                   )}
//                   {searchInput && (
//                     <button
//                       type="button"
//                       onClick={() => {
//                         setSearchInput("");
//                         setSearch("");
//                         setPage(1);
//                         setSearchLoading(false);
//                       }}
//                       className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
//                       title="Clear search"
//                       aria-label="Clear search"
//                     >
//                       <X className="w-4 h-4" />
//                     </button>
//                   )}
//                 </div>
//               </div>

//               {/* From */}
//               <div className="flex items-center gap-2">
//                 <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
//                   From
//                 </label>
//                 <input
//                   type="date"
//                   value={dateFrom}
//                   max={dateTo || todayKey}
//                   onChange={(e) => {
//                     setDateFrom(e.target.value);
//                     setPage(1);
//                     setExpandedDates(new Set());
//                     setSelectedIds(new Set());
//                   }}
//                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               {/* To */}
//               <div className="flex items-center gap-2">
//                 <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
//                   To
//                 </label>
//                 <input
//                   type="date"
//                   value={dateTo}
//                   min={dateFrom || undefined}
//                   max={todayKey}
//                   onChange={(e) => {
//                     setDateTo(e.target.value);
//                     setPage(1);
//                     setExpandedDates(new Set());
//                     setSelectedIds(new Set());
//                   }}
//                   className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
//                 />
//               </div>

//               {(dateFrom || dateTo) && (
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setDateFrom("");
//                     setDateTo("");
//                     setPage(1);
//                     setExpandedDates(new Set());
//                     setSelectedIds(new Set());
//                   }}
//                   className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
//                 >
//                   Clear Date
//                 </button>
//               )}
//             </div>

//             <div className="flex flex-col sm:flex-row sm:items-center gap-3">
//               {viewLayout === "FLAT" && (
//                 <div className="flex gap-2">
//                   <select
//                     value={sortBy}
//                     onChange={(e) => {
//                       setSortBy(e.target.value);
//                       setPage(1);
//                     }}
//                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                   >
//                     <option value="createdAt">Created Date</option>
//                     <option value="updatedAt">Updated Date</option>
//                     <option value="category">Category</option>
//                   </select>
//                   <select
//                     value={sortOrder}
//                     onChange={(e) => {
//                       setSortOrder(e.target.value as "asc" | "desc");
//                       setPage(1);
//                     }}
//                     className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                   >
//                     <option value="desc">Newest first</option>
//                     <option value="asc">Oldest first</option>
//                   </select>
//                 </div>
//               )}

//               {/* Layout toggle */}
//               <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden self-start">
//                 <button
//                   onClick={() => {
//                     setViewLayout("DATE_GROUPED");
//                     setPage(1);
//                     setSelectedIds(new Set());
//                   }}
//                   className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
//                     viewLayout === "DATE_GROUPED"
//                       ? "bg-blue-600 text-white"
//                       : "bg-white text-gray-600 hover:bg-gray-50"
//                   }`}
//                 >
//                   <Calendar className="w-3.5 h-3.5" />
//                   By Date
//                 </button>
//                 <button
//                   onClick={() => {
//                     setViewLayout("FLAT");
//                     setPage(1);
//                     setSelectedIds(new Set());
//                   }}
//                   className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
//                     viewLayout === "FLAT"
//                       ? "bg-blue-600 text-white"
//                       : "bg-white text-gray-600 hover:bg-gray-50"
//                   }`}
//                 >
//                   <List className="w-3.5 h-3.5" />
//                   Flat List
//                 </button>
//               </div>

//               <span className="text-xs text-gray-500 sm:ml-auto">
//                 {dateFrom && dateTo
//                   ? `Showing data from ${dateFrom} to ${dateTo}`
//                   : dateFrom
//                     ? `Showing data from ${dateFrom}`
//                     : dateTo
//                       ? `Showing data until ${dateTo}`
//                       : "Showing all dates"}
//                 {search && (
//                   <span className="ml-2 text-blue-600 font-medium">
//                     Searching: &quot;{search}&quot;
//                   </span>
//                 )}
//               </span>
//             </div>
//           </div>

//           {/* Selection and bulk action bar */}
//           {items.length > 0 && (
//             <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-gray-200">
//               <div className="flex items-center gap-3">
//                 <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-700">
//                   <input
//                     type="checkbox"
//                     checked={allVisibleSelected}
//                     ref={(el) => {
//                       if (el) {
//                         el.indeterminate =
//                           someVisibleSelected && !allVisibleSelected;
//                       }
//                     }}
//                     onChange={() => toggleSelectMany(items)}
//                     className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
//                   />
//                   <span>
//                     {allVisibleSelected
//                       ? "Deselect all visible"
//                       : `Select all visible (${items.length})`}
//                   </span>
//                 </label>

//                 {selectedIds.size > 0 && (
//                   <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
//                     {selectedIds.size} selected
//                   </span>
//                 )}
//               </div>

//               {selectedIds.size > 0 && (
//                 <div className="flex items-center gap-2">
//                   <button
//                     type="button"
//                     onClick={clearSelection}
//                     className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-white transition"
//                   >
//                     Clear selection
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleBulkDelete}
//                     disabled={bulkDeleting}
//                     className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
//                   >
//                     {bulkDeleting ? (
//                       <Loader2 className="w-3.5 h-3.5 animate-spin" />
//                     ) : (
//                       <Trash2 className="w-3.5 h-3.5" />
//                     )}
//                     Delete Selected ({selectedIds.size})
//                   </button>
//                 </div>
//               )}
//             </div>
//           )}

//           {/* Records */}
//           <div>
//             {loading ? (
//               <div className="flex justify-center py-16">
//                 <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
//               </div>
//             ) : items.length === 0 ? (
//               <div className="text-center py-16 text-gray-500">
//                 No records found.
//                 {mainTab === "MY_DATA" && " Paste some data above."}
//               </div>
//             ) : viewLayout === "DATE_GROUPED" ? (
//               <div className="divide-y divide-gray-100">
//                 {dateGroups.map((group) => {
//                   const isOpen = expandedDates.has(group.date);
//                   const groupIds = group.items.map((i) => i._id);
//                   const isGroupAllSelected =
//                     groupIds.length > 0 &&
//                     groupIds.every((id) => selectedIds.has(id));
//                   const isGroupSomeSelected =
//                     groupIds.some((id) => selectedIds.has(id)) &&
//                     !isGroupAllSelected;

//                   return (
//                     <div key={group.date}>
//                       <div
//                         onClick={() => toggleDate(group.date)}
//                         className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4 cursor-pointer select-none"
//                       >
//                         <div className="flex items-center gap-3">
//                           <div
//                             onClick={(e) => e.stopPropagation()}
//                             className="flex items-center justify-center p-0.5"
//                             title={
//                               isGroupAllSelected
//                                 ? `Deselect all ${group.items.length} records in ${group.dayLabel}`
//                                 : `Select all ${group.items.length} records in ${group.dayLabel}`
//                             }
//                           >
//                             <input
//                               type="checkbox"
//                               checked={isGroupAllSelected}
//                               ref={(el) => {
//                                 if (el) el.indeterminate = isGroupSomeSelected;
//                               }}
//                               onChange={() => toggleSelectMany(group.items)}
//                               className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
//                               aria-label={`Select all records for ${group.dayLabel}`}
//                             />
//                           </div>
//                           <div
//                             className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
//                               group.dayLabel === "Today"
//                                 ? "bg-emerald-100 text-emerald-700"
//                                 : group.dayLabel === "Yesterday"
//                                   ? "bg-amber-100 text-amber-700"
//                                   : "bg-indigo-100 text-indigo-700"
//                             }`}
//                           >
//                             {group.totalSubmit}
//                           </div>
//                           <div>
//                             <p className="font-semibold text-gray-900">
//                               {group.dayLabel}
//                               <span className="ml-2 text-xs font-normal text-gray-500">
//                                 • {viewingName}
//                               </span>
//                             </p>
//                             <p className="text-xs text-gray-500 mt-0.5">
//                               {group.totalSubmit} submission
//                               {group.totalSubmit !== 1 ? "s" : ""}
//                             </p>
//                           </div>
//                         </div>
//                         <div className="flex items-center gap-3">
//                           <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
//                             {group.totalSubmit}
//                           </span>
//                           <ChevronRight
//                             className={`w-5 h-5 text-gray-400 transition-transform ${
//                               isOpen ? "rotate-90" : ""
//                             }`}
//                           />
//                         </div>
//                       </div>

//                       {isOpen && (
//                         <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
//                           {group.items.map((item) =>
//                             renderRecordCard(item, true)
//                           )}
//                         </div>
//                       )}
//                     </div>
//                   );
//                 })}
//               </div>
//             ) : (
//               <div className="divide-y divide-gray-100">
//                 {items.map((item) => renderRecordCard(item))}
//               </div>
//             )}
//           </div>

//           {/* Pagination (flat list only) */}
//           {viewLayout === "FLAT" && totalPages > 1 && (
//             <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
//               <p className="text-sm text-gray-500">
//                 Page {page} of {totalPages} ({total} rows)
//               </p>
//               <div className="flex gap-2">
//                 <button
//                   disabled={page === 1}
//                   onClick={() => {
//                     setPage((p) => p - 1);
//                     setSelectedIds(new Set());
//                   }}
//                   className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
//                 >
//                   Previous
//                 </button>
//                 <button
//                   disabled={page === totalPages}
//                   onClick={() => {
//                     setPage((p) => p + 1);
//                     setSelectedIds(new Set());
//                   }}
//                   className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
//                 >
//                   Next
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       )}

//       {/* ========== EDIT MODAL ========== */}
//       {editingItem && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
//           <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
//             <div className="flex items-center justify-between px-6 py-4 border-b">
//               <h3 className="text-lg font-semibold">Edit Survey Record</h3>
//               <button
//                 onClick={() => setEditingItem(null)}
//                 className="p-1 rounded hover:bg-gray-100"
//               >
//                 <X className="w-5 h-5" />
//               </button>
//             </div>

//             <div className="p-6 space-y-4">
//               <div>
//                 <label className="block text-sm font-medium text-gray-700 mb-1">
//                   Category
//                 </label>
//                 <select
//                   value={editForm.category || "B2C"}
//                   onChange={(e) =>
//                     setEditForm((p) => ({
//                       ...p,
//                       category: e.target.value as SurveyCategory,
//                     }))
//                   }
//                   className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                 >
//                   <option value="B2B">B2B</option>
//                   <option value="B2H">B2H</option>
//                   <option value="B2C">B2C</option>
//                 </select>
//               </div>

//               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
//                 {[
//                   { key: "accountType", label: "Account Type" },
//                   { key: "projectNo", label: "Project No" },
//                   { key: "panelCode", label: "Panel Code" },
//                   { key: "description", label: "Description" },
//                   { key: "pid", label: "PID" },
//                   { key: "supplierId", label: "Supplier ID" },
//                   { key: "country", label: "Country / Location" },
//                   { key: "ip", label: "IP" },
//                   { key: "status", label: "Status" },
//                 ].map(({ key, label }) => (
//                   <div key={key}>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">
//                       {label}
//                     </label>
//                     <input
//                       type="text"
//                       value={(editForm as any)[key] || ""}
//                       onChange={(e) =>
//                         setEditForm((p) => ({ ...p, [key]: e.target.value }))
//                       }
//                       className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
//                     />
//                   </div>
//                 ))}
//               </div>

//               <div>
//                 <div className="flex items-center justify-between mb-2">
//                   <label className="block text-sm font-medium text-gray-700">
//                     Survey Data Fields
//                   </label>
//                   <button
//                     type="button"
//                     onClick={addDataField}
//                     className="text-xs text-blue-600 hover:underline"
//                   >
//                     + Add field
//                   </button>
//                 </div>
//                 <div className="space-y-2 max-h-48 overflow-y-auto">
//                   {Object.entries(editForm.data || {}).map(([k, v]) => (
//                     <div key={k} className="flex gap-2 items-center">
//                       <input
//                         type="text"
//                         value={k}
//                         disabled
//                         className="w-1/3 border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50"
//                       />
//                       <input
//                         type="text"
//                         value={v}
//                         onChange={(e) => updateDataField(k, e.target.value)}
//                         className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
//                       />
//                       <button
//                         type="button"
//                         onClick={() => removeDataField(k)}
//                         className="p-1 text-red-500 hover:bg-red-50 rounded"
//                       >
//                         <Trash2 className="w-4 h-4" />
//                       </button>
//                     </div>
//                   ))}
//                   {Object.keys(editForm.data || {}).length === 0 && (
//                     <p className="text-xs text-gray-400">No data fields</p>
//                   )}
//                 </div>
//               </div>
//             </div>

//             <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
//               <button
//                 onClick={() => setEditingItem(null)}
//                 className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
//               >
//                 Cancel
//               </button>
//               <button
//                 onClick={handleEditSave}
//                 disabled={editSaving}
//                 className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
//               >
//                 {editSaving ? (
//                   <Loader2 className="w-4 h-4 animate-spin" />
//                 ) : (
//                   <Save className="w-4 h-4" />
//                 )}
//                 Save Changes
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }


"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import {
  Upload,
  Download,
  Search,
  Loader2,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  Users,
  User,
  X,
  Save,
  RefreshCw,
  ArrowLeft,
  ChevronRight,
  Calendar,
  List,
} from "lucide-react";
import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

/* ==================================================
   TYPES
================================================== */
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
  createdBy?: any; // id string, or populated { _id, name, email }
}

interface TeamMemberSummary {
  _id: string;
  name: string;
  email: string;
  role: string;
  totalRecords: number;
  lastSubmitted: string;
  categories: string[];
}

interface DateGroup {
  date: string; // YYYY-MM-DD (browser local calendar date)
  dayLabel: string; // Today / Yesterday / Mon, 15 Jan 2026
  totalSubmit: number;
  items: SurveyItem[];
}

type MainTab = "MY_DATA" | "TEAM_DATA";
type CategoryTab = SurveyCategory | "ALL";
type ViewLayout = "DATE_GROUPED" | "FLAT";

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

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "member";

interface SurveyPageTeamLeadProps {
  currentUserId: string;
  currentUserName?: string;
}

/* ==================================================
   HELPERS
================================================== */

const pad = (n: number) => String(n).padStart(2, "0");

// Browser-local calendar date (YYYY-MM-DD) - same rule as the Admin view.
const toLocalDateKey = (input: Date | string = new Date()) => {
  const d = typeof input === "string" ? new Date(input) : input;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const getDateKey = (input: Date | string = new Date()) =>
  toLocalDateKey(input);

const getTodayKey = () => toLocalDateKey(new Date());

const getYesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return toLocalDateKey(d);
};

const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);

// One saved row can represent several submissions through its Counts field.
function getSurveyCount(item: SurveyItem): number {
  const raw =
    item?.data?.Counts ??
    item?.data?.counts ??
    (item as SurveyItem & { counts?: unknown })?.counts ??
    1;
  const count = Number(raw);
  return Number.isFinite(count) && count > 0 ? Math.floor(count) : 1;
}

/* ==================================================
   COMPONENT
================================================== */
export default function SurveyPageTeamLead({
  currentUserId,
  currentUserName = "Team Lead",
}: SurveyPageTeamLeadProps) {
  const [mainTab, setMainTab] = useState<MainTab>("MY_DATA");

  // Team navigation: members list  ->  records (one member, or whole team)
  const [teamOpen, setTeamOpen] = useState(false);
  const [selectedMember, setSelectedMember] =
    useState<TeamMemberSummary | null>(null);
  const [teamSearch, setTeamSearch] = useState("");

  const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  // Recomputed on every render so "Today" never goes stale past midnight.
  const todayKey = getTodayKey();
  const [uploadDate, setUploadDate] = useState(""); // "" = today
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reportLoading, setReportLoading] = useState<
    "weekly" | "monthly" | null
  >(null);

  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchLoading, setSearchLoading] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0); // saved rows
  const [totalCounts, setTotalCounts] = useState(0); // SUM(Counts)
  const [categoryCounts, setCategoryCounts] = useState({
    B2B: 0,
    B2H: 0,
    B2C: 0,
  });

  // Layout + date grouping
  const [viewLayout, setViewLayout] = useState<ViewLayout>("DATE_GROUPED");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());

  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Edit / Delete
  const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Bulk selection & deletion
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Records are visible on "My data", or inside the team drill-down.
  const showRecords = mainTab === "MY_DATA" || teamOpen;

  /* ==================================================
     SEARCH (debounced)
  ================================================== */
  useEffect(() => {
    const value = searchInput.trim();

    if (value === search) {
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);

    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(value);
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput, search]);

  // Ignore responses from outdated requests (fast tab / member switching).
  const dataRequestId = useRef(0);

  const memberNameById = useMemo(() => {
    const map = new Map<string, string>();
    teamMembers.forEach((m) => map.set(String(m._id), m.name));
    return map;
  }, [teamMembers]);

  const teamTotalRecords = useMemo(
    () => teamMembers.reduce((sum, m) => sum + (m.totalRecords || 0), 0),
    [teamMembers]
  );

  const filteredMembers = useMemo(() => {
    const q = teamSearch.trim().toLowerCase();
    if (!q) return teamMembers;
    return teamMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(q) || m.email?.toLowerCase().includes(q)
    );
  }, [teamMembers, teamSearch]);

  /**
   * One place that decides WHOSE data every request is about, so the screen
   * and the Excel file can never disagree.
   *
   *  My Survey Data            -> createdBy = me
   *  Team, one member picked   -> createdBy = that member
   *  Team, whole team          -> scope = team  (server resolves the team)
   */
  const applyScope = useCallback(
    (params: URLSearchParams) => {
      if (mainTab === "MY_DATA") {
        params.set("createdBy", String(currentUserId));
        return;
      }

      if (selectedMember?._id) {
        params.set("createdBy", String(selectedMember._id));
        return;
      }

      params.set("scope", "team");
    },
    [mainTab, selectedMember, currentUserId]
  );

  const applyDates = useCallback(
    (params: URLSearchParams) => {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    },
    [dateFrom, dateTo]
  );

  /* ==================================================
     FETCH: category counts
  ================================================== */
  const fetchCategoryCounts = useCallback(async () => {
    if (!showRecords) return;

    try {
      const categories = ["B2B", "B2H", "B2C"] as const;

      const results = await Promise.all(
        categories.map(async (category) => {
          const params = new URLSearchParams();
          params.set("page", "1");
          params.set("limit", "1");
          params.set("sortBy", "createdAt");
          params.set("sortOrder", "desc");
          params.set("category", category);

          applyScope(params);
          applyDates(params);

          const cleanSearch = search.trim();
          if (cleanSearch) params.set("search", cleanSearch);

          const res = await fetch(`/api/survey?${params.toString()}`, {
            method: "GET",
            cache: "no-store",
          });

          if (!res.ok) throw new Error(`Failed to fetch ${category} count`);

          const json = await res.json();

          return {
            category,
            count: json.success
              ? Number(json.pagination?.totalCounts ?? json.pagination?.total) ||
                0
              : 0,
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
  }, [applyScope, applyDates, search, showRecords]);

  /* ==================================================
     FETCH: records
     DATE_GROUPED -> every matching row (limit=0), grouped client-side
     FLAT         -> 20 rows per page
  ================================================== */
  const fetchData = useCallback(async () => {
    if (!showRecords) return;

    const requestId = ++dataRequestId.current;

    try {
      setLoading(true);

      const params = new URLSearchParams();

      if (viewLayout === "DATE_GROUPED") {
        params.set("page", "1");
        params.set("limit", "0");
        params.set("sortBy", "createdAt");
        params.set("sortOrder", "desc");
      } else {
        params.set("page", String(page));
        params.set("limit", "20");
        params.set("sortBy", sortBy);
        params.set("sortOrder", sortOrder);
      }

      applyScope(params);
      applyDates(params);

      if (activeTab !== "ALL") params.set("category", activeTab);

      const cleanSearch = search.trim();
      if (cleanSearch) params.set("search", cleanSearch);

      const res = await fetch(`/api/survey?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      const json = await res.json();

      if (requestId !== dataRequestId.current) return;

      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to fetch survey data");
      }

      const pagination = json.pagination || {};

      setItems(Array.isArray(json.data) ? json.data : []);
      setTotal(Number(pagination.total) || 0);
      setTotalCounts(Number(pagination.totalCounts) || 0);
      setTotalPages(Math.max(1, Number(pagination.totalPages) || 1));
    } catch (err) {
      if (requestId !== dataRequestId.current) return;

      console.error("Survey fetch error:", err);
      setItems([]);
      setTotalPages(1);
      setTotal(0);
      setTotalCounts(0);
    } finally {
      if (requestId === dataRequestId.current) {
        setLoading(false);
        setSearchLoading(false);
      }
    }
  }, [
    showRecords,
    viewLayout,
    applyScope,
    applyDates,
    activeTab,
    page,
    sortBy,
    sortOrder,
    search,
  ]);

  /* ==================================================
     FETCH: team members (this team lead's team only)
  ================================================== */
  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const params = new URLSearchParams({ teamLeadId: currentUserId });

      const res = await fetch(`/api/survey/team-members?${params}`);
      const json = await res.json();

      if (json.success) setTeamMembers(json.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTeamLoading(false);
    }
  }, [currentUserId]);

  const refreshAll = () => {
    fetchData();
    fetchCategoryCounts();
    if (mainTab === "TEAM_DATA") fetchTeamMembers();
  };

  useEffect(() => {
    fetchData();
    fetchCategoryCounts();
  }, [fetchData, fetchCategoryCounts]);

  useEffect(() => {
    if (mainTab === "TEAM_DATA") fetchTeamMembers();
  }, [mainTab, fetchTeamMembers]);

  /* ==================================================
     DATE GROUPS (browser-local calendar date, same as Admin)
  ================================================== */
  const dateGroups = useMemo<DateGroup[]>(() => {
    const map = new Map<string, SurveyItem[]>();

    items.forEach((item) => {
      const key = getDateKey(item.createdAt);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    const yesterdayKey = getYesterdayKey();

    return Array.from(map.entries())
      .map(([date, dayItems]) => {
        let dayLabel: string;
        if (date === todayKey) dayLabel = "Today";
        else if (date === yesterdayKey) dayLabel = "Yesterday";
        else
          dayLabel = parseLocalDate(date).toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          });

        return {
          date,
          dayLabel,
          totalSubmit: dayItems.reduce((s, i) => s + getSurveyCount(i), 0),
          items: [...dayItems].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          ),
        };
      })
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [items, todayKey]);

  // Auto-expand today's group when nothing is expanded yet
  useEffect(() => {
    if (dateGroups.length > 0 && expandedDates.size === 0) {
      const todayGroup = dateGroups.find((g) => g.dayLabel === "Today");
      if (todayGroup) setExpandedDates(new Set([todayGroup.date]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateGroups]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  /* ==================================================
     NAVIGATION
  ================================================== */
  const resetFilters = () => {
    setPage(1);
    setActiveTab("ALL");
    setSearchInput("");
    setSearch("");
    setDateFrom("");
    setDateTo("");
    setExpandedDates(new Set());
    setSelectedIds(new Set());
  };

  const openMember = (member: TeamMemberSummary | null) => {
    setSelectedMember(member);
    setTeamOpen(true);
    resetFilters();
  };

  const backToMembers = () => {
    setTeamOpen(false);
    setSelectedMember(null);
    resetFilters();
  };

  /* ==================================================
     PASTE / SAVE
  ================================================== */
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
        body: JSON.stringify({
          paste,
          surveyDate: uploadDate || undefined,
        }),
      });

      const json = await res.json();

      if (json.success) {
        setMessage({
          type: "success",
          text: `${json.message}${uploadDate ? ` for ${uploadDate}` : ""}${
            json.errors?.length
              ? ` (${json.errors.length} block(s) skipped)`
              : ""
          }`,
        });
        setPaste("");
        setUploadDate("");
        refreshAll();
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

  /* ==================================================
     EXPORT (follows the current selection)
  ================================================== */
  const searchPending = searchInput.trim() !== search;

  const exportScopeLabel =
    mainTab === "MY_DATA"
      ? "My data"
      : selectedMember
        ? selectedMember.name
        : "All team members";

  const exportLabel = [
    exportScopeLabel,
    activeTab === "ALL" ? "All categories" : activeTab,
    search.trim() ? `Search: "${search.trim()}"` : "All matching records",
  ].join(" • ");

  const handleExport = async () => {
    try {
      const cleanSearch = search.trim();

      if (searchPending) {
        alert("Search is still updating. Please wait a moment.");
        return;
      }

      if (total <= 0) {
        alert(
          cleanSearch
            ? `No records found for search: "${cleanSearch}"`
            : "No records available for the current filters."
        );
        return;
      }

      setExporting(true);

      const params = new URLSearchParams();

      // Exactly the same scope as the screen.
      applyScope(params);
      applyDates(params);

      if (activeTab !== "ALL") params.set("category", activeTab);
      if (cleanSearch) params.set("search", cleanSearch);

      // All matching records, not only the current page.
      params.set("range", "all");

      const res = await fetch(`/api/survey/export?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Survey export failed:", res.status, errorText);
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      if (!blob.size) throw new Error("Downloaded Excel file is empty.");

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");

      const scopeSlug =
        mainTab === "MY_DATA"
          ? "mine"
          : selectedMember
            ? slug(selectedMember.name)
            : "team";
      const searchSlug = cleanSearch
        ? `-${slug(cleanSearch).slice(0, 50)}`
        : "";
      const categorySlug = activeTab === "ALL" ? "all" : activeTab.toLowerCase();

      a.href = url;
      a.download = `survey-${scopeSlug}-${categorySlug}${searchSlug}-full-data.xlsx`;

      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Excel download error:", error);
      alert(
        error instanceof Error ? error.message : "Failed to download Excel"
      );
    } finally {
      setExporting(false);
    }
  };

  const handleWorkReport = async (range: "weekly" | "monthly") => {
    try {
      setReportLoading(range);
      const res = await fetch(
        `/api/survey/work-report?range=${range}&teamLeadId=${currentUserId}`
      );
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

  /* ==================================================
     EDIT
  ================================================== */
  const openEdit = (item: SurveyItem) => {
    setEditingItem(item);
    setEditForm({
      category: item.category,
      accountType: item.accountType || "",
      projectNo: item.projectNo || "",
      panelCode: item.panelCode || "",
      description: item.description || "",
      pid: item.pid || "",
      supplierId: item.supplierId || "",
      country: item.country || "",
      ip: item.ip || "",
      status: item.status || "",
      data: { ...item.data },
    });
  };

  const handleEditSave = async () => {
    if (!editingItem) return;

    try {
      setEditSaving(true);
      const res = await fetch(`/api/survey/${editingItem._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const json = await res.json();

      if (json.success) {
        setEditingItem(null);
        refreshAll();
        setMessage({ type: "success", text: "Record updated successfully" });
      } else {
        setMessage({ type: "error", text: json.message || "Update failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Update failed" });
    } finally {
      setEditSaving(false);
    }
  };

  /* ==================================================
     DELETE
  ================================================== */
  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this survey record? This cannot be undone."
      )
    ) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/survey/${id}`, { method: "DELETE" });
      const json = await res.json();

      if (json.success) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        refreshAll();
        setMessage({ type: "success", text: "Record deleted successfully" });
      } else {
        setMessage({ type: "error", text: json.message || "Delete failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  };

  /* ==================================================
     BULK SELECT / DELETE
  ================================================== */
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectMany = (list: SurveyItem[]) => {
    const ids = list.map((i) => i._id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const count = selectedIds.size;
    if (
      !confirm(
        `Are you sure you want to permanently delete ${count} selected survey record${
          count > 1 ? "s" : ""
        }? This cannot be undone.`
      )
    ) {
      return;
    }

    try {
      setBulkDeleting(true);
      const res = await fetch("/api/survey/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIds(new Set());
        refreshAll();
        setMessage({
          type: "success",
          text:
            json.message ||
            `Successfully deleted ${count} survey record${count > 1 ? "s" : ""}`,
        });
      } else {
        setMessage({
          type: "error",
          text: json.message || "Bulk delete failed",
        });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err?.message || "Bulk delete failed" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const updateDataField = (key: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      data: { ...(prev.data || {}), [key]: value },
    }));
  };

  const addDataField = () => {
    const key = prompt("Enter field name:");
    if (!key?.trim()) return;
    updateDataField(key.trim(), "");
  };

  const removeDataField = (key: string) => {
    setEditForm((prev) => {
      const next = { ...(prev.data || {}) };
      delete next[key];
      return { ...prev, data: next };
    });
  };

  // Who submitted this record.
  const getSubmitterInfo = (
    item: SurveyItem
  ): { name: string; email?: string } => {
    const raw = item.createdBy;

    if (raw && typeof raw === "object") {
      const id = String(raw._id || "");
      return {
        name:
          raw.name ||
          raw.fullName ||
          raw.username ||
          memberNameById.get(id) ||
          (id === String(currentUserId) ? currentUserName : "") ||
          "Unknown user",
        email: raw.email || undefined,
      };
    }

    const id = String(raw || "");

    if (id === String(currentUserId)) {
      return { name: currentUserName || "Me" };
    }

    const member = teamMembers.find((m) => String(m._id) === id);

    if (member) {
      return {
        name: member.name || member.email || "Unknown user",
        email: member.email || undefined,
      };
    }

    return { name: id ? `User ${id.slice(-6)}` : "Unknown user" };
  };

  /* ==================================================
     RECORD CARD
  ================================================== */
  const renderRecordCard = (item: SurveyItem, indented = false) => {
    const isSelected = selectedIds.has(item._id);
    const hasHeader = item.accountType || item.projectNo || item.description;
    const hasMeta =
      item.pid || item.supplierId || item.country || item.ip || item.status;

    // Name chip only where the owner isn't already obvious from the screen.
    const showSubmitter =
      mainTab === "TEAM_DATA" && !selectedMember;
    const submitter = showSubmitter ? getSubmitterInfo(item) : null;

    return (
      <div
        key={item._id}
        className={`px-4 py-4 transition-colors ${
          isSelected
            ? "bg-blue-50/80 border-l-4 border-l-blue-600 pl-3"
            : indented
              ? "pl-16 bg-gray-50/50 hover:bg-gray-50"
              : "hover:bg-gray-50"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2.5 flex-wrap">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelect(item._id)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
              aria-label={`Select record ${item._id}`}
            />
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
            >
              {item.category}
            </span>
            {submitter && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100"
                title={submitter.email || "Submitted by user"}
              >
                <User className="w-3.5 h-3.5" />
                <span>{submitter.name}</span>
                {submitter.email && (
                  <span className="font-normal text-indigo-500">
                    • {submitter.email}
                  </span>
                )}
              </span>
            )}
            {hasHeader && (
              <span className="text-sm font-medium text-gray-800">
                {[item.accountType, item.projectNo].filter(Boolean).join(" ")}
                {item.description ? ` - ${item.description}` : ""}
                {item.panelCode ? ` || ${item.panelCode}` : ""}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {indented
                ? new Date(item.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : `${new Date(item.createdAt).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}, ${new Date(item.createdAt).toLocaleTimeString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
            </span>

            <button
              onClick={() => openEdit(item)}
              className="p-1.5 rounded hover:bg-blue-50 text-blue-600"
              title="Edit"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item._id)}
              disabled={deletingId === item._id}
              className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
              title="Delete"
            >
              {deletingId === item._id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {Object.keys(item.data || {}).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {Object.entries(item.data).map(([k, v]) => (
              <span key={k} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                <span className="text-gray-500">{k}:</span> {v}
              </span>
            ))}
          </div>
        )}

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
  };

  /* ==================================================
     RENDER
  ================================================== */
  const allVisibleSelected =
    items.length > 0 && items.every((i) => selectedIds.has(i._id));
  const someVisibleSelected = items.some((i) => selectedIds.has(i._id));

  const viewingName =
    mainTab === "MY_DATA"
      ? currentUserName
      : selectedMember
        ? selectedMember.name
        : "All team members";

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-2xl font-bold text-gray-900">
            Survey Data Module – Team Lead
          </h4>
          <p className="text-gray-500 mt-1">
            Welcome, {currentUserName}. Manage your own survey data and your
            team&apos;s data • Edit & Delete enabled
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => handleWorkReport("weekly")}
              disabled={reportLoading !== null}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
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
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
            >
              {reportLoading === "monthly" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              Monthly Work Report
            </button>
            {showRecords && selectedIds.size > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 active:bg-red-800 text-white rounded-lg disabled:opacity-50 text-sm font-semibold shadow-sm transition"
              >
                {bulkDeleting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Delete Selected ({selectedIds.size})
              </button>
            )}
            {showRecords && (
              <button
                onClick={handleExport}
                disabled={exporting || total === 0 || searchPending || loading}
                title={
                  searchPending
                    ? "Search is still updating..."
                    : `Exports: ${exportLabel}`
                }
                className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 text-sm"
              >
                {exporting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download Excel
              </button>
            )}
          </div>
          {showRecords && (
            <p className="text-xs text-gray-500">
              Excel will contain:{" "}
              <span className="font-medium">{exportLabel}</span>
            </p>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setMainTab("MY_DATA");
            setTeamOpen(false);
            setSelectedMember(null);
            resetFilters();
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            mainTab === "MY_DATA"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <User className="w-4 h-4" />
          My Survey Data
        </button>
        <button
          onClick={() => {
            setMainTab("TEAM_DATA");
            setTeamOpen(false);
            setSelectedMember(null);
            resetFilters();
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
            mainTab === "TEAM_DATA"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          <Users className="w-4 h-4" />
          My Team&apos;s Survey Data
        </button>
      </div>

      {/* Breadcrumb (team drill-down) */}
      {mainTab === "TEAM_DATA" && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button
            onClick={backToMembers}
            className="hover:text-blue-600 font-medium"
          >
            My Team
          </button>
          {teamOpen && (
            <>
              <ChevronRight className="w-4 h-4" />
              <span className="text-gray-900 font-medium">{viewingName}</span>
            </>
          )}
        </div>
      )}

      {message && mainTab === "TEAM_DATA" && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ===================== TEAM: MEMBERS LIST ===================== */}
      {mainTab === "TEAM_DATA" && !teamOpen && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search team members..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={fetchTeamMembers}
              disabled={teamLoading}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${teamLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Whole team row */}
          <button
            onClick={() => openMember(null)}
            className="w-full text-left px-5 py-4 bg-blue-50/50 hover:bg-blue-50 border-b border-gray-100 transition flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-gray-900">
                  All team members
                </p>
                <p className="text-xs text-gray-500">
                  {teamMembers.length} member
                  {teamMembers.length !== 1 ? "s" : ""} • combined records
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-lg font-bold text-blue-600">
                  {teamTotalRecords}
                </p>
                <p className="text-xs text-gray-400">records</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          {teamLoading && teamMembers.length === 0 ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              No team members found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredMembers.map((member) => (
                <button
                  key={member._id}
                  onClick={() => openMember(member)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {(member.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {member.name || member.email || "Unknown"}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.email}
                        {member.lastSubmitted &&
                          ` • Last submitted ${new Date(
                            member.lastSubmitted
                          ).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {member.totalRecords}
                      </p>
                      <p className="text-xs text-gray-400">records</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Paste Section (only on My Data) */}
      {mainTab === "MY_DATA" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Paste Survey Data
          </h2>

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
                Leave empty to save under today&apos;s date
              </span>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste data — one record, or many separated by a &quot;=====&quot;
              line
            </label>
            <textarea
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              rows={10}
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
      )}

      {/* ===================== RECORDS (My data / one member / whole team) ===================== */}
      {showRecords && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Person header (team drill-down) */}
          {mainTab === "TEAM_DATA" && (
            <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={backToMembers}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
                <div>
                  <p className="font-semibold text-gray-900">{viewingName}</p>
                  <p className="text-xs text-gray-500">
                    {selectedMember
                      ? `${selectedMember.email} • ${selectedMember.totalRecords} records`
                      : `${teamMembers.length} members • ${teamTotalRecords} records`}
                  </p>
                </div>
              </div>

              <select
                value={selectedMember?._id || ""}
                onChange={(e) => {
                  const member =
                    teamMembers.find(
                      (m) => String(m._id) === String(e.target.value)
                    ) || null;
                  setSelectedMember(member);
                  setPage(1);
                  setExpandedDates(new Set());
                  setSelectedIds(new Set());
                }}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
                aria-label="Switch team member"
              >
                <option value="">All team members ({teamTotalRecords})</option>
                {teamMembers.map((member) => (
                  <option key={member._id} value={member._id}>
                    {member.name || member.email || "Unknown"} (
                    {member.totalRecords})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="bg-white rounded-lg p-3 border border-blue-100">
              <p className="text-xs text-gray-500">Total Records</p>
              <p className="text-xl font-bold text-blue-700">{totalCounts}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-100">
              <p className="text-xs text-gray-500">Active Days</p>
              <p className="text-xl font-bold text-emerald-700">
                {viewLayout === "DATE_GROUPED" ? dateGroups.length : "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-100">
              <p className="text-xs text-gray-500">Today</p>
              <p className="text-xl font-bold text-purple-700">
                {viewLayout === "DATE_GROUPED"
                  ? dateGroups.find((g) => g.dayLabel === "Today")
                      ?.totalSubmit || 0
                  : "—"}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-amber-100">
              <p className="text-xs text-gray-500">Avg / Day</p>
              <p className="text-xl font-bold text-amber-700">
                {viewLayout === "DATE_GROUPED" && dateGroups.length
                  ? Math.round(totalCounts / dateGroups.length)
                  : "—"}
              </p>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
              const count = tab === "ALL" ? totalCounts : categoryCounts[tab];
              const isActive = activeTab === tab;

              return (
                <button
                  key={tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setPage(1);
                    setExpandedDates(new Set());
                    setSelectedIds(new Set());
                  }}
                  className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${
                      isActive
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

          {/* Search + dates + sort + layout */}
          <div className="p-4 space-y-3 border-b border-gray-100">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setSearchInput("");
                      setSearch("");
                      setPage(1);
                      setSearchLoading(false);
                    }
                  }}
                  placeholder="Search user name, email, PID, project, supplier, country, IP, status or survey fields..."
                  className="w-full pl-10 pr-20 py-2.5 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  aria-label="Search survey data"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  {searchLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  )}
                  {searchInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setSearch("");
                        setPage(1);
                        setSearchLoading(false);
                      }}
                      className="p-1 rounded-md text-gray-400 hover:text-gray-700 hover:bg-gray-100"
                      title="Clear search"
                      aria-label="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* From */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  max={dateTo || todayKey}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setPage(1);
                    setExpandedDates(new Set());
                    setSelectedIds(new Set());
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* To */}
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500 whitespace-nowrap">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  min={dateFrom || undefined}
                  max={todayKey}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setPage(1);
                    setExpandedDates(new Set());
                    setSelectedIds(new Set());
                  }}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("");
                    setDateTo("");
                    setPage(1);
                    setExpandedDates(new Set());
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 whitespace-nowrap"
                >
                  Clear Date
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {viewLayout === "FLAT" && (
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value);
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="createdAt">Created Date</option>
                    <option value="updatedAt">Updated Date</option>
                    <option value="category">Category</option>
                  </select>
                  <select
                    value={sortOrder}
                    onChange={(e) => {
                      setSortOrder(e.target.value as "asc" | "desc");
                      setPage(1);
                    }}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="desc">Newest first</option>
                    <option value="asc">Oldest first</option>
                  </select>
                </div>
              )}

              {/* Layout toggle */}
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden self-start">
                <button
                  onClick={() => {
                    setViewLayout("DATE_GROUPED");
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                    viewLayout === "DATE_GROUPED"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  By Date
                </button>
                <button
                  onClick={() => {
                    setViewLayout("FLAT");
                    setPage(1);
                    setSelectedIds(new Set());
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition ${
                    viewLayout === "FLAT"
                      ? "bg-blue-600 text-white"
                      : "bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Flat List
                </button>
              </div>

              <span className="text-xs text-gray-500 sm:ml-auto">
                {dateFrom && dateTo
                  ? `Showing data from ${dateFrom} to ${dateTo}`
                  : dateFrom
                    ? `Showing data from ${dateFrom}`
                    : dateTo
                      ? `Showing data until ${dateTo}`
                      : "Showing all dates"}
                {search && (
                  <span className="ml-2 text-blue-600 font-medium">
                    Searching: &quot;{search}&quot;
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Selection and bulk action bar */}
          {items.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-slate-50 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          someVisibleSelected && !allVisibleSelected;
                      }
                    }}
                    onChange={() => toggleSelectMany(items)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    {allVisibleSelected
                      ? "Deselect all visible"
                      : `Select all visible (${items.length})`}
                  </span>
                </label>

                {selectedIds.size > 0 && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {selectedIds.size} selected
                  </span>
                )}
              </div>

              {selectedIds.size > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-2.5 py-1 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-white transition"
                  >
                    Clear selection
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-semibold shadow-sm transition disabled:opacity-50"
                  >
                    {bulkDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                    Delete Selected ({selectedIds.size})
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Records */}
          <div>
            {loading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : items.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No records found.
                {mainTab === "MY_DATA" && " Paste some data above."}
              </div>
            ) : viewLayout === "DATE_GROUPED" ? (
              <div className="divide-y divide-gray-100">
                {dateGroups.map((group) => {
                  const isOpen = expandedDates.has(group.date);
                  const groupIds = group.items.map((i) => i._id);
                  const isGroupAllSelected =
                    groupIds.length > 0 &&
                    groupIds.every((id) => selectedIds.has(id));
                  const isGroupSomeSelected =
                    groupIds.some((id) => selectedIds.has(id)) &&
                    !isGroupAllSelected;

                  return (
                    <div key={group.date}>
                      <div
                        onClick={() => toggleDate(group.date)}
                        className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center p-0.5"
                            title={
                              isGroupAllSelected
                                ? `Deselect all ${group.items.length} records in ${group.dayLabel}`
                                : `Select all ${group.items.length} records in ${group.dayLabel}`
                            }
                          >
                            <input
                              type="checkbox"
                              checked={isGroupAllSelected}
                              ref={(el) => {
                                if (el) el.indeterminate = isGroupSomeSelected;
                              }}
                              onChange={() => toggleSelectMany(group.items)}
                              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer shrink-0"
                              aria-label={`Select all records for ${group.dayLabel}`}
                            />
                          </div>
                          <div
                            className={`w-11 h-11 rounded-lg flex items-center justify-center font-bold text-sm shrink-0 ${
                              group.dayLabel === "Today"
                                ? "bg-emerald-100 text-emerald-700"
                                : group.dayLabel === "Yesterday"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-indigo-100 text-indigo-700"
                            }`}
                          >
                            {group.totalSubmit}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {group.dayLabel}
                              <span className="ml-2 text-xs font-normal text-gray-500">
                                • {viewingName}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {group.totalSubmit} submission
                              {group.totalSubmit !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {group.totalSubmit}
                          </span>
                          <ChevronRight
                            className={`w-5 h-5 text-gray-400 transition-transform ${
                              isOpen ? "rotate-90" : ""
                            }`}
                          />
                        </div>
                      </div>

                      {isOpen && (
                        <div className="bg-gray-50 border-t border-gray-100 divide-y divide-gray-100">
                          {group.items.map((item) =>
                            renderRecordCard(item, true)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {items.map((item) => renderRecordCard(item))}
              </div>
            )}
          </div>

          {/* Pagination (flat list only) */}
          {viewLayout === "FLAT" && totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} rows)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => {
                    setPage((p) => p - 1);
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => {
                    setPage((p) => p + 1);
                    setSelectedIds(new Set());
                  }}
                  className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== EDIT MODAL ========== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Edit Survey Record</h3>
              <button
                onClick={() => setEditingItem(null)}
                className="p-1 rounded hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={editForm.category || "B2C"}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      category: e.target.value as SurveyCategory,
                    }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="B2B">B2B</option>
                  <option value="B2H">B2H</option>
                  <option value="B2C">B2C</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { key: "accountType", label: "Account Type" },
                  { key: "projectNo", label: "Project No" },
                  { key: "panelCode", label: "Panel Code" },
                  { key: "description", label: "Description" },
                  { key: "pid", label: "PID" },
                  { key: "supplierId", label: "Supplier ID" },
                  { key: "country", label: "Country / Location" },
                  { key: "ip", label: "IP" },
                  { key: "status", label: "Status" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {label}
                    </label>
                    <input
                      type="text"
                      value={(editForm as any)[key] || ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, [key]: e.target.value }))
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Survey Data Fields
                  </label>
                  <button
                    type="button"
                    onClick={addDataField}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + Add field
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(editForm.data || {}).map(([k, v]) => (
                    <div key={k} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={k}
                        disabled
                        className="w-1/3 border border-gray-200 rounded px-2 py-1.5 text-sm bg-gray-50"
                      />
                      <input
                        type="text"
                        value={v}
                        onChange={(e) => updateDataField(k, e.target.value)}
                        className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeDataField(k)}
                        className="p-1 text-red-500 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {Object.keys(editForm.data || {}).length === 0 && (
                    <p className="text-xs text-gray-400">No data fields</p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setEditingItem(null)}
                className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editSaving}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm disabled:opacity-50"
              >
                {editSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}