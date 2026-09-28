"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Users,
  XCircle,
} from "lucide-react";

import { api } from "@/lib/api";

type TeamMember = {
  _id: string;
  name: string;
  email?: string;
  role?: string;
  totalRecords?: number;
  lastSubmitted?: string | null;
  categories?: string[];
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
  status?: string;

  // Fields returned by getOEPerformance
  aiScore?: string | number;
  aiReason?: string;
  relScore?: string | number;
  relReason?: string;

  qualityResult?: {
    ai_score?: number;
    aiScore?: number;
    relevancy_score?: number;
    relScore?: number;
    ai_reason?: string;
    aiReason?: string;
  };
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

type MemberPerformance = TeamMember & {
  performance: PerformanceData;
  loading: boolean;
  error?: string;
};

export default function TeamLeadOEPerformance() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [performances, setPerformances] = useState<
    Record<string, MemberPerformance>
  >({});

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "approved" | "pending" | "rejected"
  >("all");

  const [expandedMember, setExpandedMember] = useState<string | null>(null);
  const [expandedOE, setExpandedOE] = useState<string | null>(null);

  // =========================================================
  // LOAD TEAM MEMBERS + THEIR OE PERFORMANCE
  // =========================================================

//   const load = async () => {
//     try {
//       setLoading(true);
//       setMessage("");

//       /*
//        * IMPORTANT:
//        *
//        * Do NOT send teamLeadId from the browser.
//        *
//        * Your backend already does:
//        *
//        * if (currentUser.role === "team-lead") {
//        *   teamLeadId = currentUser.userId;
//        * }
//        *
//        * Therefore the logged-in team lead can only receive
//        * their own team's members.
//        */
//     const response = await fetch("/api/SurveyData/team-members", {
//   method: "GET",
//   credentials: "include",
//   cache: "no-store",
// });

// const contentType = response.headers.get("content-type") || "";

// if (!contentType.includes("application/json")) {
//   const text = await response.text();

//   console.error(
//     "team-members API returned non-JSON:",
//     response.status,
//     text
//   );

//   throw new Error(
//     `Team members API returned ${response.status}. Check /api/survey/team-members route.`
//   );
// }

// const result = await response.json();

// if (!response.ok || !result?.success) {
//   throw new Error(
//     result?.message || "Failed to load team members."
//   );
// }

//       if (!response.ok || !result?.success) {
//         throw new Error(
//           result?.message || "Failed to load team members."
//         );
//       }

//       const teamMembers: TeamMember[] = result.data || [];

//       setMembers(teamMembers);

//       if (!teamMembers.length) {
//         setPerformances({});
//         setMessage("No team members with SurveyData submissions found.");
//         return;
//       }

//       // =====================================================
//       // LOAD OE PERFORMANCE FOR EACH TEAM MEMBER
//       // =====================================================

//       const initialState: Record<string, MemberPerformance> = {};

//       for (const member of teamMembers) {
//         initialState[String(member._id)] = {
//           ...member,
//           performance: emptyPerformance(),
//           loading: true,
//         };
//       }

//       setPerformances(initialState);

//       /*
//        * Load all members in parallel.
//        *
//        * getOEPerformance currently works with memberName,
//        * so we pass ONLY the names returned by the secured
//        * team-members endpoint.
//        */
//       await Promise.all(
//         teamMembers.map(async (member) => {
//           const memberId = String(member._id);

//           try {
//             const performanceResult = await api<any>(
//               "getOEPerformance",
//               {
//                 memberName: member.name,
//               }
//             );

//             const performance =
//               normalizePerformance(performanceResult);

//             setPerformances((previous) => ({
//               ...previous,
//               [memberId]: {
//                 ...previous[memberId],
//                 performance,
//                 loading: false,
//               },
//             }));
//           } catch (error: any) {
//             setPerformances((previous) => ({
//               ...previous,
//               [memberId]: {
//                 ...previous[memberId],
//                 performance: emptyPerformance(),
//                 loading: false,
//                 error:
//                   error?.message ||
//                   "Failed to load OE performance.",
//               },
//             }));
//           }
//         })
//       );
//     } catch (error: any) {
//       console.error("TeamLeadOEPerformance:", error);

//       setMembers([]);
//       setPerformances({});
//       setMessage(
//         error?.message ||
//           "Failed to load team OE performance."
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

const load = async () => {
  try {
    setLoading(true);
    setMessage("");

    // =====================================================
    // GET ALL MEMBERS OF LOGGED-IN TEAM LEAD
    //
    // DO NOT send teamLeadId.
    //
    // Backend automatically uses:
    // currentUser.userId
    // =====================================================

    const response = await fetch(
      "/api/survey/team-members",
      {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      }
    );

    const contentType =
      response.headers.get("content-type") || "";

    // =====================================================
    // PROTECT AGAINST HTML / 404 RESPONSE
    // =====================================================

    if (
      !contentType.includes(
        "application/json"
      )
    ) {
      const text =
        await response.text();

      console.error(
        "team-members API returned non-JSON:",
        response.status,
        text
      );

      throw new Error(
        `Team members API returned ${response.status}. Check /api/survey/team-members`
      );
    }

    const result =
      await response.json();

    if (
      !response.ok ||
      !result?.success
    ) {
      throw new Error(
        result?.message ||
          "Failed to load team members."
      );
    }

    // =====================================================
    // IMPORTANT:
    // API now returns ALL team members,
    // including users with 0 submissions.
    // =====================================================

    const teamMembers: TeamMember[] =
      Array.isArray(result.data)
        ? result.data
        : [];

    setMembers(teamMembers);

    // =====================================================
    // NO TEAM MEMBERS
    // =====================================================

    if (!teamMembers.length) {
      setPerformances({});

      setMessage(
        "No team members found in your team."
      );

      return;
    }

    // =====================================================
    // INITIAL PERFORMANCE STATE
    //
    // Every member starts with 0 performance.
    // =====================================================

    const initialState: Record<
      string,
      MemberPerformance
    > = {};

    for (const member of teamMembers) {
      const memberId =
        String(member._id);

      initialState[memberId] = {
        ...member,

        performance:
          emptyPerformance(),

        loading: true,
      };
    }

    setPerformances(
      initialState
    );

    // =====================================================
    // LOAD OE PERFORMANCE
    // =====================================================

    await Promise.all(
      teamMembers.map(
        async (member) => {
          const memberId =
            String(member._id);

          try {
            const performanceResult =
              await api<any>(
                "getOEPerformance",
                {
                  employee:
                    member.name,
                }
              );

            const performance =
              normalizePerformance(
                performanceResult
              );

            setPerformances(
              (previous) => ({
                ...previous,

                [memberId]: {
                  ...previous[
                    memberId
                  ],

                  performance,

                  loading: false,

                  error:
                    undefined,
                },
              })
            );
          } catch (error: any) {
            /*
             * IMPORTANT:
             *
             * If user has 0 OE submissions,
             * don't remove the user.
             *
             * Show the member with:
             * Total = 0
             * Approved = 0
             * Pending = 0
             * Rejected = 0
             * Avg = 0
             */

            setPerformances(
              (previous) => ({
                ...previous,

                [memberId]: {
                  ...previous[
                    memberId
                  ],

                  performance:
                    emptyPerformance(),

                  loading: false,

                  error:
                    undefined,
                },
              })
            );

            console.warn(
              `No OE performance for ${member.name}:`,
              error
            );
          }
        }
      )
    );
  } catch (error: any) {
    console.error(
      "TeamLeadOEPerformance:",
      error
    );

    setMembers([]);
    setPerformances({});

    setMessage(
      error?.message ||
        "Failed to load team OE performance."
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    load();
  }, []);

  // =========================================================
  // FILTER MEMBERS
  // =========================================================

  const filteredMembers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return members.filter((member) => {
      const performance =
        performances[String(member._id)]?.performance;

      const matchesSearch =
        !query ||
        member.name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query);

      const matchesStatus =
        statusFilter === "all" ||
        (performance?.items || []).some(
          (item) =>
            (item.status || "pending").toLowerCase() ===
            statusFilter
        );

      return matchesSearch && matchesStatus;
    });
  }, [members, performances, search, statusFilter]);

  // =========================================================
  // TEAM SUMMARY
  // =========================================================

  const teamSummary = useMemo(() => {
    let total = 0;
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    const humanScores: number[] = [];
    const relevancyScores: number[] = [];

    Object.values(performances).forEach((member) => {
      const p = member.performance;

      total += p.total;
      approved += p.approved;
      pending += p.pending;
      rejected += p.rejected;

      if (p.avgHumanScore > 0) {
        humanScores.push(p.avgHumanScore);
      }

      if (p.avgRelevancyScore > 0) {
        relevancyScores.push(p.avgRelevancyScore);
      }
    });

    return {
      total,
      approved,
      pending,
      rejected,

      avgHumanScore:
        humanScores.length > 0
          ? Math.round(
              humanScores.reduce((a, b) => a + b, 0) /
                humanScores.length
            )
          : 0,

      avgRelevancyScore:
        relevancyScores.length > 0
          ? Math.round(
              relevancyScores.reduce((a, b) => a + b, 0) /
                relevancyScores.length
            )
          : 0,
    };
  }, [performances]);

  // =========================================================
  // HELPERS
  // =========================================================

  function getHumanScore(item: OEItem) {
    return Number(
      item.aiScore ??
        item.qualityResult?.ai_score ??
        item.qualityResult?.aiScore ??
        0
    );
  }

  function getRelScore(item: OEItem) {
    return Number(
      item.relScore ??
        item.qualityResult?.relevancy_score ??
        item.qualityResult?.relScore ??
        0
    );
  }

  function getReason(item: OEItem) {
    return (
      item.aiReason ||
      item.qualityResult?.ai_reason ||
      item.qualityResult?.aiReason ||
      ""
    );
  }

  function formatDate(value?: string | null) {
    if (!value) return "—";

    try {
      return new Date(value).toLocaleString();
    } catch {
      return value;
    }
  }

  function scoreColor(value: number) {
    if (value >= 65) return "text-success";
    if (value >= 50) return "text-orange-600";
    return "text-danger";
  }

  function statusBadge(status?: string) {
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
  }

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* HEADER */}

      <div className="rounded-t-2xl bg-brand px-5 py-5 text-white">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Users size={22} />

              <h4 className="text-xl font-bold">
                Team OE Performance
              </h4>
            </div>

            <p className="mt-1 text-xs opacity-85">
              View open-end performance of your team members
            </p>
          </div>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/25 disabled:opacity-50"
          >
            {loading ? (
              <Loader2
                size={16}
                className="animate-spin"
              />
            ) : (
              <RefreshCw size={16} />
            )}

            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      <div className="card rounded-t-none">
        {/* SECURITY INFO */}

        <div className="mb-5 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Users
              size={20}
              className="mt-0.5 text-blue-600"
            />

            <div>
              <p className="text-sm font-semibold text-blue-900">
                Team Lead View
              </p>

              <p className="mt-1 text-xs text-blue-700">
                You can only view OE performance for members
                assigned to your team.
              </p>
            </div>
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        {/* LOADING */}

        {loading && members.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <Loader2
              size={30}
              className="mb-3 animate-spin"
            />

            <p className="text-sm">
              Loading team performance...
            </p>
          </div>
        )}

        {/* TEAM SUMMARY */}

        {!loading && members.length > 0 && (
          <>
            <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard
                icon={<Users size={18} />}
                label="Members"
                value={String(members.length)}
              />

              <StatCard
                icon={<BarChart3 size={18} />}
                label="Total OEs"
                value={String(teamSummary.total)}
              />

              <StatCard
                icon={<CheckCircle2 size={18} />}
                label="Approved"
                value={String(teamSummary.approved)}
                accent="text-success"
              />

              <StatCard
                icon={<TrendingUp size={18} />}
                label="Pending"
                value={String(teamSummary.pending)}
                accent="text-orange-600"
              />

              <StatCard
                icon={<XCircle size={18} />}
                label="Rejected"
                value={String(teamSummary.rejected)}
                accent="text-danger"
              />

              <StatCard
                icon={<Target size={18} />}
                label="Avg Score"
                value={`${teamSummary.avgHumanScore}/100`}
                accent={scoreColor(
                  teamSummary.avgHumanScore
                )}
              />
            </div>

            {/* FILTER */}

            <div className="mb-5 flex flex-col gap-3 md:flex-row">
              <div className="relative flex-1">
                <Search
                  size={17}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <input
                  className="input w-full pl-9"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search team member by name or email..."
                />
              </div>

              <select
                className="input w-full md:w-48"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as
                      | "all"
                      | "approved"
                      | "pending"
                      | "rejected"
                  )
                }
              >
                <option value="all">
                  All OE Status
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="pending">
                  Pending
                </option>

                <option value="rejected">
                  Rejected
                </option>
              </select>
            </div>

            {/* MEMBER LIST */}

            <div className="space-y-4">
              {filteredMembers.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                  <Users
                    size={28}
                    className="mx-auto mb-2 text-slate-300"
                  />

                  <p className="text-sm text-slate-500">
                    No team members found.
                  </p>
                </div>
              ) : (
                filteredMembers.map((member) => {
                  const memberId = String(member._id);

                  const memberData =
                    performances[memberId];

                  const performance =
                    memberData?.performance ||
                    emptyPerformance();

                  const isMemberOpen =
                    expandedMember === memberId;

                  return (
                    <div
                      key={memberId}
                      className="overflow-hidden rounded-xl border-2 border-slate-200 bg-white"
                    >
                      {/* MEMBER HEADER */}

                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-slate-50"
                        onClick={() =>
                          setExpandedMember(
                            isMemberOpen
                              ? null
                              : memberId
                          )
                        }
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 font-bold text-brand">
                              {member.name
                                ?.charAt(0)
                                ?.toUpperCase() || "?"}
                            </div>

                            <div>
                              <div className="font-bold text-slate-800">
                                {member.name}
                              </div>

                              <div className="text-xs text-slate-500">
                                {member.email || "No email"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="hidden items-center gap-5 sm:flex">
                          <MiniStat
                            label="Total"
                            value={performance.total}
                          />

                          <MiniStat
                            label="Approved"
                            value={performance.approved}
                            valueClass="text-success"
                          />

                          <MiniStat
                            label="Pending"
                            value={performance.pending}
                            valueClass="text-orange-600"
                          />

                          <MiniStat
                            label="Rejected"
                            value={performance.rejected}
                            valueClass="text-danger"
                          />

                          <div className="text-right">
                            <div className="text-[10px] font-bold uppercase text-slate-400">
                              Avg Score
                            </div>

                            <div
                              className={`text-sm font-bold ${scoreColor(
                                performance.avgHumanScore
                              )}`}
                            >
                              {performance.avgHumanScore}/100
                            </div>
                          </div>
                        </div>

                        {isMemberOpen ? (
                          <ChevronUp
                            size={20}
                            className="shrink-0"
                          />
                        ) : (
                          <ChevronDown
                            size={20}
                            className="shrink-0"
                          />
                        )}
                      </button>

                      {/* MOBILE SUMMARY */}

                      <div className="grid grid-cols-4 gap-2 border-t border-slate-100 p-3 sm:hidden">
                        <MobileStat
                          label="Total"
                          value={performance.total}
                        />

                        <MobileStat
                          label="Approved"
                          value={performance.approved}
                          valueClass="text-success"
                        />

                        <MobileStat
                          label="Pending"
                          value={performance.pending}
                          valueClass="text-orange-600"
                        />

                        <MobileStat
                          label="Rejected"
                          value={performance.rejected}
                          valueClass="text-danger"
                        />
                      </div>

                      {/* MEMBER PERFORMANCE */}

                      {isMemberOpen && (
                        <div className="border-t border-slate-100 bg-slate-50 p-4">
                          {memberData?.loading ? (
                            <div className="flex items-center justify-center py-8 text-slate-500">
                              <Loader2
                                size={24}
                                className="mr-2 animate-spin"
                              />

                              Loading OE performance...
                            </div>
                          ) : memberData?.error ? (
                            <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                              {memberData.error}
                            </div>
                          ) : (
                            <>
                              {/* PERFORMANCE CARDS */}

                              <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                                <StatCard
                                  icon={
                                    <BarChart3
                                      size={18}
                                    />
                                  }
                                  label="Total OEs"
                                  value={String(
                                    performance.total
                                  )}
                                />

                                <StatCard
                                  icon={
                                    <CheckCircle2
                                      size={18}
                                    />
                                  }
                                  label="Approved"
                                  value={String(
                                    performance.approved
                                  )}
                                  accent="text-success"
                                />

                                <StatCard
                                  icon={
                                    <TrendingUp
                                      size={18}
                                    />
                                  }
                                  label="Avg Human"
                                  value={`${performance.avgHumanScore}/100`}
                                  accent={scoreColor(
                                    performance.avgHumanScore
                                  )}
                                />

                                <StatCard
                                  icon={
                                    <Target
                                      size={18}
                                    />
                                  }
                                  label="Avg Relevancy"
                                  value={`${performance.avgRelevancyScore}/100`}
                                  accent={scoreColor(
                                    performance.avgRelevancyScore
                                  )}
                                />
                              </div>

                              {/* LAST SUBMISSION */}

                              <div className="mb-4 rounded-lg border border-slate-200 bg-white p-3">
                                <div className="text-[10px] font-bold uppercase text-slate-400">
                                  Last Submission
                                </div>

                                <div className="mt-1 text-sm font-medium text-slate-700">
                                  {formatDate(
                                    member.lastSubmitted
                                  )}
                                </div>
                              </div>

                              {/* OE LIST */}

                              <div className="space-y-3">
                                {performance.items.length ===
                                0 ? (
                                  <div className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                                    No OE submissions found.
                                  </div>
                                ) : (
                                  performance.items.map(
                                    (item, index) => {
                                      const id =
                                        String(
                                          item.id ||
                                            item._id ||
                                            `${memberId}-${item.qNumber}-${item.pid}-${index}`
                                        );

                                      const isOpen =
                                        expandedOE === id;

                                      const human =
                                        getHumanScore(item);

                                      const rel =
                                        getRelScore(item);

                                      const reason =
                                        getReason(item);

                                      return (
                                        <div
                                          key={id}
                                          className="overflow-hidden rounded-xl border border-slate-200 bg-white"
                                        >
                                          {/* OE ROW */}

                                          <button
                                            type="button"
                                            className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-slate-50"
                                            onClick={() =>
                                              setExpandedOE(
                                                isOpen
                                                  ? null
                                                  : id
                                              )
                                            }
                                          >
                                            <div className="min-w-0 flex-1">
                                              <div className="flex flex-wrap items-center gap-2">
                                                <span className="font-bold text-brand">
                                                  {item.qNumber ||
                                                    "—"}
                                                </span>

                                                <span className="text-xs text-slate-500">
                                                  PID:{" "}
                                                  {item.pid ||
                                                    "—"}
                                                </span>

                                                {statusBadge(
                                                  item.status
                                                )}
                                              </div>

                                              <p className="mt-1 truncate text-xs text-slate-500">
                                                {item.qText ||
                                                  "No question text"}
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
                                                <ChevronUp
                                                  size={18}
                                                />
                                              ) : (
                                                <ChevronDown
                                                  size={18}
                                                />
                                              )}
                                            </div>
                                          </button>

                                          {/* OE DETAILS */}

                                          {isOpen && (
                                            <div className="border-t border-slate-100 bg-slate-50 p-4">
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
                                                <div className="mb-3 rounded-lg bg-white p-3">
                                                  <div className="text-[10px] font-bold uppercase text-slate-400">
                                                    AI Reason
                                                  </div>

                                                  <p className="mt-1 text-xs text-slate-600">
                                                    {reason}
                                                  </p>
                                                </div>
                                              )}

                                              <div className="mb-3">
                                                <div className="text-[10px] font-bold uppercase text-slate-400">
                                                  Team Member OE
                                                </div>

                                                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                                                  {item.oeResponse ||
                                                    "—"}
                                                </p>
                                              </div>

                                              {item.approvedOE &&
                                                item.approvedOE !==
                                                  item.oeResponse && (
                                                  <div className="mb-3">
                                                    <div className="text-[10px] font-bold uppercase text-green-600">
                                                      Approved OE
                                                    </div>

                                                    <p className="mt-1 whitespace-pre-wrap text-sm text-green-800">
                                                      {
                                                        item.approvedOE
                                                      }
                                                    </p>
                                                  </div>
                                                )}

                                              {item.imageUrl && (
                                                <div className="mb-3">
                                                  <div className="text-[10px] font-bold uppercase text-slate-400">
                                                    Screenshot
                                                  </div>

                                                  <a
                                                    href={
                                                      item.imageUrl
                                                    }
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="mt-1 inline-block text-xs font-semibold text-brand underline"
                                                  >
                                                    Open screenshot
                                                  </a>
                                                </div>
                                              )}

                                              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
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
                                    }
                                  )
                                )}
                              </div>
                            </>
                          )}
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

// =========================================================
// HELPERS
// =========================================================

function emptyPerformance(): PerformanceData {
  return {
    total: 0,
    approved: 0,
    pending: 0,
    rejected: 0,
    avgHumanScore: 0,
    avgRelevancyScore: 0,
    items: [],
  };
}

function normalizePerformance(
  result: any
): PerformanceData {
  // getOEPerformance returns the filtered rows in `oes`.
  // Keep `items` support as a fallback for compatibility.
  const items: OEItem[] = Array.isArray(result?.oes)
    ? result.oes
    : Array.isArray(result?.items)
      ? result.items
      : [];

  // IMPORTANT:
  // Calculate every count from THIS MEMBER'S returned OEs.
  // Do not use result.summary because the UI needs
  // per-member numbers.
  const total = items.length;

  const approved = items.filter((item) => {
    return (
      String(item.status || "")
        .trim()
        .toUpperCase() === "APPROVED"
    );
  }).length;

  const pending = items.filter((item) => {
    return (
      String(item.status || "")
        .trim()
        .toUpperCase() === "PENDING"
    );
  }).length;

  const rejected = items.filter((item) => {
    return (
      String(item.status || "")
        .trim()
        .toUpperCase() === "REJECTED"
    );
  }).length;

  const humanScores = items
    .map((item) =>
      Number(
        item.aiScore ??
          item.qualityResult?.ai_score ??
          item.qualityResult?.aiScore ??
          0
      )
    )
    .filter(
      (value) =>
        Number.isFinite(value) && value > 0
    );

  const relevancyScores = items
    .map((item) =>
      Number(
        item.relScore ??
          item.qualityResult?.relevancy_score ??
          item.qualityResult?.relScore ??
          0
      )
    )
    .filter(
      (value) =>
        Number.isFinite(value) && value > 0
    );

  const avgHumanScore =
    humanScores.length > 0
      ? Math.round(
          humanScores.reduce(
            (sum, value) => sum + value,
            0
          ) / humanScores.length
        )
      : 0;

  const avgRelevancyScore =
    relevancyScores.length > 0
      ? Math.round(
          relevancyScores.reduce(
            (sum, value) => sum + value,
            0
          ) / relevancyScores.length
        )
      : 0;

  return {
    total,
    approved,
    pending,
    rejected,
    avgHumanScore,
    avgRelevancyScore,
    items,
  };
}

// =========================================================
// STAT CARD
// =========================================================

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

// =========================================================
// MINI STAT
// =========================================================

function MiniStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="text-right">
      <div className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </div>

      <div
        className={`text-sm font-bold ${
          valueClass || "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================
// MOBILE STAT
// =========================================================

function MobileStat({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: number;
  valueClass?: string;
}) {
  return (
    <div className="rounded-lg bg-slate-50 p-2 text-center">
      <div className="text-[9px] font-bold uppercase text-slate-400">
        {label}
      </div>

      <div
        className={`text-sm font-bold ${
          valueClass || "text-slate-800"
        }`}
      >
        {value}
      </div>
    </div>
  );
}

// =========================================================
// SCORE BOX
// =========================================================

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