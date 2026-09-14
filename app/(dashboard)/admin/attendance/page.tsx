"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

// ── Types ────────────────────────────────────────────────
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  workingShift?: "day" | "night";
}

interface AttendanceRecord {
  _id: string;
  userId: User;
  date: string;
  loggingTime?: string;
  logoutTime?: string;
  lunchStart?: string;
  lunchEnd?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  loginLocationAddress?: string;
  updatedBy?: { name: string; email: string };
}

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Selected employee
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  // ── Fetch data ─────────────────────────────────────────
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);
      setSelectedEmployee(null); // reset selection when filtering

      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/attendence?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch attendance");

      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // ── Unique employees (grouped) ─────────────────────────
  const employees = useMemo(() => {
    const map = new Map<string, { user: User; count: number; lastDate: string }>();

    records.forEach((r) => {
      if (!r.userId?._id) return;

      const existing = map.get(r.userId._id);
      if (existing) {
        existing.count += 1;
        if (new Date(r.date) > new Date(existing.lastDate)) {
          existing.lastDate = r.date;
        }
      } else {
        map.set(r.userId._id, {
          user: r.userId,
          count: 1,
          lastDate: r.date,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.user.name.localeCompare(b.user.name)
    );
  }, [records]);

  // ── Filter employees by role tab ───────────────────────
  const filteredEmployees = useMemo(() => {
    if (activeTab === "all") return employees;
    return employees.filter((e) => e.user.role === activeTab);
  }, [employees, activeTab]);

  // ── Roles for tabs ─────────────────────────────────────
  const roles = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => set.add(e.user.role));
    return Array.from(set).sort();
  }, [employees]);

  // ── Selected employee's attendance records ─────────────
  const employeeRecords = useMemo(() => {
    if (!selectedEmployee) return [];
    return records
      .filter((r) => r.userId?._id === selectedEmployee._id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedEmployee]);

  // ── Helpers ────────────────────────────────────────────
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return format(new Date(dateStr), "hh:mm a");
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "dd MMM yyyy");
  };

  // ── Excel Download (current view) ──────────────────────
  const downloadExcel = () => {
    const dataToExport = selectedEmployee ? employeeRecords : records;

    if (dataToExport.length === 0) {
      alert("No data to download");
      return;
    }

    const rows = dataToExport.map((r) => ({
      Date: formatDate(r.date),
      Name: r.userId?.name || "",
      Email: r.userId?.email || "",
      Role: r.userId?.role || "",
      Shift: r.userId?.workingShift || "",
      "Login Time": formatTime(r.loggingTime),
      "Logout Time": formatTime(r.logoutTime),
      Late: r.isLate ? "Yes" : "No",
      "Late By (mins)": r.lateByMinutes || 0,
      "Lunch Start": formatTime(r.lunchStart),
      "Lunch End": formatTime(r.lunchEnd),
      Location: r.loginLocationAddress || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const name = selectedEmployee
      ? `Attendance_${selectedEmployee.name.replace(/\s+/g, "_")}`
      : `Attendance_All`;

    saveAs(blob, `${name}.xlsx`);
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h4 className="text-2xl md:text-3xl font-bold text-gray-900">
              Attendance Management
            </h4>
            <p className="text-gray-500 mt-1">
              Click on an employee to view their attendance history
            </p>
          </div>

          <button
            onClick={downloadExcel}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Excel
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              onClick={fetchAttendance}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
            >
              Apply Filter
            </button>

            <button
              onClick={() => {
                setFromDate("");
                setToDate("");
                setTimeout(fetchAttendance, 0);
              }}
              className="px-4 py-2.5 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition"
            >
              Clear
            </button>
          </div>
        </div>

        {/* Role Tabs */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex overflow-x-auto">
              <button
                onClick={() => {
                  setActiveTab("all");
                  setSelectedEmployee(null);
                }}
                className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition ${
                  activeTab === "all"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                All ({employees.length})
              </button>

              {roles.map((role) => {
                const count = employees.filter((e) => e.user.role === role).length;
                return (
                  <button
                    key={role}
                    onClick={() => {
                      setActiveTab(role);
                      setSelectedEmployee(null);
                    }}
                    className={`px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition capitalize ${
                      activeTab === role
                        ? "border-blue-600 text-blue-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {role.replace("-", " ")} ({count})
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Employee List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-800">
                    Employees ({filteredEmployees.length})
                  </h2>
                </div>

                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No employees found
                    </div>
                  ) : (
                    filteredEmployees.map(({ user, count, lastDate }) => (
                      <button
                        key={user._id}
                        onClick={() => setSelectedEmployee(user)}
                        className={`w-full text-left px-5 py-4 hover:bg-blue-50 transition ${
                          selectedEmployee?._id === user._id
                            ? "bg-blue-50 border-l-4 border-blue-600"
                            : ""
                        }`}
                      >
                        <div className="font-medium text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                        <div className="flex items-center gap-3 mt-2 text-xs">
                          <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                            {user.role?.replace("-", " ")}
                          </span>
                          <span className="text-gray-400">
                            {count} record{count > 1 ? "s" : ""}
                          </span>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right: Selected Employee Attendance */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-lg font-medium">Select an employee</p>
                    <p className="text-sm mt-1">Click on any employee to view their attendance</p>
                  </div>
                ) : (
                  <>
                    {/* Employee Header */}
                    <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedEmployee.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {selectedEmployee.email} •{" "}
                          <span className="capitalize">
                            {selectedEmployee.role?.replace("-", " ")}
                          </span>
                          {selectedEmployee.workingShift && (
                            <span> • {selectedEmployee.workingShift} shift</span>
                          )}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedEmployee(null)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        ← Back to list
                      </button>
                    </div>

                    {/* Attendance Table */}
                    <div className="overflow-x-auto">
                      {employeeRecords.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                          No attendance records found for this employee
                        </div>
                      ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Date</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Login</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Logout</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Late</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Lunch</th>
                              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-100">
                            {employeeRecords.map((record) => (
                              <tr key={record._id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                  {formatDate(record.date)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {formatTime(record.loggingTime)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {formatTime(record.logoutTime)}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                  {record.isLate ? (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                      {record.lateByMinutes} min
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                      On time
                                    </span>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                                  {record.lunchStart || record.lunchEnd ? (
                                    <div>
                                      <div>{formatTime(record.lunchStart)}</div>
                                      <div className="text-xs text-gray-400">
                                        → {formatTime(record.lunchEnd)}
                                      </div>
                                    </div>
                                  ) : (
                                    "—"
                                  )}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-600 max-w-[180px] truncate">
                                  {record.loginLocationAddress || "—"}
                                </td>
                              </tr>
                            ))}
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
      </div>
    </div>
  );
}