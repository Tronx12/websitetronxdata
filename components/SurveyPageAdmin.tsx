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
  Building2,
  ChevronRight,
} from "lucide-react";
import { SUGGESTED_FIELDS, SurveyCategory } from "@/lib/survey-fields";

// ---------- Types ----------
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
  createdBy?: string | { _id: string; name: string; email: string };
}

interface TeamMember {
  _id: string;
  name: string;
  email: string;
  role: string;
  workingShift?: string;
}

interface Team {
  _id: string;
  name: string;
  description?: string;
  isActive: boolean;
  teamLead?: TeamMember | null;
  members: TeamMember[];
  createdBy?: { name: string; email: string };
}

interface PersonSummary {
  _id: string;
  name: string;
  email: string;
  role: string;
  totalRecords: number;
  lastSubmitted?: string;
}

type ViewMode = "TEAMS" | "TEAM_MEMBERS" | "PERSON_DATA";

const CATEGORY_BADGE_CLASS: Record<SurveyCategory, string> = {
  B2B: "bg-blue-100 text-blue-800",
  B2H: "bg-purple-100 text-purple-800",
  B2C: "bg-emerald-100 text-emerald-800",
};

interface SurveyPageAdminProps {
  currentUserId: string;
  currentUserName?: string;
}

export default function SurveyPageAdmin({
  currentUserId,
  currentUserName = "Admin",
}: SurveyPageAdminProps) {
  // Navigation state
  const [viewMode, setViewMode] = useState<ViewMode>("TEAMS");
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedPerson, setSelectedPerson] = useState<PersonSummary | null>(null);

  // Teams
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [teamSearch, setTeamSearch] = useState("");

  // Survey records
  const [items, setItems] = useState<SurveyItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<SurveyCategory | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Person summaries inside a team
  const [teamPeople, setTeamPeople] = useState<PersonSummary[]>([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Edit / Delete
  const [editingItem, setEditingItem] = useState<SurveyItem | null>(null);
  const [editForm, setEditForm] = useState<Partial<SurveyItem>>({});
  const [editSaving, setEditSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Messages & Export
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [reportLoading, setReportLoading] = useState<"weekly" | "monthly" | null>(null);

  // Paste (optional for admin)
  const [paste, setPaste] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPaste, setShowPaste] = useState(false);

  // ---------- Fetch Teams ----------
  const fetchTeams = useCallback(async () => {
    try {
      setTeamsLoading(true);
      const res = await fetch("/api/teams?isActive=true");
      const json = await res.json();
      if (json.success) {
        setTeams(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTeamsLoading(false);
    }
  }, []);

  // ---------- Fetch people summaries for a team ----------
  const fetchTeamPeople = useCallback(async (team: Team) => {
    try {
      setPeopleLoading(true);
      const memberIds = [
        ...(team.teamLead?._id ? [team.teamLead._id] : []),
        ...team.members.map((m) => m._id),
      ];

      if (memberIds.length === 0) {
        setTeamPeople([]);
        return;
      }

      // Fetch summary for each person (you can optimize this with a bulk API later)
      const summaries: PersonSummary[] = [];

      for (const id of memberIds) {
        const res = await fetch(`/api/survey?createdBy=${id}&limit=1&page=1`);
        const json = await res.json();

        const person =
          team.teamLead?._id === id
            ? team.teamLead
            : team.members.find((m) => m._id === id);

        if (person) {
          summaries.push({
            _id: person._id,
            name: person.name,
            email: person.email,
            role: person.role,
            totalRecords: json.pagination?.total || 0,
            lastSubmitted: json.data?.[0]?.createdAt,
          });
        }
      }

      // Sort: Team Lead first, then by records desc
      summaries.sort((a, b) => {
        if (a.role === "team-lead") return -1;
        if (b.role === "team-lead") return 1;
        return b.totalRecords - a.totalRecords;
      });

      setTeamPeople(summaries);
    } catch (err) {
      console.error(err);
    } finally {
      setPeopleLoading(false);
    }
  }, []);

  // ---------- Fetch survey records ----------
  const fetchData = useCallback(async () => {
    if (!selectedPerson) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        sortBy,
        sortOrder,
        createdBy: selectedPerson._id,
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
  }, [selectedPerson, page, sortBy, sortOrder, activeTab, search]);

  useEffect(() => {
    if (viewMode === "TEAMS") {
      fetchTeams();
    }
  }, [viewMode, fetchTeams]);

  useEffect(() => {
    if (viewMode === "TEAM_MEMBERS" && selectedTeam) {
      fetchTeamPeople(selectedTeam);
    }
  }, [viewMode, selectedTeam, fetchTeamPeople]);

  useEffect(() => {
    if (viewMode === "PERSON_DATA" && selectedPerson) {
      fetchData();
    }
  }, [viewMode, selectedPerson, fetchData]);

  // ---------- Filtered teams ----------
  const filteredTeams = useMemo(() => {
    if (!teamSearch.trim()) return teams;
    const q = teamSearch.toLowerCase();
    return teams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.teamLead?.name?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
    );
  }, [teams, teamSearch]);

  // ---------- Handlers ----------
  const openTeam = (team: Team) => {
    setSelectedTeam(team);
    setSelectedPerson(null);
    setViewMode("TEAM_MEMBERS");
    setPage(1);
    setActiveTab("ALL");
    setSearch("");
  };

  const openPerson = (person: PersonSummary) => {
    setSelectedPerson(person);
    setViewMode("PERSON_DATA");
    setPage(1);
    setActiveTab("ALL");
    setSearch("");
  };

  const goBackToTeams = () => {
    setSelectedTeam(null);
    setSelectedPerson(null);
    setViewMode("TEAMS");
  };

  const goBackToMembers = () => {
    setSelectedPerson(null);
    setViewMode("TEAM_MEMBERS");
  };

  // ---------- Export ----------
  const handleExport = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams();
      if (activeTab !== "ALL") params.set("category", activeTab);
      if (selectedPerson) {
        params.set("createdBy", selectedPerson._id);
      }

      const res = await fetch(`/api/survey/export?${params}`);
      if (!res.ok) throw new Error("Export failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `survey-${selectedPerson?.name || "all"}-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download Excel");
    } finally {
      setExporting(false);
    }
  };

  const handleWorkReport = async (range: "weekly" | "monthly") => {
    try {
      setReportLoading(range);
      const res = await fetch(`/api/survey/work-report?range=${range}`);
      if (!res.ok) throw new Error("Report failed");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `work-report-${range}-${Date.now()}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Failed to generate work report");
    } finally {
      setReportLoading(null);
    }
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
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      setDeletingId(id);
      const res = await fetch(`/api/survey/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchData();
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

  // ---------- Record Card ----------
  const renderRecordCard = (item: SurveyItem) => {
    const hasHeader = item.accountType || item.projectNo || item.description;
    const hasMeta = item.pid || item.supplierId || item.country || item.ip || item.status;

    return (
      <div key={item._id} className="px-4 py-4 hover:bg-gray-50">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_BADGE_CLASS[item.category]}`}>
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
            <span className="text-xs text-gray-400">
              {new Date(item.createdAt).toLocaleDateString()}
            </span>
            <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-blue-50 text-blue-600" title="Edit">
              <Pencil className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(item._id)}
              disabled={deletingId === item._id}
              className="p-1.5 rounded hover:bg-red-50 text-red-600 disabled:opacity-50"
              title="Delete"
            >
              {deletingId === item._id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
            {item.pid && <span><span className="text-gray-400">PID:</span> {item.pid}</span>}
            {item.supplierId && <span><span className="text-gray-400">Supplier:</span> {item.supplierId}</span>}
            {item.country && <span><span className="text-gray-400">Location:</span> {item.country}</span>}
            {item.ip && <span><span className="text-gray-400">IP:</span> {item.ip}</span>}
            {item.status && <span><span className="text-gray-400">Status:</span> {item.status}</span>}
          </div>
        )}
      </div>
    );
  };

  // ---------- Render ----------
  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 className="text-2xl font-bold text-gray-900">Survey Data Management</h4>
          <p className="text-gray-500 mt-1">
            Admin view • Manage survey data by Team
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => handleWorkReport("weekly")}
            disabled={reportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
          >
            {reportLoading === "weekly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Weekly Report
          </button>
          <button
            onClick={() => handleWorkReport("monthly")}
            disabled={reportLoading !== null}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50 text-sm"
          >
            {reportLoading === "monthly" ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Monthly Report
          </button>
          {viewMode === "PERSON_DATA" && (
            <button
              onClick={handleExport}
              disabled={exporting || total === 0}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 text-sm"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Download Excel
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <button onClick={goBackToTeams} className="hover:text-blue-600 font-medium">
          Teams
        </button>
        {selectedTeam && (
          <>
            <ChevronRight className="w-4 h-4" />
            <button onClick={goBackToMembers} className="hover:text-blue-600 font-medium">
              {selectedTeam.name}
            </button>
          </>
        )}
        {selectedPerson && (
          <>
            <ChevronRight className="w-4 h-4" />
            <span className="text-gray-900 font-medium">{selectedPerson.name}</span>
          </>
        )}
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* ===================== VIEW: TEAMS LIST ===================== */}
      {viewMode === "TEAMS" && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search teams..."
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={fetchTeams} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm">
              Refresh
            </button>
          </div>

          {teamsLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : filteredTeams.length === 0 ? (
            <div className="text-center py-20 text-gray-500">No teams found</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredTeams.map((team) => (
                <button
                  key={team._id}
                  onClick={() => openTeam(team)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-11 h-11 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 truncate">{team.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Lead: {team.teamLead?.name || "—"} • {team.members.length} member
                        {team.members.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW: TEAM MEMBERS ===================== */}
      {viewMode === "TEAM_MEMBERS" && selectedTeam && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">{selectedTeam.name}</h2>
              <p className="text-sm text-gray-500">
                {selectedTeam.description || "No description"}
              </p>
            </div>
            <button
              onClick={goBackToTeams}
              className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
            >
              <ArrowLeft className="w-4 h-4" />
              All Teams
            </button>
          </div>

          {peopleLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : teamPeople.length === 0 ? (
            <div className="text-center py-16 text-gray-500">No members in this team</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teamPeople.map((person) => (
                <button
                  key={person._id}
                  onClick={() => openPerson(person)}
                  className="w-full text-left px-5 py-4 hover:bg-blue-50 transition flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 ${
                        person.role === "team-lead"
                          ? "bg-amber-100 text-amber-700"
                          : "bg-indigo-100 text-indigo-700"
                      }`}
                    >
                      {(person.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {person.name}
                        {person.role === "team-lead" && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                            Team Lead
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{person.email}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold text-blue-600">{person.totalRecords}</p>
                    <p className="text-xs text-gray-400">records</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===================== VIEW: PERSON DATA ===================== */}
      {viewMode === "PERSON_DATA" && selectedPerson && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header */}
          <div className="px-5 py-4 bg-gray-50 border-b flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={goBackToMembers}
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-800"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
              <div>
                <p className="font-semibold text-gray-900">{selectedPerson.name}</p>
                <p className="text-xs text-gray-500">
                  {selectedPerson.email} • {selectedPerson.totalRecords} records
                </p>
              </div>
            </div>
          </div>

          {/* Category Tabs */}
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
                placeholder="Search PID, project, country..."
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
              <div className="text-center py-16 text-gray-500">No records found</div>
            ) : (
              <div className="divide-y divide-gray-100">{items.map(renderRecordCard)}</div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages} ({total} records)
              </p>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1 border rounded disabled:opacity-40 text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===================== EDIT MODAL ===================== */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Edit Survey Record</h3>
              <button onClick={() => setEditingItem(null)} className="p-1 rounded hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={editForm.category || "B2C"}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, category: e.target.value as SurveyCategory }))
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="text"
                      value={(editForm as any)[key] || ""}
                      onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                  </div>
                ))}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Survey Data Fields</label>
                  <button type="button" onClick={addDataField} className="text-xs text-blue-600 hover:underline">
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
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}