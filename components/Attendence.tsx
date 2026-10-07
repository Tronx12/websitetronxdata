


"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import * as XLSX from "xlsx";
import { formatLateTime } from "@/lib/shiftValidation";

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
  status?: "present" | "absent" | "half-day" | "office-off" | "holiday" | "weekly-off" | "leave" | "worked-on-holiday" | "worked-on-weekly-off" | "comp-off";
  lunchDurationMinutes?: number;
  excessLunchMinutes?: number;
  remarks?: string;
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
  // const getCurrentLocation = (): Promise<{
  //   latitude: number;
  //   longitude: number;
  // }> => {
  //   return new Promise((resolve, reject) => {
  //     if (!navigator.geolocation) {
  //       reject(new Error("Geolocation is not supported by your browser"));
  //       return;
  //     }

  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         resolve({
  //           latitude: position.coords.latitude,
  //           longitude: position.coords.longitude,
  //         });
  //       },
  //       (error) => {
  //         let message = "Unable to get your location";
  //         switch (error.code) {
  //           case error.PERMISSION_DENIED:
  //             message =
  //               "Location permission denied. Please allow location access to mark attendance.";
  //             break;
  //           case error.POSITION_UNAVAILABLE:
  //             message = "Location information is unavailable.";
  //             break;
  //           case error.TIMEOUT:
  //             message = "Location request timed out.";
  //             break;
  //         }
  //         reject(new Error(message));
  //       },
  //       {
  //         enableHighAccuracy: true,
  //         timeout: 10000,
  //         maximumAge: 0,
  //       }
  //     );
  //   });
  // };

  // ── Mark Attendance Actions ──
  // const handleAction = async (
  //   action: "login" | "logout" | "lunchStart" | "lunchEnd"
  // ) => {
  //   setMarking(true);

  //   try {
  //     let body: any = {
  //       userId: currentUserId,
  //       action,
  //     };

  //     // Only for login → get location
  //     if (action === "login") {
  //       try {
  //         const location = await getCurrentLocation();
  //         body.latitude = location.latitude;
  //         body.longitude = location.longitude;
  //       } catch (locError: any) {
  //         alert(locError.message || "Failed to get location");
  //         setMarking(false);
  //         return;
  //       }
  //     }

  //     const res = await fetch("/api/attendence", {
  //       method: "POST",
  //       headers: { "Content-Type": "application/json" },
  //       body: JSON.stringify(body),
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       alert(data.error || "Action failed");
  //       return;
  //     }

  //     if (data.remarks) {
  //       alert(`${action} successful: ${data.remarks}`);
  //     } else {
  //       alert(`${action} successful`);
  //     }
  //     fetchRecords();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Something went wrong");
  //   } finally {
  //     setMarking(false);
  //   }
  // };
  // ── Mark Attendance Actions ──
  // const handleAction = async (
  //   action: "login" | "logout" | "lunchStart" | "lunchEnd"
  // ) => {
  //   setMarking(true);

  //   try {
  //     const body = {
  //       userId: currentUserId,
  //       action,
  //     };

  //     const res = await fetch("/api/attendence", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify(body),
  //     });

  //     const data = await res.json();

  //     if (!res.ok) {
  //       alert(data.error || "Action failed");
  //       return;
  //     }

  //     if (data.remarks) {
  //       alert(`${action} successful: ${data.remarks}`);
  //     } else {
  //       alert(`${action} successful`);
  //     }

  //     fetchRecords();
  //   } catch (err) {
  //     console.error(err);
  //     alert("Something went wrong");
  //   } finally {
  //     setMarking(false);
  //   }
  // };

  // ── Mark Attendance Actions ──
  const handleAction = async (
    action: "login" | "logout" | "lunchStart" | "lunchEnd"
  ) => {
    setMarking(true);

    try {
      // =====================================================
      // REQUEST BODY
      // =====================================================
      //
      // The API resolves the active attendance record itself.
      // This is important for night shifts because:
      //
      // 01 Oct 11:25 PM -> Login
      // 02 Oct 06:30 AM -> Logout
      //
      // Both actions must update the same 01 Oct record.
      // Do not send record.date from the browser here because
      // MongoDB date-only values can shift by timezone.
      // =====================================================

      const body = {
        userId: currentUserId,
        action,
      };

      console.log("Attendance action:", {
        action,
        body,
      });

      // =====================================================
      // API REQUEST
      // =====================================================

      const res = await fetch("/api/attendence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      // =====================================================
      // ERROR
      // =====================================================

      if (!res.ok) {
        alert(
          data.error ||
          "Attendance action failed"
        );

        return;
      }

      // =====================================================
      // SUCCESS
      // =====================================================

      if (data.remarks) {
        alert(
          `${action} successful: ${data.remarks}`
        );
      } else {
        alert(
          `${action} successful`
        );
      }

      // Refresh attendance table
      await fetchRecords();

    } catch (err) {
      console.error(
        "Attendance action error:",
        err
      );

      alert(
        "Something went wrong while marking attendance"
      );

    } finally {
      setMarking(false);
    }
  };

  // ── Download Excel ──
  const downloadExcel = () => {
    const params = new URLSearchParams();
    params.append("userId", userId || currentUserId);
    if (fromDate) params.append("from", fromDate);
    if (toDate) params.append("to", toDate);

    window.open(`/api/attendence/export?${params.toString()}`, "_blank");
  };


  // `date` is a date-only attendance key stored at UTC midnight.
  // Render that key in UTC so 01 Oct does not become 30 Sep in India.
  const formatAttendanceDate = (date: string) => {
    const value = new Date(date);
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "UTC",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(value);
  };

  const formatTime = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "hh:mm a");
  };

  // ── Current attendance status ──
  const todayRecord = records.length > 0 ? records[0] : null;

  const getCurrentAttendanceStatus = () => {
    if (!todayRecord?.loggingTime) {
      return {
        label: "Not Logged In",
        color: "bg-gray-100 text-gray-700",
        dot: "bg-gray-400",
      };
    }

    if (todayRecord.logoutTime) {
      return {
        label: "Logged Out",
        color: "bg-red-100 text-red-700",
        dot: "bg-red-500",
      };
    }

    if (todayRecord.lunchStart && !todayRecord.lunchEnd) {
      return {
        label: "On Lunch",
        color: "bg-amber-100 text-amber-700",
        dot: "bg-amber-500",
      };
    }

    if (todayRecord.lunchEnd) {
      return {
        label: "Lunch Ended",
        color: "bg-blue-100 text-blue-700",
        dot: "bg-blue-500",
      };
    }

    return {
      label: "Logged In",
      color: "bg-green-100 text-green-700",
      dot: "bg-green-500",
    };
  };

  const currentStatus = getCurrentAttendanceStatus();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h4 className="text-3xl font-bold text-gray-900">Attendance</h4>
          <p className="text-gray-500 mt-1">Mark & track daily attendance</p>
        </div>

        {/* Shift Timings & Guidelines Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2 text-blue-900 font-semibold">
              <span className="px-2 py-0.5 bg-blue-600 text-white text-xs rounded uppercase">Day Shift</span>
              <span>11:00 AM - 7:30 PM</span>
            </div>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• <strong>Login:</strong> 11:00 AM to 11:30 AM</li>
              <li>• <strong>Lunch:</strong> 30 to 35 minutes</li>
              <li>• <strong>Logout:</strong> 7:00 PM to 7:30 PM</li>
            </ul>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2 text-purple-900 font-semibold">
              <span className="px-2 py-0.5 bg-purple-600 text-white text-xs rounded uppercase">Night Shift</span>
              <span>9:30 PM - 6:30 AM</span>
            </div>
            <ul className="text-xs text-purple-800 space-y-1">
              <li>• <strong>Login:</strong> 9:30 PM to 10:10 PM</li>
              <li>• <strong>Lunch:</strong> 30 to 35 minutes</li>
              <li>• <strong>Logout:</strong> After 6:00 AM</li>
            </ul>
          </div>
        </div>

        {/* Mark Attendance */}
        <div className="bg-white rounded-2xl shadow-md  p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

            {/* Left - Actions */}
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">
                Mark Attendance
              </h2>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleAction("login")}
                  disabled={marking}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  {marking ? "Processing..." : "Login"}
                </button>

                <button
                  onClick={() => handleAction("logout")}
                  disabled={marking}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  Logout
                </button>

                <button
                  onClick={() => handleAction("lunchStart")}
                  disabled={marking}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  Start Lunch
                </button>

                <button
                  onClick={() => handleAction("lunchEnd")}
                  disabled={marking}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 transition"
                >
                  End Lunch
                </button>
              </div>

              {/* <p className="text-xs text-gray-400 mt-2">
                Attendance access is restricted to authorized office network/IP addresses.
              </p> */}
            </div>

            {/* Right - Small Current Status */}
            <div className="lg:border-l lg:pl-5 min-w-[300px]">

              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Current Status
                </span>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${currentStatus.color}`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${currentStatus.dot}`}
                  />
                  {currentStatus.label}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs">

                <div>
                  <span className="text-gray-400">Login</span>
                  <p className="font-semibold text-gray-700">
                    {formatTime(todayRecord?.loggingTime || null)}
                  </p>
                </div>

                <div className="h-7 w-px bg-gray-200" />

                <div>
                  <span className="text-gray-400">Lunch</span>
                  <p className="font-semibold text-gray-700">
                    {todayRecord?.lunchStart
                      ? formatTime(todayRecord.lunchStart)
                      : "—"}
                  </p>
                </div>

                <div className="h-7 w-px bg-gray-200" />

                <div>
                  <span className="text-gray-400">Logout</span>
                  <p className="font-semibold text-gray-700">
                    {formatTime(todayRecord?.logoutTime || null)}
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>


        {/* Filters + Download */}
        <div className="bg-white rounded-2xl shadow-md  p-6">
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
        <div className="bg-white rounded-2xl shadow-md  overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Logout
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Lunch
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Late
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Remarks
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
                        {formatAttendanceDate(r.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const status = r.status || "present";
                          switch (status) {
                            case "absent":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 uppercase">
                                  Absent
                                </span>
                              );
                            case "half-day":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 uppercase">
                                  Half Day
                                </span>
                              );
                            case "holiday":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 uppercase">
                                  Holiday
                                </span>
                              );
                            case "weekly-off":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                                  Weekly Off
                                </span>
                              );
                            case "office-off":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 uppercase">
                                  Office Off
                                </span>
                              );
                            case "worked-on-holiday":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 uppercase">
                                  Worked on Holiday
                                </span>
                              );
                            case "worked-on-weekly-off":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 uppercase">
                                  Worked on Weekly Off
                                </span>
                              );
                            case "comp-off":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800 uppercase">
                                  Comp Off
                                </span>
                              );
                            case "leave":
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-800 uppercase">
                                  Leave
                                </span>
                              );
                            case "present":
                            default:
                              return (
                                <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 uppercase">
                                  Present
                                </span>
                              );
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.loggingTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {formatTime(r.logoutTime)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {r.lunchStart || r.lunchEnd ? (
                          <div>
                            <div>{formatTime(r.lunchStart)} → {formatTime(r.lunchEnd)}</div>
                            {r.lunchDurationMinutes ? (
                              <div className="text-xs text-gray-400">
                                {r.lunchDurationMinutes} mins
                                {r.excessLunchMinutes ? (
                                  <span className="text-amber-600 font-medium"> ({r.excessLunchMinutes}m excess)</span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {r.isLate ? (
                          <span className="text-red-600 font-medium">
                            Yes {r.lateByMinutes ? `(${formatLateTime(r.lateByMinutes)})` : ""}
                          </span>
                        ) : (
                          <span className="text-green-600">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs text-gray-500 max-w-xs truncate">
                        {r.remarks || "—"}
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
