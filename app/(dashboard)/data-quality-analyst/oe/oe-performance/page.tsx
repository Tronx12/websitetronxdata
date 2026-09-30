"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { api } from "@/lib/api";

/* ============================================================
   TYPES
============================================================ */

interface Summary {
  totalSubmission: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  approvalRate: number;
  rejectionRate: number;
}

interface DailyRow {
  date: string;
  totalSubmission: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

interface ProjectRow {
  projectId: string;
  totalSubmission: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

interface EmployeeRow {
  employee: string;
  projectId: string;
  totalSubmission: number;
  approved: number;
  rejected: number;
  pending: number;
  approvalRate: number;
}

interface PerformanceResult {
  success: boolean;
  summary: Summary;
  daily: DailyRow[];
  projects: ProjectRow[];
  employees: EmployeeRow[];
}

interface OERecord {
  rowIndex: number;
  id: string;
  timestamp: string;
  date: string;
  memberName: string;
  pid: string;
  projectId: string;
  qNumber: string;
  oeResponse: string;
  dqaCorrection: string;
  status: "APPROVED" | "REJECTED" | "PENDING";
  approvedBy: string;
  actionTime: string;
  aiScore: string;
  aiReason: string;
  relScore: string;
  relReason: string;
  rejectReason: string;
  oldOEId: string;
  imageUrl: string;
  dqaViewedTime: string;
}

interface Filters {
  fromDate: string;
  toDate: string;
  projectId: string;
  employee: string;
  status: string;
}

interface ModalContext {
  date?: string;
  projectId?: string;
  employee?: string;
  status?: string;
  title: string;
}

interface FilterOptions {
  projects: string[];
  employees: string[];
}

/* ============================================================
   API LAYER
   Reuses the same `api()` helper as DqaView (from @/lib/api),
   which already handles calling the Apps Script proxy and
   unwrapping the { success, data, error } envelope — so this
   page talks to the backend exactly the same way DQA does.
============================================================ */

async function apiGetFilters(): Promise<FilterOptions> {
  return api<FilterOptions>("getOEPerformanceFilters");
}

async function apiGetPerformance(filters: Filters): Promise<PerformanceResult> {
  return api<PerformanceResult>("getOEPerformance", filters);
}

async function apiGetOEs(filters: Filters): Promise<OERecord[]> {
  return api<OERecord[]>("getPerformanceOEs", filters);
}

async function apiApproveOE(
  rowIndex: number,
  dqaName: string,
  correction: string
): Promise<{ success: boolean }> {
  return api<{ success: boolean }>("approveOE", {
    rowIndex,
    dqaName,
    correction,
  });
}

async function apiRejectOE(
  rowIndex: number,
  dqaName: string,
  reason: string
): Promise<{ success: boolean }> {
  return api<{ success: boolean }>("rejectOE", {
    rowIndex,
    dqaName,
    reason,
  });
}

/* ============================================================
   HELPERS
============================================================ */

function todayISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function formatDate(date: string): string {
  if (!date) return "";
  const parts = date.split("-");
  if (parts.length !== 3) return date;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

const emptyFilters = (): Filters => ({
  fromDate: todayISO(),
  toDate: todayISO(),
  projectId: "",
  employee: "",
  status: "",
});

/* ============================================================
   PAGE
============================================================ */

export default function OEPerformancePage() {
  const [filters, setFilters] = useState<Filters>(emptyFilters());
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    projects: [],
    employees: [],
  });
  const [data, setData] = useState<PerformanceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search box: filters the three result tables client-side
  const [search, setSearch] = useState("");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("OE Records");
  const [modalOEs, setModalOEs] = useState<OERecord[]>([]);
  const [modalSearch, setModalSearch] = useState("");
  const [modalLoading, setModalLoading] = useState(false);

  /* ---------------- load filter dropdowns ---------------- */

  useEffect(() => {
    apiGetFilters()
      .then(setFilterOptions)
      .catch((err) => console.error("Filter error:", err));
  }, []);

  /* ---------------- load performance data ---------------- */

