"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { LeaveSummaryData } from "@/types/leave";

type Leave = {
  _id: string;
  leaveType: "PAID" | "UNPAID";
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "CANCELLED";
  approvalHistory?: Array<{
    level: string;
    approverName?: string;
    action: string;
    comment?: string;
    actionAt: string;
  }>;
  createdAt: string;
};

interface Props {
  userId: string;
  role: string;
  name?: string;
  email: string;
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function LeaveManagementClient({
  userId,
  role,
  name,
  email,
}: Props) {
  const normalizedRole = (role || "").toLowerCase().replace(/_/g, "-");
  const now = new Date();

  const [activeTab, setActiveTab] = useState<"monthly" | "yearly" | "lifetime">("monthly");
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);

  const [summary, setSummary] = useState<LeaveSummaryData | null>(null);
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadData = useCallback(async (year: number, month: number) => {
    try {
      setLoading(true);
      setError("");

      const [summaryRes, leavesRes] = await Promise.all([
        fetch(`/api/leaves/summary?year=${year}&month=${month}`, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
        fetch("/api/leaves", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        }),
      ]);

      if (!summaryRes.ok) {
        const data = await summaryRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load leave summary");
      }

      if (!leavesRes.ok) {
        const data = await leavesRes.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to load leave requests");
      }

      const summaryData = await summaryRes.json();
      const leavesData = await leavesRes.json();

      setSummary(summaryData?.data ?? summaryData);
      setLeaves(Array.isArray(leavesData?.data) ? leavesData.data : Array.isArray(leavesData) ? leavesData : []);
    } catch (err) {
      console.error("Leave management load error:", err);
      setError(err instanceof Error ? err.message : "Unable to load leave data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedYear, selectedMonth);
  }, [loadData, selectedYear, selectedMonth]);

  async function handleCancelLeave(leaveId: string) {
    if (!window.confirm("Are you sure you want to cancel this leave request?")) {
      return;
    }

    try {
      setCancellingId(leaveId);
      setError("");
      setActionSuccess("");

      const res = await fetch(`/api/leaves/${leaveId}/cancel`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Cancelled by employee" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || "Failed to cancel leave");
      }

      setActionSuccess("Leave request cancelled successfully.");
      await loadData(selectedYear, selectedMonth);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel leave");
    } finally {
      setCancellingId(null);
    }
  }

  const filteredLeaves = leaves.filter((leave) => {
    if (statusFilter === "ALL") return true;
    return leave.status === statusFilter;
  });

  const canViewApprovals = [
    "team-lead",
    "senior-teamlead",
    // "data-quality-analyst",
    "hr",
    "admin",
  ].includes(normalizedRole);

  const applyLink = `/${normalizedRole}/leave-management/apply`;
  const approvalsLink = `/${normalizedRole}/leave-management/approvals`;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-2xl font-bold tracking-tight text-gray-900">
              Leave Management
            </h4>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200">
              {formatRole(role)}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Track monthly earned leaves, carry-forward balances, yearly breakdown & lifetime statistics.
          </p>
          {name && (
            <p className="mt-1 text-xs text-gray-600">
              Logged in as <span className="font-semibold text-gray-800">{name}</span> ({email})
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {canViewApprovals && (
            <Link
              href={approvalsLink}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 hover:text-gray-900"
            >
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Review Approvals
            </Link>
          )}

          <Link
            href={applyLink}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow transition hover:bg-blue-700"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Apply for Leave
          </Link>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold ml-2">×</button>
        </div>
      )}

      {actionSuccess && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800 flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess("")} className="text-green-600 hover:text-green-800 font-bold ml-2">×</button>
        </div>
      )}

