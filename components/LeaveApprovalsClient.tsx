"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type Leave = {
  _id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  leaveType: "PAID" | "UNPAID";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvalHistory?: Array<{
    level: string;
    approverName?: string;
    approverRole?: string;
    action: string;
    comment?: string;
    actionAt: string;
  }>;
};

const STATUS_FILTERS = [
  "ALL",
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

type StatusFilter = (typeof STATUS_FILTERS)[number];

interface Props {
  role: string;
}

export default function LeaveApprovalsClient({ role }: Props) {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  const normalizedRole = (role || "").toLowerCase().replace(/_/g, "-");
  const backLink = `/${normalizedRole}/leave-management`;

  const loadApprovals = useCallback(async () => {
    try {
      setError("");

      const response = await fetch("/api/leaves/approvals", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Failed to load leave approvals");
      }

      setLeaves(
        Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []
      );
    } catch (e) {
      console.error("Leave approvals load error:", e);
      setError(e instanceof Error ? e.message : "Unable to load approvals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  async function handleAction(id: string, type: "approve" | "reject") {
    let comment = "";

    if (type === "reject") {
      const promptVal = window.prompt("Enter reason for rejection (required):");
      if (promptVal === null) return; // user cancelled prompt
      comment = promptVal.trim();

      if (!comment) {
        alert("A rejection reason is required.");
        return;
      }
    } else {
      const confirmApprove = window.confirm("Are you sure you want to approve this leave request?");
      if (!confirmApprove) return;
    }

    try {
      setProcessingId(id);
      setError("");
      setSuccessMessage("");

      const response = await fetch(`/api/leaves/${id}/${type}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          comment: comment.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || `Unable to ${type} leave request`);
      }

      setSuccessMessage(`Leave request successfully ${type === "approve" ? "approved" : "rejected"}.`);
      await loadApprovals();
    } catch (err) {
      console.error(`Leave ${type} error:`, err);
      setError(err instanceof Error ? err.message : `Unable to ${type} leave request`);
    } finally {
      setProcessingId(null);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          Loading leave approvals...
        </div>
      </div>
    );
  }

  const filteredLeaves =
    filter === "ALL"
      ? leaves
      : leaves.filter((l) => matchesStatus(l.status, filter));

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href={backLink}
              className="text-gray-400 hover:text-gray-700 transition"
              title="Back to Leave Management"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <h4 className="text-2xl font-bold tracking-tight text-gray-900">
              Leave Approvals
            </h4>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Review and process leave requests assigned to you.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadApprovals();
          }}
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* STATUS FILTER PILLS */}
      <div className="flex flex-wrap gap-2 pt-1">
        {STATUS_FILTERS.map((s) => {
          const count =
            s === "ALL"
              ? leaves.length
              : leaves.filter((l) => matchesStatus(l.status, s)).length;

          const isSelected = filter === s;

          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-full px-4 py-1.5 text-xs sm:text-sm font-medium transition cursor-pointer ${isSelected
                  ? "bg-blue-600 text-white shadow-sm"
                  : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
            >
              {formatStatus(s)} ({count})
            </button>
          );
        })}
      </div>

      {/* NOTIFICATIONS */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold text-red-500 hover:text-red-700 ml-2">×</button>
        </div>
      )}

      {successMessage && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center justify-between">
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} className="font-bold text-green-600 hover:text-green-800 ml-2">×</button>
        </div>
      )}

      {/* REQUESTS LIST */}
      <div className="space-y-4">
        {filteredLeaves.map((leave) => {
          const processing = processingId === leave._id;
          const isPending = matchesStatus(leave.status, "PENDING");

          return (
            <div
              key={leave._id}
              className="rounded-xl border border-gray-200 bg-white p-5 md:p-6 shadow-sm hover:shadow transition"
            >
              {/* TOP ROW: EMPLOYEE INFO & STATUS BADGE */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-gray-900">
                    {leave.employeeName}
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                    {leave.employeeEmail}
                  </p>
                  <p className="mt-1 text-xs sm:text-sm text-gray-600">
                    Role: <span className="font-semibold text-gray-800">{formatRole(leave.employeeRole)}</span>
                  </p>
                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClass(
                    leave.status
                  )}`}
                >
                  {formatStatus(leave.status)}
                </span>
              </div>

              {/* DETAILS GRID */}
              <div className="mt-5 grid grid-cols-2 gap-4 text-xs sm:text-sm sm:grid-cols-4 border-t border-b border-gray-100 py-3.5">
                <div>
                  <span className="text-gray-500 block text-xs">Type</span>
                  <div className="mt-1">
                    <span
                      className={
                        leave.leaveType === "PAID"
                          ? "inline-block rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-800"
                          : "inline-block rounded-full bg-gray-100 border border-gray-200 px-2.5 py-0.5 text-xs font-bold text-gray-700"
                      }
                    >
                      {leave.leaveType}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">From</span>
                  <div className="mt-1 font-semibold text-gray-900">
                    {formatDate(leave.startDate)}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">To</span>
                  <div className="mt-1 font-semibold text-gray-900">
                    {formatDate(leave.endDate)}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500 block text-xs">Days</span>
                  <div className="mt-1 font-semibold text-gray-900">
                    {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
                  </div>
                </div>
              </div>

              {/* REASON */}
              <div className="mt-3.5 rounded-lg bg-gray-50/80 p-3 text-xs sm:text-sm text-gray-700">
                <span className="font-semibold text-gray-900">Reason:</span> {leave.reason}
              </div>

              {/* AUDIT / COMMENTS FOR ALREADY REVIEWED LEAVES */}
              {leave.approvalHistory && leave.approvalHistory.length > 0 && (
                <div className="mt-3 text-xs text-gray-500 flex items-center gap-1.5">
                  <span className="font-medium text-gray-700">Reviewed by:</span>
                  <span>
                    {leave.approvalHistory[leave.approvalHistory.length - 1].approverName || "Approver"} (
                    {leave.approvalHistory[leave.approvalHistory.length - 1].action})
                  </span>
                  {leave.approvalHistory[leave.approvalHistory.length - 1].comment && (
                    <span className="italic text-gray-600">
                      — &ldquo;{leave.approvalHistory[leave.approvalHistory.length - 1].comment}&rdquo;
                    </span>
                  )}
                </div>
              )}

              {/* ACTIONS (FOR PENDING LEAVES ONLY) */}
              {isPending && (
                <div className="mt-4 flex items-center gap-3 pt-2">
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleAction(leave._id, "approve")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    {processing ? "Processing..." : "Approve"}
                  </button>

                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => handleAction(leave._id, "reject")}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    {processing ? "Processing..." : "Reject"}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {!filteredLeaves.length && (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400 shadow-sm">
            {filter === "ALL"
              ? "No leave requests found for review."
              : `No ${formatStatus(filter).toLowerCase()} leave requests.`}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS & FORMATTERS
========================================================= */

function matchesStatus(status: string | undefined, filter: string) {
  const s = (status || "").toUpperCase();
  if (filter === "ALL") return true;
  if (filter === "PENDING") return s.includes("PENDING");
  if (filter === "APPROVED") return s === "APPROVED";
  if (filter === "REJECTED") return s === "REJECTED";
  if (filter === "CANCELLED") return s.includes("CANCEL");
  return s.includes(filter);
}

function statusClass(status: string) {
  const s = (status || "").toUpperCase();

  if (s.includes("APPROVED")) {
    return "bg-emerald-50 text-emerald-700 border border-emerald-200";
  }

  if (s.includes("REJECTED")) {
    return "bg-red-50 text-red-700 border border-red-200";
  }

  if (s.includes("CANCEL")) {
    return "bg-gray-100 text-gray-700 border border-gray-200";
  }

  return "bg-amber-50 text-amber-800 border border-amber-200";
}

function formatDate(value: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function formatRole(value: string) {
  if (!value) return "—";
  return value
    .toLowerCase()
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
