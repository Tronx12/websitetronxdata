


"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { formatLateTime } from "@/lib/shiftValidation";
import {
  Download,
  Calendar,
  User,
  ChevronRight,
  Loader2,
  Users,
  X,
  Search,
  CheckSquare,
  Square,
  FileSpreadsheet,
} from "lucide-react";

interface UserData {
  _id: string;
  name: string;
  email: string;
  role: string;
  workingShift?: "day" | "night";
}

interface AttendanceRecord {
  _id: string;
  userId: UserData;
  date: string;
  loggingTime?: string;
  logoutTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
  status?: "present" | "absent" | "half-day" | "office-off";
  lunchDurationMinutes?: number;
  excessLunchMinutes?: number;
  remarks?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  loginLocationAddress?: string;
}

type ReportType =
  | "month-performance"
  | "late-in"
  | "absent"
  | "in-out"
  | "summary"
  | "half-day"
  | "office-off";

const REPORT_OPTIONS: {
  value: ReportType;
  label: string;
}[] = [
  {
    value: "month-performance",
    label: "Month Performance",
  },
  {
    value: "late-in",
    label: "Month Late In Report",
  },
  {
    value: "absent",
    label: "Month Absent Report",
  },
  {
    value: "in-out",
    label: "Month IN/OUT Report",
  },
  {
    value: "summary",
    label: "Month Summary",
  },
  {
    value: "half-day",
    label: "Month Half Day Report",
  },
  {
    value: "office-off",
    label: "Month Office Off Report",
  },
];

function getCurrentMonth() {
  return format(new Date(), "yyyy-MM");
}

