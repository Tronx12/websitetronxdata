


// // "use client";

// // import { useEffect, useState } from "react";
// // import {
// //   Chart as ChartJS,
// //   CategoryScale,
// //   LinearScale,
// //   BarElement,
// //   Title,
// //   Tooltip,
// //   Legend,
// // } from "chart.js";
// // import { Bar } from "react-chartjs-2";

// // ChartJS.register(
// //   CategoryScale,
// //   LinearScale,
// //   BarElement,
// //   Title,
// //   Tooltip,
// //   Legend
// // );

// // type Summary = {
// //   firstTarget: number;
// //   secondTarget: number;
// //   completed: number;
// //   currentTarget: number;
// //   remaining: number;
// //   achievement: number;
// //   currentTargetLabel: "First Target" | "Second Target";
// //   firstTargetAchieved: boolean;
// //   secondTargetAchieved: boolean;
// // };

// // type DailyPerformance = {
// //   date: string;
// //   completed: number;
// // };

// // type UserPerformance = {
// //   userId: string;
// //   name: string;
// //   email: string;
// //   role: string;
// //   firstTarget: number;
// //   secondTarget: number;
// //   target: number;
// //   completed: number;
// //   remaining: number;
// //   achievement: number;
// //   currentTarget?: number;
// //   currentTargetLabel?: "First Target" | "Second Target";
// //   firstTargetAchieved?: boolean;
// //   secondTargetAchieved?: boolean;
// // };


// // type TargetProgress = {
// //   currentTarget: number;
// //   remaining: number;
// //   achievement: number;
// //   currentTargetLabel: "First Target" | "Second Target";
// //   firstTargetAchieved: boolean;
// //   secondTargetAchieved: boolean;
// // };

// // type SurveyRecord = {
// //   _id: string;
// //   createdAt: string;
// //   createdBy?: string;
// //   [key: string]: any;
// // };

// // export default function SurveyPerformancePage() {
// //   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
// //   const [summary, setSummary] = useState<Summary>({
// //     firstTarget: 0,
// //     secondTarget: 0,
// //     completed: 0,
// //     currentTarget: 0,
// //     remaining: 0,
// //     achievement: 0,
// //     currentTargetLabel: "First Target",
// //     firstTargetAchieved: false,
// //     secondTargetAchieved: false,
// //   });
// //   const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>(
// //     []
// //   );
// //   const [users, setUsers] = useState<UserPerformance[]>([]);
// //   const [teamMembers, setTeamMembers] = useState<
// //     Array<{
// //       _id?: string;
// //       name?: string;
// //       email?: string;
// //       role?: string;
// //       totalRecords?: number;
// //     }>
// //   >([]);
// //   const [dateRecords, setDateRecords] = useState<SurveyRecord[]>([]);
// //   const [monthlyRecords, setMonthlyRecords] = useState<SurveyRecord[]>([]);
// //   const [selectedDate, setSelectedDate] = useState<string | null>(null);

// //   // Selected team member for the User Performance table.
// //   // Clicking a user shows only that user's survey/performance data.
// //   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

// //   const [role, setRole] = useState("");
// //   const [loading, setLoading] = useState(false);
// //   const [error, setError] = useState("");

// //   // Modal state
// //   const [modalOpen, setModalOpen] = useState(false);
// //   const [modalRecord, setModalRecord] = useState<SurveyRecord | null>(null);

// //   // ==========================================================
// //   // LOAD ALL MONTHLY RECORDS (fetches per active date)
// //   // ==========================================================
// //   const loadMonthlyRecords = async (dates: string[]) => {
// //     if (!dates || dates.length === 0) {
// //       setMonthlyRecords([]);
// //       return;
// //     }

// //     try {
// //       const responses = await Promise.all(
// //         dates.map((date) =>
// //           fetch(`/api/survey/performance?month=${month}&date=${date}`, {
// //             method: "GET",
// //             credentials: "include",
// //           })
// //             .then((res) => res.json())
// //             .catch(() => ({ success: false, dateRecords: [] }))
// //         )
// //       );

// //       const combined: SurveyRecord[] = [];
// //       responses.forEach((res) => {
// //         if (res?.success && Array.isArray(res.dateRecords)) {
// //           combined.push(...res.dateRecords);
// //         }
// //       });

// //       combined.sort(
// //         (a, b) =>
// //           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
// //       );

// //       setMonthlyRecords(combined);
// //     } catch {
// //       setMonthlyRecords([]);
// //     }
// //   };

// //   // ==========================================================
// //   // LOAD TEAM MEMBERS
// //   //
// //   // Team Lead must only see members assigned to their own team.
// //   // The API forces the logged-in Team Lead's identity server-side.
// //   //
// //   // This roster is also used to keep members with 0 surveys visible.
// //   // ==========================================================
// //   const loadTeamMembers = async () => {
// //     try {
// //       const response = await fetch(
// //         "/api/survey/team-members",
// //         {
// //           method: "GET",
// //           credentials: "include",
// //           cache: "no-store",
// //         }
// //       );

// //       const contentType =
// //         response.headers.get("content-type") || "";

// //       if (!contentType.includes("application/json")) {
// //         throw new Error(
// //           `Team members API returned ${response.status}.`
// //         );
// //       }

// //       const result = await response.json();

// //       if (!response.ok || !result?.success) {
// //         throw new Error(
// //           result?.message || "Failed to load team members."
// //         );
// //       }

// //       // ==========================================================
// //       // DEDUPLICATE TEAM ROSTER
// //       //
// //       // Do NOT use only _id here. The same user can appear with
// //       // different IDs when the team/assignment data contains a
// //       // duplicate reference. Email is the strongest identity,
// //       // then name as fallback.
// //       // ==========================================================
// //       const rawTeamMembers = Array.isArray(result.data)
// //         ? result.data
// //         : [];

// //       const rosterMap = new Map<
// //         string,
// //         (typeof rawTeamMembers)[number]
// //       >();

// //       for (const member of rawTeamMembers) {
// //         const email = String(member?.email || "")
// //           .trim()
// //           .toLowerCase();

// //         const name = String(member?.name || "")
// //           .trim()
// //           .toLowerCase();

// //         const identityKey =
// //           email ||
// //           name ||
// //           String(member?._id || "").trim();

// //         if (!identityKey) continue;

// //         // Keep the first occurrence of the same person.
// //         if (!rosterMap.has(identityKey)) {
// //           rosterMap.set(identityKey, member);
// //         }
// //       }

// //       setTeamMembers(Array.from(rosterMap.values()));
// //     } catch (err) {
// //       console.error("Failed to load team members:", err);
// //       setTeamMembers([]);
// //     }
// //   };


// //   // ==========================================================
// //   // SEQUENTIAL TARGET LOGIC
// //   //
// //   // Team Lead and Survey Tester both follow the same sequence:
// //   // 1. First Target must be achieved first.
// //   // 2. Then Second Target becomes the active goal.
// //   // 3. Both targets remain visible in the UI.
// //   // ==========================================================
// //   const getTargetProgress = (
// //     completed: number,
// //     firstTarget: number,
// //     secondTarget: number
// //   ): TargetProgress => {
// //     const safeCompleted = Math.max(0, Number(completed) || 0);
// //     const safeFirst = Math.max(0, Number(firstTarget) || 0);
// //     const safeSecond = Math.max(0, Number(secondTarget) || 0);

// //     const firstTargetAchieved =
// //       safeFirst > 0 && safeCompleted >= safeFirst;

// //     const secondTargetAchieved =
// //       safeSecond > 0 && safeCompleted >= safeSecond;

// //     // If only the second target is configured, use it directly.
// //     if (safeFirst <= 0) {
// //       return {
// //         currentTarget: safeSecond,
// //         remaining: Math.max(safeSecond - safeCompleted, 0),
// //         achievement:
// //           safeSecond > 0
// //             ? Math.min(Math.round((safeCompleted / safeSecond) * 100), 100)
// //             : 0,
// //         currentTargetLabel: "Second Target",
// //         firstTargetAchieved: false,
// //         secondTargetAchieved,
// //       };
// //     }

// //     // First target has priority.
// //     if (!firstTargetAchieved) {
// //       return {
// //         currentTarget: safeFirst,
// //         remaining: Math.max(safeFirst - safeCompleted, 0),
// //         achievement:
// //           safeFirst > 0
// //             ? Math.min(Math.round((safeCompleted / safeFirst) * 100), 100)
// //             : 0,
// //         currentTargetLabel: "First Target",
// //         firstTargetAchieved: false,
// //         secondTargetAchieved: false,
// //       };
// //     }

// //     // First target achieved -> motivate toward second target.
// //     const currentTarget = safeSecond > 0 ? safeSecond : safeFirst;

// //     return {
// //       currentTarget,
// //       remaining: Math.max(currentTarget - safeCompleted, 0),
// //       achievement:
// //         currentTarget > 0
// //           ? Math.min(Math.round((safeCompleted / currentTarget) * 100), 100)
// //           : 0,
// //       currentTargetLabel: "Second Target",
// //       firstTargetAchieved: true,
// //       secondTargetAchieved,
// //     };
// //   };

// //   // ==========================================================
// //   // LOAD PERFORMANCE
// //   // ==========================================================

// //   // ==========================================================
// //   // FINAL SAFETY DEDUPLICATION
// //   //
// //   // A user must appear only once even if the backend returns
// //   // multiple team records with different _id values.
// //   // ==========================================================
// //   const uniqueTeamMembers = Array.from(
// //     new Map(
// //       teamMembers.map((member) => {
// //         const email = String(member.email || "")
// //           .trim()
// //           .toLowerCase();

// //         const name = String(member.name || "")
// //           .trim()
// //           .toLowerCase();

// //         // Prefer email/name over _id because the same user can
// //         // have different assignment IDs.
// //         const key =
// //           email ||
// //           name ||
// //           String(member._id || "").trim();

// //         return [key, member] as const;
// //       })
// //     ).values()
// //   );
// // // ==========================================================
// // // DEDUPLICATE USERS
// // // ==========================================================

// // const deduplicateUsers = (
// //   list: UserPerformance[]
// // ): UserPerformance[] => {
// //   const map = new Map<string, UserPerformance>();

// //   for (const user of list) {
// //     const email = String(user.email || "")
// //       .trim()
// //       .toLowerCase();

// //     const name = String(user.name || "")
// //       .trim()
// //       .toLowerCase();

// //     const userId = String(user.userId || "")
// //       .trim();

// //     // Email is the strongest identity.
// //     // Then name, then userId as fallback.
// //     const identityKey =
// //       email ||
// //       name ||
// //       userId;

// //     if (!identityKey) continue;

// //     // Keep only one record for the same real user.
// //     if (!map.has(identityKey)) {
// //       map.set(identityKey, user);
// //     }
// //   }

// //   return Array.from(map.values());
// // };


// //   const loadPerformance = async (date?: string) => {
// //     try {
// //       setLoading(true);
// //       setError("");

// //       let url = `/api/survey/performance?month=${month}`;
// //       if (date) {
// //         url += `&date=${date}`;
// //       }

// //       const response = await fetch(url, {
// //         method: "GET",
// //         credentials: "include",
// //       });

// //       const data = await response.json();

// //       if (!response.ok || !data.success) {
// //         throw new Error(data.message || "Failed to load performance");
// //       }

// //       const apiSummary = data.summary || {};

// //       const firstTarget = Number(
// //         apiSummary.firstTarget ?? data.firstTarget ?? 0
// //       );

// //       const secondTarget = Number(
// //         apiSummary.secondTarget ?? data.secondTarget ?? 0
// //       );

// //       const completed = Number(apiSummary.completed ?? 0);

// //       const summaryProgress = getTargetProgress(
// //         completed,
// //         firstTarget,
// //         secondTarget
// //       );

// //       setSummary({
// //         firstTarget,
// //         secondTarget,
// //         completed,
// //         ...summaryProgress,
// //       });

// //       const daily: DailyPerformance[] = data.dailyPerformance || [];
// //       setDailyPerformance(daily);
// //       setRole(data.role || "");

// //       const apiUsers: UserPerformance[] = Array.isArray(data.users)
// //         ? data.users.map((user: UserPerformance) => {
// //             const firstTarget = Number(
// //               user.firstTarget ??
// //                 data.summary?.firstTarget ??
// //                 data.firstTarget ??
// //                 0
// //             );

// //             const secondTarget = Number(
// //               user.secondTarget ??
// //                 data.summary?.secondTarget ??
// //                 data.secondTarget ??
// //                 0
// //             );

// //             const completed = Number(user.completed ?? 0);

// //             const progress = getTargetProgress(
// //               completed,
// //               firstTarget,
// //               secondTarget
// //             );

// //             return {
// //               ...user,
// //               firstTarget,
// //               secondTarget,
// //               target: progress.currentTarget,
// //               completed,
// //               remaining: progress.remaining,
// //               achievement: progress.achievement,
// //               currentTarget: progress.currentTarget,
// //               currentTargetLabel: progress.currentTargetLabel,
// //               firstTargetAchieved: progress.firstTargetAchieved,
// //               secondTargetAchieved: progress.secondTargetAchieved,
// //             };
// //           })
// //         : [];

// // // ==========================================================
// // // NORMALIZE ROLE
// // // ==========================================================

// // const normalizedRole = String(data.role || "")
// //   .toLowerCase()
// //   .replace(/[-\s]/g, "_");

// // const isTeamLead =
// //   normalizedRole === "teamlead" ||
// //   normalizedRole === "team_lead";

// // // ==========================================================
// // // TEAM LEAD
// // // ==========================================================

// // if (isTeamLead) {
// //   const allowedIds = new Set(
// //     uniqueTeamMembers
// //       .map((member) => String(member._id || "").trim())
// //       .filter(Boolean)
// //   );

// //   const allowedNames = new Set(
// //     uniqueTeamMembers
// //       .map((member) =>
// //         String(member.name || "")
// //           .trim()
// //           .toLowerCase()
// //       )
// //       .filter(Boolean)
// //   );

// //   const allowedEmails = new Set(
// //     uniqueTeamMembers
// //       .map((member) =>
// //         String(member.email || "")
// //           .trim()
// //           .toLowerCase()
// //       )
// //       .filter(Boolean)
// //   );

// //   // Only users belonging to this Team Lead's team.
// //   const filteredUsers = apiUsers.filter((user) => {
// //     const userId = String(user.userId || "").trim();

// //     const name = String(user.name || "")
// //       .trim()
// //       .toLowerCase();

// //     const email = String(user.email || "")
// //       .trim()
// //       .toLowerCase();

// //     return (
// //       (userId && allowedIds.has(userId)) ||
// //       (name && allowedNames.has(name)) ||
// //       (email && allowedEmails.has(email))
// //     );
// //   });

// //   // ========================================================
// //   // MATCH PERFORMANCE WITH TEAM ROSTER
// //   // ========================================================

// //   const performanceByIdentity =
// //     new Map<string, UserPerformance>();

// //   for (const user of filteredUsers) {
// //     const keys = [
// //       String(user.userId || "").trim(),

// //       String(user.email || "")
// //         .trim()
// //         .toLowerCase(),

// //       String(user.name || "")
// //         .trim()
// //         .toLowerCase(),
// //     ].filter(Boolean);

// //     for (const key of keys) {
// //       if (!performanceByIdentity.has(key)) {
// //         performanceByIdentity.set(key, user);
// //       }
// //     }
// //   }

// //   // ========================================================
// //   // BUILD ONE ROW PER REAL USER
// //   // ========================================================

// //   const teamPerformanceMap =
// //     new Map<string, UserPerformance>();

// //   for (const member of uniqueTeamMembers) {
// //     const memberId = String(member._id || "").trim();

// //     const memberEmail = String(member.email || "")
// //       .trim()
// //       .toLowerCase();

// //     const memberName = String(member.name || "")
// //       .trim()
// //       .toLowerCase();

// //     // Email > name > ID
// //     const identityKey =
// //       memberEmail ||
// //       memberName ||
// //       memberId;

// //     if (!identityKey) continue;

// //     const existing =
// //       (memberId &&
// //         performanceByIdentity.get(memberId)) ||
// //       (memberEmail &&
// //         performanceByIdentity.get(memberEmail)) ||
// //       (memberName &&
// //         performanceByIdentity.get(memberName));

// //     const memberFirstTarget = Number(
// //       existing?.firstTarget ??
// //         data.summary?.firstTarget ??
// //         data.firstTarget ??
// //         0
// //     );

// //     const memberSecondTarget = Number(
// //       existing?.secondTarget ??
// //         data.summary?.secondTarget ??
// //         data.secondTarget ??
// //         0
// //     );

// //     const memberCompleted = Number(existing?.completed ?? 0);

// //     const memberProgress = getTargetProgress(
// //       memberCompleted,
// //       memberFirstTarget,
// //       memberSecondTarget
// //     );

