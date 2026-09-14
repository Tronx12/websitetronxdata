"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Search,
  Loader2,
  RefreshCw,
  Activity,
  Filter,
  ChevronDown,
  ChevronUp,
  Clock,
  User,
  Hash,
  Calendar,
  Copy,
  Check,
} from "lucide-react";

interface AuditLog {
  _id: string;
  action: string;
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  userId?: {
    _id: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
}

interface Props {
  userId: string;
}

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-emerald-100 text-emerald-700 border-emerald-200",
  LOGOUT: "bg-gray-100 text-gray-700 border-gray-200",
  CREATE: "bg-blue-100 text-blue-700 border-blue-200",
  UPDATE: "bg-amber-100 text-amber-700 border-amber-200",
  DELETE: "bg-rose-100 text-rose-700 border-rose-200",
  UPLOAD: "bg-purple-100 text-purple-700 border-purple-200",
  EXPORT: "bg-indigo-100 text-indigo-700 border-indigo-200",
  DOWNLOAD: "bg-cyan-100 text-cyan-700 border-cyan-200",
  REPORT: "bg-violet-100 text-violet-700 border-violet-200",
};

const MODULE_COLORS: Record<string, string> = {
  Survey: "bg-orange-100 text-orange-700",
  Attendance: "bg-teal-100 text-teal-700",
  Users: "bg-pink-100 text-pink-700",
  Authentication: "bg-slate-100 text-slate-700",
};

export default function AuditLogs({ userId }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [action, setAction] = useState("");
  const [module, setModule] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
      });

      if (search.trim()) params.set("search", search.trim());
      if (action) params.set("action", action);
      if (module) params.set("module", module);

      const res = await fetch(`/api/audit-logs?${params}`);
      const json = await res.json();

      if (json.success) {
        setLogs(json.data);
        setTotalPages(json.pagination.totalPages);
        setTotal(json.pagination.total);
      }
    } catch (error) {
      console.error("Audit log fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [page, search, action, module]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const clearFilters = () => {
    setSearch("");
    setAction("");
    setModule("");
    setPage(1);
  };

  const hasFilters = search || action || module;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200/60 shadow-sm">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-md shadow-blue-200">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h4 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Audit Logs
                </h4>
                <p className="text-sm text-slate-500 mt-0.5">
                  Track user activity and system actions in real-time
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg">
              <span className="text-sm font-medium text-slate-600">{total}</span>
              <span className="text-sm text-slate-400">total events</span>
            </div>
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 disabled:opacity-50 text-sm font-medium text-slate-700 shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-slate-200/60 p-5 shadow-sm transition-all duration-200">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by description, user, or entity..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm min-w-[140px] cursor-pointer"
                >
                  <option value="">All Actions</option>
                  <option value="LOGIN">🔐 Login</option>
                  <option value="LOGOUT">🚪 Logout</option>
                  <option value="CREATE">➕ Create</option>
                  <option value="UPDATE">✏️ Update</option>
                  <option value="DELETE">🗑️ Delete</option>
                  <option value="UPLOAD">📤 Upload</option>
                  <option value="EXPORT">📊 Export</option>
                  <option value="DOWNLOAD">⬇️ Download</option>
                  <option value="REPORT">📋 Report</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={module}
                  onChange={(e) => {
                    setModule(e.target.value);
                    setPage(1);
                  }}
                  className="appearance-none pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all outline-none text-sm min-w-[140px] cursor-pointer"
                >
                  <option value="">All Modules</option>
                  <option value="Survey">📝 Survey</option>
                  <option value="Attendance">✅ Attendance</option>
                  <option value="Users">👥 Users</option>
                  <option value="Authentication">🔑 Authentication</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>

              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>

          {hasFilters && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-400 mr-1">Active filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                  🔍 {search}
                </span>
              )}
              {action && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                  {action}
                </span>
              )}
              {module && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg">
                  {module}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Logs */}
        <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
              <span className="text-sm text-slate-400">Loading audit logs...</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <div className="p-4 bg-slate-50 rounded-full">
                <Search className="w-8 h-8 text-slate-300" />
              </div>
              <p className="text-slate-500 font-medium">No audit logs found</p>
              <p className="text-sm text-slate-400">
                {hasFilters ? "Try adjusting your filters" : "No activity recorded yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const isExpanded = expandedLog === log._id;
                  const actionColor =
                    ACTION_COLORS[log.action] || "bg-slate-100 text-slate-700";
                  const moduleColor =
                    MODULE_COLORS[log.module] || "bg-slate-100 text-slate-600";

                  return (
                    <div
                      key={log._id}
                      className="group hover:bg-slate-50/80 transition-colors duration-150"
                    >
                      <div
                        className="p-5 cursor-pointer"
                        onClick={() =>
                          setExpandedLog(isExpanded ? null : log._id)
                        }
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${actionColor}`}
                              >
                                {log.action}
                              </span>
                              <span
                                className={`px-2.5 py-0.5 rounded-lg text-xs font-medium ${moduleColor}`}
                              >
                                {log.module}
                              </span>
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {getTimeAgo(log.createdAt)}
                              </span>
                            </div>

                            <p className="font-medium text-slate-800 mt-2 text-sm leading-relaxed">
                              {log.description}
                            </p>

                            <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400">
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.userId?.name || log.userId?.email || "System"}
                              </span>
                              {log.entityId && (
                                <span className="flex items-center gap-1">
                                  <Hash className="w-3 h-3" />
                                  {log.entityType}: {log.entityId.slice(0, 8)}...
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {formatDate(log.createdAt)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(log._id, log._id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
                              title="Copy ID"
                            >
                              {copiedId === log._id ? (
                                <Check className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                            <button className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-400">
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Expanded details */}
                      {isExpanded && (
                        <div className="px-5 pb-5 pt-0 border-t border-slate-100 bg-slate-50/50">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Details
                              </h4>
                              <div className="bg-white rounded-xl p-3 border border-slate-200 space-y-1.5 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">ID</span>
                                  <span className="font-mono text-xs text-slate-600">
                                    {log._id}
                                  </span>
                                </div>
                                {log.ipAddress && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">IP Address</span>
                                    <span className="text-slate-600">{log.ipAddress}</span>
                                  </div>
                                )}
                                {log.userAgent && (
                                  <div className="flex justify-between">
                                    <span className="text-slate-400">User Agent</span>
                                    <span className="text-slate-600 text-xs truncate max-w-[200px]">
                                      {log.userAgent}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="space-y-2">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                  Metadata
                                </h4>
                                <div className="bg-white rounded-xl p-3 border border-slate-200">
                                  <pre className="text-xs text-slate-600 overflow-x-auto">
                                    {JSON.stringify(log.metadata, null, 2)}
                                  </pre>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t border-slate-200 bg-slate-50/50">
                  <span className="text-sm text-slate-500">
                    Showing page <span className="font-medium text-slate-700">{page}</span> of{" "}
                    <span className="font-medium text-slate-700">{totalPages}</span> •{" "}
                    <span className="font-medium text-slate-700">{total}</span> total logs
                  </span>

                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-600"
                    >
                      Previous
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-4 py-2 text-sm border border-slate-200 rounded-xl hover:bg-white hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 font-medium text-slate-600"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}