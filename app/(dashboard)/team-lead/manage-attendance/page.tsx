"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface AttendanceRecord {
  _id: string;
  userId?: { _id: string; name: string; email: string; workingShift?: string };
  date: string;
  loggingTime?: string;
  logoutTime?: string;
  isLate?: boolean;
  lateByMinutes?: number;
  lunchStart?: string;
  lunchEnd?: string;
  loginLocationAddress?: string;
}

interface ModalRecord {
  _id?: string;
  userId: string;
  userName?: string;
  date: string;
  loggingTime: string;
  logoutTime: string;
  lunchStart: string;
  lunchEnd: string;
  isLate: boolean;
  lateByMinutes: number | string;
  loginLocationAddress: string;
}

interface UserInfo {
  _id: string;
  name: string;
  email: string;
  workingShift?: string;
}

interface EmployeeItem {
  user: UserInfo;
  count: number;
  lastDate: string;
}

export default function TeamLeadAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Selected employee
  const [selectedEmployee, setSelectedEmployee] = useState<UserInfo | null>(null);

  // Modal state (used for both "add" and "edit")
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"edit" | "add">("edit");
  const [modalRecord, setModalRecord] = useState<ModalRecord | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // ── Fetch data ─────────────────────────────────────────
  const fetchAttendance = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      const res = await fetch(`/api/teamlead/attendance?${params.toString()}`);
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to fetch attendance");
      }

      setRecords(Array.isArray(payload.data) ? payload.data : []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  // ── Unique team members (grouped from records) ─────────
  const employees = useMemo<EmployeeItem[]>(() => {
    const map = new Map<string, EmployeeItem>();

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

  const filteredEmployees = useMemo<EmployeeItem[]>(() => {
    if (!search.trim()) return employees;
    const q = search.trim().toLowerCase();
    return employees.filter(
      (e) =>
        e.user.name?.toLowerCase().includes(q) ||
        e.user.email?.toLowerCase().includes(q)
    );
  }, [employees, search]);

  // Keep selectedEmployee in sync if the list changes underneath it
  useEffect(() => {
    if (selectedEmployee && !employees.find((e) => e.user._id === selectedEmployee._id)) {
      setSelectedEmployee(null);
    }
  }, [employees, selectedEmployee]);

  const employeeRecords = useMemo<AttendanceRecord[]>(() => {
    if (!selectedEmployee) return [];
    return records
      .filter((r) => r.userId?._id === selectedEmployee._id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records, selectedEmployee]);

  // ── Helpers ────────────────────────────────────────────
  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "hh:mm a");
    } catch {
      return "—";
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return dateStr;
    }
  };

  const toTimeInputValue = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      return format(new Date(dateStr), "HH:mm");
    } catch {
      return "";
    }
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
      : `Attendance_MyTeam`;

    saveAs(blob, `${name}.xlsx`);
  };

  // ── Modal helpers ───────────────────────────────────────
  const openEditModal = (record: AttendanceRecord) => {
    setModalMode("edit");
    setModalError(null);
    setModalRecord({
      _id: record._id,
      userId: record.userId?._id || "",
      userName: record.userId?.name,
      date: record.date,
      loggingTime: toTimeInputValue(record.loggingTime),
      logoutTime: toTimeInputValue(record.logoutTime),
      lunchStart: toTimeInputValue(record.lunchStart),
      lunchEnd: toTimeInputValue(record.lunchEnd),
      isLate: !!record.isLate,
      lateByMinutes: record.lateByMinutes || 0,
      loginLocationAddress: record.loginLocationAddress || "",
    });
    setModalOpen(true);
  };

  const openAddModal = () => {
    if (!selectedEmployee) return;
    setModalMode("add");
    setModalError(null);
    setModalRecord({
      userId: selectedEmployee._id,
      userName: selectedEmployee.name,
      date: format(new Date(), "yyyy-MM-dd"),
      loggingTime: "",
      logoutTime: "",
      lunchStart: "",
      lunchEnd: "",
      isLate: false,
      lateByMinutes: 0,
      loginLocationAddress: "",
    });
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setModalRecord(null);
    setModalError(null);
  };

  // Combine a yyyy-MM-dd date with an HH:mm time into an ISO string.
  // Returns undefined if the time field is empty (so the field is left untouched on edit).
  const combineDateAndTime = (dateStr: string, timeStr: string) => {
    if (!timeStr) return undefined;
    const base = modalMode === "add" ? dateStr : format(new Date(modalRecord?.date || Date.now()), "yyyy-MM-dd");
    return new Date(`${base}T${timeStr}:00`).toISOString();
  };

  const saveModal = async () => {
    if (!modalRecord) return;

    setSaving(true);
    setModalError(null);

    try {
      const commonPayload = {
        loggingTime: combineDateAndTime(modalRecord.date, modalRecord.loggingTime),
        logoutTime: combineDateAndTime(modalRecord.date, modalRecord.logoutTime),
        lunchStart: combineDateAndTime(modalRecord.date, modalRecord.lunchStart),
        lunchEnd: combineDateAndTime(modalRecord.date, modalRecord.lunchEnd),
        isLate: modalRecord.isLate,
        lateByMinutes: Number(modalRecord.lateByMinutes) || 0,
        loginLocationAddress: modalRecord.loginLocationAddress,
      };

      let res: Response;
      if (modalMode === "add") {
        res = await fetch(`/api/teamlead/attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: modalRecord.userId,
            date: modalRecord.date,
            ...commonPayload,
          }),
        });
      } else {
        res = await fetch(`/api/teamlead/attendance/${modalRecord._id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(commonPayload),
        });
      }

      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to save attendance");
      }

      await fetchAttendance();
      setModalOpen(false);
      setModalRecord(null);
    } catch (err: any) {
      setModalError(err.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const deleteRecord = async (record: AttendanceRecord) => {
    if (!confirm(`Delete the attendance entry for ${record.userId?.name} on ${formatDate(record.date)}?`)) {
      return;
    }

    try {
      const res = await fetch(`/api/teamlead/attendance/${record._id}`, { method: "DELETE" });
      const payload = await res.json();

      if (!res.ok || !payload.success) {
        throw new Error(payload.message || "Failed to delete attendance");
      }

      await fetchAttendance();
    } catch (err: any) {
      alert(err.message || "Something went wrong");
    }
  };

  // ── Render ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h4 className="text-2xl md:text-3xl font-bold text-gray-900">
              My Team's Attendance
            </h4>
            <p className="text-gray-500 mt-1">
              Manage attendance for members of your own team
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

        {/* Content Area */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-600">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Team Member List */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="px-5 py-4 border-b bg-gray-50">
                  <h2 className="font-semibold text-gray-800 mb-2">
                    Team Members ({filteredEmployees.length})
                  </h2>
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-6 text-center text-gray-500 text-sm">
                      No team members found for the selected date range
                    </div>
                  ) : (
                    filteredEmployees.map(({ user, count }) => (
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
                          {user.workingShift && (
                            <span className="capitalize px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                              {user.workingShift} shift
                            </span>
                          )}
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

            {/* Right: Selected Member Attendance */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {!selectedEmployee ? (
                  <div className="flex flex-col items-center justify-center py-24 text-gray-400">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <p className="text-lg font-medium">Select a team member</p>
                    <p className="text-sm mt-1">Click on any member to view and manage their attendance</p>
                  </div>
                ) : (
                  <>
                    {/* Member Header */}
                    <div className="px-6 py-4 border-b bg-gray-50 flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">
                          {selectedEmployee.name}
                        </h2>
                        <p className="text-sm text-gray-500">
                          {selectedEmployee.email}
                          {selectedEmployee.workingShift && (
                            <span> • {selectedEmployee.workingShift} shift</span>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={openAddModal}
                          className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                        >
                          + Add Entry
                        </button>
                        <button
                          onClick={() => setSelectedEmployee(null)}
                          className="text-sm text-gray-500 hover:text-gray-700"
                        >
                          ← Back to list
                        </button>
                      </div>
                    </div>

                    {/* Attendance Table */}
                    <div className="overflow-x-auto">
                      {employeeRecords.length === 0 ? (
                        <div className="text-center py-16 text-gray-500">
                          No attendance records found for this member
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
                              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
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
                                <td className="px-4 py-3 text-right whitespace-nowrap">
                                  <button
                                    onClick={() => openEditModal(record)}
                                    className="text-sm text-blue-600 hover:text-blue-800 font-medium mr-3"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteRecord(record)}
                                    className="text-sm text-red-600 hover:text-red-800 font-medium"
                                  >
                                    Delete
                                  </button>
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

      {/* Add / Edit Modal */}
      {modalOpen && modalRecord && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {modalMode === "add" ? "Add Attendance Entry" : "Edit Attendance Entry"}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                ✕
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className="text-sm text-gray-500">
                {modalRecord.userName}
                {modalMode === "edit" && ` • ${formatDate(modalRecord.date)}`}
              </div>

              {modalMode === "add" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={modalRecord.date}
                    onChange={(e) => setModalRecord({ ...modalRecord, date: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Login Time</label>
                  <input
                    type="time"
                    value={modalRecord.loggingTime}
                    onChange={(e) => setModalRecord({ ...modalRecord, loggingTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Logout Time</label>
                  <input
                    type="time"
                    value={modalRecord.logoutTime}
                    onChange={(e) => setModalRecord({ ...modalRecord, logoutTime: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lunch Start</label>
                  <input
                    type="time"
                    value={modalRecord.lunchStart}
                    onChange={(e) => setModalRecord({ ...modalRecord, lunchStart: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lunch End</label>
                  <input
                    type="time"
                    value={modalRecord.lunchEnd}
                    onChange={(e) => setModalRecord({ ...modalRecord, lunchEnd: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={modalRecord.isLate}
                    onChange={(e) => setModalRecord({ ...modalRecord, isLate: e.target.checked })}
                  />
                  Mark as late
                </label>
                {modalRecord.isLate && (
                  <input
                    type="number"
                    min="0"
                    placeholder="Minutes late"
                    value={modalRecord.lateByMinutes}
                    onChange={(e) => setModalRecord({ ...modalRecord, lateByMinutes: e.target.value })}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location (optional)</label>
                <input
                  type="text"
                  value={modalRecord.loginLocationAddress}
                  onChange={(e) => setModalRecord({ ...modalRecord, loginLocationAddress: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {modalError && <div className="text-sm text-red-600">{modalError}</div>}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium rounded-lg transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={saveModal}
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}