      {/* Granularity & Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-4 rounded-xl border shadow-sm">
        {/* Tab Controls */}
        <div className="flex items-center rounded-lg bg-gray-100 p-1 border">
          <button
            type="button"
            onClick={() => setActiveTab("monthly")}
            className={`rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              activeTab === "monthly"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📅 Monthly Leave
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("yearly")}
            className={`rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              activeTab === "yearly"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            📊 Yearly Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("lifetime")}
            className={`rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition ${
              activeTab === "lifetime"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            🏆 Lifetime Record
          </button>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-2">
          {activeTab === "monthly" && (
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {MONTHS.map((m, idx) => (
                <option key={m} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
          )}

          {(activeTab === "monthly" || activeTab === "yearly") && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {[now.getFullYear() + 1, now.getFullYear(), now.getFullYear() - 1, now.getFullYear() - 2].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && !summary && (
        <div className="rounded-xl border bg-white p-8 text-center text-sm text-gray-500">
          Loading leave data...
        </div>
      )}

      {/* TAB 1: MONTHLY LEAVE */}
      {activeTab === "monthly" && summary?.monthly && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {summary.monthly.monthName} {summary.monthly.year} Leave Status
            </h2>
            <span className="text-xs text-gray-500">
              Rule: 1 Paid Leave per month if ≤ 3 absences. Unused leaves carry forward.
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              title="Total Available"
              value={summary.monthly.totalAvailable}
              subtext={`Earned (${summary.monthly.earned}) + Carried (${summary.monthly.carriedForward})`}
              highlight
            />

            <MetricCard
              title="Carried Forward"
              value={summary.monthly.carriedForward}
              subtext="From previous months"
              color="indigo"
            />

            <MetricCard
              title="This Month Earned"
              value={summary.monthly.earned}
              subtext={summary.monthly.eligible ? "Eligible (≤3 absent)" : "0 (Absences > 3)"}
              color={summary.monthly.eligible ? "green" : "red"}
            />

            <MetricCard
              title="Paid Used"
              value={summary.monthly.used}
              subtext="Approved this month"
              color="orange"
            />

            <MetricCard
              title="Remaining Balance"
              value={summary.monthly.remaining}
              subtext="Usable paid leaves"
              color="emerald"
            />

            <MetricCard
              title="Absent Days"
              value={summary.monthly.absentDays}
              subtext={summary.monthly.absentDays > 3 ? "Exceeded 3 days limit" : "Within limit"}
              color={summary.monthly.absentDays > 3 ? "red" : "gray"}
            />
          </div>

          {/* Status Message Banner */}
          {summary.monthly.eligible ? (
            <div className="rounded-xl border border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 text-sm text-green-900 flex items-start gap-3 shadow-sm">
              <span className="text-xl">✨</span>
              <div>
                <p className="font-semibold text-green-900">
                  You have earned 1 paid leave for {summary.monthly.monthName} {summary.monthly.year}!
                </p>
                <p className="mt-0.5 text-xs text-green-700">
                  Carried forward from previous months: <strong>{summary.monthly.carriedForward}</strong> | Total usable paid leaves: <strong>{summary.monthly.remaining}</strong>.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 p-4 text-sm text-amber-900 flex items-start gap-3 shadow-sm">
              <span className="text-xl">ℹ️</span>
              <div>
                <p className="font-semibold text-amber-900">
                  Current month paid leave not earned ({summary.monthly.absentDays} absent days &gt; 3 limit).
                </p>
                {summary.monthly.carriedForward > 0 ? (
                  <p className="mt-0.5 text-xs text-amber-800">
                    Good news: You still have <strong>{summary.monthly.carriedForward}</strong> carried-forward paid leaves available to use! (Remaining: <strong>{summary.monthly.remaining}</strong>)
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-amber-800">
                    You have no carried-forward paid leaves available. Any leaves taken this month will be unpaid.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: YEARLY OVERVIEW */}
      {activeTab === "yearly" && summary?.yearly && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {summary.yearly.year} Yearly Leave Summary
            </h2>
            <span className="text-xs text-gray-500">
              Full 12-Month Accumulation & Carry-Forward Track
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <MetricCard
              title="Yearly Earned"
              value={summary.yearly.totalEarned}
              subtext="Sum of eligible months"
              color="green"
            />

            <MetricCard
              title="Carried Into Year"
              value={summary.yearly.carriedForwardFromPrevYear}
              subtext="From previous year"
              color="indigo"
            />

            <MetricCard
              title="Paid Leaves Used"
              value={summary.yearly.totalPaidUsed}
              subtext="Total across year"
              color="orange"
            />

            <MetricCard
              title="Unpaid Leaves"
              value={summary.yearly.totalUnpaidUsed}
              subtext="Total unpaid days"
              color="gray"
            />

            <MetricCard
              title="Current Balance"
              value={summary.yearly.remainingBalance}
              subtext="Active usable leaves"
              color="emerald"
              highlight
            />

            <MetricCard
              title="Yearly Absent Days"
              value={summary.yearly.totalAbsentDays}
              subtext="Total absent days"
              color="red"
            />
          </div>

          {/* 12-Month Table */}
          <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
            <div className="border-b p-4">
              <h3 className="text-sm font-semibold text-gray-900">
                Monthly Breakdown ({summary.yearly.year})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-gray-50 border-b text-gray-600 font-medium">
                  <tr>
                    <th className="p-3">Month</th>
                    <th className="p-3">Absent Days</th>
                    <th className="p-3">Eligible?</th>
                    <th className="p-3">Earned</th>
                    <th className="p-3">Carried In</th>
                    <th className="p-3">Total Available</th>
                    <th className="p-3">Paid Used</th>
                    <th className="p-3">Unpaid Used</th>
                    <th className="p-3 font-semibold text-emerald-700">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y text-gray-700">
                  {summary.yearly.monthlyBreakdown.map((m) => (
                    <tr
                      key={m.month}
                      className={
                        m.month === selectedMonth && m.year === selectedYear
                          ? "bg-blue-50/60 font-medium"
                          : "hover:bg-gray-50"
                      }
                    >
                      <td className="p-3 font-semibold text-gray-900">
                        {m.monthName}
                        {m.month === (now.getMonth() + 1) && m.year === now.getFullYear() && (
                          <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            Current
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <span className={m.absentDays > 3 ? "text-red-600 font-bold" : "text-gray-700"}>
                          {m.absentDays}
                        </span>
                      </td>
                      <td className="p-3">
                        {m.eligible ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                            No (&gt;3 abs)
                          </span>
                        )}
                      </td>
                      <td className="p-3">{m.earned}</td>
                      <td className="p-3 text-indigo-600 font-medium">{m.carriedForward}</td>
                      <td className="p-3 font-semibold">{m.totalAvailable}</td>
                      <td className="p-3 text-orange-600">{m.used}</td>
                      <td className="p-3 text-gray-500">{m.unpaidUsed}</td>
                      <td className="p-3 font-bold text-emerald-600">{m.remaining}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LIFETIME RECORD */}
      {activeTab === "lifetime" && summary?.lifetime && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Lifetime Leave & Attendance Record
            </h2>
            <span className="text-xs text-gray-500">
              All-Time Career Statistics
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <MetricCard
              title="All-Time Earned"
              value={summary.lifetime.totalEarned}
              subtext="Total paid leaves accrued"
              color="green"
            />

            <MetricCard
              title="All-Time Paid Taken"
              value={summary.lifetime.totalPaidUsed}
              subtext="Approved paid leaves"
              color="orange"
            />

            <MetricCard
              title="All-Time Unpaid"
              value={summary.lifetime.totalUnpaidUsed}
              subtext="Unpaid leave days"
              color="gray"
            />

            <MetricCard
              title="Current Balance"
              value={summary.lifetime.currentBalance}
              subtext="Currently usable balance"
              color="emerald"
              highlight
            />

            <MetricCard
              title="All-Time Absent Days"
              value={summary.lifetime.totalAbsentDays}
              subtext="Recorded absent days"
              color="red"
            />
          </div>

          {/* Request Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-4 rounded-xl border">
            <div className="p-3 rounded-lg bg-gray-50 text-center">
              <div className="text-xs text-gray-500">Total Applications</div>
              <div className="text-xl font-bold text-gray-800 mt-1">{summary.lifetime.totalLeaveRequests}</div>
            </div>
            <div className="p-3 rounded-lg bg-green-50 text-center">
              <div className="text-xs text-green-700">Approved</div>
              <div className="text-xl font-bold text-green-800 mt-1">{summary.lifetime.approvedRequests}</div>
            </div>
            <div className="p-3 rounded-lg bg-yellow-50 text-center">
              <div className="text-xs text-yellow-700">Pending Approval</div>
              <div className="text-xl font-bold text-yellow-800 mt-1">{summary.lifetime.pendingRequests}</div>
            </div>
            <div className="p-3 rounded-lg bg-red-50 text-center">
              <div className="text-xs text-red-700">Rejected / Cancelled</div>
              <div className="text-xl font-bold text-red-800 mt-1">
                {summary.lifetime.rejectedRequests + summary.lifetime.cancelledRequests}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              My Leave Requests
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              All leave requests submitted by your account.
            </p>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {["ALL", "PENDING_APPROVAL", "APPROVED", "REJECTED", "CANCELLED"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                  statusFilter === st
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {st === "ALL" ? "All" : st.replace("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase())}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-semibold text-gray-600">
                <th className="whitespace-nowrap p-4">Type</th>
                <th className="whitespace-nowrap p-4">Duration</th>
                <th className="whitespace-nowrap p-4">Days</th>
                <th className="whitespace-nowrap p-4">Reason</th>
                <th className="whitespace-nowrap p-4">Status</th>
                <th className="whitespace-nowrap p-4">Audit / Approvals</th>
                <th className="whitespace-nowrap p-4 text-right">Action</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredLeaves.map((leave) => (
                <tr key={leave._id} className="hover:bg-gray-50/70 transition">
                  <td className="p-4">
                    <LeaveTypeBadge type={leave.leaveType} />
                  </td>

                  <td className="whitespace-nowrap p-4 text-gray-700">
                    <div className="font-medium">{formatDate(leave.startDate)}</div>
                    <div className="text-xs text-gray-400">to {formatDate(leave.endDate)}</div>
                  </td>

                  <td className="p-4 font-semibold text-gray-800">
                    {leave.totalDays} {leave.totalDays === 1 ? "day" : "days"}
                  </td>

                  <td className="p-4 text-gray-600 max-w-xs truncate" title={leave.reason}>
                    {leave.reason}
                  </td>

                  <td className="p-4">
                    <StatusBadge status={leave.status} />
                  </td>

                  <td className="p-4 text-xs text-gray-500">
                    {leave.approvalHistory && leave.approvalHistory.length > 0 ? (
                      <div>
                        <div className="font-medium text-gray-700">
                          {leave.approvalHistory[leave.approvalHistory.length - 1].action} by{" "}
                          {leave.approvalHistory[leave.approvalHistory.length - 1].approverName || "Approver"}
                        </div>
                        {leave.approvalHistory[leave.approvalHistory.length - 1].comment && (
                          <div className="text-gray-500 italic mt-0.5 truncate max-w-xs" title={leave.approvalHistory[leave.approvalHistory.length - 1].comment}>
                            &ldquo;{leave.approvalHistory[leave.approvalHistory.length - 1].comment}&rdquo;
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Awaiting review</span>
                    )}
                  </td>

                  <td className="p-4 text-right">
                    {leave.status === "PENDING_APPROVAL" ? (
                      <button
                        type="button"
                        onClick={() => handleCancelLeave(leave._id)}
                        disabled={cancellingId === leave._id}
                        className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                      >
                        {cancellingId === leave._id ? "Cancelling..." : "Cancel"}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}

              {!filteredLeaves.length && (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-gray-400">
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
   METRIC CARD
========================================================= */

function MetricCard({
  title,
  value,
  subtext,
  color = "blue",
  highlight = false,
}: {
  title: string;
  value: number | string;
  subtext?: string;
  color?: "blue" | "green" | "red" | "orange" | "emerald" | "indigo" | "gray";
  highlight?: boolean;
}) {
  const colorMap = {
    blue: "text-blue-600",
    green: "text-green-600",
    red: "text-red-600",
    orange: "text-orange-600",
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
    gray: "text-gray-700",
  };

  return (
    <div
      className={`rounded-xl border p-4 shadow-sm transition bg-white ${
        highlight ? "ring-2 ring-blue-500/20 border-blue-200" : ""
      }`}
    >
      <div className="text-xs font-medium text-gray-500 truncate">{title}</div>
      <div className={`mt-2 text-2xl font-bold tracking-tight ${colorMap[color]}`}>
        {value}
      </div>
      {subtext && <div className="mt-1 text-[11px] text-gray-400 truncate">{subtext}</div>}
    </div>
  );
}

/* =========================================================
   BADGES & FORMATTERS
========================================================= */

function LeaveTypeBadge({ type }: { type: "PAID" | "UNPAID" }) {
  if (type === "PAID") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
        Paid Leave
      </span>
    );
  }

  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
      Unpaid Leave
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return (
        <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
          Approved
        </span>
      );
    case "PENDING_APPROVAL":
      return (
        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
          Pending Approval
        </span>
      );
    case "REJECTED":
      return (
        <span className="inline-flex rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">
          Rejected
        </span>
      );
    case "CANCELLED":
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600">
          Cancelled
        </span>
      );
    default:
      return (
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
          {status}
        </span>
      );
  }
}

function formatDate(value: string | Date) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRole(role?: string) {
  if (!role) return "Employee";
  return role
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}