function getMonthDateRange(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  const lastDay = new Date(
    year,
    monthNumber,
    0
  ).getDate();

  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, "0")}`,
  };
}

export default function AttendancePage() {
  const [records, setRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(
    null
  );

  const [month, setMonth] = useState(
    getCurrentMonth()
  );

  const [activeTab, setActiveTab] =
    useState("all");

  const [selectedEmployee, setSelectedEmployee] =
    useState<UserData | null>(null);

  // Download modal
  const [showDownloadPanel, setShowDownloadPanel] =
    useState(false);

  const [isDownloading, setIsDownloading] =
    useState(false);

  const [downloadSelection, setDownloadSelection] =
    useState<"all" | "selected">("all");

  const [selectedUserIds, setSelectedUserIds] =
    useState<string[]>([]);

  const [employeeSearch, setEmployeeSearch] =
    useState("");

  const [reportType, setReportType] =
    useState<ReportType>(
      "month-performance"
    );

  const [sortBy, setSortBy] = useState<
    "employee" | "role"
  >("employee");

  // ============================================================
  // FETCH ATTENDANCE
  // ============================================================

  const fetchAttendance = async (
    selectedMonth = month
  ) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedEmployee(null);

      const { from, to } =
        getMonthDateRange(selectedMonth);

      const params = new URLSearchParams({
        from,
        to,
      });

      const res = await fetch(
        `/api/attendence?${params.toString()}`
      );

      if (!res.ok) {
        throw new Error(
          "Failed to fetch attendance"
        );
      }

      const data = await res.json();

      setRecords(
        Array.isArray(data) ? data : []
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Something went wrong"
      );

      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance(getCurrentMonth());

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ============================================================
  // EMPLOYEES
  // ============================================================

  const employees = useMemo(() => {
    const map = new Map<
      string,
      {
        user: UserData;
        count: number;
      }
    >();

    records.forEach((record) => {
      if (!record.userId?._id) return;

      const existing = map.get(
        record.userId._id
      );

      if (existing) {
        existing.count += 1;
      } else {
        map.set(record.userId._id, {
          user: record.userId,
          count: 1,
        });
      }
    });

    return Array.from(
      map.values()
    ).sort((a, b) =>
      a.user.name.localeCompare(
        b.user.name
      )
    );
  }, [records]);

  // ============================================================
  // ROLE FILTER
  // ============================================================

  const filteredEmployees = useMemo(() => {
    let result =
      activeTab === "all"
        ? employees
        : employees.filter(
            (item) =>
              item.user.role ===
              activeTab
          );

    if (employeeSearch.trim()) {
      const search =
        employeeSearch.toLowerCase();

      result = result.filter(
        ({ user }) =>
          user.name
            .toLowerCase()
            .includes(search) ||
          user.email
            .toLowerCase()
            .includes(search)
      );
    }

    return result;
  }, [
    employees,
    activeTab,
    employeeSearch,
  ]);

  // ============================================================
  // ROLES
  // ============================================================

  const roles = useMemo(() => {
    return Array.from(
      new Set(
        employees
          .map(
            (item) => item.user.role
          )
          .filter(Boolean)
      )
    ).sort();
  }, [employees]);

  // ============================================================
  // SELECTED EMPLOYEE RECORDS
  // ============================================================

  const employeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];

    return records
      .filter(
        (record) =>
          record.userId?._id ===
          selectedEmployee._id
      )
      .sort(
        (a, b) =>
          new Date(
            b.date
          ).getTime() -
          new Date(
            a.date
          ).getTime()
      );
  }, [
    records,
    selectedEmployee,
  ]);

  // ============================================================
  // DOWNLOAD EMPLOYEE LIST
  // ============================================================

  const downloadEmployees = useMemo(() => {
    let result = [...employees];

    if (employeeSearch.trim()) {
      const search =
        employeeSearch.toLowerCase();

      result = result.filter(
        ({ user }) =>
          user.name
            .toLowerCase()
            .includes(search) ||
          user.email
            .toLowerCase()
            .includes(search)
      );
    }

    if (sortBy === "role") {
      result.sort(
        (a, b) =>
          a.user.role.localeCompare(
            b.user.role
          ) ||
          a.user.name.localeCompare(
            b.user.name
          )
      );
    } else {
      result.sort((a, b) =>
        a.user.name.localeCompare(
          b.user.name
        )
      );
    }

    return result;
  }, [
    employees,
    employeeSearch,
    sortBy,
  ]);

  // ============================================================
  // HELPERS
  // ============================================================

  const formatTime = (
    dateStr?: string
  ) => {
    if (!dateStr) return "—";

    try {
      return format(
        new Date(dateStr),
        "hh:mm a"
      );
    } catch {
      return "—";
    }
  };

  const formatDate = (
    dateStr: string
  ) => {
    try {
      return format(
        new Date(dateStr),
        "dd MMM yyyy"
      );
    } catch {
      return "—";
    }
  };

  // ============================================================
  // EMPLOYEE SELECTION
  // ============================================================

  const toggleUser = (
    id: string
  ) => {
    setSelectedUserIds(
      (current) =>
        current.includes(id)
          ? current.filter(
              (item) => item !== id
            )
          : [...current, id]
    );
  };

  const selectAllUsers = () => {
    setSelectedUserIds(
      downloadEmployees.map(
        ({ user }) => user._id
      )
    );
  };

  const clearSelectedUsers = () => {
    setSelectedUserIds([]);
  };

  // ============================================================
  // DOWNLOAD EXCEL
  // ============================================================

  const downloadExcel = async () => {
    if (
      downloadSelection ===
        "selected" &&
      selectedUserIds.length === 0
    ) {
      alert(
        "Please select at least one employee."
      );
      return;
    }

    setIsDownloading(true);

    try {
      const {
        from,
        to,
      } = getMonthDateRange(month);

      const params =
        new URLSearchParams({
          from,
          to,
          reportType,
          sortBy,
        });

      if (
        downloadSelection ===
        "selected"
      ) {
        params.set(
          "userIds",
          selectedUserIds.join(",")
        );
      }

      const res = await fetch(
        `/api/attendence/export?${params.toString()}`
      );

      if (!res.ok) {
        let message =
          "Failed to export attendance";

        try {
          const data =
            await res.json();

          message =
            data?.error ||
            data?.message ||
            message;
        } catch {
          // Ignore JSON parsing errors.
        }

        throw new Error(message);
      }

      const disposition =
        res.headers.get(
          "Content-Disposition"
        ) || "";

      const filenameMatch =
        disposition.match(
          /filename="?([^"]+)"?/
        );

      const filename =
        filenameMatch?.[1] ||
        `attendance-${month}-${Date.now()}.xlsx`;

      const blob =
        await res.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const anchor =
        document.createElement("a");

      anchor.href = url;
      anchor.download =
        filename;

      document.body.appendChild(
        anchor
      );

      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(
        url
      );

      setShowDownloadPanel(false);
    } catch (err: any) {
      console.error(
        "Download failed:",
        err
      );

      alert(
        `Download failed: ${
          err?.message ||
          "Unknown error"
        }`
      );
    } finally {
      setIsDownloading(false);
    }
  };

  // ============================================================
  // OPEN DOWNLOAD PANEL
  // ============================================================

  const openDownloadPanel =
    () => {
      setDownloadSelection(
        "all"
      );

      setSelectedUserIds([]);

      setEmployeeSearch("");

      setReportType(
        "month-performance"
      );

      setSortBy("employee");

      setShowDownloadPanel(true);
    };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">

          <div>
            <h4 className="text-3xl font-bold text-slate-900 tracking-tight">
              Attendance Management
            </h4>

            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Users className="w-4 h-4" />

              View and manage employee
              attendance records
            </p>
          </div>

          <button
            onClick={
              openDownloadPanel
            }
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow-sm transition-all"
          >
            <Download className="w-5 h-5" />

            Download Report
          </button>
        </div>

        {/* MONTH FILTER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-6">

          <div className="flex flex-col sm:flex-row gap-4 items-end">

            <div className="flex-1 w-full">

              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Attendance Month
              </label>

              <div className="relative">

                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                <input
                  type="month"
                  value={month}
                  onChange={(event) =>
                    setMonth(
                      event.target.value
                    )
                  }
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm"
                />

              </div>
            </div>

            <button
              onClick={() =>
                fetchAttendance(month)
              }
              className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors shadow-sm text-sm"
            >
              Load Month
            </button>

            <button
              onClick={
                openDownloadPanel
              }
              className="w-full sm:w-auto px-6 py-2.5 border border-emerald-300 text-emerald-700 hover:bg-emerald-50 font-medium rounded-lg transition-colors text-sm"
            >
              Download This Month
            </button>

          </div>
        </div>

        {/* ROLE TABS */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">

          <div className="border-b border-slate-200">

            <nav className="flex overflow-x-auto">

              <button
                onClick={() => {
                  setActiveTab("all");
                  setSelectedEmployee(
                    null
                  );
                }}
                className={`px-6 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 ${
                  activeTab === "all"
                    ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                    : "border-transparent text-slate-500 hover:bg-slate-50"
                }`}
              >
                All Employees (
                {employees.length})
              </button>

              {roles.map(
                (role) => {
                  const count =
                    employees.filter(
                      (item) =>
                        item.user
                          .role ===
                        role
                    ).length;

                  return (
                    <button
                      key={role}
                      onClick={() => {
                        setActiveTab(
                          role
                        );
                        setSelectedEmployee(
                          null
                        );
                      }}
                      className={`px-6 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 capitalize ${
                        activeTab === role
                          ? "border-indigo-600 text-indigo-600 bg-indigo-50/50"
                          : "border-transparent text-slate-500 hover:bg-slate-50"
                      }`}
                    >
                      {role.replace(
                        "-",
                        " "
                      )}{" "}
                      ({count})
                    </button>
                  );
                }
              )}

            </nav>
          </div>
        </div>

        {/* MAIN DATA */}
        {loading ? (

          <div className="flex flex-col items-center justify-center py-24 text-slate-400">

            <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />

            <p>
              Loading attendance
              data...
            </p>

          </div>

        ) : error ? (

          <div className="text-center py-16 bg-red-50 rounded-xl border border-red-100 text-red-600">

            <p className="font-medium">
              Error loading data
            </p>

            <p className="text-sm mt-1">
              {error}
            </p>

          </div>

        ) : (

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* EMPLOYEE LIST */}
            <div className="lg:col-span-1">

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">

                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">

                  <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">
                    Select Employee
                  </h2>

                  <span className="bg-slate-200 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                    {
                      filteredEmployees.length
                    }
                  </span>

                </div>

                <div className="p-3 border-b border-slate-100">

                  <div className="relative">

                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                    <input
                      value={
                        employeeSearch
                      }
                      onChange={(
                        event
                      ) =>
                        setEmployeeSearch(
                          event.target
                            .value
                        )
                      }
                      placeholder="Search employee..."
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    />

                  </div>

                </div>

                <div className="divide-y divide-slate-100 overflow-y-auto flex-1">

                  {filteredEmployees.length ===
                  0 ? (

                    <div className="p-8 text-center text-slate-400 text-sm">
                      No employees
                      found.
                    </div>

                  ) : (

                    filteredEmployees.map(
                      ({
                        user,
                        count,
                      }) => (

                        <button
                          key={
                            user._id
                          }
                          onClick={() =>
                            setSelectedEmployee(
                              user
                            )
                          }
                          className={`w-full text-left px-5 py-4 hover:bg-slate-50 transition-all group relative ${
                            selectedEmployee?._id ===
                            user._id
                              ? "bg-indigo-50/60"
                              : ""
                          }`}
                        >

                          {selectedEmployee?._id ===
                            user._id && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600 rounded-r" />
                          )}

                          <div className="flex justify-between items-start">

                            <div>

                              <div
                                className={`font-medium ${
                                  selectedEmployee?._id ===
                                  user._id
                                    ? "text-indigo-700"
                                    : "text-slate-900"
                                }`}
                              >
                                {
                                  user.name
                                }
                              </div>

                              <div className="text-xs text-slate-500 mt-0.5">
                                {
                                  user.email
                                }
                              </div>

                            </div>

                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-400" />

                          </div>

                          <div className="flex items-center gap-2 mt-2">

                            <span className="capitalize text-[10px] font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200">
                              {user.role?.replace(
                                "-",
                                " "
                              )}
                            </span>

                            <span className="text-[10px] text-slate-400 font-medium">
                              {count}{" "}
                              record
                              {count >
                              1
                                ? "s"
                                : ""}
                            </span>

                          </div>

                        </button>

                      )
                    )

                  )}

                </div>

              </div>

            </div>

            {/* ATTENDANCE DETAILS */}
            <div className="lg:col-span-2">

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden h-[calc(100vh-280px)] min-h-[500px] flex flex-col">

                {!selectedEmployee ? (

                  <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8 text-center">

                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">

                      <User className="w-8 h-8 text-slate-300" />

                    </div>

                    <p className="text-lg font-medium text-slate-600">
                      No Employee
                      Selected
                    </p>

                    <p className="text-sm mt-1 max-w-xs">
                      Select an employee
                      from the list to
                      view attendance
                      history.
                    </p>

                  </div>

                ) : (

                  <>

                    <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between gap-4">

                      <div className="flex items-center gap-4">

                        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg">
                          {selectedEmployee.name.charAt(
                            0
                          )}
                        </div>

                        <div>

                          <h2 className="text-lg font-bold text-slate-900">
                            {
                              selectedEmployee.name
                            }
                          </h2>

                          <div className="text-xs text-slate-500 mt-0.5">
                            {
                              selectedEmployee.email
                            }{" "}
                            ·{" "}
                            {selectedEmployee.role?.replace(
                              "-",
                              " "
                            )}
                          </div>

                        </div>

                      </div>

                      <button
                        onClick={() =>
                          setSelectedEmployee(
                            null
                          )
                        }
                        className="text-xs font-medium text-slate-500 hover:text-slate-800 bg-white border border-slate-200 px-3 py-1.5 rounded-md"
                      >
                        Close View
                      </button>

                    </div>

                    <div className="overflow-auto flex-1">

                      {employeeRecords.length ===
                      0 ? (

                        <div className="text-center py-20 text-slate-400">
                          No attendance
                          records found
                          for this period.
                        </div>

                      ) : (

                        <table className="min-w-full divide-y divide-slate-200">

                          <thead className="bg-slate-50 sticky top-0 z-10">

                            <tr>

                              {[
                                "Date",
                                "Status",
                                "Login",
                                "Logout",
                                "Late",
                                "Lunch",
                                "Remarks",
                              ].map(
                                (
                                  heading
                                ) => (

                                  <th
                                    key={
                                      heading
                                    }
                                    className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-50"
                                  >
                                    {
                                      heading
                                    }
                                  </th>

                                )
                              )}

                            </tr>

                          </thead>

                          <tbody className="bg-white divide-y divide-slate-100">

                            {employeeRecords.map(
                              (
                                record
                              ) => (

                                <tr
                                  key={
                                    record._id
                                  }
                                  className="hover:bg-slate-50"
                                >

                                  <td className="px-4 py-3 text-sm font-medium whitespace-nowrap">
                                    {formatDate(
                                      record.date
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                                    <span className="capitalize text-xs font-bold">
                                      {record.status ||
                                        "present"}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                                    {formatTime(
                                      record.loggingTime
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-xs font-mono whitespace-nowrap">
                                    {formatTime(
                                      record.logoutTime
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-sm">
                                    {record.isLate ? (
                                      <span className="text-xs font-bold text-red-700">
                                        +
                                        {formatLateTime(
                                          record.lateByMinutes
                                        )}
                                      </span>
                                    ) : (
                                      "—"
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-xs whitespace-nowrap">
                                    {record.lunchStart ||
                                    record.lunchEnd
                                      ? `${formatTime(
                                          record.lunchStart
                                        )} - ${formatTime(
                                          record.lunchEnd
                                        )}`
                                      : "—"}
                                  </td>

                                  <td className="px-4 py-3 text-xs text-slate-500 max-w-[180px] truncate">
                                    {record.remarks ||
                                      "—"}
                                  </td>

                                </tr>

                              )
                            )}

                          </tbody>

                        </table>

                      )}

                    </div>

                  </>

                )}

              </div>

            </div>

          </div>

        )}

        {/* ======================================================
            DOWNLOAD MODAL
        ====================================================== */}

        {showDownloadPanel && (

          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

            <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl overflow-hidden">

              {/* MODAL HEADER */}
              <div className="px-6 py-4 border-b flex items-center justify-between">

                <div>

                  <h2 className="text-xl font-bold text-slate-900">
                    Monthly Attendance
                    Report
                  </h2>

                  <p className="text-sm text-slate-500 mt-1">
                    Select month, employees
                    and report type.
                  </p>

                </div>

                <button
                  onClick={() =>
                    setShowDownloadPanel(
                      false
                    )
                  }
                  className="p-2 rounded-lg hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>

              </div>

              {/* MODAL BODY */}
              <div className="p-6 overflow-y-auto max-h-[calc(92vh-145px)]">

                {/* MONTH + SORTING */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                  <div>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Select Punch Month
                    </label>

                    <div className="relative">

                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                      <input
                        type="month"
                        value={
                          month
                        }
                        onChange={(
                          event
                        ) =>
                          setMonth(
                            event.target
                              .value
                          )
                        }
                        className="w-full pl-10 pr-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                    </div>

                  </div>

                  <div>

                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Sorting
                    </label>

                    <select
                      value={
                        sortBy
                      }
                      onChange={(
                        event
                      ) =>
                        setSortBy(
                          event.target
                            .value as
                            | "employee"
                            | "role"
                        )
                      }
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                    >

                      <option value="employee">
                        By Employee
                        Wise
                      </option>

                      <option value="role">
                        By Role Wise
                      </option>

                    </select>

                  </div>

                </div>

                {/* EMPLOYEE SELECTION */}
                <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">

                  <div className="px-4 py-3 bg-slate-50 border-b">

                    <h3 className="font-semibold text-slate-800">
                      Employee Selection
                    </h3>

                  </div>

                  <div className="p-4 flex flex-col md:flex-row gap-3">

                    <button
                      onClick={() =>
                        setDownloadSelection(
                          "all"
                        )
                      }
                      className={`flex-1 rounded-lg border p-3 text-left ${
                        downloadSelection ===
                        "all"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >

                      <div className="font-semibold">
                        All Employees
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Export all employees
                        visible to your
                        account.
                      </div>

                    </button>

                    <button
                      onClick={() =>
                        setDownloadSelection(
                          "selected"
                        )
                      }
                      className={`flex-1 rounded-lg border p-3 text-left ${
                        downloadSelection ===
                        "selected"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-slate-200"
                      }`}
                    >

                      <div className="font-semibold">
                        Selected Employees
                      </div>

                      <div className="text-xs text-slate-500 mt-1">
                        Export only selected
                        employees.
                      </div>

                    </button>

                  </div>

                  <div className="px-4 pb-4">

                    <div className="flex flex-col sm:flex-row gap-2 mb-3">

                      <div className="relative flex-1">

                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />

                        <input
                          value={
                            employeeSearch
                          }
                          onChange={(
                            event
                          ) =>
                            setEmployeeSearch(
                              event.target
                                .value
                            )
                          }
                          placeholder="Search employee..."
                          className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                        />

                      </div>

                      <button
                        onClick={
                          selectAllUsers
                        }
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Select All
                      </button>

                      <button
                        onClick={
                          clearSelectedUsers
                        }
                        className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50"
                      >
                        Clear
                      </button>

                    </div>

                    <div className="border rounded-lg max-h-64 overflow-y-auto">

                      {downloadEmployees.length ===
                      0 ? (

                        <div className="p-8 text-center text-sm text-slate-400">
                          No employees found
                          in this month.
                        </div>

                      ) : (

                        downloadEmployees.map(
                          ({
                            user,
                            count,
                          }) => {

                            const checked =
                              selectedUserIds.includes(
                                user._id
                              );

                            return (

                              <button
                                key={
                                  user._id
                                }
                                type="button"
                                onClick={() =>
                                  toggleUser(
                                    user._id
                                  )
                                }
                                className="w-full flex items-center gap-3 px-4 py-3 border-b last:border-b-0 hover:bg-slate-50 text-left"
                              >

                                {checked ? (
                                  <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
                                ) : (
                                  <Square className="w-5 h-5 text-slate-300 shrink-0" />
                                )}

                                <div className="min-w-0 flex-1">

                                  <div className="font-medium text-sm text-slate-900">
                                    {
                                      user.name
                                    }
                                  </div>

                                  <div className="text-xs text-slate-500">
                                    {
                                      user.email
                                    }{" "}
                                    ·{" "}
                                    {user.role?.replace(
                                      "-",
                                      " "
                                    )}
                                  </div>

                                </div>

                                <span className="text-xs text-slate-400">
                                  {
                                    count
                                  }{" "}
                                  records
                                </span>

                              </button>

                            );
                          }
                        )

                      )}

                    </div>

                    <div className="text-xs text-slate-500 mt-2">

                      Selected:{" "}

                      <span className="font-semibold text-slate-800">
                        {
                          selectedUserIds.length
                        }
                      </span>

                    </div>

                  </div>

                </div>

                {/* REPORT TYPES */}
                <div className="mt-6">

                  <h3 className="text-sm font-semibold text-slate-700 mb-3">
                    Monthly Report
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">

                    {REPORT_OPTIONS.map(
                      (option) => (

                        <button
                          key={
                            option.value
                          }
                          onClick={() =>
                            setReportType(
                              option.value
                            )
                          }
                          className={`text-left p-3 rounded-lg border text-sm ${
                            reportType ===
                            option.value
                              ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 hover:bg-slate-50"
                          }`}
                        >

                          <span className="inline-flex items-center gap-2">

                            <span
                              className={`w-4 h-4 rounded-full border-2 ${
                                reportType ===
                                option.value
                                  ? "border-indigo-600"
                                  : "border-slate-300"
                              }`}
                            />

                            {
                              option.label
                            }

                          </span>

                        </button>

                      )
                    )}

                  </div>

                </div>

              </div>

              {/* MODAL FOOTER */}
              <div className="px-6 py-4 border-t bg-slate-50 flex flex-col sm:flex-row justify-end gap-3">

                <button
                  onClick={() =>
                    setShowDownloadPanel(
                      false
                    )
                  }
                  disabled={
                    isDownloading
                  }
                  className="px-5 py-2.5 border border-slate-300 rounded-lg font-medium text-slate-700 hover:bg-white disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  onClick={
                    downloadExcel
                  }
                  disabled={
                    isDownloading
                  }
                  className="inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-60"
                >

                  {isDownloading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="w-5 h-5" />
                  )}

                  {isDownloading
                    ? "Generating..."
                    : "Download Report"}

                </button>

              </div>

            </div>

          </div>

        )}

      </div>
    </div>
  );
}