// //     const user: UserPerformance = existing
// //       ? {
// //           ...existing,
// //           firstTarget: memberFirstTarget,
// //           secondTarget: memberSecondTarget,
// //           target: memberProgress.currentTarget,
// //           completed: memberCompleted,
// //           remaining: memberProgress.remaining,
// //           achievement: memberProgress.achievement,
// //           currentTarget: memberProgress.currentTarget,
// //           currentTargetLabel: memberProgress.currentTargetLabel,
// //           firstTargetAchieved: memberProgress.firstTargetAchieved,
// //           secondTargetAchieved: memberProgress.secondTargetAchieved,
// //         }
// //       : {
// //           userId:
// //             memberId ||
// //             memberEmail ||
// //             memberName,

// //           name: member.name || "Unknown",

// //           email: member.email || "",

// //           role: member.role || "survey-tester",

// //           firstTarget: memberFirstTarget,

// //           secondTarget: memberSecondTarget,

// //           target: memberProgress.currentTarget,

// //           completed: 0,

// //           remaining: memberProgress.remaining,

// //           achievement: memberProgress.achievement,

// //           currentTarget: memberProgress.currentTarget,

// //           currentTargetLabel: memberProgress.currentTargetLabel,

// //           firstTargetAchieved: memberProgress.firstTargetAchieved,

// //           secondTargetAchieved: memberProgress.secondTargetAchieved,
// //         };

// //     // IMPORTANT:
// //     // Never add the same person twice.
// //     if (!teamPerformanceMap.has(identityKey)) {
// //       teamPerformanceMap.set(
// //         identityKey,
// //         user
// //       );
// //     }
// //   }

// //   const teamPerformance =
// //     Array.from(
// //       teamPerformanceMap.values()
// //     );

// //   // Final safety deduplication.
// //   setUsers(
// //     deduplicateUsers(teamPerformance)
// //   );
// // } else {
// //   // HR/Admin/etc.
// //   // IMPORTANT: also deduplicate API users.
// //   setUsers(
// //     deduplicateUsers(apiUsers)
// //   );
// // }

// //       // const apiUsers: UserPerformance[] =
// //       //   Array.isArray(data.users) ? data.users : [];

// //       // // Team Lead: show ONLY their own team members.
// //       // // HR/Admin keep the API-provided user list.
// //       // const normalizedRole = String(
// //       //   data.role || ""
// //       // )
// //       //   .toLowerCase()
// //       //   .replace(/[-\s]/g, "_");

// //       // const isTeamLead =
// //       //   normalizedRole === "teamlead" ||
// //       //   normalizedRole === "team_lead" ||
// //       //   normalizedRole === "team-lead";

// //       // if (isTeamLead) {
// //       //   const allowedIds = new Set(
// //       //     teamMembers
// //       //       .map((member) => String(member._id || "").trim())
// //       //       .filter(Boolean)
// //       //   );

// //       //   const allowedNames = new Set(
// //       //     teamMembers
// //       //       .map((member) =>
// //       //         String(member.name || "")
// //       //           .trim()
// //       //           .toLowerCase()
// //       //       )
// //       //       .filter(Boolean)
// //       //   );

// //       //   const allowedEmails = new Set(
// //       //     teamMembers
// //       //       .map((member) =>
// //       //         String(member.email || "")
// //       //           .trim()
// //       //           .toLowerCase()
// //       //       )
// //       //       .filter(Boolean)
// //       //   );

// //       //   const filteredUsers = apiUsers.filter((user) => {
// //       //     const userId = String(user.userId || "").trim();
// //       //     const name = String(user.name || "")
// //       //       .trim()
// //       //       .toLowerCase();
// //       //     const email = String(user.email || "")
// //       //       .trim()
// //       //       .toLowerCase();

// //       //     return (
// //       //       (userId && allowedIds.has(userId)) ||
// //       //       (name && allowedNames.has(name)) ||
// //       //       (email && allowedEmails.has(email))
// //       //     );
// //       //   });

// //       //   // Merge the roster with performance so a member with 0
// //       //   // surveys is still displayed.
// //       //   const performanceByIdentity = new Map<
// //       //     string,
// //       //     UserPerformance
// //       //   >();

// //       //   for (const user of filteredUsers) {
// //       //     const keys = [
// //       //       String(user.userId || "").trim(),
// //       //       String(user.email || "").trim().toLowerCase(),
// //       //       String(user.name || "").trim().toLowerCase(),
// //       //     ].filter(Boolean);

// //       //     for (const key of keys) {
// //       //       performanceByIdentity.set(key, user);
// //       //     }
// //       //   }

// //       //   const teamPerformanceMap = new Map<string, UserPerformance>();

// //       //   for (const member of uniqueTeamMembers) {
// //       //     const memberId = String(member._id || "").trim();
// //       //     const memberEmail = String(member.email || "")
// //       //       .trim()
// //       //       .toLowerCase();
// //       //     const memberName = String(member.name || "")
// //       //       .trim()
// //       //       .toLowerCase();

// //       //     // Use email/name as the real-person identity.
// //       //     // _id may be different for duplicate assignment records.
// //       //     const identityKey =
// //       //       memberEmail ||
// //       //       memberName ||
// //       //       memberId;

// //       //     const existing =
// //       //       (memberId &&
// //       //         performanceByIdentity.get(memberId)) ||
// //       //       (memberEmail &&
// //       //         performanceByIdentity.get(memberEmail)) ||
// //       //       (memberName &&
// //       //         performanceByIdentity.get(memberName));

// //       //     const user: UserPerformance = existing || {
// //       //       userId: memberId || memberEmail || memberName,
// //       //       name: member.name || "Unknown",
// //       //       email: member.email || "",
// //       //       role: member.role || "survey-tester",
// //       //       target: 0,
// //       //       completed: 0,
// //       //       remaining: 0,
// //       //       achievement: 0,
// //       //     };

// //       //     // Exactly one row per real user.
// //       //     if (!teamPerformanceMap.has(identityKey)) {
// //       //       teamPerformanceMap.set(identityKey, user);
// //       //     }
// //       //   }

// //       //   const teamPerformance: UserPerformance[] =
// //       //     Array.from(teamPerformanceMap.values());

// //       //   setUsers(teamPerformance);
// //       // } else {
// //       //   setUsers(apiUsers);
// //       // }

// //       if (date) {
// //         setDateRecords(data.dateRecords || []);
// //       } else {
// //         // Default view: fetch all records across active dates
// //         loadMonthlyRecords(daily.map((d) => d.date));
// //       }
// //     } catch (err: any) {
// //       setError(err?.message || "Failed to load performance");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   // ==========================================================
// //   // INITIAL LOAD
// //   // ==========================================================
// //   useEffect(() => {
// //     setSelectedDate(null);
// //     setSelectedUserId(null);
// //     setDateRecords([]);
// //     setMonthlyRecords([]);

// //     const initialize = async () => {
// //       // Load roster first so the Team Lead performance table
// //       // can include members with zero submissions.
// //       await loadTeamMembers();
// //     };

// //     initialize();
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [month]);

// //   useEffect(() => {
// //     // Once the team roster is available, load performance.
// //     loadPerformance();
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [month, teamMembers]);

// //   // ==========================================================
// //   // CLICK DATE
// //   // ==========================================================
// //   const handleDateClick = (date: string) => {
// //     setSelectedDate(date);
// //     loadPerformance(date);
// //   };

// //   // ==========================================================
// //   // CLEAR DATE FILTER
// //   // ==========================================================
// //   const clearDateFilter = () => {
// //     setSelectedDate(null);
// //     setDateRecords([]);
// //     loadPerformance();
// //   };

// //   // ==========================================================
// //   // FORMAT DATE
// //   // ==========================================================
// //   const formatDate = (date: string) => {
// //     const [, m, d] = date.split("-");
// //     return `${d}/${m}`;
// //   };

// //   const formatFullDate = (date: string) => {
// //     return new Date(date).toLocaleDateString("en-IN", {
// //       weekday: "long",
// //       day: "numeric",
// //       month: "long",
// //       year: "numeric",
// //     });
// //   };

// //   // ==========================================================
// //   // FORMAT ROLE
// //   // ==========================================================
// //   const formatRole = (value: string) => {
// //     if (!value) return "";
// //     if (value.toLowerCase().includes("survey")) return "Survey Tester";
// //     if (value.toLowerCase().includes("team")) return "Team Lead";
// //     return value.toUpperCase();
// //   };

// //   // ==========================================================
// //   // RECORDS SHOWN IN TABLE (date filter wins, else monthly)
// //   // ==========================================================
// //   const displayedRecords = selectedDate ? dateRecords : monthlyRecords;

// //   // ==========================================================
// //   // SELECTED USER
// //   // ==========================================================

// //   const selectedUser = users.find(
// //     (user) => String(user.userId) === String(selectedUserId)
// //   );

// //   // Show only the selected user's survey records.
// //   // createdBy can be an ID, name, or email depending on the API data.
// //   const selectedUserRecords = selectedUserId
// //     ? displayedRecords.filter((record) => {
// //         const createdBy = String(record.createdBy || "")
// //           .trim()
// //           .toLowerCase();

// //         const userId = String(selectedUser?.userId || "")
// //           .trim()
// //           .toLowerCase();

// //         const userName = String(selectedUser?.name || "")
// //           .trim()
// //           .toLowerCase();

// //         const userEmail = String(selectedUser?.email || "")
// //           .trim()
// //           .toLowerCase();

// //         return (
// //           (userId && createdBy === userId) ||
// //           (userName && createdBy === userName) ||
// //           (userEmail && createdBy === userEmail)
// //         );
// //       })
// //     : displayedRecords;

// //   // ==========================================================
// //   // CHART DATA
// //   // ==========================================================
// //   const chartData = {
// //     labels: dailyPerformance.map((item) => formatDate(item.date)),
// //     datasets: [
// //       {
// //         label: "Completed",
// //         data: dailyPerformance.map((item) => item.completed),
// //         backgroundColor: dailyPerformance.map((item) =>
// //           selectedDate === item.date
// //             ? "rgba(37, 99, 235, 1)"
// //             : "rgba(96, 165, 250, 0.85)"
// //         ),
// //         hoverBackgroundColor: "rgba(37, 99, 235, 1)",
// //         borderColor: "rgba(37, 99, 235, 0.4)",
// //         borderWidth: 1,
// //         borderRadius: 8,
// //         maxBarThickness: 40,
// //       },
// //     ],
// //   };

// //   const chartOptions = {
// //     responsive: true,
// //     maintainAspectRatio: false,
// //     plugins: {
// //       legend: { display: false },
// //       tooltip: {
// //         backgroundColor: "rgba(17, 24, 39, 0.95)",
// //         padding: 12,
// //         cornerRadius: 8,
// //         titleFont: { size: 13, weight: 600 },
// //         bodyFont: { size: 12 },
// //         displayColors: false,
// //         callbacks: {
// //           label: (context: any) => `${context.raw} surveys completed`,
// //         },
// //       },
// //     },
// //     scales: {
// //       y: {
// //         beginAtZero: true,
// //         ticks: {
// //           stepSize: 1,
// //           color: "#9ca3af",
// //           font: { size: 11 },
// //         },
// //         grid: { color: "rgba(229, 231, 235, 0.6)" },
// //         border: { display: false },
// //       },
// //       x: {
// //         grid: { display: false },
// //         ticks: { color: "#6b7280", font: { size: 11 } },
// //         border: { display: false },
// //       },
// //     },
// //     onClick: (_event: any, elements: any[]) => {
// //       if (elements.length > 0) {
// //         const index = elements[0].index;
// //         const date = dailyPerformance[index].date;
// //         handleDateClick(date);
// //       }
// //     },
// //   };

// //   // ==========================================================
// //   // MODAL HANDLERS
// //   // ==========================================================
// //   const openModal = (record: SurveyRecord) => {
// //     setModalRecord(record);
// //     setModalOpen(true);
// //   };

// //   const closeModal = () => {
// //     setModalOpen(false);
// //     setModalRecord(null);
// //   };

// //   // ==========================================================
// //   // HELPERS
// //   // ==========================================================
// //   const getDisplayFields = (record: SurveyRecord) => {
// //     const excluded = ["_id", "createdAt", "updatedAt", "createdBy", "__v"];
// //     return Object.entries(record).filter(([key]) => !excluded.includes(key));
// //   };

// //   const formatFieldLabel = (key: string) =>
// //     key
// //       .replace(/([A-Z])/g, " $1")
// //       .replace(/_/g, " ")
// //       .replace(/\b\w/g, (c) => c.toUpperCase())
// //       .trim();

// //   const formatFieldValue = (value: any): string => {
// //     if (value === null || value === undefined) return "—";
// //     if (typeof value === "boolean") return value ? "Yes" : "No";
// //     if (Array.isArray(value)) {
// //       if (value.length === 0) return "—";
// //       if (typeof value[0] === "object") {
// //         return value
// //           .map((v) => Object.values(v).filter(Boolean).join(" • "))
// //           .join("\n");
// //       }
// //       return value.join(", ");
// //     }
// //     if (typeof value === "object") {
// //       return Object.entries(value)
// //         .map(([k, v]) => `${formatFieldLabel(k)}: ${v}`)
// //         .join("\n");
// //     }
// //     return String(value);
// //   };

// //   // ==========================================================
// //   // LOADING
// //   // ==========================================================
// //   if (loading) {
// //     return (
// //       <div className="flex min-h-screen items-center justify-center bg-slate-50">
// //         <div className="flex flex-col items-center gap-3">
// //           <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
// //           <p className="text-sm text-slate-500">Loading performance data...</p>
// //         </div>
// //       </div>
// //     );
// //   }

// //   // ==========================================================
// //   // UI
// //   // ==========================================================
// //   return (
// //     <div className="min-h-screen bg-slate-50">
// //       <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
// //         {/* HEADER */}
// //         <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
// //           <div>
// //             <h4 className="text-2xl font-semibold tracking-tight text-slate-900">
// //               Survey Performance
// //             </h4>
// //             <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
// //               <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
// //               {formatRole(role) || "Dashboard"}
// //             </p>
// //           </div>
// //           <div className="flex items-center gap-2">
// //             <label className="text-sm font-medium text-slate-600">Month</label>
// //             <input
// //               type="month"
// //               value={month}
// //               onChange={(e) => setMonth(e.target.value)}
// //               className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
// //             />
// //           </div>
// //         </div>

// //         {/* ERROR */}
// //         {error && (
// //           <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
// //             <svg
// //               className="h-5 w-5 flex-shrink-0"
// //               fill="none"
// //               viewBox="0 0 24 24"
// //               stroke="currentColor"
// //               strokeWidth={2}
// //             >
// //               <path
// //                 strokeLinecap="round"
// //                 strokeLinejoin="round"
// //                 d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
// //               />
// //             </svg>
// //             {error}
// //           </div>
// //         )}

// //         {/* SUMMARY CARDS */}
// //         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
// //           <SummaryCard
// //             label="First Target"
// //             value={summary.firstTarget}
// //             accent="slate"
// //             icon={
// //               <path
// //                 strokeLinecap="round"
// //                 strokeLinejoin="round"
// //                 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
// //               />
// //             }
// //           />

// //           <SummaryCard
// //             label="Second Target"
// //             value={summary.secondTarget}
// //             accent="blue"
// //             icon={
// //               <path
// //                 strokeLinecap="round"
// //                 strokeLinejoin="round"
// //                 d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
// //               />
// //             }
// //           />

// //           <SummaryCard
// //             label="Completed"
// //             value={summary.completed}
// //             accent="emerald"
// //             icon={
// //               <path
// //                 strokeLinecap="round"
// //                 strokeLinejoin="round"
// //                 d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 01-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 01-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 01-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
// //               />
// //             }
// //           />

// //           <SummaryCard
// //             label={`${summary.currentTargetLabel} Progress`}
// //             value={`${summary.achievement}%`}
// //             accent={summary.secondTargetAchieved ? "emerald" : "amber"}
// //             icon={
// //               <path
// //                 strokeLinecap="round"
// //                 strokeLinejoin="round"
// //                 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
// //               />
// //             }
// //           />
// //         </div>

// //         {/* TEAM LEAD TARGET MOTIVATION */}
// //         <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
// //           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
// //             <div>
// //               <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                 Team Target Progress
// //               </p>

