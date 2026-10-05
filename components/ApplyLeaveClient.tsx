"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LeaveSummaryData } from "@/types/leave";

interface Props {
  role: string;
}

export default function ApplyLeaveClient({ role }: Props) {
  const router = useRouter();
  const normalizedRole = (role || "").toLowerCase().replace(/_/g, "-");
  const backLink = `/${normalizedRole}/leave-management`;

  const [leaveType, setLeaveType] = useState<"PAID" | "UNPAID">("PAID");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [summary, setSummary] = useState<LeaveSummaryData | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">("error");

  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryLoading(true);
        const res = await fetch("/api/leaves/summary", {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.message || "Failed to load leave summary");
        }

        setSummary(data?.data ?? data);
      } catch (err) {
        console.error("Leave summary error:", err);
      } finally {
        setSummaryLoading(false);
      }
    }

    loadSummary();
  }, []);

  // Calculate requested days
  let requestedDays = 0;
  if (startDate && endDate && endDate >= startDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    s.setHours(0, 0, 0, 0);
    e.setHours(0, 0, 0, 0);
    requestedDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      if (!startDate) throw new Error("Please select the start date.");
      if (!endDate) throw new Error("Please select the end date.");
      if (endDate < startDate) throw new Error("End date cannot be before start date.");
      if (!reason.trim()) throw new Error("Please enter a reason for your leave.");

      if (leaveType === "PAID" && summary) {
        if (summary.remaining <= 0) {
          if (!summary.eligible) {
            throw new Error(
              "Paid leave is unavailable because you have more than 3 absent days this month."
            );
          }
          throw new Error("You have no paid leave remaining.");
        }

        if (requestedDays > summary.remaining) {
          throw new Error(
            `You requested ${requestedDays} paid leave day(s), but only have ${summary.remaining} available.`
          );
        }
      }

      setLoading(true);

      const response = await fetch("/api/leaves", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          leaveType,
          startDate,
          endDate,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || "Failed to submit leave request.");
      }

      setMessage("Leave application submitted successfully! Redirecting...");
      setMessageType("success");

      setTimeout(() => {
        router.push(backLink);
        router.refresh();
      }, 1200);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Unable to submit leave request.");
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6 space-y-6">
      {/* Back button & Header */}
      <div>
        <Link
          href={backLink}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Leave Management
        </Link>
        <h4 className="mt-3 text-2xl font-bold tracking-tight text-gray-900">
          Apply for Leave
        </h4>
        <p className="mt-1 text-sm text-gray-500">
          Submit a leave request for supervisor and management approval.
        </p>
      </div>

      {/* Summary / Balance Card */}
      {summaryLoading ? (
        <div className="rounded-xl border bg-white p-6 text-sm text-gray-500">
          Loading your leave balance...
        </div>
      ) : summary ? (
        <div className="rounded-xl border bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="font-semibold text-gray-800 text-sm">
              Your Current Paid Leave Balance ({summary.monthly?.monthName || "Current Month"} {summary.year})
            </h2>
            <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              {summary.remaining} Available
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-gray-50">
              <div className="text-gray-500">Earned This Month</div>
              <div className="text-base font-bold text-gray-800 mt-0.5">{summary.earned}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-orange-50">
              <div className="text-orange-600">Used This Month</div>
              <div className="text-base font-bold text-orange-700 mt-0.5">{summary.used}</div>
            </div>
            <div className="p-2.5 rounded-lg bg-emerald-50">
              <div className="text-emerald-700 font-semibold">Total Usable</div>
              <div className="text-base font-bold text-emerald-800 mt-0.5">{summary.remaining}</div>
            </div>
          </div>



          {!summary.eligible && (
            <div className="text-xs text-amber-800 bg-amber-50 p-2.5 rounded-lg border border-amber-200 flex items-center gap-2">
              <span>ℹ️</span>
              <span>
                Absences this month: <strong>{summary.absentDays}</strong> (&gt;3). Current month paid leave is 0.
                {summary.remaining > 0
                  ? " You can still apply for Unpaid Leave."
                  : " Any leave applied will be Unpaid Leave."}
              </span>
            </div>
          )}
        </div>
      ) : null}

      {/* Error / Success Feedback */}
      {message && (
        <div
          className={`rounded-lg border p-4 text-sm font-medium ${
            messageType === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* Application Form */}
      <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border bg-white p-6 shadow-sm">
        {/* Leave Type */}
        <div>
          <label htmlFor="leaveType" className="block text-sm font-medium text-gray-700 mb-1.5">
            Leave Type <span className="text-red-500">*</span>
          </label>
          <select
            id="leaveType"
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as "PAID" | "UNPAID")}
            disabled={loading}
            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="PAID">Paid Leave (Deducts from available balance)</option>
            <option value="UNPAID">Unpaid Leave</option>
          </select>
        </div>

        {/* Date Pickers */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1.5">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1.5">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Duration Preview */}
        {requestedDays > 0 && (
          <div className="rounded-lg bg-blue-50/70 p-3 border border-blue-100 flex items-center justify-between text-xs sm:text-sm">
            <span className="text-blue-900 font-medium">
              Requested Duration: <strong>{requestedDays} {requestedDays === 1 ? "day" : "days"}</strong>
            </span>
            {leaveType === "PAID" && summary && (
              <span className={requestedDays <= summary.remaining ? "text-emerald-700 font-semibold" : "text-red-600 font-semibold"}>
                {requestedDays <= summary.remaining
                  ? `✓ Covered by balance (${summary.remaining - requestedDays} remaining after)`
                  : `⚠️ Exceeds available balance (${summary.remaining})`}
              </span>
            )}
          </div>
        )}

        {/* Reason */}
        <div>
          <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1.5">
            Reason for Leave <span className="text-red-500">*</span>
          </label>
          <textarea
            id="reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={loading}
            maxLength={1000}
            placeholder="Please specify the reason for taking leave..."
            className="w-full rounded-lg border border-gray-300 p-3 text-sm text-gray-800 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-y"
          />
          <div className="mt-1 text-right text-xs text-gray-400">
            {reason.length}/1000 characters
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link
            href={backLink}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition"
          >
            Cancel
          </Link>

          <button
            type="submit"
            disabled={loading || summaryLoading}
            className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50 transition min-w-[120px]"
          >
            {loading ? "Submitting..." : "Submit Application"}
          </button>
        </div>
      </form>
    </div>
  );
}
