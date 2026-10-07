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

type MainTab = "MY_DATA" | "TEAM_DATA";
type CategoryTab = SurveyCategory | "ALL";

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
// Same "business date" rule as the backend (IST, rollover at 06:30 AM)
const getBusinessTodayKey = () => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const get = (t: string) =>
    Number(parts.find((p) => p.type === t)?.value);

  const d = new Date(Date.UTC(get("year"), get("month") - 1, get("day")));
  if (get("hour") * 60 + get("minute") < 6 * 60 + 30) {
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return d.toISOString().slice(0, 10);
};

const parseLocalDate = (date: string) => new Date(`${date}T00:00:00`);

export default function SurveyPageTeamLead({
  currentUserId,
  currentUserName = "Team Lead",
}: SurveyPageTeamLeadProps) {
  const [mainTab, setMainTab] = useState<MainTab>("MY_DATA");

  const [activeTab, setActiveTab] = useState<CategoryTab>("ALL");
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const todayKey = useMemo(() => getBusinessTodayKey(), []);
  const [uploadDate, setUploadDate] = useState(""); // "" = today (default)
  const [dateFrom, setDateFrom] = useState("");
const [dateTo, setDateTo] = useState("");
  const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(null);

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
  const [total, setTotal] = useState(0);
  const [totalCounts, setTotalCounts] = useState(0);
  const [categoryCounts, setCategoryCounts] = useState({
    B2B: 0,
    B2H: 0,
    B2C: 0,
  });


  // Team
  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  // null = whole team
  const [selectedMember, setSelectedMember] = useState<TeamMemberSummary | null>(null);

  const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  /* ==================================================
     SEARCH
  ================================================== */
  // useEffect(() => {
  //   const value = searchInput.trim();

  //   // Do not request the API for every keystroke.
  //   const timer = window.setTimeout(() => {
  //     setSearchLoading(value !== search);

  //     setSearch((current) => {
  //       if (current === value) {
  //         setSearchLoading(false);
  //         return current;
  //       }

  //       setPage(1);
  //       return value;
  //     });
  //   }, 350);

  //   return () => window.clearTimeout(timer);
  // }, [searchInput, search]);

  // Keep the visible input in sync when the active screen changes.
  /* ==================================================
   SEARCH (debounced)
================================================== */
  useEffect(() => {
    const value = searchInput.trim();

    // Already applied: nothing to wait for.
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

  // useEffect(() => {
  //   setSearchInput(search);
  // }, [mainTab]);


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

  /**
   * One place that decides WHOSE data every request (records, counts, days,
   * export) is about, so the screen and the Excel file can never disagree.
   *
   *  My Survey Data            -> createdBy = me
   *  Team, one member picked   -> createdBy = that member
   *  Team, nobody picked       -> scope = team  (server resolves the team)
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

  // ---------- Category counts ----------
  // const fetchCategoryCounts = useCallback(async () => {
  //   try {
  //     const categories = ["B2B", "B2H", "B2C"] as const;

  //     const results = await Promise.all(
  //       categories.map(async (category) => {
  //         const params = new URLSearchParams();
  //         params.set("page", "1");
  //         params.set("limit", "1");
  //         params.set("sortBy", "createdAt");
  //         params.set("sortOrder", "desc");
  //         params.set("category", category);

  //         applyScope(params);

  //         const cleanSearch = search.trim();
  //         if (cleanSearch) {
  //           params.set("search", cleanSearch);
  //         }

  //         const res = await fetch(`/api/survey?${params.toString()}`, {
  //           method: "GET",
  //           cache: "no-store",
  //         });

  //         if (!res.ok) {
  //           throw new Error(`Failed to fetch ${category} count`);
  //         }

  //         const json = await res.json();

  //         return {
  //           category,
  //           count: json.success ? Number(json.pagination?.totalCounts ?? json.pagination?.total) || 0 : 0,
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
  // }, [applyScope, search]);

  const fetchCategoryCounts = useCallback(async () => {
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

        if (dateFrom) {
          params.set("dateFrom", dateFrom);
        }

        if (dateTo) {
          params.set("dateTo", dateTo);
        }

        const cleanSearch = search.trim();

        if (cleanSearch) {
          params.set("search", cleanSearch);
        }

        const res = await fetch(`/api/survey?${params.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          throw new Error(`Failed to fetch ${category} count`);
        }

        const json = await res.json();

        return {
          category,
          count: json.success
            ? Number(
                json.pagination?.totalCounts ??
                  json.pagination?.total
              ) || 0
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
}, [applyScope, search, dateFrom, dateTo]);

  // ---------- Fetch records ----------
//   const fetchData = useCallback(async () => {
//     const requestId = ++dataRequestId.current;

//     try {
//       setLoading(true);

//       const params = new URLSearchParams();
//       params.set("page", String(page));
//       params.set("limit", "20");
//       params.set("sortBy", sortBy);
//       params.set("sortOrder", sortOrder);

//       applyScope(params);

//       if (activeTab !== "ALL") {
//         params.set("category", activeTab);
//       }

//       const cleanSearch = search.trim();
//       if (cleanSearch) {
//         params.set("search", cleanSearch);
//       }

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

// // Number of saved survey rows
// setTotal(Number(pagination.total) || 0);

// // SUM of Counts field
// setTotalCounts(Number(pagination.totalCounts) || 0);

// setTotalPages(
//   Math.max(1, Number(pagination.totalPages) || 1)
// );

//       // setItems(Array.isArray(json.data) ? json.data : []);
//       // setTotal(Number(pagination.total) || 0);
//       // setTotalPages(Math.max(1, Number(pagination.totalPages) || 1));
//     } catch (err) {
//       if (requestId !== dataRequestId.current) return;

//       console.error("Survey fetch error:", err);
//       setItems([]);
//       setTotalPages(1);
//       setTotal(0);
//     } finally {
//       if (requestId === dataRequestId.current) {
//         setLoading(false);
//         setSearchLoading(false);
//       }
//     }
//   }, [applyScope, activeTab, page, sortBy, sortOrder, search]);

const fetchData = useCallback(async () => {
  const requestId = ++dataRequestId.current;

  try {
    setLoading(true);

    const params = new URLSearchParams();

    params.set("page", String(page));
    params.set("limit", "20");
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);

    applyScope(params);

    if (activeTab !== "ALL") {
      params.set("category", activeTab);
    }

    const cleanSearch = search.trim();

    if (cleanSearch) {
      params.set("search", cleanSearch);
    }

    // DATE-WISE FILTER
    if (dateFrom) {
      params.set("dateFrom", dateFrom);
    }

    if (dateTo) {
      params.set("dateTo", dateTo);
    }

    const res = await fetch(`/api/survey?${params.toString()}`, {
      method: "GET",
      cache: "no-store",
    });

    const json = await res.json();

    if (requestId !== dataRequestId.current) return;

    if (!res.ok || !json.success) {
      throw new Error(
        json.message || "Failed to fetch survey data"
      );
    }

    const pagination = json.pagination || {};

    setItems(Array.isArray(json.data) ? json.data : []);

    setTotal(Number(pagination.total) || 0);

    // SUM OF COUNTS
    setTotalCounts(Number(pagination.totalCounts) || 0);

    setTotalPages(
      Math.max(1, Number(pagination.totalPages) || 1)
    );
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
  applyScope,
  activeTab,
  page,
  sortBy,
  sortOrder,
  search,
  dateFrom,
  dateTo,
]);

  // ---------- Fetch team members (scoped to this team lead only) ----------
  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const params = new URLSearchParams({
        teamLeadId: currentUserId, // restrict results to members reporting to this team lead
      });

      const res = await fetch(`/api/survey/team-members?${params}`);
      const json = await res.json();

      if (json.success) {
        setTeamMembers(json.data);
      }
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
    if (mainTab === "TEAM_DATA") {
      fetchTeamMembers();
    }
  }, [mainTab, fetchTeamMembers]);

  const blockPreviewCount = useMemo(() => {
    if (!paste.trim()) return 0;
    const hasDelimiter = /^\s*=+\s*$/m.test(paste);
    if (!hasDelimiter) return 1;
    return paste
      .split(/^\s*=+\s*$/m)
      .map((b) => b.trim())
      .filter(Boolean).length;
  }, [paste]);

  // ---------- Paste / Save ----------
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

      // if (json.success) {
      //   setMessage({
      //     type: "success",
      //     text: `${json.message}${json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
      //       }`,
      //   });
      //   setPaste("");
      //   refreshAll();
      // }
      if (json.success) {
  setMessage({
    type: "success",
    text: `${json.message}${uploadDate ? ` for ${uploadDate}` : ""}${
      json.errors?.length ? ` (${json.errors.length} block(s) skipped)` : ""
    }`,
  });
  setPaste("");
  setUploadDate("");
  refreshAll();
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
  const searchPending = searchInput.trim() !== search;
  // ---------- Export (follows the current selection) ----------
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

  // const handleExport = async () => {
  //   try {
  //     if (searchPending) {
  //       alert("Search is still updating. Please wait a moment and try again.");
  //       return;
  //     }
  //     if (total <= 0) {
  //       alert("No records available for the current filters.");
  //       return;
  //     }

  //     setExporting(true);

  //     const params = new URLSearchParams();
  //     applyScope(params);

  //     if (activeTab !== "ALL") {
  //       params.set("category", activeTab);
  //     }

  //     const cleanSearch = search.trim();
  //     if (cleanSearch) {
  //       params.set("search", cleanSearch);
  //     }

  //     // Export all matching records, not only the current page.
  //     params.set("range", "all");

  //     const res = await fetch(`/api/survey/export?${params.toString()}`, {
  //       method: "GET",
  //       cache: "no-store",
  //     });

  //     if (!res.ok) {
  //       const errorText = await res.text();
  //       console.error("Survey export error:", errorText);
  //       throw new Error("Export failed");
  //     }

  //     const blob = await res.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement("a");

  //     const scopeSlug =
  //       mainTab === "MY_DATA"
  //         ? "mine"
  //         : selectedMember
  //           ? slug(selectedMember.name)
  //           : "team";

  //     const searchSlug = cleanSearch ? `-${slug(cleanSearch).slice(0, 50)}` : "";

  //     a.href = url;
  //     a.download = `survey-${scopeSlug}-${activeTab.toLowerCase()}${searchSlug}-all.xlsx`;

  //     document.body.appendChild(a);
  //     a.click();
  //     a.remove();

  //     window.URL.revokeObjectURL(url);
  //   } catch (error) {
  //     console.error(error);
  //     alert("Failed to download Excel");
  //   } finally {
  //     setExporting(false);
  //   }
  // };

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

    // IMPORTANT:
    // Use exactly the same scope currently displayed on screen.
    applyScope(params);
    if (dateFrom) {
  params.set("dateFrom", dateFrom);
}

if (dateTo) {
  params.set("dateTo", dateTo);
}

    // Current category filter
    if (activeTab !== "ALL") {
      params.set("category", activeTab);
    }

    // Current search filter
    if (cleanSearch) {
      params.set("search", cleanSearch);
    }

    /*
     * IMPORTANT:
     * Do NOT send page or limit.
     *
     * The export API must download ALL records
     * matching the current search/filter.
     */
    params.set("range", "all");

    console.log(
      "EXPORT FILTER:",
      Object.fromEntries(params.entries())
    );

    const res = await fetch(
      `/api/survey/export?${params.toString()}`,
      {
        method: "GET",
        cache: "no-store",
      }
    );

    if (!res.ok) {
      const errorText = await res.text();

      console.error(
        "Survey export failed:",
        res.status,
        errorText
      );

      throw new Error(
        `Export failed (${res.status})`
      );
    }

    const blob = await res.blob();

    if (!blob.size) {
      throw new Error("Downloaded Excel file is empty.");
    }

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

    const categorySlug =
      activeTab === "ALL"
        ? "all"
        : activeTab.toLowerCase();

    a.href = url;

    a.download =
      `survey-${scopeSlug}-${categorySlug}` +
      `${searchSlug}-full-data.xlsx`;

    document.body.appendChild(a);
    a.click();
    a.remove();

    window.URL.revokeObjectURL(url);

    console.log(
      `Excel downloaded successfully. ` +
      `Expected matching records: ${total}`
    );

  } catch (error) {
    console.error(
      "Excel download error:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to download Excel"
    );
  } finally {
    setExporting(false);
  }
};
  const handleWorkReport = async (range: "weekly" | "monthly") => {
    try {
      setReportLoading(range);
      // Scope the report to this team lead + their team only.
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

  // ---------- Edit ----------
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

  // ---------- Delete ----------
  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey record? This cannot be undone.")) {
      return;
    }

    try {
      setDeletingId(id);
      const res = await fetch(`/api/survey/${id}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (json.success) {
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

  // Who submitted this record. Show it for every record.
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

  // ---------- Record card ----------
  const renderRecordCard = (item: SurveyItem) => {
    const hasHeader = item.accountType || item.projectNo || item.description;
    const hasMeta =
      item.pid || item.supplierId || item.country || item.ip || item.status;
    const submitter = getSubmitterInfo(item);

    return (
      <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}
            >
              {item.category}
            </span>
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
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-2xl font-bold text-gray-900">
            Survey Data Module – Team Lead
          </h4>
          <p className="text-gray-500 mt-1">
            Welcome, {currentUserName}. Manage your own survey data and your team&apos;s data • Edit & Delete enabled
          </p>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <div className="flex gap-2 flex-wrap">
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
            {/* <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              title={`Exports: ${exportLabel}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50"
            > */}
            <button
              onClick={handleExport}
              disabled={exporting || total === 0 || searchPending || loading}
              title={
                searchPending
                  ? "Search is still updating..."
                  : `Exports: ${exportLabel}`
              }
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
          <p className="text-xs text-gray-500">
            Excel will contain: <span className="font-medium">{exportLabel}</span>
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setMainTab("MY_DATA");
            setSelectedMember(null);
            setPage(1);
            setActiveTab("ALL");
            // setSearchInput(search);
            // setSearch(search);
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === "MY_DATA"
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
            setSelectedMember(null);
            setPage(1);
            setActiveTab("ALL");
            setSearchInput(search);
            setSearch(search);
          }}
          className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${mainTab === "TEAM_DATA"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
        >
          <Users className="w-4 h-4" />
          My Team&apos;s Survey Data
        </button>
      </div>

      {/* Paste Section (only on My Data — team lead submits their own survey data) */}
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
      Leave empty to save under today's date
    </span>
  )}