// //               {summary.secondTargetAchieved ? (
// //                 <>
// //                   <h3 className="mt-1 text-lg font-semibold text-emerald-700">
// //                     🎉 Both targets achieved!
// //                   </h3>
// //                   <p className="mt-1 text-sm text-slate-500">
// //                     First Target {summary.firstTarget} ✓ · Second Target{" "}
// //                     {summary.secondTarget} ✓
// //                   </p>
// //                 </>
// //               ) : summary.firstTargetAchieved ? (
// //                 <>
// //                   <h3 className="mt-1 text-lg font-semibold text-blue-700">
// //                     First Target achieved — motivate the team for the Second Target!
// //                   </h3>
// //                   <p className="mt-1 text-sm text-slate-500">
// //                     The team has completed {summary.completed}. Only{" "}
// //                     <span className="font-semibold text-blue-700">
// //                       {summary.remaining}
// //                     </span>{" "}
// //                     more to reach the Second Target of{" "}
// //                     <span className="font-semibold">
// //                       {summary.secondTarget}
// //                     </span>.
// //                   </p>
// //                 </>
// //               ) : (
// //                 <>
// //                   <h3 className="mt-1 text-lg font-semibold text-slate-800">
// //                     Focus on the First Target
// //                   </h3>
// //                   <p className="mt-1 text-sm text-slate-500">
// //                     The team needs{" "}
// //                     <span className="font-semibold text-amber-600">
// //                       {summary.remaining}
// //                     </span>{" "}
// //                     more survey
// //                     {summary.remaining === 1 ? "" : "s"} to reach the First
// //                     Target of{" "}
// //                     <span className="font-semibold">
// //                       {summary.firstTarget}
// //                     </span>
// //                     . After that, the Second Target becomes active.
// //                   </p>
// //                 </>
// //               )}
// //             </div>

// //             <div className="min-w-[220px]">
// //               <div className="mb-1 flex items-center justify-between text-xs">
// //                 <span className="font-medium text-slate-500">
// //                   {summary.currentTargetLabel}
// //                 </span>
// //                 <span className="font-semibold text-slate-700">
// //                   {summary.completed} / {summary.currentTarget}
// //                 </span>
// //               </div>

// //               <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
// //                 <div
// //                   className={`h-full rounded-full transition-all ${
// //                     summary.secondTargetAchieved
// //                       ? "bg-emerald-500"
// //                       : summary.firstTargetAchieved
// //                       ? "bg-blue-500"
// //                       : "bg-amber-500"
// //                   }`}
// //                   style={{
// //                     width: `${Math.min(summary.achievement, 100)}%`,
// //                   }}
// //                 />
// //               </div>
// //             </div>
// //           </div>
// //         </div>

// //         {/* DAILY PERFORMANCE CHART */}
// //         <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
// //           <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
// //             <div>
// //               <h2 className="text-base font-semibold text-slate-900">
// //                 Daily Survey Performance
// //               </h2>
// //               <p className="text-sm text-slate-500">
// //                 Click a bar to filter records by that date.
// //               </p>
// //             </div>
// //             {selectedDate && (
// //               <button
// //                 onClick={clearDateFilter}
// //                 className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
// //               >
// //                 Show all dates
// //               </button>
// //             )}
// //           </div>

// //           {dailyPerformance.length === 0 ? (
// //             <EmptyState
// //               title="No survey data"
// //               description="No survey data found for this month."
// //             />
// //           ) : (
// //             <>
// //               <div className="h-72">
// //                 <Bar data={chartData} options={chartOptions} />
// //               </div>

// //               {/* Date pills */}
// //               <div className="mt-5 flex flex-wrap gap-2">
// //                 <button
// //                   onClick={clearDateFilter}
// //                   className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
// //                     selectedDate === null
// //                       ? "border-blue-600 bg-blue-600 text-white shadow-sm"
// //                       : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
// //                   }`}
// //                 >
// //                   All Dates
// //                 </button>
// //                 {dailyPerformance.map((item) => (
// //                   <button
// //                     key={item.date}
// //                     onClick={() => handleDateClick(item.date)}
// //                     className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
// //                       selectedDate === item.date
// //                         ? "border-blue-600 bg-blue-600 text-white shadow-sm"
// //                         : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
// //                     }`}
// //                   >
// //                     <span>{formatDate(item.date)}</span>
// //                     <span
// //                       className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
// //                         selectedDate === item.date
// //                           ? "bg-white/20 text-white"
// //                           : "bg-slate-100 text-slate-600"
// //                       }`}
// //                     >
// //                       {item.completed}
// //                     </span>
// //                   </button>
// //                 ))}
// //               </div>
// //             </>
// //           )}
// //         </div>

// //         {/* USER PERFORMANCE */}
// //         {(role === "teamlead" ||
// //           role === "team_lead" ||
// //           role === "hr" ||
// //           role === "admin") && (
// //           <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
// //             <div className="border-b border-slate-100 p-6">
// //               <h2 className="text-base font-semibold text-slate-900">
// //                 User Performance
// //               </h2>
// //               <p className="text-sm text-slate-500">
// //                 Performance of users available to your role.
// //               </p>
// //             </div>
// //             <div className="overflow-x-auto">
// //               <table className="w-full text-sm">
// //                 <thead>
// //                   <tr className="border-b border-slate-100 bg-slate-50/60">
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       User
// //                     </th>
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Role
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       First Target
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Second Target
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Completed
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Current Goal
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Remaining
// //                     </th>
// //                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Progress
// //                     </th>
// //                   </tr>
// //                 </thead>
// //                 <tbody className="divide-y divide-slate-100">
// //                   {users.length === 0 ? (
// //                     <tr>
// //                       <td
// //                         colSpan={8}
// //                         className="px-6 py-10 text-center text-sm text-slate-400"
// //                       >
// //                         No team members found.
// //                       </td>
// //                     </tr>
// //                   ) : null}

// //                   {users.map((user) => (
// //                     <tr
// //                       key={user.userId}
// //                       onClick={() => {
// //                         const id = String(user.userId);

// //                         setSelectedUserId(
// //                           selectedUserId === id ? null : id
// //                         );

// //                         // Clear date selection so the selected user's
// //                         // monthly data is shown immediately.
// //                         setSelectedDate(null);
// //                         setDateRecords([]);
// //                       }}
// //                       className={`cursor-pointer transition ${
// //                         String(selectedUserId) === String(user.userId)
// //                           ? "bg-blue-50 hover:bg-blue-50"
// //                           : "hover:bg-slate-50/60"
// //                       }`}
// //                     >
// //                       <td className="px-6 py-4">
// //                         <div className="flex items-center gap-3">
// //                           <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-semibold text-white">
// //                             {user.name
// //                               ?.split(" ")
// //                               .map((n) => n[0])
// //                               .slice(0, 2)
// //                               .join("")
// //                               .toUpperCase() || "?"}
// //                           </div>
// //                           <div className="min-w-0">
// //                             <div
// //                               className={`truncate font-medium ${
// //                                 String(selectedUserId) === String(user.userId)
// //                                   ? "text-blue-700"
// //                                   : "text-slate-800"
// //                               }`}
// //                             >
// //                               {user.name}
// //                             </div>

// //                             {String(selectedUserId) === String(user.userId) && (
// //                               <div className="mt-0.5 text-[11px] font-medium text-blue-600">
// //                                 Selected — showing this user's data
// //                               </div>
// //                             )}
// //                             <div className="truncate text-xs text-slate-500">
// //                               {user.email}
// //                             </div>
// //                           </div>
// //                         </div>
// //                       </td>
// //                       <td className="px-6 py-4">
// //                         <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
// //                           {user.role}
// //                         </span>
// //                       </td>
// //                       <td className="px-6 py-4 text-right font-medium text-slate-700">
// //                         {user.firstTarget}
// //                         {user.firstTargetAchieved && (
// //                           <span className="ml-1 text-emerald-600">✓</span>
// //                         )}
// //                       </td>

// //                       <td className="px-6 py-4 text-right font-medium text-slate-700">
// //                         {user.secondTarget}
// //                         {user.secondTargetAchieved && (
// //                           <span className="ml-1 text-emerald-600">✓</span>
// //                         )}
// //                       </td>

// //                       <td className="px-6 py-4 text-right font-semibold text-emerald-600">
// //                         {user.completed}
// //                       </td>

// //                       <td className="px-6 py-4 text-right">
// //                         <div className="font-semibold text-slate-700">
// //                           {user.currentTarget ?? user.target}
// //                         </div>
// //                         <div className="text-[11px] text-slate-500">
// //                           {user.currentTargetLabel ||
// //                             (user.firstTargetAchieved
// //                               ? "Second Target"
// //                               : "First Target")}
// //                         </div>
// //                       </td>

// //                       <td className="px-6 py-4 text-right font-medium text-amber-600">
// //                         {user.remaining}
// //                       </td>

// //                       <td className="px-6 py-4 text-right">
// //                         <div className="flex items-center justify-end gap-2">
// //                           <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
// //                             <div
// //                               className={`h-full rounded-full ${
// //                                 user.secondTargetAchieved
// //                                   ? "bg-emerald-500"
// //                                   : user.firstTargetAchieved
// //                                   ? "bg-blue-500"
// //                                   : "bg-amber-500"
// //                               }`}
// //                               style={{
// //                                 width: `${Math.min(user.achievement, 100)}%`,
// //                               }}
// //                             />
// //                           </div>
// //                           <span className="w-10 text-right font-semibold text-slate-700">
// //                             {user.achievement}%
// //                           </span>
// //                         </div>
// //                       </td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>
// //           </div>
// //         )}

// //         {/* SURVEY RECORDS */}
// //         <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
// //           <div className="border-b border-slate-100 p-6">
// //             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
// //               <div>
// //                 <h2 className="text-base font-semibold text-slate-900">
// //                   Survey Records
// //                 </h2>
// //                 <p className="text-sm text-slate-500">
// //                   {selectedUser
// //                     ? `${selectedUser.name} • ${
// //                         selectedDate
// //                           ? formatFullDate(selectedDate)
// //                           : "All records for this month"
// //                       }`
// //                     : selectedDate
// //                       ? formatFullDate(selectedDate)
// //                       : "Showing all records for this month"}
// //                 </p>
// //               </div>
// //               <div className="flex items-center gap-3">
// //                 {selectedUser && (
// //                   <button
// //                     onClick={() => setSelectedUserId(null)}
// //                     className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
// //                   >
// //                     Show all users
// //                   </button>
// //                 )}

// //                 {selectedDate && (
// //                   <button
// //                     onClick={clearDateFilter}
// //                     className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
// //                   >
// //                     Clear filter
// //                   </button>
// //                 )}
// //                 <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
// //                   <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
// //                   {selectedUserRecords.length}{" "}
// //                   {selectedUserRecords.length === 1 ? "record" : "records"}
// //                 </span>
// //               </div>
// //             </div>
// //           </div>
// //           {selectedUserRecords.length === 0 ? (
// //             <EmptyState
// //               title="No submissions"
// //               description={
// //                 selectedUser
// //                   ? selectedDate
// //                     ? `No survey submitted by ${selectedUser.name} on this date.`
// //                     : `No survey submitted by ${selectedUser.name} this month.`
// //                   : selectedDate
// //                     ? "No survey submitted on this date."
// //                     : "No survey submitted this month."
// //               }
// //             />
// //           ) : (
// //             <div className="overflow-x-auto">
// //               <table className="w-full text-sm">
// //                 <thead>
// //                   <tr className="border-b border-slate-100 bg-slate-50/60">
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       #
// //                     </th>
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Submitted At
// //                     </th>
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Survey ID
// //                     </th>
// //                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       Created By
// //                     </th>
// //                     <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
// //                       View
// //                     </th>
// //                   </tr>
// //                 </thead>
// //                 <tbody className="divide-y divide-slate-100">
// //                   {selectedUserRecords.map((record, index) => (
// //                     <tr
// //                       key={record._id}
// //                       className="transition hover:bg-slate-50/60"
// //                     >
// //                       <td className="px-6 py-4 text-slate-500">{index + 1}</td>
// //                       <td className="px-6 py-4 text-slate-700">
// //                         {record.createdAt
// //                           ? new Date(record.createdAt).toLocaleString("en-IN", {
// //                               day: "2-digit",
// //                               month: "short",
// //                               year: "numeric",
// //                               hour: "2-digit",
// //                               minute: "2-digit",
// //                             })
// //                           : "—"}
// //                       </td>
// //                       <td className="px-6 py-4">
// //                         <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
// //                           {record._id.slice(-8)}
// //                         </span>
// //                       </td>
// //                       <td className="px-6 py-4">
// //                         <span className="font-mono text-xs text-slate-600">
// //                           {record.createdBy || "—"}
// //                         </span>
// //                       </td>
// //                       <td className="px-6 py-4 text-center">
// //                         <button
// //                           onClick={() => openModal(record)}
// //                           className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
// //                           title="View survey details"
// //                         >
// //                           <svg
// //                             xmlns="http://www.w3.org/2000/svg"
// //                             width={18}
// //                             height={18}
// //                             fill="none"
// //                             viewBox="0 0 24 24"
// //                             stroke="currentColor"
// //                             strokeWidth={2}
// //                           >
// //                             <path
// //                               strokeLinecap="round"
// //                               strokeLinejoin="round"
// //                               d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
// //                             />
// //                             <path
// //                               strokeLinecap="round"
// //                               strokeLinejoin="round"
// //                               d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
// //                             />
// //                           </svg>
// //                         </button>
// //                       </td>
// //                     </tr>
// //                   ))}
// //                 </tbody>
// //               </table>
// //             </div>
// //           )}
// //         </div>
// //       </div>

// //       {/* MODAL */}
// //       {modalOpen && modalRecord && (
// //         <div
// //           className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
// //           onClick={closeModal}
// //         >
// //           <div
// //             className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
// //             onClick={(e) => e.stopPropagation()}
// //           >
// //             <div className="flex items-start justify-between border-b border-slate-100 p-6">
// //               <div>
// //                 <h3 className="text-lg font-semibold text-slate-900">
// //                   Survey Submission
// //                 </h3>
// //                 <p className="mt-0.5 text-sm text-slate-500">
// //                   {modalRecord.createdAt
// //                     ? new Date(modalRecord.createdAt).toLocaleString("en-IN", {
// //                         day: "2-digit",
// //                         month: "short",
// //                         year: "numeric",
// //                         hour: "2-digit",
// //                         minute: "2-digit",
// //                       })
// //                     : "—"}
// //                 </p>
// //               </div>
// //               <button
// //                 onClick={closeModal}
// //                 className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
// //               >
// //                 <svg
// //                   xmlns="http://www.w3.org/2000/svg"
// //                   className="h-5 w-5"
// //                   fill="none"
// //                   viewBox="0 0 24 24"
// //                   stroke="currentColor"
// //                   strokeWidth={2}
// //                 >
// //                   <path
// //                     strokeLinecap="round"
// //                     strokeLinejoin="round"
// //                     d="M6 18L18 6M6 6l12 12"
// //                   />
// //                 </svg>
// //               </button>
// //             </div>

// //             <div className="flex-1 overflow-y-auto p-6">
// //               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
// //                 <MetaCard label="Survey ID" value={modalRecord._id} mono />
// //                 <MetaCard
// //                   label="Created By"
// //                   value={modalRecord.createdBy || "—"}
// //                   mono
// //                 />
// //               </div>

// //               {(() => {
// //                 const fields = getDisplayFields(modalRecord);
// //                 if (fields.length === 0) {
// //                   return (
// //                     <div className="mt-6">
// //                       <EmptyState
// //                         title="No additional data"
// //                         description="This record contains no extra survey fields."
// //                       />
// //                     </div>
// //                   );
// //                 }

// //                 return (
// //                   <div className="mt-6">
// //                     <div className="mb-3 flex items-center gap-2">
// //                       <div className="h-1 w-1 rounded-full bg-blue-500" />
// //                       <h4 className="text-sm font-semibold text-slate-700">
// //                         Survey Details
// //                       </h4>
// //                     </div>
// //                     <div className="overflow-hidden rounded-xl border border-slate-200">
// //                       <dl className="divide-y divide-slate-100">
// //                         {fields.map(([key, value], idx) => (
// //                           <div
// //                             key={key}
// //                             className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4 ${
// //                               idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
// //                             }`}
// //                           >
// //                             <dt className="min-w-[140px] text-xs font-medium uppercase tracking-wide text-slate-500">
// //                               {formatFieldLabel(key)}
// //                             </dt>
// //                             <dd className="flex-1 whitespace-pre-wrap break-words text-sm text-slate-800">
// //                               {formatFieldValue(value)}
// //                             </dd>
// //                           </div>
// //                         ))}
// //                       </dl>
// //                     </div>
// //                   </div>
// //                 );
// //               })()}
// //             </div>

// //             <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
// //               <button
// //                 onClick={closeModal}
// //                 className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
// //               >
// //                 Close
// //               </button>
// //             </div>
// //           </div>
// //         </div>
// //       )}
// //     </div>
// //   );
// // }

// // /* SUB COMPONENTS */

