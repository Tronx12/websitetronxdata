"use client";

import { useEffect, useMemo, useState } from "react";

// ============================================================
// TYPES
// ============================================================

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string | { _id: string; name?: string } | null;
  firstTarget: number;
  secondTarget: number;
  completedSurvey?: number;
};

type TeamMember = {
  _id?: string;
  name?: string;
  email?: string;
};

type Team = {
  _id: string;
  name: string;
  teamLead?: string | TeamMember | null;
  members?: TeamMember[] | number;
  memberCount?: number;
  currentCompleted?: number;
};

type TeamDailyRecord = {
  userId: string;
  username: string;
  email?: string;
  date: string;
  displayDate: string;
  day: string;
  totalSubmit: number;
};

type SurveyRecord = {
  _id: string;
  createdAt?: string;
  createdBy?: string;
  [key: string]: any;
};

// ============================================================
// HELPERS
// ============================================================

const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

function formatMonth(month: string) {
  const [year, monthNumber] = month.split("-");

  return new Date(
    Number(year),
    Number(monthNumber) - 1,
    1
  ).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function getTeamLeadName(team: Team) {
  if (!team.teamLead) return "-";

  if (typeof team.teamLead === "string") {
    return team.teamLead;
  }

  return team.teamLead.name || team.teamLead.email || "-";
}

function getMemberNames(team: Team) {
  if (Array.isArray(team.members)) {
    const names = team.members
      .map((member) => member?.name || member?.email)
      .filter(Boolean);

    if (names.length > 0) {
      return names.join(", ");
    }
  }

  const count =
    typeof team.members === "number"
      ? team.members
      : team.memberCount;

  return count != null ? `${count} member${count === 1 ? "" : "s"}` : "-";
}

// ============================================================
// PAGE
// ============================================================

export default function SurveyTargetPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  // Targets always use the current month.
  const month = CURRENT_MONTH;

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [teamFilter, setTeamFilter] = useState("");

  const [firstTarget, setFirstTarget] = useState("");
  const [secondTarget, setSecondTarget] = useState("");

  const [selectedTeam, setSelectedTeam] =
    useState<Team | null>(null);

  const [teamData, setTeamData] =
    useState<TeamDailyRecord[]>([]);

  const [selectedUserInfo, setSelectedUserInfo] =
    useState<User | null>(null);

  const [records, setRecords] =
    useState<SurveyRecord[]>([]);

  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [viewRecord, setViewRecord] = useState<SurveyRecord | null>(null);

  // userId -> total completed surveys this month
  const [userCompletedMap, setUserCompletedMap] =
    useState<Record<string, number>>({});

  // ==========================================================
  // LOAD USERS
  // ==========================================================

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/survey/targets?month=${month}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load users"
        );
      }

      // Only show roles that actually do survey work
      const allUsers: User[] = (data.users || []).filter(
        (u: User) =>
          u.role === "team-lead" ||
          u.role === "survey-tester"
      );

      setUsers(allUsers);

      // Fetch actual survey count for each user (same
      // source as the View Data button uses)
      const countMap: Record<string, number> = {};
      await Promise.all(
        allUsers.map(async (u) => {
          try {
            const r = await fetch(
              `/api/survey/user-data?userId=${u._id}`,
              { method: "GET", credentials: "include" }
            );
            const d = await r.json();
            if (r.ok && d.success) {
              countMap[u._id] =
                (d.records || []).length;
            } else {
              countMap[u._id] = 0;
            }
          } catch {
            countMap[u._id] = 0;
          }
        })
      );
      setUserCompletedMap(countMap);
    } catch (err: any) {
      setError(
        err?.message || "Failed to load users"
      );
    } finally {
      setLoading(false);
    }
  };


  // ==========================================================
  // LOAD TEAMS + CURRENT MONTH COMPLETED
  // ==========================================================

  const loadTeams = async () => {
    try {
      setTeamLoading(true);
      setError("");

      const response = await fetch("/api/teams?limit=1000", {
        method: "GET",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load teams"
        );
      }

      const apiTeams: Team[] =
        data.teams || data.data || [];

      // Current Completed = total submissions for the
      // current month across all members of the team.
      const teamsWithCompleted = await Promise.all(
        apiTeams.map(async (team) => {
          try {
            const teamResponse = await fetch(
              `/api/SurveyData/team-daily?teamId=${team._id}&month=${month}`,
              {
                method: "GET",
                credentials: "include",
              }
            );

            const teamDataResponse =
              await teamResponse.json();

            if (
              !teamResponse.ok ||
              !teamDataResponse.success
            ) {
              return {
                ...team,
                currentCompleted:
                  Number(team.currentCompleted) || 0,
              };
            }

            const dailyRecords: TeamDailyRecord[] =
              teamDataResponse.data || [];

            const currentCompleted =
              dailyRecords.reduce(
                (total, item) =>
                  total + (Number(item.totalSubmit) || 0),
                0
              );

            return {
              ...team,
              currentCompleted,
            };
          } catch {
            return {
              ...team,
              currentCompleted:
                Number(team.currentCompleted) || 0,
            };
          }
        })
      );

      setTeams(teamsWithCompleted);
    } catch (err: any) {
      setError(
        err?.message || "Failed to load teams"
      );
    } finally {
      setTeamLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, []);

  // ==========================================================
  // TEAM MAPS (Map userId -> teamId and teamName)
  // Since Auth doesn't have teamId, we map from teams data
  // ==========================================================

  const userTeamIdMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of teams) {
      const leadId = typeof team.teamLead === "object" ? (team.teamLead as any)?._id : team.teamLead;
      if (leadId) map[String(leadId)] = team._id;

      if (Array.isArray(team.members)) {
        for (const member of team.members) {
          const mId = typeof member === "object" ? (member as any)?._id : member;
          if (mId) map[String(mId)] = team._id;
        }
      }
    }
    return map;
  }, [teams]);

  const userTeamNameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const team of teams) {
      const leadId = typeof team.teamLead === "object" ? (team.teamLead as any)?._id : team.teamLead;
      if (leadId) map[String(leadId)] = team.name;

      if (Array.isArray(team.members)) {
        for (const member of team.members) {
          const mId = typeof member === "object" ? (member as any)?._id : member;
          if (mId) map[String(mId)] = team.name;
        }
      }
    }
    return map;
  }, [teams]);

  function getUserTeamId(user: User): string | null {
    return userTeamIdMap[user._id] || null;
  }

  function getUserTeamName(user: User): string {
    return userTeamNameMap[user._id] || "-";
  }

  // ==========================================================
  // SEARCH USERS
  // ==========================================================

  const filteredUsers = useMemo(() => {
    let result = users;

    if (teamFilter) {
      result = result.filter(
        (user) => getUserTeamId(user) === teamFilter
      );
    }

    const value = search.trim().toLowerCase();
    if (value) {
      result = result.filter((user) => {
        const teamName = getUserTeamName(user).toLowerCase();
        return (
          user.name?.toLowerCase().includes(value) ||
          user.email?.toLowerCase().includes(value) ||
          user.role?.toLowerCase().includes(value) ||
          teamName.includes(value)
        );
      });
    }

    return result;
  }, [users, search, teamFilter, userTeamIdMap, userTeamNameMap]);

  // ==========================================================
  // TEAM DATA
  // ==========================================================

  const handleViewTeam = async (teamId: string) => {
    setSelectedTeam(null);
    setTeamData([]);
    setMessage("");
    setError("");

    const team = teams.find(
      (item) => item._id === teamId
    );

    if (!team) {
      setError("Team not found");
      return;
    }

    setSelectedTeam(team);

    try {
      setDataLoading(true);

      const response = await fetch(
        `/api/SurveyData/team-daily?teamId=${teamId}&month=${month}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Failed to load team data"
        );
      }

      setTeamData(data.data || []);

      const currentCompleted =
        (data.data || []).reduce(
          (total: number, item: TeamDailyRecord) =>
            total + (Number(item.totalSubmit) || 0),
          0
        );

      setTeams((current) =>
        current.map((item) =>
          item._id === teamId
            ? { ...item, currentCompleted }
            : item
        )
      );

      setSelectedTeam((current) =>
        current
          ? { ...current, currentCompleted }
          : current
      );
    } catch (err: any) {
      setError(
        err?.message || "Failed to load team data"
      );
      setTeamData([]);
    } finally {
      setDataLoading(false);
    }
  };

  // ==========================================================
  // USER SELECTION
  // ==========================================================

  const toggleUser = (userId: string) => {
    setSelectedUsers((current) => {
      if (current.includes(userId)) {
        return current.filter(
          (id) => id !== userId
        );
      }

      return [...current, userId];
    });

    setMessage("");
    setError("");
  };

  const toggleSelectAll = () => {
    const visibleIds = filteredUsers.map(
      (user) => user._id
    );

    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) =>
        selectedUsers.includes(id)
      );

    if (allVisibleSelected) {
      setSelectedUsers((current) =>
        current.filter(
          (id) => !visibleIds.includes(id)
        )
      );
    } else {
      setSelectedUsers((current) => [
        ...new Set([
          ...current,
          ...visibleIds,
        ]),
      ]);
    }

    setMessage("");
    setError("");
  };

  // ==========================================================
  // VIEW USER DATA
  // ==========================================================

  const handleViewUser = async (userId: string) => {
    setSelectedUserInfo(null);
    setRecords([]);
    setMessage("");
    setError("");

    const user = users.find(
      (item) => item._id === userId
    );

    if (!user) {
      setError("User not found");
      return;
    }

    setSelectedUserInfo(user);

    try {
      setDataLoading(true);

      const response = await fetch(
        `/api/survey/user-data?userId=${userId}`,
        {
          method: "GET",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
          "Failed to load user data"
        );
      }

      setRecords(data.records || []);
    } catch (err: any) {
      setError(
        err?.message ||
        "Failed to load user data"
      );
      setRecords([]);
    } finally {
      setDataLoading(false);
    }
  };

  // ==========================================================
  // ASSIGN SAME TARGETS TO MULTIPLE USERS
  // ==========================================================

  const handleAssignTarget = async (
    e: React.FormEvent
  ) => {
    e.preventDefault();

    setMessage("");
    setError("");

    if (selectedUsers.length === 0) {
      setError(
        "Please select at least one user"
      );
      return;
    }

    if (
      firstTarget === "" ||
      secondTarget === ""
    ) {
      setError(
        "Please enter both targets"
      );
      return;
    }

    const numericFirstTarget =
      Number(firstTarget);

    const numericSecondTarget =
      Number(secondTarget);

    if (
      !Number.isFinite(
        numericFirstTarget
      ) ||
      numericFirstTarget < 0
    ) {
      setError(
        "First target must be a valid number"
      );
      return;
    }

    if (
      !Number.isFinite(
        numericSecondTarget
      ) ||
      numericSecondTarget < 0
    ) {
      setError(
        "Second target must be a valid number"
      );
      return;
    }

    try {
      setSaving(true);

      const results = await Promise.all(
        selectedUsers.map(async (userId) => {
          const response = await fetch(
            "/api/survey/targets",
            {
              method: "POST",
              headers: {
                "Content-Type":
                  "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                userId,
                month,
                firstTarget:
                  numericFirstTarget,
                secondTarget:
                  numericSecondTarget,
              }),
            }
          );

          const data =
            await response.json();

          if (
            !response.ok ||
            !data.success
          ) {
            throw new Error(
              data.message ||
              "Failed to save target"
            );
          }

          return data;
        })
      );

      setMessage(
        `Targets assigned successfully to ${results.length} user${results.length === 1
          ? ""
          : "s"
        }.`
      );

      setSelectedUsers([]);
      await loadUsers();
    } catch (err: any) {
      setError(
        err?.message ||
        "Failed to assign targets"
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">

        {/* HEADER */}
        <div className="mb-6">
          <h4 className="text-2xl font-bold text-gray-900">
            Survey Target Management
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Manage teams, view current completed surveys,
            and assign first and second targets to users.
          </p>
        </div>

        {/* MESSAGE */}
        {message && (
          <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}



        {/* ====================================================
            TARGET FORM
        ==================================================== */}

        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                Assign Survey Target
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Targets will be saved for{" "}
                <span className="font-medium text-gray-700">
                  {formatMonth(month)}
                </span>
                .
              </p>
            </div>

            <div className="rounded-lg bg-blue-50 px-4 py-2 text-sm text-blue-700">
              {selectedUsers.length} user
              {selectedUsers.length === 1
                ? ""
                : "s"} selected
            </div>
          </div>

          <form
            onSubmit={handleAssignTarget}
            className="grid grid-cols-1 gap-5 md:grid-cols-3"
          >
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                First Target
              </label>

              <input
                type="number"
                min="0"
                value={firstTarget}
                placeholder="500"
                onChange={(e) =>
                  setFirstTarget(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Second Target
              </label>

              <input
                type="number"
                min="0"
                value={secondTarget}
                placeholder="500"
                onChange={(e) =>
                  setSecondTarget(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={
                  saving ||
                  selectedUsers.length === 0
                }
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Assigning..."
                  : "Assign Target"}
              </button>
            </div>
          </form>
        </div>

        {/* ====================================================
            USERS FOR TARGET ASSIGNMENT
        ==================================================== */}

        <div className="mt-6 rounded-xl border bg-white shadow-sm">
          <div className="border-b p-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  Users
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Search users and select multiple users
                  to assign the same targets.
                </p>
              </div>

              <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                <select
                  value={teamFilter}
                  onChange={(e) =>
                    setTeamFilter(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:w-52"
                >
                  <option value="">All Teams</option>
                  {teams.map((team) => (
                    <option key={team._id} value={team._id}>
                      {team.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={search}
                  onChange={(e) =>
                    setSearch(e.target.value)
                  }
                  placeholder="Search by name, email, role or team..."
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 md:w-80"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading users...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-6 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filteredUsers.length > 0 &&
                          filteredUsers.every(
                            (user) =>
                              selectedUsers.includes(
                                user._id
                              )
                          )
                        }
                        onChange={toggleSelectAll}
                        aria-label="Select all visible users"
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </th>

                    <th className="px-6 py-3 text-left">
                      Name
                    </th>

                    <th className="px-6 py-3 text-left">
                      Team Name
                    </th>

                    <th className="px-6 py-3 text-left">
                      Role
                    </th>

                    <th className="px-6 py-3 text-right">
                      Completed Survey
                    </th>

                    <th className="px-6 py-3 text-right">
                      First Target
                    </th>

                    <th className="px-6 py-3 text-right">
                      Second Target
                    </th>

                    <th className="px-6 py-3 text-right">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="p-8 text-center text-gray-500"
                      >
                        No users found.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const isSelected =
                        selectedUsers.includes(
                          user._id
                        );

                      return (
                        <tr
                          key={user._id}
                          className={
                            isSelected
                              ? "bg-blue-50"
                              : "hover:bg-gray-50"
                          }
                        >
                          <td className="px-6 py-4 text-center">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() =>
                                toggleUser(
                                  user._id
                                )
                              }
                              aria-label={`Select ${user.name ||
                                user.email
                                }`}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>

                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">
                              {user.name || "-"}
                            </div>
                          </td>

                          <td className="px-6 py-4 text-gray-600">
                            <div>
                              {getUserTeamName(user)}
                            </div>
                          </td>

                          <td className="px-6 py-4">
                            <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                              {user.role}
                            </span>
                          </td>

                          <td className="px-6 py-4 text-right font-semibold text-green-700">
                            {userCompletedMap[user._id] ?? 0}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold">
                            {user.firstTarget}
                          </td>

                          <td className="px-6 py-4 text-right font-semibold">
                            {user.secondTarget}
                          </td>

                          <td className="px-6 py-4 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                handleViewUser(
                                  user._id
                                )
                              }
                              className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700"
                            >
                              View Data
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ====================================================
            SELECTED USER DATA
        ==================================================== */}

        {selectedUserInfo && (
          <div className="mt-6 rounded-xl border bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b p-6 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold">
                  {selectedUserInfo.name ||
                    selectedUserInfo.email}
                </h2>

                <p className="text-sm text-gray-500">
                  {selectedUserInfo.email}
                  {" • "}
                  {selectedUserInfo.role}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 px-4 py-2">
                <span className="text-xs text-gray-500">
                  Total Surveys
                </span>

                <div className="text-xl font-bold text-blue-600">
                  {records.length}
                </div>
              </div>
            </div>

            {dataLoading ? (
              <div className="p-10 text-center text-gray-500">
                Loading survey data...
              </div>
            ) : records.length === 0 ? (
              <div className="p-10 text-center text-gray-500">
                No survey data found for this user.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        #
                      </th>

                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        Submitted At
                      </th>

                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        Survey ID
                      </th>

                      {Object.keys(records[0])
                        .filter(
                          (key) =>
                            ![
                              "_id",
                              "createdAt",
                              "updatedAt",
                              "createdBy",
                              "__v",
                            ].includes(key)
                        )
                        .slice(0, 10)
                        .map((key) => (
                          <th
                            key={key}
                            className="whitespace-nowrap px-5 py-3 text-left"
                          >
                            {key}
                          </th>
                        ))}

                      <th className="whitespace-nowrap px-5 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y">
                    {records.map(
                      (record, index) => {
                        const columns =
                          Object.keys(records[0])
                            .filter(
                              (key) =>
                                ![
                                  "_id",
                                  "createdAt",
                                  "updatedAt",
                                  "createdBy",
                                  "__v",
                                ].includes(key)
                            )
                            .slice(0, 10);

                        return (
                          <tr
                            key={record._id}
                            className="hover:bg-gray-50"
                          >
                            <td className="whitespace-nowrap px-5 py-4">
                              {index + 1}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4">
                              {record.createdAt
                                ? new Date(
                                  record.createdAt
                                ).toLocaleString(
                                  "en-IN"
                                )
                                : "-"}
                            </td>

                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs">
                              {record._id}
                            </td>

                            {columns.map(
                              (key) => (
                                <td
                                  key={key}
                                  className="max-w-xs px-5 py-4"
                                >
                                  <div className="max-w-xs truncate">
                                    {typeof record[
                                      key
                                    ] === "object"
                                      ? JSON.stringify(
                                        record[key]
                                      )
                                      : String(
                                        record[key] ??
                                        "-"
                                      )}
                                  </div>
                                </td>
                              )
                            )}

                            <td className="whitespace-nowrap px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => setViewRecord(record)}
                                className="rounded p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                                aria-label="View Full Data"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={1.5}
                                  stroke="currentColor"
                                  className="h-5 w-5"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        );
                      }
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ====================================================
          FULL DATA MODAL
      ==================================================== */}

      {viewRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Survey Data Details
              </h3>
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="h-6 w-6"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <pre className="rounded-lg bg-gray-50 p-4 text-sm text-gray-800 overflow-x-auto whitespace-pre-wrap break-words">
                {(() => {
                  const cleanedRecord = { ...viewRecord };
                  // Remove massive text block from the UI display
                  delete cleanedRecord.rawPaste;
                  return JSON.stringify(cleanedRecord, null, 2);
                })()}
              </pre>
            </div>

            <div className="border-t bg-gray-50 px-6 py-4 flex justify-end rounded-b-xl">
              <button
                type="button"
                onClick={() => setViewRecord(null)}
                className="rounded-lg bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
