"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type Status = "APPROVED" | "REJECTED" | "PENDING";

interface OERecord {
  rowIndex: number;
  id: string;
  timestamp?: string;
  date?: string;
  memberName?: string;
  pid?: string;
  projectId?: string;
  qNumber?: string;
  oeResponse?: string;
  status: Status;

  aiScore?: number | string;
  aiReason?: string;
  humanScore?: number | string;
  relScore?: number | string;
  relReason?: string;
  relevanceScore?: number | string;

  rejectReason?: string;
  dqaCorrection?: string;
}

interface CurrentUser {
  userId: string;
  name?: string;
  email?: string;
  role?: string;
}

interface OEPerformanceResponse {
  success: boolean;
  oes?: OERecord[];
  records?: OERecord[];
  items?: OERecord[];
  summary?: {
    total?: number;
    approved?: number;
    rejected?: number;
    pending?: number;
    avgHuman?: number;
    avgRelevancy?: number;
  };
}

function normalize(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function numberValue(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatDate(value?: string): string {
  if (!value) return "";

  const text = String(value).trim();

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const [year, month, day] = text.split("-");
    return `${day}-${month}-${year}`;
  }

  return text;
}

export default function OEPerformancePage() {
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [allRecords, setAllRecords] = useState<OERecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | Status>("ALL");

  const [expandedId, setExpandedId] = useState<string | null>(null);

  /*
   * ============================================================
   * GET CURRENT LOGGED-IN USER
   * ============================================================
   */
  const loadCurrentUser = useCallback(async (): Promise<CurrentUser | null> => {
    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to get current user.");
      }

      const result = await response.json();
      const user = result?.user ?? result?.data ?? result;

      if (!user?.userId && !user?._id) {
        throw new Error("Current user was not found.");
      }

      return {
        userId: String(user.userId ?? user._id),
        name: user.name ?? "",
        email: user.email ?? "",
        role: user.role ?? "",
      };
    } catch (err: any) {
      console.error("loadCurrentUser error:", err);
      return null;
    }
  }, []);

  /*
   * ============================================================
   * LOAD OE PERFORMANCE
   * ============================================================
   */
  const loadPerformance = useCallback(async () => {
    try {
      setError("");
      setRefreshing(true);

      const user = await loadCurrentUser();
      if (user) {
        setCurrentUser(user);
      }

      const loggedInName = normalize(user?.name);
      const loggedInEmail = normalize(user?.email);
      const userFirstName = loggedInName.split(" ")[0] || "";

      let myRecords: OERecord[] = [];

      // 1. Try server-side query with employee name
      if (user?.name) {
        try {
          const directResult = await api<OEPerformanceResponse>(
            "getOEPerformance",
            {
              fromDate: "",
              toDate: "",
              projectId: "",
              employee: user.name.trim(),
              status: "",
            }
          );

          const directOes = Array.isArray(directResult?.oes)
            ? directResult.oes
            : Array.isArray(directResult?.records)
            ? directResult.records
            : Array.isArray(directResult?.items)
            ? directResult.items
            : [];

          if (directOes.length > 0) {
            myRecords = directOes;
          }
        } catch (err) {
          console.warn("Direct employee query failed, falling back to full list:", err);
        }
      }

      // 2. If direct query returned 0 records, fetch full list and match flexibly
      if (myRecords.length === 0) {
        const fullResult = await api<OEPerformanceResponse>(
          "getOEPerformance",
          {
            fromDate: "",
            toDate: "",
            projectId: "",
            employee: "",
            status: "",
          }
        );

        const allOes = Array.isArray(fullResult?.oes)
          ? fullResult.oes
          : Array.isArray(fullResult?.records)
          ? fullResult.records
          : Array.isArray(fullResult?.items)
          ? fullResult.items
          : [];

        myRecords = allOes.filter((record) => {
          const recordName = normalize(record.memberName);
          if (!recordName) return false;

          // Exact name match
          if (loggedInName && recordName === loggedInName) {
            return true;
          }

          // Contains name match
          if (
            loggedInName &&
            (recordName.includes(loggedInName) || loggedInName.includes(recordName))
          ) {
            return true;
          }

          // First name match (if length >= 3)
          const recFirstName = recordName.split(" ")[0] || "";
          if (
            userFirstName.length >= 3 &&
            recFirstName.length >= 3 &&
            recFirstName === userFirstName
          ) {
            return true;
          }

          // Email prefix match
          if (loggedInEmail) {
            const emailPrefix = loggedInEmail.split("@")[0];
            if (
              emailPrefix &&
              (recordName.includes(emailPrefix) || emailPrefix.includes(recordName))
            ) {
              return true;
            }
          }

          return false;
        });
      }

      setAllRecords(myRecords);
    } catch (err) {
      console.error("OE Performance Error:", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load OE performance."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadCurrentUser]);

  useEffect(() => {
    loadPerformance();
  }, [loadPerformance]);

  /*
   * ============================================================
   * STATUS + SEARCH FILTER
   * ============================================================
   */
  const filteredRecords = useMemo(() => {
    const query = search.trim().toLowerCase();

    return allRecords.filter((record) => {
      const recordStatus = String(record.status || "").trim().toUpperCase();

      if (status !== "ALL" && recordStatus !== status) {
        return false;
      }

      if (!query) {
        return true;
      }

      return (
        normalize(record.id).includes(query) ||
        normalize(record.pid).includes(query) ||
        normalize(record.projectId).includes(query) ||
        normalize(record.qNumber).includes(query) ||
        normalize(record.oeResponse).includes(query)
      );
    });
  }, [allRecords, search, status]);

  /*
   * ============================================================
   * USER-SPECIFIC SUMMARY
   * ============================================================
   */
  const summary = useMemo(() => {
    const total = allRecords.length;

    const approved = allRecords.filter(
      (r) => String(r.status || "").trim().toUpperCase() === "APPROVED"
    ).length;

    const rejected = allRecords.filter(
      (r) => String(r.status || "").trim().toUpperCase() === "REJECTED"
    ).length;

    const pending = allRecords.filter(
      (r) => String(r.status || "").trim().toUpperCase() === "PENDING"
    ).length;

    // AI / Human Score check (supports aiScore, humanScore, qualityResult)
    const humanScores = allRecords
      .map((r) => numberValue(r.aiScore ?? r.humanScore))
      .filter((n) => n > 0);

    // Relevancy Score check (supports relScore, relevanceScore)
    const relevanceScores = allRecords
      .map((r) => numberValue(r.relScore ?? r.relevanceScore))
      .filter((n) => n > 0);

    const avgHuman =
      humanScores.length > 0
        ? Math.round(
            humanScores.reduce((a, b) => a + b, 0) / humanScores.length
          )
        : 0;

    const avgRelevancy =
      relevanceScores.length > 0
        ? Math.round(
            relevanceScores.reduce((a, b) => a + b, 0) / relevanceScores.length
          )
        : 0;

    return {
      total,
      approved,
      rejected,
      pending,
      avgHuman,
      avgRelevancy,
    };
  }, [allRecords]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-semibold text-slate-500">
          Loading your OE performance...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-[850px] px-5 py-8">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          {/* HEADER */}
          <div className="bg-blue-600 px-6 py-7 text-center text-white">
            <h4 className="text-2xl font-bold">📊 OE Performance</h4>
            <p className="mt-1 text-sm text-blue-100">
              Your open-end submission history and quality scores
            </p>
          </div>

          <div className="p-6">
            {/* USER */}
            <label className="mb-2 block text-sm font-bold uppercase text-slate-700">
              YOUR NAME
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-100 px-4 py-3 text-slate-700 font-medium">
              {currentUser?.name || currentUser?.email || "Current User"}
            </div>

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Name is linked to your account.
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                🔒 Locked
              </span>
            </div>

            {/* REFRESH */}
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={loadPerformance}
                disabled={refreshing}
                className="rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                ↻ {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200">
                {error}
              </div>
            )}

            {/* KPI */}
            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              <Kpi title="TOTAL OEs" value={summary.total} />

              <Kpi
                title="APPROVED"
                value={summary.approved}
                green={summary.approved > 0}
              />

              <Kpi
                title="AVG HUMAN"
                value={`${summary.avgHuman}/100`}
                green={summary.avgHuman >= 65}
                red={summary.avgHuman > 0 && summary.avgHuman < 50}
              />

              <Kpi
                title="AVG RELEVANCY"
                value={`${summary.avgRelevancy}/100`}
                green={summary.avgRelevancy >= 65}
                red={summary.avgRelevancy > 0 && summary.avgRelevancy < 50}
              />
            </div>

            {/* SEARCH & FILTER */}
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-[1fr_170px]">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter by PID, Q#, response..."
                className="h-12 rounded-lg border border-slate-200 px-4 outline-none focus:border-blue-500 text-sm"
              />

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "ALL" | Status)}
                className="h-12 rounded-lg border border-slate-200 bg-white px-4 outline-none focus:border-blue-500 text-sm"
              >
                <option value="ALL">All statuses</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PENDING">Pending</option>
              </select>
            </div>

            <div className="mb-3 mt-6 flex items-center justify-between text-sm font-bold text-slate-700">
              <span>Submissions ({filteredRecords.length})</span>
            </div>

            {/* RECORDS */}
            <div className="space-y-3">
              {filteredRecords.length === 0 ? (
                <div className="rounded-xl border border-slate-200 p-10 text-center text-sm text-slate-400">
                  <p className="font-semibold text-slate-600">
                    No OE submissions found
                    {currentUser?.name ? ` for ${currentUser.name}` : ""}.
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Your submitted responses from the OE Submit page will appear here once submitted.
                  </p>
                </div>
              ) : (
                filteredRecords.map((record) => {
                  const humanScore = numberValue(record.aiScore ?? record.humanScore);
                  const relScore = numberValue(record.relScore ?? record.relevanceScore);
                  const isExpanded = expandedId === record.id;

                  return (
                    <div
                      key={`${record.rowIndex}-${record.id}`}
                      className="overflow-hidden rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : record.id)
                        }
                        className="w-full px-4 py-4 text-left"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-bold text-blue-600">
                                {record.qNumber?.startsWith("Q")
                                  ? record.qNumber
                                  : `Q${record.qNumber}`}
                              </span>

                              <span className="text-xs text-slate-500 font-medium">
                                PID: {record.pid}
                              </span>

                              <span
                                className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                                  record.status === "APPROVED"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : record.status === "REJECTED"
                                    ? "bg-rose-100 text-rose-700"
                                    : "bg-amber-100 text-amber-700"
                                }`}
                              >
                                {record.status}
                              </span>

                              {humanScore > 0 && (
                                <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-medium text-blue-700">
                                  Human: {humanScore}/100
                                </span>
                              )}

                              {relScore > 0 && (
                                <span className="rounded-full bg-purple-50 px-2.5 py-0.5 text-[11px] font-medium text-purple-700">
                                  Rel: {relScore}/100
                                </span>
                              )}
                            </div>

                            <div className="mt-1 text-xs text-slate-400">
                              {formatDate(record.date)}
                            </div>
                          </div>

                          <span className="text-slate-400 text-xs">
                            {isExpanded ? "▲" : "▼"}
                          </span>
                        </div>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                          <div className="rounded-lg bg-white p-4 border border-slate-100">
                            <div className="mb-2 text-xs font-bold uppercase text-slate-400">
                              OE Response
                            </div>
                            <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                              {record.oeResponse || "No response provided."}
                            </div>
                          </div>

                          {record.dqaCorrection && (
                            <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-100">
                              <strong className="block mb-1 font-semibold">
                                DQA Correction:
                              </strong>
                              {record.dqaCorrection}
                            </div>
                          )}

                          {record.rejectReason && (
                            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-100">
                              <strong className="block mb-1 font-semibold">
                                Rejection Reason:
                              </strong>
                              {record.rejectReason}
                            </div>
                          )}

                          {record.aiReason && (
                            <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-slate-600">
                              <strong className="block mb-0.5 font-semibold text-blue-900">
                                AI Quality Notes:
                              </strong>
                              {record.aiReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  title,
  value,
  green,
  red,
}: {
  title: string;
  value: string | number;
  green?: boolean;
  red?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[11px] font-semibold text-slate-400">{title}</div>
      <div
        className={`mt-2 text-xl font-bold ${
          green
            ? "text-emerald-600"
            : red
            ? "text-red-600"
            : "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}