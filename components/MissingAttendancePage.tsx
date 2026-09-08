"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface Request {
  _id: string;
  userId: {
    _id: string;
    name: string;
    email: string;
  };
  date: string;
  requestedLoggingTime: string | null;
  requestedLogoutTime: string | null;
  requestedLunchStart: string | null;
  requestedLunchEnd: string | null;
  reason: string;
  attachment?: string;
  status: "pending" | "approved" | "rejected";
  reviewedBy?: {
    name: string;
  };
  reviewComment?: string;
  reviewedAt?: string;
  createdAt: string;
}

interface Props {
  currentUserId: string;
  currentUserRole: string; // "survey-tester" | "team-lead" | "hr" | "admin"
}

export default function MissingAttendancePage({
  currentUserId,
  currentUserRole,
}: Props) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [date, setDate] = useState("");
  const [loginTime, setLoginTime] = useState("");
  const [logoutTime, setLogoutTime] = useState("");
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [reason, setReason] = useState("");

  // Review state (for TL/HR/Admin)
  const [reviewComment, setReviewComment] = useState<{ [key: string]: string }>({});

  const isReviewer = ["team-lead", "hr", "admin"].includes(currentUserRole);

  // ── Fetch requests ──
  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      // Normal users see only their own requests
      if (!isReviewer) {
        params.append("userId", currentUserId);
      }

      const res = await fetch(`/api/missing-attendance?${params.toString()}`);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      alert("Failed to load requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUserId]);

  // ── Submit new request ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !reason.trim()) {
      alert("Date and Reason are required");
      return;
    }

    setSubmitting(true);
    try {
      const body: any = {
        userId: currentUserId,
        date,
        reason: reason.trim(),
      };

      // Convert time inputs to full ISO date
      if (loginTime) {
        body.requestedLoggingTime = new Date(`${date}T${loginTime}:00`);
      }
      if (logoutTime) {
        body.requestedLogoutTime = new Date(`${date}T${logoutTime}:00`);
      }
      if (lunchStart) {
        body.requestedLunchStart = new Date(`${date}T${lunchStart}:00`);
      }
      if (lunchEnd) {
        body.requestedLunchEnd = new Date(`${date}T${lunchEnd}:00`);
      }

      const res = await fetch("/api/missing-attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to submit request");
        return;
      }

      alert("Request submitted successfully!");
      // Reset form
      setDate("");
      setLoginTime("");
      setLogoutTime("");
      setLunchStart("");
      setLunchEnd("");
      setReason("");
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ── Approve / Reject ──
  const handleReview = async (id: string, action: "approve" | "reject") => {
    try {
      const res = await fetch(`/api/missing-attendance/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reviewedBy: currentUserId,
          reviewComment: reviewComment[id] || "",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Action failed");
        return;
      }

      alert(`Request ${action}d successfully`);
      fetchRequests();
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const formatTime = (date: string | null) => {
    if (!date) return "—";
    return format(new Date(date), "hh:mm a");
  };

  const statusBadge = (status: string) => {
    const styles: any = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Missing Attendance Request
          </h1>
          <p className="text-gray-500 mt-1">
            Request to mark attendance for a missed day
          </p>
        </div>

        {/* ────────── Submit Form (for all users) ────────── */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            Submit New Request
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Login Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Login Time
                </label>
                <input
                  type="time"
                  value={loginTime}
                  onChange={(e) => setLoginTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Logout Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Logout Time
                </label>
                <input
                  type="time"
                  value={logoutTime}
                  onChange={(e) => setLogoutTime(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Lunch Start */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lunch Start
                </label>
                <input
                  type="time"
                  value={lunchStart}
                  onChange={(e) => setLunchStart(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Lunch End */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Lunch End
                </label>
                <input
                  type="time"
                  value={lunchEnd}
                  onChange={(e) => setLunchEnd(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="Explain why attendance was not marked..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
          </form>
        </div>

        {/* ────────── Requests List ────────── */}
        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b">
            <h2 className="text-lg font-semibold text-gray-800">
              {isReviewer ? "All Requests" : "My Requests"}
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>
                  {isReviewer && (
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Employee
                    </th>
                  )}
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Login
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Logout
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Reason
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>
                  {isReviewer && (
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Action
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td
                      colSpan={isReviewer ? 7 : 5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (
                  <tr>
                    <td
                      colSpan={isReviewer ? 7 : 5}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No requests found
                    </td>
                  </tr>
                ) : (
                  requests.map((r) => (
                    <tr key={r._id} className="hover:bg-gray-50">
                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
                        {format(new Date(r.date), "dd MMM yyyy")}
                      </td>

                      {isReviewer && (
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium">{r.userId?.name}</div>
                          <div className="text-xs text-gray-400">
                            {r.userId?.email}
                          </div>
                        </td>
                      )}

                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {formatTime(r.requestedLoggingTime)}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {formatTime(r.requestedLogoutTime)}
                      </td>
                      <td className="px-5 py-4 text-sm max-w-xs">
                        <div className="truncate" title={r.reason}>
                          {r.reason}
                        </div>
                        {r.reviewComment && (
                          <div className="text-xs text-gray-500 mt-1">
                            Review: {r.reviewComment}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {statusBadge(r.status)}
                      </td>

                      {isReviewer && (
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          {r.status === "pending" ? (
                            <div className="flex flex-col gap-2">
                              <input
                                type="text"
                                placeholder="Comment (optional)"
                                value={reviewComment[r._id] || ""}
                                onChange={(e) =>
                                  setReviewComment((prev) => ({
                                    ...prev,
                                    [r._id]: e.target.value,
                                  }))
                                }
                                className="border border-gray-300 rounded px-2 py-1 text-xs w-40"
                              />
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleReview(r._id, "approve")}
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => handleReview(r._id, "reject")}
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                >
                                  Reject
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-400">
                              {r.reviewedBy?.name
                                ? `By ${r.reviewedBy.name}`
                                : "—"}
                            </span>
                          )}
                        </td>
                      )}
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