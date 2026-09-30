"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Summary = {
  absentDays: number;
  monthlyEntitlement: number;
  eligible: boolean;
  used: number;
  remaining: number;
};

type Leave = {
  _id: string;
  leaveType: "PAID" | "UNPAID";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  currentApprovalLevel?: string | null;
  createdAt: string;
};

interface Props {
  userId: string;
  role: string;
  name?: string;
  email: string;
}

export default function LeaveManagementClient({
  userId,
  role,
  name,
  email,
}: Props) {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        setError("");

        if (!userId) {
          setError("Authenticated user not found.");
          return;
        }

        const [summaryRes, leavesRes] = await Promise.all([
          fetch(`/api/leaves/summary?userId=${encodeURIComponent(userId)}`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),

          fetch(`/api/leaves?userId=${encodeURIComponent(userId)}`, {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }),
        ]);

        if (!summaryRes.ok) {
          const data = await safeJson(summaryRes);

          throw new Error(
            data?.message || "Failed to load leave summary"
          );
        }

        if (!leavesRes.ok) {
          const data = await safeJson(leavesRes);

          throw new Error(
            data?.message || "Failed to load leave requests"
          );
        }

        const summaryData = await summaryRes.json();
        const leavesData = await leavesRes.json();

        /*
         * Support both:
         *
         * { ...summary }
         *
         * and
         *
         * { success: true, data: {...summary} }
         */
        const normalizedSummary =
          summaryData?.data ?? summaryData;

        const normalizedLeaves =
          leavesData?.data ?? leavesData;

        setSummary(normalizedSummary);

        setLeaves(
          Array.isArray(normalizedLeaves)
            ? normalizedLeaves
            : []
        );
      } catch (error) {
        console.error("Leave management load error:", error);

        setError(
          error instanceof Error
            ? error.message
            : "Unable to load leave data"
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="rounded-xl border bg-white p-6">
          <div className="text-sm text-gray-500">
            Loading leave management...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h4 className="text-2xl font-semibold">
            Leave Management
          </h4>

          <p className="mt-1 text-sm text-gray-500">
            Manage your monthly leave and leave requests.
          </p>

          {name && (
            <p className="mt-1 text-sm text-gray-600">
              Welcome,{" "}
              <span className="font-medium">{name}</span>
            </p>
          )}
        </div>

        <Link
          href="/survey-tester/leave-management/apply"
          className="inline-flex w-fit items-center rounded-lg bg-red-400 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-400"
        >
          Apply for Leave
        </Link>
      </div>

      {/* User information */}
      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 text-sm md:grid-cols-3">
          <div>
            <div className="text-gray-500">Employee</div>
            <div className="font-medium">
              {name || "—"}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Email</div>
            <div className="font-medium">
              {email}
            </div>
          </div>

          <div>
            <div className="text-gray-500">Role</div>
            <div className="font-medium">
              {formatRole(role)}
            </div>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card
              title="Monthly Paid Leave"
              value={String(summary.monthlyEntitlement)}
            />

            <Card
              title="Paid Leave Used"
              value={String(summary.used)}
            />

            <Card
              title="Remaining"
              value={String(summary.remaining)}
            />

            <Card
              title="Absent Days"
              value={String(summary.absentDays)}
            />
          </div>

          {!summary.eligible && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800">
              Paid leave is unavailable because you have
              more than 3 absent days this month.
            </div>
          )}

          {summary.eligible &&
            summary.remaining > 0 && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
                You currently have{" "}
                <strong>{summary.remaining}</strong>{" "}
                paid leave remaining this month.
              </div>
            )}
        </>
      )}

      {/* Leave requests */}
      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="border-b p-4">
          <h2 className="font-semibold">
            My Leave Requests
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            All leave requests submitted by your account.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left">
                <th className="whitespace-nowrap p-4">
                  Type
                </th>

                <th className="whitespace-nowrap p-4">
                  From
                </th>

                <th className="whitespace-nowrap p-4">
                  To
                </th>

                <th className="whitespace-nowrap p-4">
                  Days
                </th>

                <th className="whitespace-nowrap p-4">
                  Status
                </th>

                <th className="whitespace-nowrap p-4">
                  Approval
                </th>
              </tr>
            </thead>

            <tbody>
              {leaves.map((leave) => (
                <tr
                  key={leave._id}
                  className="border-b last:border-b-0 hover:bg-gray-50"
                >
                  <td className="p-4">
                    <LeaveTypeBadge
                      type={leave.leaveType}
                    />
                  </td>

                  <td className="whitespace-nowrap p-4">
                    {formatDate(leave.startDate)}
                  </td>

                  <td className="whitespace-nowrap p-4">
                    {formatDate(leave.endDate)}
                  </td>

                  <td className="p-4">
                    {leave.totalDays}
                  </td>

                  <td className="p-4">
                    <StatusBadge
                      status={leave.status}
                    />
                  </td>

                  <td className="p-4">
                    <span className="text-xs font-medium text-gray-600">
                      {formatApprovalLevel(
                        leave.currentApprovalLevel
                      )}
                    </span>
                  </td>
                </tr>
              ))}

              {!leaves.length && (
                <tr>
                  <td
                    colSpan={6}
                    className="p-10 text-center text-gray-500"
                  >
                    No leave requests found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   CARD
========================================================= */

function Card({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-5">
      <div className="text-sm text-gray-500">
        {title}
      </div>

      <div className="mt-2 text-2xl font-semibold">
        {value}
      </div>
    </div>
  );
}

/* =========================================================
   LEAVE TYPE
========================================================= */

function LeaveTypeBadge({
  type,
}: {
  type: "PAID" | "UNPAID";
}) {
  if (type === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700">
        Paid
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
      Unpaid
    </span>
  );
}

/* =========================================================
   STATUS
========================================================= */

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized = status.toUpperCase();

  let className =
    "bg-gray-100 text-gray-700";

  if (normalized === "APPROVED") {
    className =
      "bg-green-100 text-green-700";
  } else if (normalized === "REJECTED") {
    className =
      "bg-red-100 text-red-700";
  } else if (normalized === "CANCELLED") {
    className =
      "bg-gray-100 text-gray-600";
  } else if (normalized.startsWith("PENDING")) {
    className =
      "bg-yellow-100 text-yellow-700";
  }

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${className}`}
    >
      {formatStatus(status)}
    </span>
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

function formatApprovalLevel(
  value?: string | null
) {
  if (!value) {
    return "Completed";
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

async function safeJson(
  response: Response
) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}