// // function SummaryCard({
// //   label,
// //   value,
// //   accent,
// //   icon,
// // }: {
// //   label: string;
// //   value: number | string;
// //   accent: "slate" | "emerald" | "amber" | "blue";
// //   icon: React.ReactNode;
// // }) {
// //   const accentMap = {
// //     slate: {
// //       bg: "bg-slate-100",
// //       text: "text-slate-700",
// //       value: "text-slate-900",
// //     },
// //     emerald: {
// //       bg: "bg-emerald-50",
// //       text: "text-emerald-600",
// //       value: "text-emerald-600",
// //     },
// //     amber: {
// //       bg: "bg-amber-50",
// //       text: "text-amber-600",
// //       value: "text-amber-600",
// //     },
// //     blue: {
// //       bg: "bg-blue-50",
// //       text: "text-blue-600",
// //       value: "text-blue-600",
// //     },
// //   } as const;

// //   const a = accentMap[accent];

// //   return (
// //     <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
// //       <div className="flex items-center justify-between">
// //         <p className="text-sm font-medium text-slate-500">{label}</p>
// //         <div
// //           className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text}`}
// //         >
// //           <svg
// //             className="h-4 w-4"
// //             fill="none"
// //             viewBox="0 0 24 24"
// //             stroke="currentColor"
// //             strokeWidth={2}
// //           >
// //             {icon}
// //           </svg>
// //         </div>
// //       </div>
// //       <p className={`mt-3 text-2xl font-semibold tracking-tight ${a.value}`}>
// //         {value}
// //       </p>
// //     </div>
// //   );
// // }

// // function EmptyState({
// //   title,
// //   description,
// // }: {
// //   title: string;
// //   description: string;
// // }) {
// //   return (
// //     <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
// //       <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
// //         <svg
// //           className="h-6 w-6"
// //           fill="none"
// //           viewBox="0 0 24 24"
// //           stroke="currentColor"
// //           strokeWidth={1.5}
// //         >
// //           <path
// //             strokeLinecap="round"
// //             strokeLinejoin="round"
// //             d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
// //           />
// //         </svg>
// //       </div>
// //       <p className="text-sm font-medium text-slate-700">{title}</p>
// //       <p className="text-xs text-slate-500">{description}</p>
// //     </div>
// //   );
// // }

// // function MetaCard({
// //   label,
// //   value,
// //   mono = false,
// // }: {
// //   label: string;
// //   value: string;
// //   mono?: boolean;
// // }) {
// //   return (
// //     <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
// //       <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
// //         {label}
// //       </p>
// //       <p
// //         className={`mt-1 break-all text-sm text-slate-800 ${
// //           mono ? "font-mono text-xs" : "font-medium"
// //         }`}
// //       >
// //         {value}
// //       </p>
// //     </div>
// //   );
// // }





// "use client";

// import { useEffect, useState } from "react";
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
// } from "chart.js";
// import { Bar } from "react-chartjs-2";

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend
// );

// type Summary = {
//   firstTarget: number;
//   secondTarget: number;
//   completed: number;
//   currentTarget: number;
//   remaining: number;
//   achievement: number;
//   currentTargetLabel: "First Target" | "Second Target";
//   firstTargetAchieved: boolean;
//   secondTargetAchieved: boolean;
// };

// type DailyPerformance = {
//   date: string;
//   completed: number;
// };

// type UserPerformance = {
//   userId: string;
//   name: string;
//   email: string;
//   role: string;
//   firstTarget: number;
//   secondTarget: number;
//   target: number;
//   completed: number;
//   remaining: number;
//   achievement: number;
//   currentTarget?: number;
//   currentTargetLabel?: "First Target" | "Second Target";
//   firstTargetAchieved?: boolean;
//   secondTargetAchieved?: boolean;
// };


// type TargetProgress = {
//   currentTarget: number;
//   remaining: number;
//   achievement: number;
//   currentTargetLabel: "First Target" | "Second Target";
//   firstTargetAchieved: boolean;
//   secondTargetAchieved: boolean;
// };

// type SurveyRecord = {
//   _id: string;
//   createdAt: string;
//   createdBy?: string;
//   [key: string]: any;
// };

// export default function SurveyPerformancePage() {
//   const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
//   const [summary, setSummary] = useState<Summary>({
//     firstTarget: 0,
//     secondTarget: 0,
//     completed: 0,
//     currentTarget: 0,
//     remaining: 0,
//     achievement: 0,
//     currentTargetLabel: "First Target",
//     firstTargetAchieved: false,
//     secondTargetAchieved: false,
//   });
//   const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>(
//     []
//   );
//   const [users, setUsers] = useState<UserPerformance[]>([]);
//   const [teamMembers, setTeamMembers] = useState<
//     Array<{
//       _id?: string;
//       name?: string;
//       email?: string;
//       role?: string;
//       totalRecords?: number;
//     }>
//   >([]);
//   const [dateRecords, setDateRecords] = useState<SurveyRecord[]>([]);
//   const [monthlyRecords, setMonthlyRecords] = useState<SurveyRecord[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string | null>(null);

//   // Selected team member for the User Performance table.
//   // Clicking a user shows only that user's survey/performance data.
//   const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

//   const [role, setRole] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Modal state
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalRecord, setModalRecord] = useState<SurveyRecord | null>(null);

//   // ==========================================================
//   // LOAD ALL MONTHLY RECORDS (fetches per active date)
//   // ==========================================================
//   const loadMonthlyRecords = async (dates: string[]) => {
//     if (!dates || dates.length === 0) {
//       setMonthlyRecords([]);
//       return;
//     }

//     try {
//       const responses = await Promise.all(
//         dates.map((date) =>
//           fetch(`/api/survey/performance?month=${month}&date=${date}`, {
//             method: "GET",
//             credentials: "include",
//           })
//             .then((res) => res.json())
//             .catch(() => ({ success: false, dateRecords: [] }))
//         )
//       );

//       const combined: SurveyRecord[] = [];
//       responses.forEach((res) => {
//         if (res?.success && Array.isArray(res.dateRecords)) {
//           combined.push(...res.dateRecords);
//         }
//       });

//       combined.sort(
//         (a, b) =>
//           new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
//       );

//       setMonthlyRecords(combined);
//     } catch {
//       setMonthlyRecords([]);
//     }
//   };

//   // ==========================================================
//   // LOAD TEAM MEMBERS
//   //
//   // Team Lead must only see members assigned to their own team.
//   // The API forces the logged-in Team Lead's identity server-side.
//   //
//   // This roster is also used to keep members with 0 surveys visible.
//   // ==========================================================
//   const loadTeamMembers = async () => {
//     try {
//       const response = await fetch(
//         "/api/survey/team-members",
//         {
//           method: "GET",
//           credentials: "include",
//           cache: "no-store",
//         }
//       );

//       const contentType =
//         response.headers.get("content-type") || "";

//       if (!contentType.includes("application/json")) {
//         throw new Error(
//           `Team members API returned ${response.status}.`
//         );
//       }

//       const result = await response.json();

//       if (!response.ok || !result?.success) {
//         throw new Error(
//           result?.message || "Failed to load team members."
//         );
//       }

//       // ==========================================================
//       // DEDUPLICATE TEAM ROSTER
//       //
//       // Do NOT use only _id here. The same user can appear with
//       // different IDs when the team/assignment data contains a
//       // duplicate reference. Email is the strongest identity,
//       // then name as fallback.
//       // ==========================================================
//       const rawTeamMembers = Array.isArray(result.data)
//         ? result.data
//         : [];

//       const rosterMap = new Map<
//         string,
//         (typeof rawTeamMembers)[number]
//       >();

//       for (const member of rawTeamMembers) {
//         const email = String(member?.email || "")
//           .trim()
//           .toLowerCase();

//         const name = String(member?.name || "")
//           .trim()
//           .toLowerCase();

//         const identityKey =
//           email ||
//           name ||
//           String(member?._id || "").trim();

//         if (!identityKey) continue;

//         // Keep the first occurrence of the same person.
//         if (!rosterMap.has(identityKey)) {
//           rosterMap.set(identityKey, member);
//         }
//       }

//       setTeamMembers(Array.from(rosterMap.values()));
//     } catch (err) {
//       console.error("Failed to load team members:", err);
//       setTeamMembers([]);
//     }
//   };


//   // ==========================================================
//   // SEQUENTIAL TARGET LOGIC
//   //
//   // Team Lead and Survey Tester both follow the same sequence:
//   // 1. First Target must be achieved first.
//   // 2. Then Second Target becomes the active goal.
//   // 3. Both targets remain visible in the UI.
//   // ==========================================================
//   const getTargetProgress = (
//     completed: number,
//     firstTarget: number,
//     secondTarget: number
//   ): TargetProgress => {
//     const safeCompleted = Math.max(0, Number(completed) || 0);
//     const safeFirst = Math.max(0, Number(firstTarget) || 0);
//     const safeSecond = Math.max(0, Number(secondTarget) || 0);

//     const firstTargetAchieved =
//       safeFirst > 0 && safeCompleted >= safeFirst;

//     const secondTargetAchieved =
//       safeSecond > 0 && safeCompleted >= safeSecond;

//     // If only the second target is configured, use it directly.
//     if (safeFirst <= 0) {
//       return {
//         currentTarget: safeSecond,
//         remaining: Math.max(safeSecond - safeCompleted, 0),
//         achievement:
//           safeSecond > 0
//             ? Math.min(Math.round((safeCompleted / safeSecond) * 100), 100)
//             : 0,
//         currentTargetLabel: "Second Target",
//         firstTargetAchieved: false,
//         secondTargetAchieved,
//       };
//     }

//     // First target has priority.
//     if (!firstTargetAchieved) {
//       return {
//         currentTarget: safeFirst,
//         remaining: Math.max(safeFirst - safeCompleted, 0),
//         achievement:
//           safeFirst > 0
//             ? Math.min(Math.round((safeCompleted / safeFirst) * 100), 100)
//             : 0,
//         currentTargetLabel: "First Target",
//         firstTargetAchieved: false,
//         secondTargetAchieved: false,
//       };
//     }

//     // First target achieved -> motivate toward second target.
//     const currentTarget = safeSecond > 0 ? safeSecond : safeFirst;

//     return {
//       currentTarget,
//       remaining: Math.max(currentTarget - safeCompleted, 0),
//       achievement:
//         currentTarget > 0
//           ? Math.min(Math.round((safeCompleted / currentTarget) * 100), 100)
//           : 0,
//       currentTargetLabel: "Second Target",
//       firstTargetAchieved: true,
//       secondTargetAchieved,
//     };
//   };

//   // ==========================================================
//   // LOAD PERFORMANCE
//   // ==========================================================

//   // ==========================================================
//   // FINAL SAFETY DEDUPLICATION
//   //
//   // A user must appear only once even if the backend returns
//   // multiple team records with different _id values.
//   // ==========================================================
//   const uniqueTeamMembers = Array.from(
//     new Map(
//       teamMembers.map((member) => {
//         const email = String(member.email || "")
//           .trim()
//           .toLowerCase();

//         const name = String(member.name || "")
//           .trim()
//           .toLowerCase();

//         // Prefer email/name over _id because the same user can
//         // have different assignment IDs.
//         const key =
//           email ||
//           name ||
//           String(member._id || "").trim();

//         return [key, member] as const;
//       })
//     ).values()
//   );
// // ==========================================================
// // DEDUPLICATE USERS
// // ==========================================================

// const deduplicateUsers = (
//   list: UserPerformance[]
// ): UserPerformance[] => {
//   const map = new Map<string, UserPerformance>();

//   for (const user of list) {
//     const email = String(user.email || "")
//       .trim()
//       .toLowerCase();

//     const name = String(user.name || "")
//       .trim()
//       .toLowerCase();

//     const userId = String(user.userId || "")
//       .trim();

//     // Email is the strongest identity.
//     // Then name, then userId as fallback.
//     const identityKey =
//       email ||
//       name ||
//       userId;

//     if (!identityKey) continue;

//     // Keep only one record for the same real user.
//     if (!map.has(identityKey)) {
//       map.set(identityKey, user);
//     }
//   }

//   return Array.from(map.values());
// };


//   const loadPerformance = async (date?: string) => {
//     try {
//       setLoading(true);
//       setError("");

//       let url = `/api/survey/performance?month=${month}`;
//       if (date) {
//         url += `&date=${date}`;
//       }

//       const response = await fetch(url, {
//         method: "GET",
//         credentials: "include",
//       });

//       const data = await response.json();

//       if (!response.ok || !data.success) {
//         throw new Error(data.message || "Failed to load performance");
//       }

//       const apiSummary = data.summary || {};

//       const firstTarget = Number(
//         apiSummary.firstTarget ?? data.firstTarget ?? 0
//       );

//       const secondTarget = Number(
//         apiSummary.secondTarget ?? data.secondTarget ?? 0
//       );

//       const completed = Number(apiSummary.completed ?? 0);

//       const summaryProgress = getTargetProgress(
//         completed,
//         firstTarget,
//         secondTarget
//       );

//       setSummary({
//         firstTarget,
//         secondTarget,
//         completed,
//         ...summaryProgress,
//       });

//       const daily: DailyPerformance[] = data.dailyPerformance || [];
//       setDailyPerformance(daily);
//       setRole(data.role || "");

//       const apiUsers: UserPerformance[] = Array.isArray(data.users)
//         ? data.users.map((user: UserPerformance) => {
//             const firstTarget = Number(
//               user.firstTarget ??
//                 data.summary?.firstTarget ??
//                 data.firstTarget ??
//                 0
//             );

//             const secondTarget = Number(
//               user.secondTarget ??
//                 data.summary?.secondTarget ??
//                 data.secondTarget ??
//                 0
//             );

//             const completed = Number(user.completed ?? 0);

//             const progress = getTargetProgress(
//               completed,
//               firstTarget,
//               secondTarget
//             );

//             return {
//               ...user,
//               firstTarget,
//               secondTarget,
//               target: progress.currentTarget,
//               completed,
//               remaining: progress.remaining,
//               achievement: progress.achievement,
//               currentTarget: progress.currentTarget,
//               currentTargetLabel: progress.currentTargetLabel,
//               firstTargetAchieved: progress.firstTargetAchieved,
//               secondTargetAchieved: progress.secondTargetAchieved,
//             };
//           })
//         : [];

// // ==========================================================
// // NORMALIZE ROLE
// // ==========================================================

// const normalizedRole = String(data.role || "")
//   .toLowerCase()
//   .replace(/[-\s]/g, "_");

// const isTeamLead =
//   normalizedRole === "teamlead" ||
//   normalizedRole === "team_lead";

// // ==========================================================
// // TEAM LEAD
// // ==========================================================

// if (isTeamLead) {
//   const allowedIds = new Set(
//     uniqueTeamMembers
//       .map((member) => String(member._id || "").trim())
//       .filter(Boolean)
//   );

//   const allowedNames = new Set(
//     uniqueTeamMembers
//       .map((member) =>
//         String(member.name || "")
//           .trim()
//           .toLowerCase()
//       )
//       .filter(Boolean)
//   );

//   const allowedEmails = new Set(
//     uniqueTeamMembers
//       .map((member) =>
//         String(member.email || "")
//           .trim()
//           .toLowerCase()
//       )
//       .filter(Boolean)
//   );

//   // Only users belonging to this Team Lead's team.
//   const filteredUsers = apiUsers.filter((user) => {
//     const userId = String(user.userId || "").trim();

//     const name = String(user.name || "")
//       .trim()
//       .toLowerCase();

//     const email = String(user.email || "")
//       .trim()
//       .toLowerCase();

//     return (
//       (userId && allowedIds.has(userId)) ||
//       (name && allowedNames.has(name)) ||
//       (email && allowedEmails.has(email))
//     );
//   });

//   // ========================================================
//   // MATCH PERFORMANCE WITH TEAM ROSTER
//   // ========================================================

//   const performanceByIdentity =
//     new Map<string, UserPerformance>();

//   for (const user of filteredUsers) {
//     const keys = [
//       String(user.userId || "").trim(),

//       String(user.email || "")
//         .trim()
//         .toLowerCase(),

//       String(user.name || "")
//         .trim()
//         .toLowerCase(),
//     ].filter(Boolean);

//     for (const key of keys) {
//       if (!performanceByIdentity.has(key)) {
//         performanceByIdentity.set(key, user);
//       }
//     }
//   }

//   // ========================================================
//   // BUILD ONE ROW PER REAL USER
//   // ========================================================

//   const teamPerformanceMap =
//     new Map<string, UserPerformance>();

//   for (const member of uniqueTeamMembers) {
//     const memberId = String(member._id || "").trim();

//     const memberEmail = String(member.email || "")
//       .trim()
//       .toLowerCase();

//     const memberName = String(member.name || "")
//       .trim()
//       .toLowerCase();