  const loadPerformance = useCallback(async (f: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const result = await apiGetPerformance(f);
      if (!result || result.success !== true) {
        throw new Error("Unable to load performance data.");
      }
      setData(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPerformance(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function applyFilter() {
    loadPerformance(filters);
  }

  function resetFilters() {
    const fresh = emptyFilters();
    setFilters(fresh);
    setSearch("");
    loadPerformance(fresh);
  }

  /* ---------------- search filtering (client-side) ---------------- */

  const searchLower = search.trim().toLowerCase();

  const filteredDaily = useMemo(() => {
    if (!data) return [];
    if (!searchLower) return data.daily;
    return data.daily.filter((row) =>
      formatDate(row.date).toLowerCase().includes(searchLower)
    );
  }, [data, searchLower]);

  const filteredProjects = useMemo(() => {
    if (!data) return [];
    if (!searchLower) return data.projects;
    return data.projects.filter((row) =>
      row.projectId.toLowerCase().includes(searchLower)
    );
  }, [data, searchLower]);

  const filteredEmployees = useMemo(() => {
    if (!data) return [];
    if (!searchLower) return data.employees;
    return data.employees.filter(
      (row) =>
        row.employee.toLowerCase().includes(searchLower) ||
        row.projectId.toLowerCase().includes(searchLower)
    );
  }, [data, searchLower]);

  /* ---------------- modal: open OE list ---------------- */

  async function openOEs(ctx: ModalContext) {
    setModalLoading(true);
    setModalSearch("");
    try {
      const rows = await apiGetOEs({
        // A single-day drill-down collapses the range to that day;
        // the backend only understands fromDate/toDate, not a
        // standalone "date" filter.
        fromDate: ctx.date || filters.fromDate,
        toDate: ctx.date || filters.toDate,
        projectId: ctx.projectId || filters.projectId,
        employee: ctx.employee || filters.employee,
        status: ctx.status || "",
      });
      setModalOEs(rows || []);
      setModalTitle(ctx.title);
      setModalOpen(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Unable to load OEs: ${message}`);
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
  }

  const filteredModalOEs = useMemo(() => {
    const q = modalSearch.trim().toLowerCase();
    if (!q) return modalOEs;
    return modalOEs.filter(
      (oe) =>
        oe.id.toLowerCase().includes(q) ||
        oe.memberName.toLowerCase().includes(q) ||
        oe.pid.toLowerCase().includes(q) ||
        oe.qNumber.toLowerCase().includes(q) ||
        oe.oeResponse.toLowerCase().includes(q)
    );
  }, [modalOEs, modalSearch]);

  /* ---------------- approve / reject ---------------- */

  async function handleApprove(rowIndex: number) {
    const dqaName = prompt("Enter DQA name:");
    if (!dqaName || !dqaName.trim()) return;
    const correction = prompt("Correction (optional):") || "";

    setModalLoading(true);
    try {
      const result = await apiApproveOE(rowIndex, dqaName.trim(), correction);
      if (!result || result.success !== true) {
        throw new Error("Approval failed.");
      }
      alert("OE approved successfully.");
      closeModal();
      loadPerformance(filters);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Approval error: ${message}`);
    } finally {
      setModalLoading(false);
    }
  }

  async function handleReject(rowIndex: number) {
    const dqaName = prompt("Enter DQA name:");
    if (!dqaName || !dqaName.trim()) return;
    const reason = prompt("Enter rejection reason:");
    if (!reason || !reason.trim()) {
      alert("Rejection reason is required.");
      return;
    }

    setModalLoading(true);
    try {
      const result = await apiRejectOE(rowIndex, dqaName.trim(), reason.trim());
      if (!result || result.success !== true) {
        throw new Error("Rejection failed.");
      }
      alert("OE rejected successfully.");
      closeModal();
      loadPerformance(filters);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      alert(`Rejection error: ${message}`);
    } finally {
      setModalLoading(false);
    }
  }

  const busy = loading || modalLoading;
  const summary = data?.summary;

  /* ============================================================
     RENDER
  ============================================================ */

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {busy && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-white/70 font-bold">
          Loading...
        </div>
      )}

      <div className="mx-auto max-w-[1600px] p-6">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h4 className="text-[28px] font-bold">OE Performance</h4>
            <p className="mt-1 text-sm text-slate-500">
              Daily submission, approval and rejection performance
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Filters */}
        <div className="mb-5 grid grid-cols-1 gap-3.5 rounded-xl bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          <Field label="From Date">
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, fromDate: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
            />
          </Field>

          <Field label="To Date">
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) =>
                setFilters((f) => ({ ...f, toDate: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 px-2.5 outline-none focus:border-blue-600"
            />
          </Field>

          <Field label="Project ID">
            <select
              value={filters.projectId}
              onChange={(e) =>
                setFilters((f) => ({ ...f, projectId: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
            >
              <option value="">All Projects</option>
              {filterOptions.projects.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Employee">
            <select
              value={filters.employee}
              onChange={(e) =>
                setFilters((f) => ({ ...f, employee: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
            >
              <option value="">All Employees</option>
              {filterOptions.employees.map((emp) => (
                <option key={emp} value={emp}>
                  {emp}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Status">
            <select
              value={filters.status}
              onChange={(e) =>
                setFilters((f) => ({ ...f, status: e.target.value }))
              }
              className="h-10 w-full rounded-lg border border-slate-300 bg-white px-2.5 outline-none focus:border-blue-600"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </Field>

          <div className="flex items-end gap-2 lg:col-span-5">
            <button
              onClick={applyFilter}
              className="h-10 rounded-lg bg-blue-600 px-4.5 font-semibold text-white"
            >
              Apply Filter
            </button>
            <button
              onClick={resetFilters}
              className="h-10 rounded-lg bg-slate-100 px-4.5 font-semibold text-slate-700"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Search box */}
        <div className="mb-5 rounded-xl bg-white p-4 shadow-sm">
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">
            Search
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by date, project ID or employee..."
              className="h-10 w-full rounded-lg border border-slate-300 pl-9 pr-3 outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* KPI cards */}
        <div className="mb-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          <Card title="Total Submission" value={summary?.totalSubmission ?? 0} />
          <Card title="Approved" value={summary?.totalApproved ?? 0} />
          <Card title="Rejected" value={summary?.totalRejected ?? 0} />
          <Card title="Pending" value={summary?.totalPending ?? 0} />
          <Card title="Approval %" value={`${summary?.approvalRate ?? 0}%`} />
          <Card title="Rejection %" value={`${summary?.rejectionRate ?? 0}%`} />
        </div>

        {/* Daily Performance */}
        <Section title="Daily Performance">
          <table className="w-full min-w-[750px] border-collapse">
            <thead>
              <tr>
                <Th>Date</Th>
                <Th>Total Submission</Th>
                <Th>Approved</Th>
                <Th>Rejected</Th>
                <Th>Pending</Th>
                <Th>Approval %</Th>
              </tr>
            </thead>
            <tbody>
              {filteredDaily.length === 0 ? (
                <EmptyRow colSpan={6} text="No data found" />
              ) : (
                filteredDaily.map((row) => (
                  <tr key={row.date}>
                    <Td>{formatDate(row.date)}</Td>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          date: row.date,
                          title: `Date ${formatDate(row.date)}`,
                        })
                      }
                    >
                      {row.totalSubmission}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          date: row.date,
                          status: "APPROVED",
                          title: `Approved - ${formatDate(row.date)}`,
                        })
                      }
                    >
                      {row.approved}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          date: row.date,
                          status: "REJECTED",
                          title: `Rejected - ${formatDate(row.date)}`,
                        })
                      }
                    >
                      {row.rejected}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          date: row.date,
                          status: "PENDING",
                          title: `Pending - ${formatDate(row.date)}`,
                        })
                      }
                    >
                      {row.pending}
                    </ClickableTd>
                    <Td>{row.approvalRate}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        {/* Project Performance */}
        <Section title="Project / PID Performance">
          <table className="w-full min-w-[750px] border-collapse">
            <thead>
              <tr>
                <Th>Project ID</Th>
                <Th>Total Submission</Th>
                <Th>Approved</Th>
                <Th>Rejected</Th>
                <Th>Pending</Th>
                <Th>Approval %</Th>
              </tr>
            </thead>
            <tbody>
              {filteredProjects.length === 0 ? (
                <EmptyRow colSpan={6} text="No project data found" />
              ) : (
                filteredProjects.map((row) => (
                  <tr key={row.projectId}>
                    <Td>
                      <strong>{row.projectId}</strong>
                    </Td>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          projectId: row.projectId,
                          title: `Project ${row.projectId}`,
                        })
                      }
                    >
                      {row.totalSubmission}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          projectId: row.projectId,
                          status: "APPROVED",
                          title: `Approved - Project ${row.projectId}`,
                        })
                      }
                    >
                      {row.approved}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          projectId: row.projectId,
                          status: "REJECTED",
                          title: `Rejected - Project ${row.projectId}`,
                        })
                      }
                    >
                      {row.rejected}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          projectId: row.projectId,
                          status: "PENDING",
                          title: `Pending - Project ${row.projectId}`,
                        })
                      }
                    >
                      {row.pending}
                    </ClickableTd>
                    <Td>{row.approvalRate}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>

