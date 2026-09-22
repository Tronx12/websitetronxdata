"use client";

import { useEffect, useState } from "react";

type Summary = {
  target: number;
  completed: number;
  remaining: number;
  achievement: number;
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
  target: number;
  completed: number;
  remaining: number;
  achievement: number;
};

type SurveyRecord = {
  _id: string;
  createdAt: string;
  createdBy?: string;

  [key: string]: any;
};

export default function SurveyPerformancePage() {

  const [month, setMonth] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  const [summary, setSummary] =
    useState<Summary>({
      target: 0,
      completed: 0,
      remaining: 0,
      achievement: 0,
    });

  const [
    dailyPerformance,
    setDailyPerformance,
  ] = useState<
    DailyPerformance[]
  >([]);

  const [users, setUsers] =
    useState<UserPerformance[]>(
      []
    );

  const [dateRecords, setDateRecords] =
    useState<SurveyRecord[]>([]);

  const [selectedDate, setSelectedDate] =
    useState<string | null>(null);

  const [role, setRole] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD PERFORMANCE
  // ==========================================================

  const loadPerformance = async (
    date?: string
  ) => {
    try {
      setLoading(true);
      setError("");

      let url =
        `/api/survey/performance?month=${month}`;

      if (date) {
        url += `&date=${date}`;
      }

      const response =
        await fetch(url, {
          method: "GET",
          credentials: "include",
        });

      const data =
        await response.json();

      if (
        !response.ok ||
        !data.success
      ) {
        throw new Error(
          data.message ||
            "Failed to load performance"
        );
      }

      setSummary(
        data.summary || {
          target: 0,
          completed: 0,
          remaining: 0,
          achievement: 0,
        }
      );

      setDailyPerformance(
        data.dailyPerformance ||
          []
      );

      setUsers(
        data.users || []
      );

      setRole(
        data.role || ""
      );

      setDateRecords(
        data.dateRecords || []
      );

    } catch (err: any) {
      setError(
        err?.message ||
          "Failed to load performance"
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // INITIAL LOAD
  // ==========================================================

  useEffect(() => {
    setSelectedDate(null);
    setDateRecords([]);

    loadPerformance();
  }, [month]);

  // ==========================================================
  // CLICK DATE
  // ==========================================================

  const handleDateClick = (
    date: string
  ) => {
    setSelectedDate(date);

    loadPerformance(date);
  };

  // ==========================================================
  // FORMAT DATE
  // ==========================================================

  const formatDate = (
    date: string
  ) => {
    const [year, month, day] =
      date.split("-");

    return `${day}/${month}`;
  };

  // ==========================================================
  // FORMAT ROLE
  // ==========================================================

  const formatRole = (
    value: string
  ) => {
    if (!value) return "";

    if (
      value
        .toLowerCase()
        .includes("survey")
    ) {
      return "Survey Tester";
    }

    if (
      value
        .toLowerCase()
        .includes("team")
    ) {
      return "Team Lead";
    }

    return value.toUpperCase();
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading && !summary) {
    return (
      <div className="p-10 text-center">
        Loading...
      </div>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-7xl">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

          <div>

            <h1 className="text-2xl font-bold text-gray-900">
              Survey Performance
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              {formatRole(role)}
            </p>

          </div>

          <div>

            <label className="mr-2 text-sm font-medium">
              Month
            </label>

            <input
              type="month"
              value={month}
              onChange={(e) =>
                setMonth(
                  e.target.value
                )
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2"
            />

          </div>

        </div>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* ==================================================
            SUMMARY CARDS
        ================================================== */}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">

          {/* TARGET */}

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Monthly Target
            </p>

            <p className="mt-2 text-3xl font-bold text-gray-900">
              {summary.target}
            </p>

          </div>

          {/* COMPLETED */}

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Completed Survey
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {summary.completed}
            </p>

          </div>

          {/* REMAINING */}

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Remaining Survey
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-500">
              {summary.remaining}
            </p>

          </div>

          {/* ACHIEVEMENT */}

          <div className="rounded-xl border bg-white p-5 shadow-sm">

            <p className="text-sm text-gray-500">
              Achievement
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {summary.achievement}%
            </p>

          </div>

        </div>

        {/* ==================================================
            DAILY PERFORMANCE
        ================================================== */}

        <div className="mt-6 rounded-xl border bg-white p-6 shadow-sm">

          <div className="mb-5">

            <h2 className="text-lg font-semibold">
              Daily Survey Performance
            </h2>

            <p className="text-sm text-gray-500">
              Click a date to view submitted survey data.
            </p>

          </div>

          {dailyPerformance.length === 0 ? (

            <div className="py-10 text-center text-gray-500">
              No survey data found for this month.
            </div>

          ) : (

            <div className="space-y-3">

              {dailyPerformance.map(
                (item) => {

                  const max =
                    Math.max(
                      ...dailyPerformance.map(
                        (x) =>
                          x.completed
                      ),
                      1
                    );

                  const width =
                    Math.max(
                      (item.completed /
                        max) *
                        100,
                      5
                    );

                  const active =
                    selectedDate ===
                    item.date;

                  return (

                    <button
                      key={item.date}
                      onClick={() =>
                        handleDateClick(
                          item.date
                        )
                      }
                      className={`w-full rounded-lg p-2 text-left transition ${
                        active
                          ? "bg-blue-50"
                          : "hover:bg-gray-50"
                      }`}
                    >

                      <div className="mb-1 flex justify-between text-sm">

                        <span className="font-medium text-gray-700">
                          {formatDate(
                            item.date
                          )}
                        </span>

                        <span className="font-semibold text-gray-900">
                          {item.completed}
                        </span>

                      </div>

                      <div className="h-5 w-full overflow-hidden rounded-full bg-gray-100">

                        <div
                          className="h-full rounded-full bg-blue-500 transition-all"
                          style={{
                            width: `${width}%`,
                          }}
                        />

                      </div>

                    </button>

                  );
                }
              )}

            </div>

          )}

        </div>

        {/* ==================================================
            USER PERFORMANCE
        ================================================== */}

        {(role === "teamlead" ||
          role === "team_lead" ||
          role === "hr" ||
          role === "admin") && (

          <div className="mt-6 rounded-xl border bg-white shadow-sm">

            <div className="border-b p-6">

              <h2 className="text-lg font-semibold">
                User Performance
              </h2>

              <p className="text-sm text-gray-500">
                Performance of users available to your role.
              </p>

            </div>

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-6 py-3 text-left">
                      User
                    </th>

                    <th className="px-6 py-3 text-left">
                      Role
                    </th>

                    <th className="px-6 py-3 text-right">
                      Target
                    </th>

                    <th className="px-6 py-3 text-right">
                      Completed
                    </th>

                    <th className="px-6 py-3 text-right">
                      Remaining
                    </th>

                    <th className="px-6 py-3 text-right">
                      Achievement
                    </th>

                  </tr>

                </thead>

                <tbody className="divide-y">

                  {users.map(
                    (user) => (

                      <tr
                        key={
                          user.userId
                        }
                        className="hover:bg-gray-50"
                      >

                        <td className="px-6 py-4">

                          <div className="font-medium">
                            {user.name}
                          </div>

                          <div className="text-xs text-gray-500">
                            {user.email}
                          </div>

                        </td>

                        <td className="px-6 py-4">
                          {user.role}
                        </td>

                        <td className="px-6 py-4 text-right font-medium">
                          {user.target}
                        </td>

                        <td className="px-6 py-4 text-right text-green-600 font-semibold">
                          {user.completed}
                        </td>

                        <td className="px-6 py-4 text-right text-orange-600">
                          {user.remaining}
                        </td>

                        <td className="px-6 py-4 text-right font-semibold">
                          {user.achievement}%
                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          </div>

        )}

        {/* ==================================================
            DATE DATA
        ================================================== */}

        {selectedDate && (

          <div className="mt-6 rounded-xl border bg-white shadow-sm">

            <div className="border-b p-6">

              <div className="flex items-center justify-between">

                <div>

                  <h2 className="text-lg font-semibold">
                    Survey Data
                  </h2>

                  <p className="text-sm text-gray-500">
                    Submitted on{" "}
                    {formatDate(
                      selectedDate
                    )}
                  </p>

                </div>

                <button
                  onClick={() => {
                    setSelectedDate(
                      null
                    );

                    setDateRecords(
                      []
                    );

                    loadPerformance();
                  }}
                  className="rounded-lg border px-3 py-2 text-sm hover:bg-gray-50"
                >
                  Clear
                </button>

              </div>

            </div>

            {dateRecords.length ===
            0 ? (

              <div className="p-8 text-center text-gray-500">
                No survey submitted on this date.
              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-6 py-3 text-left">
                        #
                      </th>

                      <th className="px-6 py-3 text-left">
                        Submitted At
                      </th>

                      <th className="px-6 py-3 text-left">
                        Survey ID
                      </th>

                      <th className="px-6 py-3 text-left">
                        Created By
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y">

                    {dateRecords.map(
                      (
                        record,
                        index
                      ) => (

                        <tr
                          key={
                            record._id
                          }
                          className="hover:bg-gray-50"
                        >

                          <td className="px-6 py-4">
                            {index + 1}
                          </td>

                          <td className="px-6 py-4">

                            {record.createdAt
                              ? new Date(
                                  record.createdAt
                                ).toLocaleString(
                                  "en-IN"
                                )
                              : "-"}

                          </td>

                          <td className="px-6 py-4 font-mono text-xs">
                            {record._id}
                          </td>

                          <td className="px-6 py-4 font-mono text-xs">
                            {record.createdBy ||
                              "-"}
                          </td>

                        </tr>

                      )
                    )}

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