//     // Email > name > ID
//     const identityKey =
//       memberEmail ||
//       memberName ||
//       memberId;

//     if (!identityKey) continue;

//     const existing: UserPerformance | undefined =
//       (memberId
//         ? performanceByIdentity.get(memberId)
//         : undefined) ??
//       (memberEmail
//         ? performanceByIdentity.get(memberEmail)
//         : undefined) ??
//       (memberName
//         ? performanceByIdentity.get(memberName)
//         : undefined);

//     const memberFirstTarget = Number(
//       existing?.firstTarget ??
//         data.summary?.firstTarget ??
//         data.firstTarget ??
//         0
//     );

//     const memberSecondTarget = Number(
//       existing?.secondTarget ??
//         data.summary?.secondTarget ??
//         data.secondTarget ??
//         0
//     );

//     const memberCompleted = Number(existing?.completed ?? 0);

//     const memberProgress = getTargetProgress(
//       memberCompleted,
//       memberFirstTarget,
//       memberSecondTarget
//     );

//     const user: UserPerformance = existing
//       ? {
//           ...existing,
//           firstTarget: memberFirstTarget,
//           secondTarget: memberSecondTarget,
//           target: memberProgress.currentTarget,
//           completed: memberCompleted,
//           remaining: memberProgress.remaining,
//           achievement: memberProgress.achievement,
//           currentTarget: memberProgress.currentTarget,
//           currentTargetLabel: memberProgress.currentTargetLabel,
//           firstTargetAchieved: memberProgress.firstTargetAchieved,
//           secondTargetAchieved: memberProgress.secondTargetAchieved,
//         }
//       : {
//           userId:
//             memberId ||
//             memberEmail ||
//             memberName,

//           name: member.name || "Unknown",

//           email: member.email || "",

//           role: member.role || "survey-tester",

//           firstTarget: memberFirstTarget,

//           secondTarget: memberSecondTarget,

//           target: memberProgress.currentTarget,

//           completed: 0,

//           remaining: memberProgress.remaining,

//           achievement: memberProgress.achievement,

//           currentTarget: memberProgress.currentTarget,

//           currentTargetLabel: memberProgress.currentTargetLabel,

//           firstTargetAchieved: memberProgress.firstTargetAchieved,

//           secondTargetAchieved: memberProgress.secondTargetAchieved,
//         };

//     // IMPORTANT:
//     // Never add the same person twice.
//     if (!teamPerformanceMap.has(identityKey)) {
//       teamPerformanceMap.set(
//         identityKey,
//         user
//       );
//     }
//   }

//   const teamPerformance =
//     Array.from(
//       teamPerformanceMap.values()
//     );

//   // Final safety deduplication.
//   setUsers(
//     deduplicateUsers(teamPerformance)
//   );
// } else {
//   // HR/Admin/etc.
//   // IMPORTANT: also deduplicate API users.
//   setUsers(
//     deduplicateUsers(apiUsers)
//   );
// }

//       // const apiUsers: UserPerformance[] =
//       //   Array.isArray(data.users) ? data.users : [];

//       // // Team Lead: show ONLY their own team members.
//       // // HR/Admin keep the API-provided user list.
//       // const normalizedRole = String(
//       //   data.role || ""
//       // )
//       //   .toLowerCase()
//       //   .replace(/[-\s]/g, "_");

//       // const isTeamLead =
//       //   normalizedRole === "teamlead" ||
//       //   normalizedRole === "team_lead" ||
//       //   normalizedRole === "team-lead";

//       // if (isTeamLead) {
//       //   const allowedIds = new Set(
//       //     teamMembers
//       //       .map((member) => String(member._id || "").trim())
//       //       .filter(Boolean)
//       //   );

//       //   const allowedNames = new Set(
//       //     teamMembers
//       //       .map((member) =>
//       //         String(member.name || "")
//       //           .trim()
//       //           .toLowerCase()
//       //       )
//       //       .filter(Boolean)
//       //   );

//       //   const allowedEmails = new Set(
//       //     teamMembers
//       //       .map((member) =>
//       //         String(member.email || "")
//       //           .trim()
//       //           .toLowerCase()
//       //       )
//       //       .filter(Boolean)
//       //   );

//       //   const filteredUsers = apiUsers.filter((user) => {
//       //     const userId = String(user.userId || "").trim();
//       //     const name = String(user.name || "")
//       //       .trim()
//       //       .toLowerCase();
//       //     const email = String(user.email || "")
//       //       .trim()
//       //       .toLowerCase();

//       //     return (
//       //       (userId && allowedIds.has(userId)) ||
//       //       (name && allowedNames.has(name)) ||
//       //       (email && allowedEmails.has(email))
//       //     );
//       //   });

//       //   // Merge the roster with performance so a member with 0
//       //   // surveys is still displayed.
//       //   const performanceByIdentity = new Map<
//       //     string,
//       //     UserPerformance
//       //   >();

//       //   for (const user of filteredUsers) {
//       //     const keys = [
//       //       String(user.userId || "").trim(),
//       //       String(user.email || "").trim().toLowerCase(),
//       //       String(user.name || "").trim().toLowerCase(),
//       //     ].filter(Boolean);

//       //     for (const key of keys) {
//       //       performanceByIdentity.set(key, user);
//       //     }
//       //   }

//       //   const teamPerformanceMap = new Map<string, UserPerformance>();

//       //   for (const member of uniqueTeamMembers) {
//       //     const memberId = String(member._id || "").trim();
//       //     const memberEmail = String(member.email || "")
//       //       .trim()
//       //       .toLowerCase();
//       //     const memberName = String(member.name || "")
//       //       .trim()
//       //       .toLowerCase();

//       //     // Use email/name as the real-person identity.
//       //     // _id may be different for duplicate assignment records.
//       //     const identityKey =
//       //       memberEmail ||
//       //       memberName ||
//       //       memberId;

//       //     const existing =
//       //       (memberId &&
//       //         performanceByIdentity.get(memberId)) ||
//       //       (memberEmail &&
//       //         performanceByIdentity.get(memberEmail)) ||
//       //       (memberName &&
//       //         performanceByIdentity.get(memberName));

//       //     const user: UserPerformance = existing || {
//       //       userId: memberId || memberEmail || memberName,
//       //       name: member.name || "Unknown",
//       //       email: member.email || "",
//       //       role: member.role || "survey-tester",
//       //       target: 0,
//       //       completed: 0,
//       //       remaining: 0,
//       //       achievement: 0,
//       //     };

//       //     // Exactly one row per real user.
//       //     if (!teamPerformanceMap.has(identityKey)) {
//       //       teamPerformanceMap.set(identityKey, user);
//       //     }
//       //   }

//       //   const teamPerformance: UserPerformance[] =
//       //     Array.from(teamPerformanceMap.values());

//       //   setUsers(teamPerformance);
//       // } else {
//       //   setUsers(apiUsers);
//       // }

//       if (date) {
//         setDateRecords(data.dateRecords || []);
//       } else {
//         // Default view: fetch all records across active dates
//         loadMonthlyRecords(daily.map((d) => d.date));
//       }
//     } catch (err: any) {
//       setError(err?.message || "Failed to load performance");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ==========================================================
//   // INITIAL LOAD
//   // ==========================================================
//   useEffect(() => {
//     setSelectedDate(null);
//     setSelectedUserId(null);
//     setDateRecords([]);
//     setMonthlyRecords([]);

//     const initialize = async () => {
//       // Load roster first so the Team Lead performance table
//       // can include members with zero submissions.
//       await loadTeamMembers();
//     };

//     initialize();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [month]);

//   useEffect(() => {
//     // Once the team roster is available, load performance.
//     loadPerformance();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [month, teamMembers]);

//   // ==========================================================
//   // CLICK DATE
//   // ==========================================================
//   const handleDateClick = (date: string) => {
//     setSelectedDate(date);
//     loadPerformance(date);
//   };

//   // ==========================================================
//   // CLEAR DATE FILTER
//   // ==========================================================
//   const clearDateFilter = () => {
//     setSelectedDate(null);
//     setDateRecords([]);
//     loadPerformance();
//   };

//   // ==========================================================
//   // FORMAT DATE
//   // ==========================================================
//   const formatDate = (date: string) => {
//     const [, m, d] = date.split("-");
//     return `${d}/${m}`;
//   };

//   const formatFullDate = (date: string) => {
//     return new Date(date).toLocaleDateString("en-IN", {
//       weekday: "long",
//       day: "numeric",
//       month: "long",
//       year: "numeric",
//     });
//   };

//   // ==========================================================
//   // FORMAT ROLE
//   // ==========================================================
//   const formatRole = (value: string) => {
//     if (!value) return "";
//     if (value.toLowerCase().includes("survey")) return "Survey Tester";
//     if (value.toLowerCase().includes("team")) return "Team Lead";
//     return value.toUpperCase();
//   };

//   // ==========================================================
//   // RECORDS SHOWN IN TABLE (date filter wins, else monthly)
//   // ==========================================================
//   const displayedRecords = selectedDate ? dateRecords : monthlyRecords;

//   // ==========================================================
//   // SELECTED USER
//   // ==========================================================

//   const selectedUser = users.find(
//     (user) => String(user.userId) === String(selectedUserId)
//   );

//   // Show only the selected user's survey records.
//   // createdBy can be an ID, name, or email depending on the API data.
//   const selectedUserRecords = selectedUserId
//     ? displayedRecords.filter((record) => {
//         const createdBy = String(record.createdBy || "")
//           .trim()
//           .toLowerCase();

//         const userId = String(selectedUser?.userId || "")
//           .trim()
//           .toLowerCase();

//         const userName = String(selectedUser?.name || "")
//           .trim()
//           .toLowerCase();

//         const userEmail = String(selectedUser?.email || "")
//           .trim()
//           .toLowerCase();

//         return (
//           (userId && createdBy === userId) ||
//           (userName && createdBy === userName) ||
//           (userEmail && createdBy === userEmail)
//         );
//       })
//     : displayedRecords;

//   // ==========================================================
//   // CHART DATA
//   // ==========================================================
//   const chartData = {
//     labels: dailyPerformance.map((item) => formatDate(item.date)),
//     datasets: [
//       {
//         label: "Completed",
//         data: dailyPerformance.map((item) => item.completed),
//         backgroundColor: dailyPerformance.map((item) =>
//           selectedDate === item.date
//             ? "rgba(37, 99, 235, 1)"
//             : "rgba(96, 165, 250, 0.85)"
//         ),
//         hoverBackgroundColor: "rgba(37, 99, 235, 1)",
//         borderColor: "rgba(37, 99, 235, 0.4)",
//         borderWidth: 1,
//         borderRadius: 8,
//         maxBarThickness: 40,
//       },
//     ],
//   };

//   const chartOptions = {
//     responsive: true,
//     maintainAspectRatio: false,
//     plugins: {
//       legend: { display: false },
//       tooltip: {
//         backgroundColor: "rgba(17, 24, 39, 0.95)",
//         padding: 12,
//         cornerRadius: 8,
//         titleFont: { size: 13, weight: 600 },
//         bodyFont: { size: 12 },
//         displayColors: false,
//         callbacks: {
//           label: (context: any) => `${context.raw} surveys completed`,
//         },
//       },
//     },
//     scales: {
//       y: {
//         beginAtZero: true,
//         ticks: {
//           stepSize: 1,
//           color: "#9ca3af",
//           font: { size: 11 },
//         },
//         grid: { color: "rgba(229, 231, 235, 0.6)" },
//         border: { display: false },
//       },
//       x: {
//         grid: { display: false },
//         ticks: { color: "#6b7280", font: { size: 11 } },
//         border: { display: false },
//       },
//     },
//     onClick: (_event: any, elements: any[]) => {
//       if (elements.length > 0) {
//         const index = elements[0].index;
//         const date = dailyPerformance[index].date;
//         handleDateClick(date);
//       }
//     },
//   };

//   // ==========================================================
//   // MODAL HANDLERS
//   // ==========================================================
//   const openModal = (record: SurveyRecord) => {
//     setModalRecord(record);
//     setModalOpen(true);
//   };

//   const closeModal = () => {
//     setModalOpen(false);
//     setModalRecord(null);
//   };

//   // ==========================================================
//   // HELPERS
//   // ==========================================================
//   const getDisplayFields = (record: SurveyRecord) => {
//     const excluded = ["_id", "createdAt", "updatedAt", "createdBy", "__v"];
//     return Object.entries(record).filter(([key]) => !excluded.includes(key));
//   };

//   const formatFieldLabel = (key: string) =>
//     key
//       .replace(/([A-Z])/g, " $1")
//       .replace(/_/g, " ")
//       .replace(/\b\w/g, (c) => c.toUpperCase())
//       .trim();

//   const formatFieldValue = (value: any): string => {
//     if (value === null || value === undefined) return "—";
//     if (typeof value === "boolean") return value ? "Yes" : "No";
//     if (Array.isArray(value)) {
//       if (value.length === 0) return "—";
//       if (typeof value[0] === "object") {
//         return value
//           .map((v) => Object.values(v).filter(Boolean).join(" • "))
//           .join("\n");
//       }
//       return value.join(", ");
//     }
//     if (typeof value === "object") {
//       return Object.entries(value)
//         .map(([k, v]) => `${formatFieldLabel(k)}: ${v}`)
//         .join("\n");
//     }
//     return String(value);
//   };

//   // ==========================================================
//   // LOADING
//   // ==========================================================
//   if (loading) {
//     return (
//       <div className="flex min-h-screen items-center justify-center bg-slate-50">
//         <div className="flex flex-col items-center gap-3">
//           <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
//           <p className="text-sm text-slate-500">Loading performance data...</p>
//         </div>
//       </div>
//     );
//   }

//   // ==========================================================
//   // UI
//   // ==========================================================
//   return (
//     <div className="min-h-screen bg-slate-50">
//       <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
//         {/* HEADER */}
//         <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//           <div>
//             <h4 className="text-2xl font-semibold tracking-tight text-slate-900">
//               Survey Performance
//             </h4>
//             <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
//               <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
//               {formatRole(role) || "Dashboard"}
//             </p>
//           </div>
//           <div className="flex items-center gap-2">
//             <label className="text-sm font-medium text-slate-600">Month</label>
//             <input
//               type="month"
//               value={month}
//               onChange={(e) => setMonth(e.target.value)}
//               className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
//             />
//           </div>
//         </div>

//         {/* ERROR */}
//         {error && (
//           <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
//             <svg
//               className="h-5 w-5 flex-shrink-0"
//               fill="none"
//               viewBox="0 0 24 24"
//               stroke="currentColor"
//               strokeWidth={2}
//             >
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             </svg>
//             {error}
//           </div>
//         )}

//         {/* SUMMARY CARDS */}
//         <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
//           <SummaryCard
//             label="First Target"
//             value={summary.firstTarget}
//             accent="slate"
//             icon={
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             }
//           />

//           <SummaryCard
//             label="Second Target"
//             value={summary.secondTarget}
//             accent="blue"
//             icon={
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
//               />
//             }
//           />

//           <SummaryCard
//             label="Completed"
//             value={summary.completed}
//             accent="emerald"
//             icon={
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 01-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 01-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 01-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
//               />
//             }
//           />

//           <SummaryCard
//             label={`${summary.currentTargetLabel} Progress`}
//             value={`${summary.achievement}%`}
//             accent={summary.secondTargetAchieved ? "emerald" : "amber"}
//             icon={
//               <path
//                 strokeLinecap="round"
//                 strokeLinejoin="round"
//                 d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
//               />
//             }
//           />
//         </div>

//         {/* TEAM LEAD TARGET MOTIVATION */}
//         <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
//           <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
//             <div>
//               <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
//                 Team Target Progress
//               </p>

//               {summary.secondTargetAchieved ? (
//                 <>
//                   <h3 className="mt-1 text-lg font-semibold text-emerald-700">
//                     🎉 Both targets achieved!
//                   </h3>
//                   <p className="mt-1 text-sm text-slate-500">
//                     First Target {summary.firstTarget} ✓ · Second Target{" "}
//                     {summary.secondTarget} ✓
//                   </p>
//                 </>
//               ) : summary.firstTargetAchieved ? (
//                 <>
//                   <h3 className="mt-1 text-lg font-semibold text-blue-700">
//                     First Target achieved — motivate the team for the Second Target!
//                   </h3>
//                   <p className="mt-1 text-sm text-slate-500">
//                     The team has completed {summary.completed}. Only{" "}
//                     <span className="font-semibold text-blue-700">
//                       {summary.remaining}
//                     </span>{" "}
//                     more to reach the Second Target of{" "}
//                     <span className="font-semibold">
//                       {summary.secondTarget}
//                     </span>.
//                   </p>
//                 </>
//               ) : (
//                 <>
//                   <h3 className="mt-1 text-lg font-semibold text-slate-800">
//                     Focus on the First Target
//                   </h3>
//                   <p className="mt-1 text-sm text-slate-500">
//                     The team needs{" "}
//                     <span className="font-semibold text-amber-600">
//                       {summary.remaining}
//                     </span>{" "}
//                     more survey
//                     {summary.remaining === 1 ? "" : "s"} to reach the First
//                     Target of{" "}
//                     <span className="font-semibold">
//                       {summary.firstTarget}
//                     </span>
//                     . After that, the Second Target becomes active.
//                   </p>
//                 </>
//               )}
//             </div>