        {/* Employee Performance */}
        <Section title="Employee / Project Performance">
          <table className="w-full min-w-[750px] border-collapse">
            <thead>
              <tr>
                <Th>Employee</Th>
                <Th>Project ID</Th>
                <Th>Total Submission</Th>
                <Th>Approved</Th>
                <Th>Rejected</Th>
                <Th>Pending</Th>
                <Th>Approval %</Th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees.length === 0 ? (
                <EmptyRow colSpan={7} text="No employee data found" />
              ) : (
                filteredEmployees.map((row) => (
                  <tr key={`${row.employee}-${row.projectId}`}>
                    <Td>{row.employee}</Td>
                    <Td>{row.projectId}</Td>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          employee: row.employee,
                          projectId: row.projectId,
                          title: `${row.employee} - ${row.projectId}`,
                        })
                      }
                    >
                      {row.totalSubmission}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          employee: row.employee,
                          projectId: row.projectId,
                          status: "APPROVED",
                          title: `Approved - ${row.employee}`,
                        })
                      }
                    >
                      {row.approved}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          employee: row.employee,
                          projectId: row.projectId,
                          status: "REJECTED",
                          title: `Rejected - ${row.employee}`,
                        })
                      }
                    >
                      {row.rejected}
                    </ClickableTd>
                    <ClickableTd
                      onClick={() =>
                        openOEs({
                          employee: row.employee,
                          projectId: row.projectId,
                          status: "PENDING",
                          title: `Pending - ${row.employee}`,
                        })
                      }
                    >
                      {row.pending}
                    </ClickableTd>
                    <Td>{row.approvalRate}%</Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Section>
      </div>

      {/* OE Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[1000] flex bg-slate-900/55 p-8"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="m-auto max-h-[90vh] w-full max-w-[1200px] overflow-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-[2] flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4">
              <strong>{modalTitle}</strong>
              <button
                onClick={closeModal}
                className="h-9 w-9 rounded-lg bg-slate-100 text-lg text-slate-700"
              >
                ×
              </button>
            </div>

            <div className="px-5 pt-4">
              <input
                type="text"
                value={modalSearch}
                onChange={(e) => setModalSearch(e.target.value)}
                placeholder="Search these OEs by ID, employee, PID, Q# or response..."
                className="h-10 w-full rounded-lg border border-slate-300 px-3 outline-none focus:border-blue-600"
              />
            </div>

            <div>
              {filteredModalOEs.length === 0 ? (
                <div className="p-10 text-center text-slate-400">
                  No OE records found.
                </div>
              ) : (
                filteredModalOEs.map((oe) => (
                  <div
                    key={oe.rowIndex}
                    className="m-5 rounded-[10px] border border-slate-200 p-4"
                  >
                    <div className="mb-3 flex justify-between gap-4">
                      <div>
                        <strong>{oe.id}</strong>
                        <div className="text-xs text-slate-500">
                          Employee: {oe.memberName} &nbsp;|&nbsp; PID: {oe.pid}{" "}
                          &nbsp;|&nbsp; Q: {oe.qNumber}
                        </div>
                      </div>
                      <StatusBadge status={oe.status} />
                    </div>

                    <div className="mb-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 leading-relaxed">
                      {oe.oeResponse}
                    </div>

                    {oe.rejectReason && (
                      <div className="mb-3 text-xs text-slate-500">
                        <strong>Reject Reason:</strong> {oe.rejectReason}
                      </div>
                    )}

                    {oe.status === "PENDING" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(oe.rowIndex)}
                          className="h-10 rounded-lg bg-green-600 px-4.5 font-semibold text-white"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(oe.rowIndex)}
                          className="h-10 rounded-lg bg-red-600 px-4.5 font-semibold text-white"
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   SMALL PRESENTATIONAL COMPONENTS
============================================================ */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">
        {label}
      </label>
      {children}
    </div>
  );
}

function Card({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-xs font-semibold uppercase text-slate-500">
        {title}
      </div>
      <div className="mt-2 text-[28px] font-bold">{value}</div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-5 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <div className="text-[17px] font-bold">{title}</div>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-slate-200 bg-slate-50 px-4 py-3.5 text-left text-xs uppercase text-slate-500">
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="border-b border-slate-100 px-4 py-3.5 text-[13px]">
      {children}
    </td>
  );
}

function ClickableTd({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <td
      onClick={onClick}
      className="cursor-pointer border-b border-slate-100 px-4 py-3.5 text-[13px] font-bold text-blue-600 hover:underline"
    >
      {children}
    </td>
  );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="p-10 text-center text-slate-400">
        {text}
      </td>
    </tr>
  );
}

function StatusBadge({ status }: { status: OERecord["status"] }) {
  const styles: Record<OERecord["status"], string> = {
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-800",
    PENDING: "bg-amber-100 text-amber-800",
  };
  return (
    <span
      className={`inline-flex h-fit rounded-full px-2.5 py-1 text-[11px] font-bold ${styles[status]}`}
    >
      {status}
    </span>
  );
}