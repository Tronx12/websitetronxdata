"use client";

import React, { useState } from "react";
import { Download, Loader2, X, Calendar, FileSpreadsheet, CheckCircle2 } from "lucide-react";

interface MonthlySubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamId?: string | null;
}

export default function MonthlySubmissionModal({
  isOpen,
  onClose,
  teamId,
}: MonthlySubmissionModalProps) {
  // Current month format: YYYY-MM
  const getCurrentMonthStr = () => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const getPreviousMonthStr = () => {
    const now = new Date();
    now.setMonth(now.getMonth() - 1);
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthStr);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute 1st and last day for display
  const getDisplayRange = (monthStr: string) => {
    try {
      const [yStr, mStr] = monthStr.split("-");
      const y = Number(yStr);
      const m = Number(mStr) - 1;
      const firstDate = new Date(y, m, 1);
      const lastDate = new Date(y, m + 1, 0);

      const format = (d: Date) =>
        d.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });

      return `${format(firstDate)} — ${format(lastDate)}`;
    } catch {
      return "";
    }
  };

  const handleDownload = async () => {
    if (!selectedMonth) {
      setError("Please select a month to download.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        month: selectedMonth,
      });

      if (teamId && teamId !== "all") {
        params.append("teamId", teamId);
      }

      const res = await fetch(
        `/api/survey/monthly-submission-report?${params.toString()}`
      );

      if (!res.ok) {
        let msg = "Failed to download monthly submission report.";
        try {
          const json = await res.json();
          if (json.message) msg = json.message;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }

      const blob = await res.blob();
      if (!blob.size) {
        throw new Error("The report returned empty data.");
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `monthly-submission-report-${selectedMonth}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to download report");
    } finally {
      setLoading(false);
    }
  };

  const columnsList = [
    "S.no.",
    "TNX Project ID",
    "Study Type",
    "parents id",
    "child id",
    "respondents id",
    "status",
    "count",
    "note",
  ];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl transition-all dark:bg-gray-900 border border-gray-100 dark:border-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                Monthly Submission Report
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Download month-wise submission report (1st to last date of month)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        {/* Month Selection */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Select Month
            </label>
            <div className="relative">
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm font-semibold text-gray-800 shadow-xs focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </div>
            <p className="mt-1.5 text-xs text-gray-500">
              Covering: <strong className="text-gray-800 dark:text-gray-200">{getDisplayRange(selectedMonth)}</strong>
            </p>
          </div>

          {/* Quick Shortcuts */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Quick Select:</span>
            <button
              type="button"
              onClick={() => setSelectedMonth(getCurrentMonthStr())}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedMonth === getCurrentMonthStr()
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              Current Month
            </button>
            <button
              type="button"
              onClick={() => setSelectedMonth(getPreviousMonthStr())}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                selectedMonth === getPreviousMonthStr()
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300"
              }`}
            >
              Previous Month
            </button>
          </div>

          {/* Export Fields Spec */}
          <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-3.5 dark:border-gray-800 dark:bg-gray-800/40">
            <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 dark:text-gray-300 mb-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Exported Columns in Exact Order:</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {columnsList.map((col, idx) => (
                <span
                  key={col}
                  className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-2xs border border-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
                >
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
                    {idx + 1}.
                  </span>
                  {col}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-3 border-t pt-4 dark:border-gray-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={loading || !selectedMonth}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Excel...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download Report (.xlsx)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