//             <div className="min-w-[220px]">
//               <div className="mb-1 flex items-center justify-between text-xs">
//                 <span className="font-medium text-slate-500">
//                   {summary.currentTargetLabel}
//                 </span>
//                 <span className="font-semibold text-slate-700">
//                   {summary.completed} / {summary.currentTarget}
//                 </span>
//               </div>

//               <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
//                 <div
//                   className={`h-full rounded-full transition-all ${
//                     summary.secondTargetAchieved
//                       ? "bg-emerald-500"
//                       : summary.firstTargetAchieved
//                       ? "bg-blue-500"
//                       : "bg-amber-500"
//                   }`}
//                   style={{
//                     width: `${Math.min(summary.achievement, 100)}%`,
//                   }}
//                 />
//               </div>
//             </div>
//           </div>
//         </div>

//         {/* DAILY PERFORMANCE CHART */}
//         <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
//           <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
//             <div>
//               <h2 className="text-base font-semibold text-slate-900">
//                 Daily Survey Performance
//               </h2>
//               <p className="text-sm text-slate-500">
//                 Click a bar to filter records by that date.
//               </p>
//             </div>
//             {selectedDate && (
//               <button
//                 onClick={clearDateFilter}
//                 className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
//               >
//                 Show all dates
//               </button>
//             )}
//           </div>

//           {dailyPerformance.length === 0 ? (
//             <EmptyState
//               title="No survey data"
//               description="No survey data found for this month."
//             />
//           ) : (
//             <>
//               <div className="h-72">
//                 <Bar data={chartData} options={chartOptions} />
//               </div>

//               {/* Date pills */}
//               <div className="mt-5 flex flex-wrap gap-2">
//                 <button
//                   onClick={clearDateFilter}
//                   className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
//                     selectedDate === null
//                       ? "border-blue-600 bg-blue-600 text-white shadow-sm"
//                       : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
//                   }`}
//                 >
//                   All Dates
//                 </button>
//                 {dailyPerformance.map((item) => (
//                   <button
//                     key={item.date}
//                     onClick={() => handleDateClick(item.date)}
//                     className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
//                       selectedDate === item.date
//                         ? "border-blue-600 bg-blue-600 text-white shadow-sm"
//                         : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
//                     }`}
//                   >
//                     <span>{formatDate(item.date)}</span>
//                     <span
//                       className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
//                         selectedDate === item.date
//                           ? "bg-white/20 text-white"
//                           : "bg-slate-100 text-slate-600"
//                       }`}
//                     >
//                       {item.completed}
//                     </span>
//                   </button>
//                 ))}
//               </div>
//             </>
//           )}
//         </div>

//         {/* USER PERFORMANCE */}
//         {(role === "teamlead" ||
//           role === "team_lead" ||
//           role === "hr" ||
//           role === "admin") && (
//           <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//             <div className="border-b border-slate-100 p-6">
//               <h2 className="text-base font-semibold text-slate-900">
//                 User Performance
//               </h2>
//               <p className="text-sm text-slate-500">
//                 Performance of users available to your role.
//               </p>
//             </div>
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-slate-100 bg-slate-50/60">
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       User
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Role
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       First Target
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Second Target
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Completed
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Current Goal
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Remaining
//                     </th>
//                     <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Progress
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {users.length === 0 ? (
//                     <tr>
//                       <td
//                         colSpan={8}
//                         className="px-6 py-10 text-center text-sm text-slate-400"
//                       >
//                         No team members found.
//                       </td>
//                     </tr>
//                   ) : null}

//                   {users.map((user) => (
//                     <tr
//                       key={user.userId}
//                       onClick={() => {
//                         const id = String(user.userId);

//                         setSelectedUserId(
//                           selectedUserId === id ? null : id
//                         );

//                         // Clear date selection so the selected user's
//                         // monthly data is shown immediately.
//                         setSelectedDate(null);
//                         setDateRecords([]);
//                       }}
//                       className={`cursor-pointer transition ${
//                         String(selectedUserId) === String(user.userId)
//                           ? "bg-blue-50 hover:bg-blue-50"
//                           : "hover:bg-slate-50/60"
//                       }`}
//                     >
//                       <td className="px-6 py-4">
//                         <div className="flex items-center gap-3">
//                           <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-semibold text-white">
//                             {user.name
//                               ?.split(" ")
//                               .map((n) => n[0])
//                               .slice(0, 2)
//                               .join("")
//                               .toUpperCase() || "?"}
//                           </div>
//                           <div className="min-w-0">
//                             <div
//                               className={`truncate font-medium ${
//                                 String(selectedUserId) === String(user.userId)
//                                   ? "text-blue-700"
//                                   : "text-slate-800"
//                               }`}
//                             >
//                               {user.name}
//                             </div>

//                             {String(selectedUserId) === String(user.userId) && (
//                               <div className="mt-0.5 text-[11px] font-medium text-blue-600">
//                                 Selected — showing this user's data
//                               </div>
//                             )}
//                             <div className="truncate text-xs text-slate-500">
//                               {user.email}
//                             </div>
//                           </div>
//                         </div>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
//                           {user.role}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-right font-medium text-slate-700">
//                         {user.firstTarget}
//                         {user.firstTargetAchieved && (
//                           <span className="ml-1 text-emerald-600">✓</span>
//                         )}
//                       </td>

//                       <td className="px-6 py-4 text-right font-medium text-slate-700">
//                         {user.secondTarget}
//                         {user.secondTargetAchieved && (
//                           <span className="ml-1 text-emerald-600">✓</span>
//                         )}
//                       </td>

//                       <td className="px-6 py-4 text-right font-semibold text-emerald-600">
//                         {user.completed}
//                       </td>

//                       <td className="px-6 py-4 text-right">
//                         <div className="font-semibold text-slate-700">
//                           {user.currentTarget ?? user.target}
//                         </div>
//                         <div className="text-[11px] text-slate-500">
//                           {user.currentTargetLabel ||
//                             (user.firstTargetAchieved
//                               ? "Second Target"
//                               : "First Target")}
//                         </div>
//                       </td>

//                       <td className="px-6 py-4 text-right font-medium text-amber-600">
//                         {user.remaining}
//                       </td>

//                       <td className="px-6 py-4 text-right">
//                         <div className="flex items-center justify-end gap-2">
//                           <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
//                             <div
//                               className={`h-full rounded-full ${
//                                 user.secondTargetAchieved
//                                   ? "bg-emerald-500"
//                                   : user.firstTargetAchieved
//                                   ? "bg-blue-500"
//                                   : "bg-amber-500"
//                               }`}
//                               style={{
//                                 width: `${Math.min(user.achievement, 100)}%`,
//                               }}
//                             />
//                           </div>
//                           <span className="w-10 text-right font-semibold text-slate-700">
//                             {user.achievement}%
//                           </span>
//                         </div>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           </div>
//         )}

//         {/* SURVEY RECORDS */}
//         <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
//           <div className="border-b border-slate-100 p-6">
//             <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
//               <div>
//                 <h2 className="text-base font-semibold text-slate-900">
//                   Survey Records
//                 </h2>
//                 <p className="text-sm text-slate-500">
//                   {selectedUser
//                     ? `${selectedUser.name} • ${
//                         selectedDate
//                           ? formatFullDate(selectedDate)
//                           : "All records for this month"
//                       }`
//                     : selectedDate
//                       ? formatFullDate(selectedDate)
//                       : "Showing all records for this month"}
//                 </p>
//               </div>
//               <div className="flex items-center gap-3">
//                 {selectedUser && (
//                   <button
//                     onClick={() => setSelectedUserId(null)}
//                     className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
//                   >
//                     Show all users
//                   </button>
//                 )}

//                 {selectedDate && (
//                   <button
//                     onClick={clearDateFilter}
//                     className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
//                   >
//                     Clear filter
//                   </button>
//                 )}
//                 <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700">
//                   <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
//                   {selectedUserRecords.length}{" "}
//                   {selectedUserRecords.length === 1 ? "record" : "records"}
//                 </span>
//               </div>
//             </div>
//           </div>
//           {selectedUserRecords.length === 0 ? (
//             <EmptyState
//               title="No submissions"
//               description={
//                 selectedUser
//                   ? selectedDate
//                     ? `No survey submitted by ${selectedUser.name} on this date.`
//                     : `No survey submitted by ${selectedUser.name} this month.`
//                   : selectedDate
//                     ? "No survey submitted on this date."
//                     : "No survey submitted this month."
//               }
//             />
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full text-sm">
//                 <thead>
//                   <tr className="border-b border-slate-100 bg-slate-50/60">
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       #
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Submitted At
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Survey ID
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       Created By
//                     </th>
//                     <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
//                       View
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-slate-100">
//                   {selectedUserRecords.map((record, index) => (
//                     <tr
//                       key={record._id}
//                       className="transition hover:bg-slate-50/60"
//                     >
//                       <td className="px-6 py-4 text-slate-500">{index + 1}</td>
//                       <td className="px-6 py-4 text-slate-700">
//                         {record.createdAt
//                           ? new Date(record.createdAt).toLocaleString("en-IN", {
//                               day: "2-digit",
//                               month: "short",
//                               year: "numeric",
//                               hour: "2-digit",
//                               minute: "2-digit",
//                             })
//                           : "—"}
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600">
//                           {record._id.slice(-8)}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4">
//                         <span className="font-mono text-xs text-slate-600">
//                           {record.createdBy || "—"}
//                         </span>
//                       </td>
//                       <td className="px-6 py-4 text-center">
//                         <button
//                           onClick={() => openModal(record)}
//                           className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-blue-50 hover:text-blue-600"
//                           title="View survey details"
//                         >
//                           <svg
//                             xmlns="http://www.w3.org/2000/svg"
//                             width={18}
//                             height={18}
//                             fill="none"
//                             viewBox="0 0 24 24"
//                             stroke="currentColor"
//                             strokeWidth={2}
//                           >
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
//                             />
//                             <path
//                               strokeLinecap="round"
//                               strokeLinejoin="round"
//                               d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
//                             />
//                           </svg>
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//           )}
//         </div>
//       </div>

//       {/* MODAL */}
//       {modalOpen && modalRecord && (
//         <div
//           className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm"
//           onClick={closeModal}
//         >
//           <div
//             className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-start justify-between border-b border-slate-100 p-6">
//               <div>
//                 <h3 className="text-lg font-semibold text-slate-900">
//                   Survey Submission
//                 </h3>
//                 <p className="mt-0.5 text-sm text-slate-500">
//                   {modalRecord.createdAt
//                     ? new Date(modalRecord.createdAt).toLocaleString("en-IN", {
//                         day: "2-digit",
//                         month: "short",
//                         year: "numeric",
//                         hour: "2-digit",
//                         minute: "2-digit",
//                       })
//                     : "—"}
//                 </p>
//               </div>
//               <button
//                 onClick={closeModal}
//                 className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
//               >
//                 <svg
//                   xmlns="http://www.w3.org/2000/svg"
//                   className="h-5 w-5"
//                   fill="none"
//                   viewBox="0 0 24 24"
//                   stroke="currentColor"
//                   strokeWidth={2}
//                 >
//                   <path
//                     strokeLinecap="round"
//                     strokeLinejoin="round"
//                     d="M6 18L18 6M6 6l12 12"
//                   />
//                 </svg>
//               </button>
//             </div>

//             <div className="flex-1 overflow-y-auto p-6">
//               <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
//                 <MetaCard label="Survey ID" value={modalRecord._id} mono />
//                 <MetaCard
//                   label="Created By"
//                   value={modalRecord.createdBy || "—"}
//                   mono
//                 />
//               </div>

//               {(() => {
//                 const fields = getDisplayFields(modalRecord);
//                 if (fields.length === 0) {
//                   return (
//                     <div className="mt-6">
//                       <EmptyState
//                         title="No additional data"
//                         description="This record contains no extra survey fields."
//                       />
//                     </div>
//                   );
//                 }

//                 return (
//                   <div className="mt-6">
//                     <div className="mb-3 flex items-center gap-2">
//                       <div className="h-1 w-1 rounded-full bg-blue-500" />
//                       <h4 className="text-sm font-semibold text-slate-700">
//                         Survey Details
//                       </h4>
//                     </div>
//                     <div className="overflow-hidden rounded-xl border border-slate-200">
//                       <dl className="divide-y divide-slate-100">
//                         {fields.map(([key, value], idx) => (
//                           <div
//                             key={key}
//                             className={`flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-start sm:gap-4 ${
//                               idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
//                             }`}
//                           >
//                             <dt className="min-w-[140px] text-xs font-medium uppercase tracking-wide text-slate-500">
//                               {formatFieldLabel(key)}
//                             </dt>
//                             <dd className="flex-1 whitespace-pre-wrap break-words text-sm text-slate-800">
//                               {formatFieldValue(value)}
//                             </dd>
//                           </div>
//                         ))}
//                       </dl>
//                     </div>
//                   </div>
//                 );
//               })()}
//             </div>

//             <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
//               <button
//                 onClick={closeModal}
//                 className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
//               >
//                 Close
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }

// /* SUB COMPONENTS */

// function SummaryCard({
//   label,
//   value,
//   accent,
//   icon,
// }: {
//   label: string;
//   value: number | string;
//   accent: "slate" | "emerald" | "amber" | "blue";
//   icon: React.ReactNode;
// }) {
//   const accentMap = {
//     slate: {
//       bg: "bg-slate-100",
//       text: "text-slate-700",
//       value: "text-slate-900",
//     },
//     emerald: {
//       bg: "bg-emerald-50",
//       text: "text-emerald-600",
//       value: "text-emerald-600",
//     },
//     amber: {
//       bg: "bg-amber-50",
//       text: "text-amber-600",
//       value: "text-amber-600",
//     },
//     blue: {
//       bg: "bg-blue-50",
//       text: "text-blue-600",
//       value: "text-blue-600",
//     },
//   } as const;

//   const a = accentMap[accent];

//   return (
//     <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
//       <div className="flex items-center justify-between">
//         <p className="text-sm font-medium text-slate-500">{label}</p>
//         <div
//           className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text}`}
//         >
//           <svg
//             className="h-4 w-4"
//             fill="none"
//             viewBox="0 0 24 24"
//             stroke="currentColor"
//             strokeWidth={2}
//           >
//             {icon}
//           </svg>
//         </div>
//       </div>
//       <p className={`mt-3 text-2xl font-semibold tracking-tight ${a.value}`}>
//         {value}
//       </p>
//     </div>
//   );
// }

// function EmptyState({
//   title,
//   description,
// }: {
//   title: string;
//   description: string;
// }) {
//   return (
//     <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
//       <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
//         <svg
//           className="h-6 w-6"
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//           strokeWidth={1.5}
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
//           />
//         </svg>
//       </div>
//       <p className="text-sm font-medium text-slate-700">{title}</p>
//       <p className="text-xs text-slate-500">{description}</p>
//     </div>
//   );
// }

// function MetaCard({
//   label,
//   value,
//   mono = false,
// }: {
//   label: string;
//   value: string;
//   mono?: boolean;
// }) {
//   return (
//     <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5">
//       <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
//         {label}
//       </p>
//       <p
//         className={`mt-1 break-all text-sm text-slate-800 ${
//           mono ? "font-mono text-xs" : "font-medium"
//         }`}
//       >
//         {value}
//       </p>
//     </div>
//   );
// }


"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

type Summary = {
  firstTarget: number;
  secondTarget: number;
  completed: number;
  currentTarget: number;
  remaining: number;
  achievement: number;
  currentTargetLabel: "First Target" | "Second Target";
  firstTargetAchieved: boolean;
  secondTargetAchieved: boolean;
};

type DailyPerformance = {
  date: string;
  completed: number;
};

type UserPerformance = {
  userId: string;
  name: string;
  email: string;
  role: string;
  firstTarget: number;
  secondTarget: number;
  target: number;
  completed: number;
  remaining: number;
  achievement: number;
  currentTarget?: number;
  currentTargetLabel?: "First Target" | "Second Target";
  firstTargetAchieved?: boolean;
  secondTargetAchieved?: boolean;
};

type TargetProgress = {
  currentTarget: number;
  remaining: number;
  achievement: number;
  currentTargetLabel: "First Target" | "Second Target";
  firstTargetAchieved: boolean;
  secondTargetAchieved: boolean;
};

type SurveyRecord = {
  _id: string;
  createdAt: string;
  createdBy?: any;
  [key: string]: any;
};

type TeamMember = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
  totalRecords?: number;
};

