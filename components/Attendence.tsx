"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface AttendenceRecord {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
    workingShift?: string;
  };
  date: string;
  loggingTime: string | null;
  logoutTime: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  isLate?: boolean;
  lateByMinutes?: number;
  updatedBy?: {
    name: string;
  };
  createdAt: string;
}

interface Props {
  currentUserId: string;
}

export default function AttendencePage({ currentUserId }: Props) {
  const [records, setRecords] = useState<AttendenceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);

  // Filters
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [userId, setUserId] = useState(""); // for admin filter (optional)

  // ── Fetch records ──
  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // By default show only current user's records
      params.append("userId", userId || currentUserId);

      if (fromDate) params.append("from", fromDate);
      if (toDate) params.append("to", toDate);

      // Note: make sure this matches your actual API route
      const res = await fetch(`/api/attendence?${params.toString()}`);
      const data = await res.json();
      setRecords(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to load attendance");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [currentUserId]);

  // ── Get current location ──
  const getCurrentLocation = (): Promise<{
    latitude: number;
    longitude: number;
  }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by your browser"));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          let message = "Unable to get your location";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              message =
                "Location permission denied. Please allow location access to mark attendance.";
              break;
            case error.POSITION_UNAVAILABLE:
              message = "Location information is unavailable.";
              break;
            case error.TIMEOUT:
              message = "Location request timed out.";
              break;
          }
          reject(new Error(message));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  };

  // ── Mark Attendance Actions ──
  const handleAction = async (
    action: "login" | "logout" | "lunchStart" | "lunchEnd"
  ) => {
    setMarking(true);

    try {
      let body: any = {
        userId: currentUserId,
        action,
      };

      // Only for login → get location
      if (action === "login") {
        try {
          const location = await getCurrentLocation();
          body.latitude = location.latitude;
          body.longitude = location.longitude;
          // Optional: you can later add reverse geocoding for address
        } catch (locError: any) {
          alert(locError.message || "Failed to get location");
          setMarking(false);
          return;
        }
      }

      const res = await fetch("/api/attendence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Action failed");
        return;
      }

      alert(`${action} successful`);
      fetchRecords();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setMarking(false);
    }
  };

  // ── Download Excel ──
  const downloadExcel = () => {
    if (records.length === 0) {
      alert("No data to download");
      return;
    }

    const excelData = records.map((r) => ({
      Date: format(new Date(r.date), "dd MMM yyyy"),
      Employee: r.userId?.name || "—",
      Email: r.userId?.email || "—",
      "Login Time": r.loggingTime
        ? format(new Date(r.loggingTime), "hh:mm a")
        : "—",
      "Logout Time": r.logoutTime
        ? format(new Date(r.logoutTime), "hh:mm a")
        : "—",
      "Lunch Start": r.lunchStart
        ? format(new Date(r.lunchStart), "hh:mm a")
        : "—",
      "Lunch End": r.lunchEnd
        ? format(new Date(r.lunchEnd), "hh:mm a")
        : "—",
      Late: r.isLate ? `Yes (${r.lateByMinutes} min)` : "No",
      "Updated By": r.updatedBy?.name || "—",
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

    const colWidths = Object.keys(excelData[0] || {}).map(() => ({ wch: 18 }));
    worksheet["!cols"] = colWidths;

    const fileName = `Attendance_${fromDate || "all"}_to_${toDate || "all"}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  const formatTime = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "hh:mm a");
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h4 className="text-3xl font-bold text-gray-900">Attendance</h4>
          <p className="text-gray-500 mt-1">Mark & track daily attendance</p>
        </div>

        {/* Mark Attendance */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Mark Attendance
          </h2>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => handleAction("login")}
              disabled={marking}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
            >
              {marking ? "Processing..." : "Login"}
            </button>

            <button
              onClick={() => handleAction("logout")}
              disabled={marking}
              className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
            >
              Logout
            </button>

            <button
              onClick={() => handleAction("lunchStart")}
              disabled={marking}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium disabled:opacity-50 transition"
            >
              Start Lunch
            </button>

            <button
              onClick={() => handleAction("lunchEnd")}
              disabled={marking}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
            >
              End Lunch
            </button>
          </div>

          <p className="text-sm text-gray-500 mt-3">
            Note: Login requires location access. Please allow location permission when prompted.
          </p>
        </div>

        {/* Filters + Download */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <div className="flex flex-col md:flex-row md:items-end gap-4 justify-between">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchRecords}
                  className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-medium transition"
                >
                  Apply Filter
                </button>
              </div>
            </div>

            <button
              onClick={downloadExcel}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download Excel
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Logout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lunch Start
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lunch End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Late
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      Loading...
                    </td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                      No records found
                    </td>
                  </tr>
                ) : (
                  records.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {format(new Date(r.date), "dd MMM yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        <div className="font-medium">{r.userId?.name}</div>
                        <div className="text-xs text-gray-400">
                          {r.userId?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.loggingTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.logoutTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.lunchStart)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.lunchEnd)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {r.isLate ? (
                          <span className="text-red-600 font-medium">
                            Yes ({r.lateByMinutes} min)
                          </span>
                        ) : (
                          <span className="text-green-600">No</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}