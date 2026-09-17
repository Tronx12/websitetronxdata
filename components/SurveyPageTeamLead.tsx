"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Upload,
  Download,
  Search,
  Loader2,
  FileText,
  FileSpreadsheet,
  Pencil,
  Trash2,
  ArrowLeft,
  Users,
  User,
  X,
  Save,
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
  createdBy?: string;
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

interface SurveyPageTeamLeadProps {
  currentUserId: string;
  currentUserName?: string;
}

/**
 * Team Lead survey page.
 *
 * Unlike the Admin view (which browses ALL testers and does not submit its
 * own survey data), a Team Lead:
 *   1. Submits/pastes their OWN survey data (MY_DATA tab), and
 *   2. Can view the survey data submitted by the members of THEIR OWN team
 *      only (TEAM_DATA tab) — not every tester in the system.
 *
 * The "team member" restriction is enforced by passing the current team
 * lead's id as `teamLeadId` to /api/survey/team-members. The backend is
 * expected to resolve that to "users whose manager/teamLeadId === this id"
 * (or however your reporting-line relationship is modeled) rather than
 * returning every tester, the way /api/survey/testers does for Admin.
 */
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
  const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(null);

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

  const [teamMembers, setTeamMembers] = useState<TeamMemberSummary[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMemberSummary | null>(null);

  const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ---------- Fetch records ----------
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

      if (mainTab === "MY_DATA") {
        params.set("createdBy", currentUserId);
      } else if (mainTab === "TEAM_DATA" && selectedMember) {
        params.set("createdBy", selectedMember._id);
      }

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
  }, [activeTab, page, sortBy, sortOrder, search, mainTab, currentUserId, selectedMember]);

  // ---------- Fetch team members (scoped to this team lead only) ----------
  const fetchTeamMembers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const params = new URLSearchParams({
        teamLeadId: currentUserId, // restrict results to members reporting to this team lead
      });
      if (teamSearch.trim()) params.set("search", teamSearch.trim());

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
  }, [teamSearch, currentUserId]);

  useEffect(() => {
    if (mainTab === "MY_DATA" || (mainTab === "TEAM_DATA" && selectedMember)) {
      fetchData();
    }
  }, [fetchData, mainTab, selectedMember]);

  useEffect(() => {
    if (mainTab === "TEAM_DATA" && !selectedMember) {
      fetchTeamMembers();
    }
  }, [mainTab, selectedMember, fetchTeamMembers]);

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
          // createdBy: currentUserId,
        }),
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
        setMainTab("MY_DATA");
        setSelectedMember(null);
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

  // ---------- Export ----------
  // const handleExport = async () => {
  //   try {
  //     setExporting(true);
  //     const params = new URLSearchParams();
  //     if (activeTab !== "ALL") params.set("category", activeTab);
  //     if (mainTab === "MY_DATA") {
  //       params.set("createdBy", currentUserId);
  //     } else if (selectedMember) {
  //       params.set("createdBy", selectedMember._id);
  //     }

  //     const res = await fetch(`/api/survey/export?${params}`);
  //     if (!res.ok) throw new Error("Export failed");

  //     const blob = await res.blob();
  //     const url = window.URL.createObjectURL(blob);
  //     const a = document.createElement("a");
  //     a.href = url;
  //     a.download = `survey-${activeTab.toLowerCase()}-${Date.now()}.xlsx`;
  //     a.click();
  //     window.URL.revokeObjectURL(url);
  //   } catch (err) {
  //     alert("Failed to download Excel");
  //   } finally {
  //     setExporting(false);
  //   }
  // };

  const handleExport = async () => {
  try {
    setExporting(true);

    const params =
      new URLSearchParams();

    if (
      activeTab !== "ALL"
    ) {
      params.set(
        "category",
        activeTab
      );
    }

    /*
     * DO NOT send createdBy.
     *
     * Backend automatically gets:
     * logged-in Team Lead
     * +
     * all members of his team
     */
    const res =
      await fetch(
        `/api/survey/export?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

    if (!res.ok) {
      const errorText =
        await res.text();

      console.error(
        "Team Lead export error:",
        errorText
      );

      throw new Error(
        "Export failed"
      );
    }

    const blob =
      await res.blob();

    const url =
      window.URL.createObjectURL(
        blob
      );

    const a =
      document.createElement(
        "a"
      );

    a.href = url;

    a.download =
      `survey-team-${activeTab.toLowerCase()}-${Date.now()}.xlsx`;

    document.body.appendChild(
      a
    );

    a.click();

    a.remove();

    window.URL.revokeObjectURL(
      url
    );

  } catch (error) {
    console.error(
      error
    );

    alert(
      "Failed to download Excel"
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
        fetchData();
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
        fetchData();
        if (mainTab === "TEAM_DATA" && !selectedMember) {
          fetchTeamMembers();
        }
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

  // ---------- Record card ----------
  const renderRecordCard = (item: SurveyItem) => {
    const hasHeader = item.accountType || item.projectNo || item.description;
    const hasMeta =
      item.pid || item.supplierId || item.country || item.ip || item.status;

    return (
      <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
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

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {new Date(item.createdAt).toLocaleDateString()}
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

        {Object.keys(item.data).length > 0 && (
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

      {/* Main Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => {
            setMainTab("MY_DATA");
            setSelectedMember(null);
            setPage(1);
            setActiveTab("ALL");
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
            setSelectedMember(null);
            setPage(1);
            setActiveTab("ALL");
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

      {/* Paste Section (only on My Data — team lead submits their own survey data) */}
      {mainTab === "MY_DATA" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Paste Survey Data
          </h2>

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

      {/* Content */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Team Member List (scoped to this team lead's team only) */}
        {mainTab === "TEAM_DATA" && !selectedMember && (
          <>
            <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search team member by name or email..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={fetchTeamMembers}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm"
              >
                Refresh
              </button>
            </div>

            {teamLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : teamMembers.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                No team members with submitted survey data found.
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {teamMembers.map((member) => (
                  <button
                    key={member._id}
                    onClick={() => {
                      setSelectedMember(member);
                      setPage(1);
                      setActiveTab("ALL");
                      setSearch("");
                    }}
                    className="w-full text-left px-4 py-4 hover:bg-blue-50 transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm shrink-0">
                        {(member.name || "T").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">
                          {member.name || "Unknown Member"}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {member.email || "No email"}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-blue-600">
                        {member.totalRecords}
                      </p>
                      <p className="text-xs text-gray-400">records</p>
                      {member.lastSubmitted && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Last: {new Date(member.lastSubmitted).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {/* Records (My Data or selected team member) */}
        {(mainTab === "MY_DATA" || (mainTab === "TEAM_DATA" && selectedMember)) && (
          <>
            {mainTab === "TEAM_DATA" && selectedMember && (
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-3">
                <button
                  onClick={() => {
                    setSelectedMember(null);
                    setPage(1);
                  }}
                  className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back to my team
                </button>
                <span className="text-sm text-gray-600">
                  Viewing data of <strong>{selectedMember.name}</strong> (
                  {selectedMember.totalRecords} total records)
                </span>
              </div>
            )}

            {/* Category tabs */}
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
          </>
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