// ==========================================================
// ATTENDANCE STATUS
// ==========================================================
type AttendanceKey =
  | "present"
  | "absent"
  | "wfh"
  | "leave"
  | "half_day"
  | "holiday"
  | "fun_day"
  | "week_off"
  | "other";

const ATTENDANCE_META: Record<
  AttendanceKey,
  { code: string; label: string; badge: string }
> = {
  present: {
    code: "P",
    label: "Present",
    badge: "bg-emerald-100 text-emerald-700",
  },
  absent: { code: "A", label: "Absent", badge: "bg-red-100 text-red-700" },
  wfh: {
    code: "WFH",
    label: "Work From Home",
    badge: "bg-sky-100 text-sky-700",
  },
  leave: { code: "L", label: "Leave", badge: "bg-amber-100 text-amber-700" },
  half_day: {
    code: "HD",
    label: "Half Day",
    badge: "bg-orange-100 text-orange-700",
  },
  holiday: {
    code: "H",
    label: "Holiday",
    badge: "bg-violet-100 text-violet-700",
  },
  fun_day: {
    code: "FD",
    label: "Fun Day",
    badge: "bg-pink-100 text-pink-700",
  },
  week_off: {
    code: "WO",
    label: "Week Off",
    badge: "bg-slate-200 text-slate-600",
  },
  other: { code: "?", label: "Other", badge: "bg-slate-100 text-slate-600" },
};

const LEGEND_ORDER: AttendanceKey[] = [
  "present",
  "absent",
  "wfh",
  "leave",
  "half_day",
  "holiday",
  "fun_day",
  "week_off",
];

// Maps whatever text your Attendance module stores to one of the keys above.
const normalizeAttendance = (raw?: string | null): AttendanceKey | null => {
  if (!raw) return null;

  const s = String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

  if (!s) return null;

  if (s.includes("work from home") || s === "wfh" || s.includes("remote"))
    return "wfh";
  if (s.includes("half")) return "half_day";
  if (s.includes("fun")) return "fun_day";
  if (
    (s.includes("week") && s.includes("off")) ||
    s === "wo" ||
    s.includes("weekoff")
  )
    return "week_off";
  if (s.includes("holiday")) return "holiday";
  if (
    s.includes("leave") ||
    s.includes("lwp") ||
    s.includes("sick") ||
    s.includes("casual")
  )
    return "leave";
  if (s.includes("absent")) return "absent";
  if (s.includes("present") || s.includes("late")) return "present";

  return "other";
};

// ==========================================================
// DATE HELPERS
// ==========================================================
const pad2 = (n: number) => String(n).padStart(2, "0");

const localDateKey = (value: string | Date) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const createdByKey = (value: any): string => {
  if (value && typeof value === "object") {
    return String(value._id || value.email || value.name || "")
      .trim()
      .toLowerCase();
  }
  return String(value || "")
    .trim()
    .toLowerCase();
};

const WEEKDAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export default function SurveyPerformancePage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [summary, setSummary] = useState<Summary>({
    firstTarget: 0,
    secondTarget: 0,
    completed: 0,
    currentTarget: 0,
    remaining: 0,
    achievement: 0,
    currentTargetLabel: "First Target",
    firstTargetAchieved: false,
    secondTargetAchieved: false,
  });
  const [dailyPerformance, setDailyPerformance] = useState<DailyPerformance[]>(
    []
  );
  const [users, setUsers] = useState<UserPerformance[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Raw records are only used to count submissions per user per date.
  const [monthlyRecords, setMonthlyRecords] = useState<SurveyRecord[]>([]);

  // Highlights one date column in the matrix.
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Show only one user in the matrix.
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // attendance[userId][YYYY-MM-DD] = raw status text
  const [attendance, setAttendance] = useState<
    Record<string, Record<string, string>>
  >({});
  const [attendanceError, setAttendanceError] = useState("");

  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD ALL MONTHLY RECORDS (fetches per active date)
  // ==========================================================
  const loadMonthlyRecords = async (dates: string[]) => {
    if (!dates || dates.length === 0) {
      setMonthlyRecords([]);
      return;
    }

    try {
      const responses = await Promise.all(
        dates.map((date) =>
          fetch(`/api/survey/performance?month=${month}&date=${date}`, {
            method: "GET",
            credentials: "include",
          })
            .then((res) => res.json())
            .catch(() => ({ success: false, dateRecords: [] }))
        )
      );

      const combined: SurveyRecord[] = [];
      responses.forEach((res) => {
        if (res?.success && Array.isArray(res.dateRecords)) {
          combined.push(...res.dateRecords);
        }
      });

      setMonthlyRecords(combined);
    } catch {
      setMonthlyRecords([]);
    }
  };

  // ==========================================================
  // LOAD TEAM MEMBERS (Team Lead sees only their own team;
  // the API enforces the identity server-side)
  // ==========================================================
  const loadTeamMembers = async () => {
    try {
      const response = await fetch("/api/survey/team-members", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const contentType = response.headers.get("content-type") || "";

      if (!contentType.includes("application/json")) {
        throw new Error(`Team members API returned ${response.status}.`);
      }

      const result = await response.json();

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || "Failed to load team members.");
      }

      // Deduplicate: email > name > _id
      const rawTeamMembers: TeamMember[] = Array.isArray(result.data)
        ? result.data
        : [];

      const rosterMap = new Map<string, TeamMember>();

      for (const member of rawTeamMembers) {
        const identityKey =
          String(member?.email || "")
            .trim()
            .toLowerCase() ||
          String(member?.name || "")
            .trim()
            .toLowerCase() ||
          String(member?._id || "").trim();

        if (!identityKey) continue;
        if (!rosterMap.has(identityKey)) rosterMap.set(identityKey, member);
      }

      setTeamMembers(Array.from(rosterMap.values()));
    } catch (err) {
      console.error("Failed to load team members:", err);
      setTeamMembers([]);
    }
  };

  // ==========================================================
  // SEQUENTIAL TARGET LOGIC
  // 1. First Target must be achieved first.
  // 2. Then Second Target becomes the active goal.
  // ==========================================================
  const getTargetProgress = (
    completed: number,
    firstTarget: number,
    secondTarget: number
  ): TargetProgress => {
    const safeCompleted = Math.max(0, Number(completed) || 0);
    const safeFirst = Math.max(0, Number(firstTarget) || 0);
    const safeSecond = Math.max(0, Number(secondTarget) || 0);

    const firstTargetAchieved = safeFirst > 0 && safeCompleted >= safeFirst;
    const secondTargetAchieved = safeSecond > 0 && safeCompleted >= safeSecond;

    if (safeFirst <= 0) {
      return {
        currentTarget: safeSecond,
        remaining: Math.max(safeSecond - safeCompleted, 0),
        achievement:
          safeSecond > 0
            ? Math.min(Math.round((safeCompleted / safeSecond) * 100), 100)
            : 0,
        currentTargetLabel: "Second Target",
        firstTargetAchieved: false,
        secondTargetAchieved,
      };
    }

    if (!firstTargetAchieved) {
      return {
        currentTarget: safeFirst,
        remaining: Math.max(safeFirst - safeCompleted, 0),
        achievement: Math.min(
          Math.round((safeCompleted / safeFirst) * 100),
          100
        ),
        currentTargetLabel: "First Target",
        firstTargetAchieved: false,
        secondTargetAchieved: false,
      };
    }

    const currentTarget = safeSecond > 0 ? safeSecond : safeFirst;

    return {
      currentTarget,
      remaining: Math.max(currentTarget - safeCompleted, 0),
      achievement:
        currentTarget > 0
          ? Math.min(Math.round((safeCompleted / currentTarget) * 100), 100)
          : 0,
      currentTargetLabel: "Second Target",
      firstTargetAchieved: true,
      secondTargetAchieved,
    };
  };

  // ==========================================================
  // DEDUPLICATION
  // ==========================================================
  const uniqueTeamMembers = Array.from(
    new Map(
      teamMembers.map((member) => {
        const key =
          String(member.email || "")
            .trim()
            .toLowerCase() ||
          String(member.name || "")
            .trim()
            .toLowerCase() ||
          String(member._id || "").trim();

        return [key, member] as const;
      })
    ).values()
  );

  const deduplicateUsers = (list: UserPerformance[]): UserPerformance[] => {
    const map = new Map<string, UserPerformance>();

    for (const user of list) {
      const identityKey =
        String(user.email || "")
          .trim()
          .toLowerCase() ||
        String(user.name || "")
          .trim()
          .toLowerCase() ||
        String(user.userId || "").trim();

      if (!identityKey) continue;
      if (!map.has(identityKey)) map.set(identityKey, user);
    }

    return Array.from(map.values());
  };

  // ==========================================================
  // LOAD PERFORMANCE
  // ==========================================================
  const loadPerformance = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`/api/survey/performance?month=${month}`, {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Failed to load performance");
      }

      const apiSummary = data.summary || {};

      const firstTarget = Number(
        apiSummary.firstTarget ?? data.firstTarget ?? 0
      );
      const secondTarget = Number(
        apiSummary.secondTarget ?? data.secondTarget ?? 0
      );
      const completed = Number(apiSummary.completed ?? 0);

      setSummary({
        firstTarget,
        secondTarget,
        completed,
        ...getTargetProgress(completed, firstTarget, secondTarget),
      });

      const daily: DailyPerformance[] = data.dailyPerformance || [];
      setDailyPerformance(daily);
      setRole(data.role || "");

      const apiUsers: UserPerformance[] = Array.isArray(data.users)
        ? data.users.map((user: UserPerformance) => {
            const uFirst = Number(
              user.firstTarget ??
                data.summary?.firstTarget ??
                data.firstTarget ??
                0
            );
            const uSecond = Number(
              user.secondTarget ??
                data.summary?.secondTarget ??
                data.secondTarget ??
                0
            );
            const uCompleted = Number(user.completed ?? 0);
            const progress = getTargetProgress(uCompleted, uFirst, uSecond);

            return {
              ...user,
              firstTarget: uFirst,
              secondTarget: uSecond,
              target: progress.currentTarget,
              completed: uCompleted,
              remaining: progress.remaining,
              achievement: progress.achievement,
              currentTarget: progress.currentTarget,
              currentTargetLabel: progress.currentTargetLabel,
              firstTargetAchieved: progress.firstTargetAchieved,
              secondTargetAchieved: progress.secondTargetAchieved,
            };
          })
        : [];

      const normalizedRole = String(data.role || "")
        .toLowerCase()
        .replace(/[-\s]/g, "_");

        const isSurveyTester =
  normalizedRole === "survey_tester" ||
  normalizedRole === "surveytester" ||
  normalizedRole === "survey-tester" ||
  normalizedRole === "survey tester";

      const isTeamLead =
        normalizedRole === "teamlead" || normalizedRole === "team_lead";
  const isDQA =
  normalizedRole === "data_quality_analyst" ||
  normalizedRole === "dataqualityanalyst" ||
  normalizedRole === "dqa";


if (isDQA || isSurveyTester) {
  const currentUserId = String(data.userId || "").trim();

  const currentUserEmail = String(data.email || "")
    .trim()
    .toLowerCase();

  const currentUserName = String(data.name || "")
    .trim()
    .toLowerCase();

  const ownUser = apiUsers.filter((user) => {
    const userId = String(user.userId || "").trim();

    const email = String(user.email || "")
      .trim()
      .toLowerCase();

    const name = String(user.name || "")
      .trim()
      .toLowerCase();

    return (
      (currentUserId && userId === currentUserId) ||
      (currentUserEmail && email === currentUserEmail) ||
      (currentUserName && name === currentUserName)
    );
  });

  setUsers(deduplicateUsers(ownUser));

} else if (isTeamLead) {

  // existing Team Lead logic

} else {

  // HR/Admin
  setUsers(deduplicateUsers(apiUsers));
}

      if (isTeamLead) {
        const allowedIds = new Set(
          uniqueTeamMembers
            .map((m) => String(m._id || "").trim())
            .filter(Boolean)
        );
        const allowedNames = new Set(
          uniqueTeamMembers
            .map((m) =>
              String(m.name || "")
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        );
        const allowedEmails = new Set(
          uniqueTeamMembers
            .map((m) =>
              String(m.email || "")
                .trim()
                .toLowerCase()
            )
            .filter(Boolean)
        );

        // Only users belonging to this Team Lead's team.
        const filteredUsers = apiUsers.filter((user) => {
          const userId = String(user.userId || "").trim();
          const name = String(user.name || "")
            .trim()
            .toLowerCase();
          const email = String(user.email || "")
            .trim()
            .toLowerCase();

          return (
            (userId && allowedIds.has(userId)) ||
            (name && allowedNames.has(name)) ||
            (email && allowedEmails.has(email))
          );
        });

        const performanceByIdentity = new Map<string, UserPerformance>();

        for (const user of filteredUsers) {
          const keys = [
            String(user.userId || "").trim(),
            String(user.email || "")
              .trim()
              .toLowerCase(),
            String(user.name || "")
              .trim()
              .toLowerCase(),
          ].filter(Boolean);

          for (const key of keys) {
            if (!performanceByIdentity.has(key)) {
              performanceByIdentity.set(key, user);
            }
          }
        }

        // One row per real user, including members with 0 surveys.
        const teamPerformanceMap = new Map<string, UserPerformance>();

        for (const member of uniqueTeamMembers) {
          const memberId = String(member._id || "").trim();
          const memberEmail = String(member.email || "")
            .trim()
            .toLowerCase();
          const memberName = String(member.name || "")
            .trim()
            .toLowerCase();

          const identityKey = memberEmail || memberName || memberId;
          if (!identityKey) continue;

          const existing: UserPerformance | undefined =
            (memberId ? performanceByIdentity.get(memberId) : undefined) ??
            (memberEmail
              ? performanceByIdentity.get(memberEmail)
              : undefined) ??
            (memberName ? performanceByIdentity.get(memberName) : undefined);

          const mFirst = Number(
            existing?.firstTarget ??
              data.summary?.firstTarget ??
              data.firstTarget ??
              0
          );
          const mSecond = Number(
            existing?.secondTarget ??
              data.summary?.secondTarget ??
              data.secondTarget ??
              0
          );
          const mCompleted = Number(existing?.completed ?? 0);
          const mProgress = getTargetProgress(mCompleted, mFirst, mSecond);

          const user: UserPerformance = existing
            ? {
                ...existing,
                firstTarget: mFirst,
                secondTarget: mSecond,
                target: mProgress.currentTarget,
                completed: mCompleted,
                remaining: mProgress.remaining,
                achievement: mProgress.achievement,
                currentTarget: mProgress.currentTarget,
                currentTargetLabel: mProgress.currentTargetLabel,
                firstTargetAchieved: mProgress.firstTargetAchieved,
                secondTargetAchieved: mProgress.secondTargetAchieved,
              }
            : {
                userId: memberId || memberEmail || memberName,
                name: member.name || "Unknown",
                email: member.email || "",
                role: member.role || "survey-tester",
                firstTarget: mFirst,
                secondTarget: mSecond,
                target: mProgress.currentTarget,
                completed: 0,
                remaining: mProgress.remaining,
                achievement: mProgress.achievement,
                currentTarget: mProgress.currentTarget,
                currentTargetLabel: mProgress.currentTargetLabel,
                firstTargetAchieved: mProgress.firstTargetAchieved,
                secondTargetAchieved: mProgress.secondTargetAchieved,
              };

          if (!teamPerformanceMap.has(identityKey)) {
            teamPerformanceMap.set(identityKey, user);
          }
        }

        setUsers(deduplicateUsers(Array.from(teamPerformanceMap.values())));
      } else {
        setUsers(deduplicateUsers(apiUsers));
      }

      // Records are only needed to count submissions per user per date.
      loadMonthlyRecords(daily.map((d) => d.date));
    } catch (err: any) {
      setError(err?.message || "Failed to load performance");
    } finally {
      setLoading(false);
      setHasLoadedOnce(true);
    }
  };

  // ==========================================================
  // EFFECTS
  // ==========================================================
  useEffect(() => {
    setSelectedDate(null);
    setSelectedUserId(null);
    setMonthlyRecords([]);
    loadTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month]);

  useEffect(() => {
    loadPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, teamMembers]);

  // Attendance for every user shown in the matrix.
  const userIdsKey = users.map((u) => u.userId).join(",");

  useEffect(() => {
    if (!userIdsKey) {
      setAttendance({});
      setAttendanceError("");
      return;
    }

    let cancelled = false;

    const loadAttendance = async () => {
      try {
        const params = new URLSearchParams({
          month,
          userIds: userIdsKey,
          tzOffset: String(new Date().getTimezoneOffset()),
        });

        const res = await fetch(
          `/api/survey/attendance-summary?${params.toString()}`,
          { credentials: "include", cache: "no-store" }
        );
        const json = await res.json();

        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load attendance");
        }

        if (!cancelled) {
          setAttendance(json.data || {});
          setAttendanceError("");
        }
      } catch (err: any) {
        if (!cancelled) {
          setAttendance({});
          setAttendanceError(err?.message || "Attendance data unavailable");
        }
      }
    };

    loadAttendance();

    return () => {
      cancelled = true;
    };
  }, [month, userIdsKey]);

  // ==========================================================
  // DATE HANDLERS
  // ==========================================================
  const handleDateClick = (date: string) =>
    setSelectedDate((prev) => (prev === date ? null : date));

  const clearDateFilter = () => setSelectedDate(null);

  const formatDate = (date: string) => {
    const [, m, d] = date.split("-");
    return `${d}/${m}`;
  };

  const formatRole = (value: string) => {
    if (!value) return "";
    if (value.toLowerCase().includes("survey")) return "Survey Tester";
    if (value.toLowerCase().includes("team")) return "Team Lead";
    return value.toUpperCase();
  };

  // ==========================================================
  // MATRIX DATA: users x dates
  // ==========================================================
  const monthDates = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const key = `${month}-${pad2(day)}`;
      return {
        key,
        day,
        weekday: new Date(y, m - 1, day).getDay(),
      };
    });
  }, [month]);

  const todayKey = useMemo(() => localDateKey(new Date()), []);

  // submissions[userId][date] = count
  const submissions = useMemo(() => {
    const lookup = new Map<string, string>();

    for (const user of users) {
      const keys = [
        String(user.userId || "")
          .trim()
          .toLowerCase(),
        String(user.email || "")
          .trim()
          .toLowerCase(),
        String(user.name || "")
          .trim()
          .toLowerCase(),
      ].filter(Boolean);

      for (const key of keys) {
        if (!lookup.has(key)) lookup.set(key, user.userId);
      }
    }

    const result: Record<string, Record<string, number>> = {};

    for (const record of monthlyRecords) {
      const uid = lookup.get(createdByKey(record.createdBy));
      if (!uid || !record.createdAt) continue;

      const date = localDateKey(record.createdAt);
      result[uid] = result[uid] || {};
      result[uid][date] = (result[uid][date] || 0) + 1;
    }

    return result;
  }, [monthlyRecords, users]);

  const matrixUsers = selectedUserId
    ? users.filter((u) => String(u.userId) === String(selectedUserId))
    : users;

  const selectedUser = users.find(
    (u) => String(u.userId) === String(selectedUserId)
  );

  const getUserTotals = (userId: string) => {
    const totals: Record<AttendanceKey, number> = {
      present: 0,
      absent: 0,
      wfh: 0,
      leave: 0,
      half_day: 0,
      holiday: 0,
      fun_day: 0,
      week_off: 0,
      other: 0,
    };
    let submitted = 0;

    for (const d of monthDates) {
      const key = normalizeAttendance(attendance[userId]?.[d.key]);
      if (key) totals[key] += 1;
      submitted += submissions[userId]?.[d.key] || 0;
    }

    return { totals, submitted };
  };

  // ==========================================================
  // CHART DATA
  // ==========================================================
  const chartData = {
    labels: dailyPerformance.map((item) => formatDate(item.date)),
    datasets: [
      {
        label: "Completed",
        data: dailyPerformance.map((item) => item.completed),
        backgroundColor: dailyPerformance.map((item) =>
          selectedDate === item.date
            ? "rgba(37, 99, 235, 1)"
            : "rgba(96, 165, 250, 0.85)"
        ),
        hoverBackgroundColor: "rgba(37, 99, 235, 1)",
        borderColor: "rgba(37, 99, 235, 0.4)",
        borderWidth: 1,
        borderRadius: 8,
        maxBarThickness: 40,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: "rgba(17, 24, 39, 0.95)",
        padding: 12,
        cornerRadius: 8,
        titleFont: { size: 13, weight: 600 },
        bodyFont: { size: 12 },
        displayColors: false,
        callbacks: {
          label: (context: any) => `${context.raw} surveys completed`,
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: "#9ca3af", font: { size: 11 } },
        grid: { color: "rgba(229, 231, 235, 0.6)" },
        border: { display: false },
      },
      x: {
        grid: { display: false },
        ticks: { color: "#6b7280", font: { size: 11 } },
        border: { display: false },
      },
    },
    onClick: (_event: any, elements: any[]) => {
      if (elements.length > 0) {
        handleDateClick(dailyPerformance[elements[0].index].date);
      }
    },
  };

  // ==========================================================
  // LOADING (first load only, so the page doesn't flash on refresh)
  // ==========================================================
  if (loading && !hasLoadedOnce) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-blue-600" />
          <p className="text-sm text-slate-500">Loading performance data...</p>
        </div>
      </div>
    );
  }

