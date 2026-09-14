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
  currentUserRole: string;
}

export default function MissingAttendancePage({
  currentUserId,
  currentUserRole,
}: Props) {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // ============================================
  // FORM STATE
  // ============================================

  const [date, setDate] = useState("");
  const [loginTime, setLoginTime] = useState("");
  const [logoutTime, setLogoutTime] = useState("");
  const [lunchStart, setLunchStart] = useState("");
  const [lunchEnd, setLunchEnd] = useState("");
  const [reason, setReason] = useState("");

  // ============================================
  // REVIEW STATE
  // ============================================

  const [reviewComment, setReviewComment] = useState<
    Record<string, string>
  >({});

  // ============================================
  // ROLE CHECK
  // ============================================

  const isReviewer = [
    "team-lead",
    "hr",
    "admin",
  ].includes(currentUserRole);

  const isAdmin = currentUserRole === "admin";

  // ============================================
  // FETCH REQUESTS
  // ============================================

  const fetchRequests = async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams();

      // Normal users see only their own requests.
      // Team Lead / HR / Admin see all requests.
      if (!isReviewer) {
        params.append("userId", currentUserId);
      }

      const query = params.toString();

      const res = await fetch(
        `/api/missing-attendance${query ? `?${query}` : ""}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
          data?.message ||
          "Failed to load requests"
        );
      }

      setRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(
        "FETCH MISSING ATTENDANCE ERROR:",
        error
      );

      alert("Failed to load attendance requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUserId, currentUserRole]);

  // ============================================
  // SUBMIT NEW REQUEST
  // ============================================

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    // Admin should never submit a missing attendance request.
    if (isAdmin) {
      return;
    }

    if (!date || !reason.trim()) {
      alert("Date and Reason are required");
      return;
    }

    setSubmitting(true);

    try {
      const body: Record<string, any> = {
        userId: currentUserId,
        date,
        reason: reason.trim(),
      };

      // Login time
      if (loginTime) {
        body.requestedLoggingTime = new Date(
          `${date}T${loginTime}:00`
        ).toISOString();
      }

      // Logout time
      if (logoutTime) {
        body.requestedLogoutTime = new Date(
          `${date}T${logoutTime}:00`
        ).toISOString();
      }

      // Lunch start
      if (lunchStart) {
        body.requestedLunchStart = new Date(
          `${date}T${lunchStart}:00`
        ).toISOString();
      }

      // Lunch end
      if (lunchEnd) {
        body.requestedLunchEnd = new Date(
          `${date}T${lunchEnd}:00`
        ).toISOString();
      }

      const res = await fetch(
        "/api/missing-attendance",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(body),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
          data?.message ||
          "Failed to submit request"
        );
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

      await fetchRequests();
    } catch (error) {
      console.error(
        "SUBMIT MISSING ATTENDANCE ERROR:",
        error
      );

      alert("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // ============================================
  // APPROVE / REJECT
  // ============================================

  const handleReview = async (
    id: string,
    action: "approve" | "reject"
  ) => {
    try {
      const comment =
        reviewComment[id]?.trim() || "";

      const res = await fetch(
        `/api/missing-attendance/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action,
            reviewedBy: currentUserId,
            reviewComment: comment,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
          data?.message ||
          "Action failed"
        );
        return;
      }

      alert(
        action === "approve"
          ? "Request approved successfully"
          : "Request rejected successfully"
      );

      // Remove review comment after action
      setReviewComment((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });

      await fetchRequests();
    } catch (error) {
      console.error(
        "REVIEW ATTENDANCE ERROR:",
        error
      );

      alert("Something went wrong");
    }
  };

  // ============================================
  // FORMAT TIME
  // ============================================

  const formatTime = (value: string | null) => {
    if (!value) return "—";

    try {
      return format(
        new Date(value),
        "hh:mm a"
      );
    } catch {
      return "—";
    }
  };

  // ============================================
  // STATUS BADGE
  // ============================================

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending:
        "bg-yellow-100 text-yellow-800",
      approved:
        "bg-green-100 text-green-800",
      rejected:
        "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2.5 py-1 rounded-full text-xs font-medium ${styles[status] ||
          "bg-gray-100 text-gray-700"
          }`}
      >
        {status.charAt(0).toUpperCase() +
          status.slice(1)}
      </span>
    );
  };

  // ============================================
  // COUNTS
  // ============================================

  const pendingCount = requests.filter(
    (r) => r.status === "pending"
  ).length;

  const approvedCount = requests.filter(
    (r) => r.status === "approved"
  ).length;

  const rejectedCount = requests.filter(
    (r) => r.status === "rejected"
  ).length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============================================
            HEADER
        ============================================ */}

        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h4 className="text-3xl font-bold text-gray-900">
                {isAdmin
                  ? "Attendance Management"
                  : "Missing Attendance"}
              </h4>

              {isAdmin && (
                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                  ADMIN
                </span>
              )}
            </div>

            <p className="text-gray-500 mt-1">
              {isAdmin
                ? "Manage employee missing attendance requests"
                : "Request to mark attendance for a missed day"}
            </p>
          </div>

          <button
            type="button"
            onClick={fetchRequests}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {loading
              ? "Refreshing..."
              : "Refresh"}
          </button>
        </div>

        {/* ============================================
            SUMMARY CARDS
        ============================================ */}

        {isReviewer && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

            {/* PENDING */}

            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Pending
              </p>

              <p className="text-3xl font-bold text-yellow-600 mt-1">
                {pendingCount}
              </p>
            </div>

            {/* APPROVED */}

            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Approved
              </p>

              <p className="text-3xl font-bold text-green-600 mt-1">
                {approvedCount}
              </p>
            </div>

            {/* REJECTED */}

            <div className="bg-white border rounded-xl p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Rejected
              </p>

              <p className="text-3xl font-bold text-red-600 mt-1">
                {rejectedCount}
              </p>
            </div>
          </div>
        )}

        {/* ============================================
            SUBMIT NEW REQUEST
            HIDDEN FOR ADMIN
        ============================================ */}

        {!isAdmin && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">

            <h2 className="text-lg font-semibold text-gray-800 mb-5">
              Submit New Request
            </h2>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                {/* DATE */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="date"
                    value={date}
                    onChange={(e) =>
                      setDate(e.target.value)
                    }
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* LOGIN TIME */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Login Time
                  </label>

                  <input
                    type="time"
                    value={loginTime}
                    onChange={(e) =>
                      setLoginTime(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* LOGOUT TIME */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logout Time
                  </label>

                  <input
                    type="time"
                    value={logoutTime}
                    onChange={(e) =>
                      setLogoutTime(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* LUNCH START */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lunch Start
                  </label>

                  <input
                    type="time"
                    value={lunchStart}
                    onChange={(e) =>
                      setLunchStart(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                {/* LUNCH END */}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lunch End
                  </label>

                  <input
                    type="time"
                    value={lunchEnd}
                    onChange={(e) =>
                      setLunchEnd(
                        e.target.value
                      )
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* REASON */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason{" "}
                  <span className="text-red-500">
                    *
                  </span>
                </label>

                <textarea
                  value={reason}
                  onChange={(e) =>
                    setReason(e.target.value)
                  }
                  required
                  rows={3}
                  placeholder="Explain why attendance was not marked..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* SUBMIT */}

              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
              >
                {submitting
                  ? "Submitting..."
                  : "Submit Request"}
              </button>
            </form>
          </div>
        )}

        {/* ============================================
            REQUESTS LIST
        ============================================ */}

        <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">

          {/* TABLE HEADER */}

          <div className="px-6 py-4 border-b flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {isReviewer
                  ? "All Attendance Requests"
                  : "My Attendance Requests"}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                {requests.length} request
                {requests.length !== 1
                  ? "s"
                  : ""}
              </p>
            </div>
          </div>

          {/* TABLE */}

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">

              <thead className="bg-gray-50">
                <tr>

                  {/* DATE */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>

                  {/* EMPLOYEE */}

                  {isReviewer && (
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Employee
                    </th>
                  )}

                  {/* LOGIN */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Login
                  </th>

                  {/* LOGOUT */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Logout
                  </th>

                  {/* LUNCH */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Lunch
                  </th>

                  {/* REASON */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Reason
                  </th>

                  {/* STATUS */}

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Status
                  </th>

                  {/* ACTION */}

                  {isReviewer && (
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                      Action
                    </th>
                  )}

                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">

                {/* LOADING */}

                {loading ? (
                  <tr>
                    <td
                      colSpan={
                        isReviewer ? 8 : 6
                      }
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Loading attendance requests...
                    </td>
                  </tr>
                ) : requests.length === 0 ? (

                  /* EMPTY */

                  <tr>
                    <td
                      colSpan={
                        isReviewer ? 8 : 6
                      }
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No attendance requests found
                    </td>
                  </tr>

                ) : (

                  /* DATA */

                  requests.map((r) => (
                    <tr
                      key={r._id}
                      className="hover:bg-gray-50"
                    >

                      {/* DATE */}

                      <td className="px-5 py-4 whitespace-nowrap text-sm font-medium">
                        {format(
                          new Date(r.date),
                          "dd MMM yyyy"
                        )}
                      </td>

                      {/* EMPLOYEE */}

                      {isReviewer && (
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <div className="font-medium text-gray-900">
                            {r.userId?.name ||
                              "Unknown"}
                          </div>

                          <div className="text-xs text-gray-400">
                            {r.userId?.email ||
                              "—"}
                          </div>
                        </td>
                      )}

                      {/* LOGIN */}

                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {formatTime(
                          r.requestedLoggingTime
                        )}
                      </td>

                      {/* LOGOUT */}

                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {formatTime(
                          r.requestedLogoutTime
                        )}
                      </td>

                      {/* LUNCH */}

                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {r.requestedLunchStart ||
                          r.requestedLunchEnd ? (
                          <div>
                            <div>
                              {formatTime(
                                r.requestedLunchStart
                              )}
                            </div>

                            <div className="text-xs text-gray-400">
                              to{" "}
                              {formatTime(
                                r.requestedLunchEnd
                              )}
                            </div>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* REASON */}

                      <td className="px-5 py-4 text-sm max-w-xs">
                        <div
                          className="truncate"
                          title={r.reason}
                        >
                          {r.reason}
                        </div>

                        {r.reviewComment && (
                          <div className="text-xs text-gray-500 mt-1">
                            Review:{" "}
                            {r.reviewComment}
                          </div>
                        )}
                      </td>

                      {/* STATUS */}

                      <td className="px-5 py-4 whitespace-nowrap text-sm">
                        {statusBadge(
                          r.status
                        )}
                      </td>


                      {/* ACTION */}

                      {isReviewer && (
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          {r.status === "pending" &&
                            r.userId?._id !== currentUserId ? (
                            <div className="flex flex-col gap-2">

                              {/* REVIEW COMMENT */}
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
                                className="border border-gray-300 rounded px-2 py-1 text-xs w-44 outline-none focus:ring-1 focus:ring-blue-500"
                              />

                              {/* BUTTONS */}
                              <div className="flex gap-2">

                                {/* APPROVE */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReview(r._id, "approve")
                                  }
                                  className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded"
                                >
                                  Approve
                                </button>

                                {/* REJECT */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleReview(r._id, "reject")
                                  }
                                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded"
                                >
                                  Reject
                                </button>

                              </div>
                            </div>
                          ) : r.status === "pending" &&
                            r.userId?._id === currentUserId ? (
                            <span className="text-xs text-gray-400">
                              Your request
                            </span>
                          ) : (
                            <div className="text-xs text-gray-400">
                              {r.reviewedBy?.name
                                ? `By ${r.reviewedBy.name}`
                                : "Reviewed"}
                            </div>
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