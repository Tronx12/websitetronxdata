"use client";

import { useEffect, useState } from "react";

type Leave = {
  _id: string;
  employeeName: string;
  employeeEmail: string;
  employeeRole: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
};

export default function LeaveApprovalsPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [processingId, setProcessingId] =
    useState<string | null>(null);

  /* =========================================================
     LOAD PENDING LEAVES
  ========================================================= */

  async function load() {
    try {
      setError("");

      const response = await fetch(
        "/api/leaves/pending",
        {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to load approvals"
        );
      }

      setLeaves(
        Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
            ? data
            : []
      );
    } catch (e) {
      console.error(
        "Leave approvals error:",
        e
      );

      setError(
        e instanceof Error
          ? e.message
          : "Unable to load approvals"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  /* =========================================================
     APPROVE / REJECT
  ========================================================= */

  async function action(
    id: string,
    type: "approve" | "reject"
  ) {
    let comment = "";

    if (type === "reject") {
      comment =
        window.prompt(
          "Enter rejection reason:"
        ) || "";

      if (!comment.trim()) {
        return;
      }
    }

    try {
      setProcessingId(id);
      setError("");

      /*
       * IMPORTANT:
       *
       * Do NOT send:
       * - approverId
       * - userId
       * - x-user-id
       *
       * Backend identifies the authenticated
       * approver using getCurrentUser().
       */

      const response = await fetch(
        `/api/leaves/${id}/${type}`,
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            comment: comment.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            `Unable to ${type} leave`
        );
      }

      /*
       * Reload the pending list.
       *
       * After approval/rejection the request
       * should disappear automatically.
       */
      await load();
    } catch (error) {
      console.error(
        `Leave ${type} error:`,
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : `Unable to ${type} leave`
      );
    } finally {
      setProcessingId(null);
    }
  }

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-6">
          Loading approvals...
        </div>
      </div>
    );
  }

  /* =========================================================
     PAGE
  ========================================================= */

  return (
    <div className="space-y-6 p-6">
      {/* HEADER */}

      <div>
        <h4 className="text-2xl font-semibold">
          Leave Approvals
        </h4>

        <p className="mt-1 text-sm text-gray-500">
          Review and process leave requests you
          are authorized to approve.
        </p>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* REQUESTS */}

      <div className="space-y-4">
        {leaves.map((leave) => {
          const processing =
            processingId === leave._id;

          return (
            <div
              key={leave._id}
              className="rounded-xl border bg-white p-5 shadow-sm"
            >
              {/* EMPLOYEE */}

              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="font-semibold">
                    {leave.employeeName}
                  </h2>

                  <p className="text-sm text-gray-500">
                    {leave.employeeEmail}
                  </p>

                  <p className="mt-1 text-sm">
                    Role:{" "}
                    <span className="font-medium">
                      {formatRole(
                        leave.employeeRole
                      )}
                    </span>
                  </p>
                </div>

                <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                  {formatStatus(
                    leave.status
                  )}
                </span>
              </div>

              {/* LEAVE DETAILS */}

              <div className="mt-4 grid gap-4 text-sm md:grid-cols-4">
                <div>
                  <span className="text-gray-500">
                    Type
                  </span>

                  <div className="mt-1">
                    <span
                      className={
                        leave.leaveType ===
                        "PAID"
                          ? "rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700"
                          : "rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                      }
                    >
                      {leave.leaveType}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">
                    From
                  </span>

                  <div className="mt-1 font-medium">
                    {formatDate(
                      leave.startDate
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">
                    To
                  </span>

                  <div className="mt-1 font-medium">
                    {formatDate(
                      leave.endDate
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-gray-500">
                    Days
                  </span>

                  <div className="mt-1 font-medium">
                    {leave.totalDays}
                  </div>
                </div>
              </div>

              {/* APPROVAL INFORMATION */}

              <div className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
                <strong>
                  Approval:
                </strong>{" "}
                Any authorized approver can approve
                this request.
              </div>

              {/* REASON */}

              <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm">
                <strong>Reason:</strong>{" "}
                {leave.reason}
              </div>

              {/* ACTIONS */}

              <div className="mt-4 flex gap-3">
                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    action(
                      leave._id,
                      "approve"
                    )
                  }
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? "Processing..."
                    : "Approve"}
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() =>
                    action(
                      leave._id,
                      "reject"
                    )
                  }
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {processing
                    ? "Processing..."
                    : "Reject"}
                </button>
              </div>
            </div>
          );
        })}

        {/* EMPTY */}

        {!leaves.length && (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            No pending leave approvals.
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(value: string) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatStatus(value: string) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("_")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}

function formatRole(value: string) {
  if (!value) {
    return "—";
  }

  return value
    .toLowerCase()
    .split("-")
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1)
    )
    .join(" ");
}