</div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste data — one record, or many separated by a &quot;=====&quot; line
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
              className={`mt-4 p-3 rounded-lg text-sm ${message.type === "success"
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

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Team: member filter (all team data is already showing) */}
        {mainTab === "TEAM_DATA" && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center gap-3">
            <label
              htmlFor="team-member-filter"
              className="text-sm font-medium text-gray-700"
            >
              Team member
            </label>

            <select
              id="team-member-filter"
              value={selectedMember?._id || ""}
              onChange={(e) => {
                const member =
                  teamMembers.find(
                    (m) => String(m._id) === String(e.target.value)
                  ) || null;

                setSelectedMember(member);
                setPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white min-w-[220px]"
            >
              <option value="">
                All team members ({teamTotalRecords})
              </option>
              {teamMembers.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name || member.email || "Unknown"} (
                  {member.totalRecords})
                </option>
              ))}
            </select>

            {selectedMember && (
              <button
                onClick={() => {
                  setSelectedMember(null);
                  setPage(1);
                }}
                className="text-sm text-blue-600 hover:underline"
              >
                Show all team
              </button>
            )}

            <button
              onClick={fetchTeamMembers}
              disabled={teamLoading}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm bg-white border border-gray-300 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${teamLoading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>

            <span className="text-sm text-gray-600 sm:ml-auto">
              Viewing{" "}
              <strong>
                {selectedMember ? selectedMember.name : "all team members"}
              </strong>
              {selectedMember?.email && (
                <span className="ml-1 text-gray-400">
                  ({selectedMember.email})
                </span>
              )}
            </span>
          </div>
        )}

        {/* Category tabs */}
        <div className="flex border-b border-gray-200 overflow-x-auto">
          {/* {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
            const count = tab === "ALL" ? total : categoryCounts[tab]; */}
            {(["ALL", "B2B", "B2H", "B2C"] as const).map((tab) => {
  const count =
    tab === "ALL"
      ? totalCounts
      : categoryCounts[tab];

            return (
              <button
                key={tab}
                onClick={() => {
                  setActiveTab(tab);
                  setPage(1);
                }}
                className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
              >
                <span>{tab}</span>

                <span
                  className={`ml-1.5 inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full text-xs font-semibold ${activeTab === tab
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

        {/* DATE-WISE FILTER */}
<div className="px-4 py-4 bg-gray-50 border-b border-gray-200">
  <div className="flex flex-wrap items-end gap-3">

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        From Date
      </label>

      <input
        type="date"
        value={dateFrom}
        max={dateTo || todayKey}
        onChange={(e) => {
          setDateFrom(e.target.value);
          setPage(1);
        }}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      />
    </div>

    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">
        To Date
      </label>

      <input
        type="date"
        value={dateTo}
        min={dateFrom || undefined}
        max={todayKey}
        onChange={(e) => {
          setDateTo(e.target.value);
          setPage(1);
        }}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white"
      />
    </div>

    {(dateFrom || dateTo) && (
      <button
        type="button"
        onClick={() => {
          setDateFrom("");
          setDateTo("");
          setPage(1);
        }}
        className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
      >
        Clear Date
      </button>
    )}

    <div className="text-xs text-gray-500 pb-2">
      {dateFrom && dateTo
        ? `Showing data from ${dateFrom} to ${dateTo}`
        : dateFrom
        ? `Showing data from ${dateFrom}`
        : dateTo
        ? `Showing data until ${dateTo}`
        : "Showing all dates"}
    </div>

  </div>
</div>

        {/* Search + Sort */}
        <div className="p-4 flex flex-col sm:flex-row gap-3 border-b border-gray-100">
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
              placeholder="Search user name, email, PID, project, supplier, country, IP, status, TNX, parent, child, respondent or survey fields..."
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
        </div>

        {/* Search fields hint */}
        <div className="px-4 pb-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-600">Search:</span>
          {[
            "User name",
            "Email",
            "IP address",
            "Location",
            "PID",
            "Project",
            "Supplier ID",
            "Status",
            "Survey fields",
          ].map((label) => (
            <span
              key={label}
              className="px-2 py-1 rounded-full bg-gray-50 border border-gray-200"
            >
              {label}
            </span>
          ))}
          {search && (
            <span className="ml-auto text-blue-600 font-medium">
              Searching: "{search}"
            </span>
          )}
        </div>


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
          ) : (
            <div className="divide-y divide-gray-100">
              {items.map(renderRecordCard)}
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
              {/* Category */}
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

              {/* Header fields */}
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

              {/* Dynamic data fields */}
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