const normalizedDisplayRole = String(role || "")
  .trim()
  .toLowerCase()
  .replace(/[-\s]+/g, "_");

const showUsers =
  normalizedDisplayRole === "teamlead" ||
  normalizedDisplayRole === "team_lead" ||
  normalizedDisplayRole === "hr" ||
  normalizedDisplayRole === "data_quality_analyst" ||
  normalizedDisplayRole === "dataqualityanalyst" ||
  normalizedDisplayRole === "dqa" ||
  normalizedDisplayRole === "admin";

  // ==========================================================
  // UI
  // ==========================================================
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* HEADER */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-2xl font-semibold tracking-tight text-slate-900">
              Survey Performance
            </h4>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
              {formatRole(role) || "Dashboard"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-slate-600">Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <svg
              className="h-5 w-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {error}
          </div>
        )}

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="First Target"
            value={summary.firstTarget}
            accent="slate"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            }
          />

          <SummaryCard
            label="Second Target"
            value={summary.secondTarget}
            accent="blue"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            }
          />

          <SummaryCard
            label="Completed"
            value={summary.completed}
            accent="emerald"
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            }
          />

          <SummaryCard
            label={`${summary.currentTargetLabel} Progress`}
            value={`${summary.achievement}%`}
            accent={summary.secondTargetAchieved ? "emerald" : "amber"}
            icon={
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            }
          />
        </div>

        {/* TEAM TARGET MOTIVATION */}
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Team Target Progress
              </p>

              {summary.secondTargetAchieved ? (
                <>
                  <h3 className="mt-1 text-lg font-semibold text-emerald-700">
                    🎉 Both targets achieved!
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    First Target {summary.firstTarget} ✓ · Second Target{" "}
                    {summary.secondTarget} ✓
                  </p>
                </>
              ) : summary.firstTargetAchieved ? (
                <>
                  <h3 className="mt-1 text-lg font-semibold text-blue-700">
                    First Target achieved — motivate the team for the Second
                    Target!
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    The team has completed {summary.completed}. Only{" "}
                    <span className="font-semibold text-blue-700">
                      {summary.remaining}
                    </span>{" "}
                    more to reach the Second Target of{" "}
                    <span className="font-semibold">
                      {summary.secondTarget}
                    </span>
                    .
                  </p>
                </>
              ) : (
                <>
                  <h3 className="mt-1 text-lg font-semibold text-slate-800">
                    Focus on the First Target
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    The team needs{" "}
                    <span className="font-semibold text-amber-600">
                      {summary.remaining}
                    </span>{" "}
                    more survey
                    {summary.remaining === 1 ? "" : "s"} to reach the First
                    Target of{" "}
                    <span className="font-semibold">
                      {summary.firstTarget}
                    </span>
                    . After that, the Second Target becomes active.
                  </p>
                </>
              )}
            </div>

            <div className="min-w-[220px]">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-slate-500">
                  {summary.currentTargetLabel}
                </span>
                <span className="font-semibold text-slate-700">
                  {summary.completed} / {summary.currentTarget}
                </span>
              </div>

              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all ${
                    summary.secondTargetAchieved
                      ? "bg-emerald-500"
                      : summary.firstTargetAchieved
                      ? "bg-blue-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(summary.achievement, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* DAILY PERFORMANCE CHART */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Daily Survey Performance
              </h2>
              <p className="text-sm text-slate-500">
                Click a bar to highlight that date in the table below.
              </p>
            </div>
            {selectedDate && (
              <button
                onClick={clearDateFilter}
                className="self-start rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Clear highlight
              </button>
            )}
          </div>

          {dailyPerformance.length === 0 ? (
            <EmptyState
              title="No survey data"
              description="No survey data found for this month."
            />
          ) : (
            <>
              <div className="h-72">
                <Bar data={chartData} options={chartOptions} />
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {dailyPerformance.map((item) => (
                  <button
                    key={item.date}
                    onClick={() => handleDateClick(item.date)}
                    className={`group inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition ${
                      selectedDate === item.date
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <span>{formatDate(item.date)}</span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        selectedDate === item.date
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.completed}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* USER PERFORMANCE */}
        {showUsers && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <h2 className="text-base font-semibold text-slate-900">
                User Performance
              </h2>
              <p className="text-sm text-slate-500">
                Click a user to see only their date-wise submissions and
                attendance below.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Role
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      First Target
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Second Target
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Current Goal
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Remaining
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-10 text-center text-sm text-slate-400"
                      >
                        No team members found.
                      </td>
                    </tr>
                  )}

                  {users.map((user) => {
                    const isSelected =
                      String(selectedUserId) === String(user.userId);

                    return (
                      <tr
                        key={user.userId}
                        onClick={() =>
                          setSelectedUserId(
                            isSelected ? null : String(user.userId)
                          )
                        }
                        className={`cursor-pointer transition ${
                          isSelected
                            ? "bg-blue-50 hover:bg-blue-50"
                            : "hover:bg-slate-50/60"
                        }`}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 text-xs font-semibold text-white">
                              {user.name
                                ?.split(" ")
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join("")
                                .toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0">
                              <div
                                className={`truncate font-medium ${
                                  isSelected
                                    ? "text-blue-700"
                                    : "text-slate-800"
                                }`}
                              >
                                {user.name}
                              </div>
                              {isSelected && (
                                <div className="mt-0.5 text-[11px] font-medium text-blue-600">
                                  Selected — showing this user only
                                </div>
                              )}
                              <div className="truncate text-xs text-slate-500">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {user.firstTarget}
                          {user.firstTargetAchieved && (
                            <span className="ml-1 text-emerald-600">✓</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-slate-700">
                          {user.secondTarget}
                          {user.secondTargetAchieved && (
                            <span className="ml-1 text-emerald-600">✓</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right font-semibold text-emerald-600">
                          {user.completed}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="font-semibold text-slate-700">
                            {user.currentTarget ?? user.target}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {user.currentTargetLabel ||
                              (user.firstTargetAchieved
                                ? "Second Target"
                                : "First Target")}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-amber-600">
                          {user.remaining}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                              <div
                                className={`h-full rounded-full ${
                                  user.secondTargetAchieved
                                    ? "bg-emerald-500"
                                    : user.firstTargetAchieved
                                    ? "bg-blue-500"
                                    : "bg-amber-500"
                                }`}
                                style={{
                                  width: `${Math.min(user.achievement, 100)}%`,
                                }}
                              />
                            </div>
                            <span className="w-10 text-right font-semibold text-slate-700">
                              {user.achievement}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* DATE-WISE SUBMISSIONS + ATTENDANCE (replaces the Survey Records table) */}
        {showUsers && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">
                    Date-wise Submissions &amp; Attendance
                  </h2>
                  <p className="text-sm text-slate-500">
                    {selectedUser
                      ? `${selectedUser.name} • each day shows attendance status and surveys submitted`
                      : "Every user, every day: attendance status on top, surveys submitted below"}
                  </p>
                </div>
                {selectedUser && (
                  <button
                    onClick={() => setSelectedUserId(null)}
                    className="self-start rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
                  >
                    Show all users
                  </button>
                )}
              </div>

              {/* Legend */}
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2">
                {LEGEND_ORDER.map((key) => (
                  <span
                    key={key}
                    className="inline-flex items-center gap-1.5 text-xs text-slate-600"
                  >
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${ATTENDANCE_META[key].badge}`}
                    >
                      {ATTENDANCE_META[key].code}
                    </span>
                    {ATTENDANCE_META[key].label}
                  </span>
                ))}
              </div>

              {attendanceError && (
                <div className="mt-4 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Attendance status could not be loaded ({attendanceError}).
                  Submission counts are still shown.
                </div>
              )}
            </div>

            {matrixUsers.length === 0 ? (
              <EmptyState
                title="No users"
                description="No users available for this month."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="sticky left-0 z-10 min-w-[220px] bg-slate-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                        User
                      </th>
                      {monthDates.map((d) => (
                        <th
                          key={d.key}
                          className={`min-w-[44px] border-l border-slate-100 px-1 py-2 text-center text-xs font-semibold ${
                            selectedDate === d.key
                              ? "bg-blue-100 text-blue-700"
                              : d.key === todayKey
                              ? "bg-blue-50 text-blue-600"
                              : "text-slate-500"
                          }`}
                        >
                          <div>{d.day}</div>
                          <div className="text-[10px] font-normal text-slate-400">
                            {WEEKDAY_LETTERS[d.weekday]}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {matrixUsers.map((user) => {
                      const { totals, submitted } = getUserTotals(user.userId);

                      return (
                        <tr key={user.userId}>
                          <td className="sticky left-0 z-10 bg-white px-4 py-3 align-top">
                            <div className="truncate font-medium text-slate-800">
                              {user.name}
                            </div>
                            <div className="mt-1 flex flex-wrap gap-1">
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                                P {totals.present}
                              </span>
                              <span className="rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                                A {totals.absent}
                              </span>
                              {totals.wfh > 0 && (
                                <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">
                                  WFH {totals.wfh}
                                </span>
                              )}
                              {totals.leave > 0 && (
                                <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                                  L {totals.leave}
                                </span>
                              )}
                              {totals.fun_day > 0 && (
                                <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-semibold text-pink-700">
                                  FD {totals.fun_day}
                                </span>
                              )}
                            </div>
                            <div className="mt-1 text-xs text-slate-500">
                              <span className="font-semibold text-slate-800">
                                {submitted}
                              </span>{" "}
                              submitted this month
                            </div>
                          </td>

                          {monthDates.map((d) => {
                            const isFuture = d.key > todayKey;
                            const count = submissions[user.userId]?.[d.key] || 0;
                            const statusKey = normalizeAttendance(
                              attendance[user.userId]?.[d.key]
                            );
                            const meta = statusKey
                              ? ATTENDANCE_META[statusKey]
                              : null;

                            return (
                              <td
                                key={d.key}
                                className={`border-l border-slate-100 px-1 py-2 text-center ${
                                  selectedDate === d.key
                                    ? "bg-blue-50"
                                    : d.key === todayKey
                                    ? "bg-blue-50/40"
                                    : ""
                                }`}
                              >
                                {isFuture ? (
                                  <span className="text-xs text-slate-200">
                                    ·
                                  </span>
                                ) : (
                                  <div className="flex flex-col items-center gap-0.5">
                                    {meta ? (
                                      <span
                                        title={meta.label}
                                        className={`rounded px-1 text-[10px] font-semibold ${meta.badge}`}
                                      >
                                        {meta.code}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] text-slate-300">
                                        –
                                      </span>
                                    )}
                                    <span
                                      title={`${count} survey${
                                        count === 1 ? "" : "s"
                                      } submitted`}
                                      className={
                                        count > 0
                                          ? "text-xs font-semibold text-emerald-600"
                                          : "text-xs text-slate-300"
                                      }
                                    >
                                      {count}
                                    </span>
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* SUB COMPONENTS */

function SummaryCard({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number | string;
  accent: "slate" | "emerald" | "amber" | "blue";
  icon: React.ReactNode;
}) {
  const accentMap = {
    slate: {
      bg: "bg-slate-100",
      text: "text-slate-700",
      value: "text-slate-900",
    },
    emerald: {
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      value: "text-emerald-600",
    },
    amber: {
      bg: "bg-amber-50",
      text: "text-amber-600",
      value: "text-amber-600",
    },
    blue: {
      bg: "bg-blue-50",
      text: "text-blue-600",
      value: "text-blue-600",
    },
  } as const;

  const a = accentMap[accent];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-lg ${a.bg} ${a.text}`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            {icon}
          </svg>
        </div>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${a.value}`}>
        {value}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <svg
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <p className="text-sm font-medium text-slate-700">{title}</p>
      <p className="text-xs text-slate-500">{description}</p>
    </div>
  );
}