


"use client";

// components/AttendanceDashboard.tsx
// Install once:  npm i recharts
// Use in a page: app/attendence/dashboard/page.tsx
//   import AttendanceDashboard from "@/components/AttendanceDashboard";
//   export default function Page() { return <AttendanceDashboard />; }
//
// Same API contract as before: GET /api/attendence/dashboard?date=YYYY-MM-DD&shift=all|day|night

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Status =
  | "Present"
  | "Late"
  | "Half Day"
  | "Leave"
  | "Absent"
  | "Office Off"; // "Not Marked" from the API is merged into Absent (see normalize)

type LunchState = "none" | "on" | "completed" | "exceeded" | "overdue";

interface LunchInfo {
  state: LunchState;
  minutes: number | null;
}

interface ShiftStats {
  total: number;
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  notMarked: number;
  officeOff: number;
  attendancePercentage: number;
}

interface EmployeeRow {
  _id: string;
  name: string;
  employeeId: string;
  email: string;
  role: string;
  workingShift: "day" | "night";
  loginTime: string | null;
  logoutTime: string | null;
  status: Status;
  attendanceId: string | null;
  lunchStart: string | null;
  lunchEnd: string | null;
  lunchMinutes: number | null;
  statusNote?: string | null;
  lateByMinutes?: number | null;
}

interface DashboardData {
  date: string;
  summary: {
    totalEmployees: number;
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    notMarked: number;
    officeOff: number;
    attendancePercentage: number;
  };
  shiftWise: { day: ShiftStats; night: ShiftStats };
  employees: EmployeeRow[];
}

type EmpWithLunch = EmployeeRow & { lunch: LunchInfo };

type SortKey =
  | "name"
  | "role"
  | "shift"
  | "login"
  | "logout"
  | "lunch"
  | "status";

/* ------------------------------------------------------------------ */
/* Constants + helpers                                                 */
/* ------------------------------------------------------------------ */

const STATUS_COLORS: Record<Status, string> = {
  Present: "#0f9d7a",
  Late: "#e0a100",
  "Half Day": "#7c5cd6",
  Leave: "#2f7de1",
  Absent: "#d9475f",
  "Office Off": "#7a869a",
};

const STATUS_ORDER: Status[] = [
  "Present",
  "Late",
  "Half Day",
  "Leave",
  "Absent",
  "Office Off",
];

const LUNCH_LIMIT = 35; // minutes
const PAGE_SIZE = 15;

const LUNCH_BADGE: Record<LunchState, { label: string; color: string }> = {
  none: { label: "Not started", color: "#aab2bd" },
  on: { label: "On lunch", color: "#2f7de1" },
  completed: { label: "Completed", color: "#0f9d7a" },
  exceeded: { label: "Exceeded", color: "#e0a100" },
  overdue: { label: "Not ended", color: "#d9475f" },
};

const LUNCH_ORDER: LunchState[] = [
  "none",
  "on",
  "completed",
  "exceeded",
  "overdue",
];

const ROLE_PALETTE = [
  "#2f7de1",
  "#0f9d7a",
  "#7c5cd6",
  "#e0a100",
  "#d9475f",
  "#16a3b8",
  "#c2632b",
  "#6b7686",
];

const isAttended = (s: Status) =>
  s === "Present" || s === "Late" || s === "Half Day";

// Live lunch state: if lunch started and not ended, minutes keep counting up.
const getLunch = (e: EmployeeRow, now: number): LunchInfo => {
  if (!e.lunchStart) return { state: "none", minutes: null };
  const start = new Date(e.lunchStart).getTime();
  if (Number.isNaN(start)) return { state: "none", minutes: null };

  if (e.lunchEnd) {
    const end = new Date(e.lunchEnd).getTime();
    const m = e.lunchMinutes ?? Math.round((end - start) / 60000);
    return { state: m > LUNCH_LIMIT ? "exceeded" : "completed", minutes: m };
  }
  const m = Math.max(0, Math.floor((now - start) / 60000));
  return { state: m > LUNCH_LIMIT ? "overdue" : "on", minutes: m };
};

const formatDuration = (m: number | null) => {
  if (m === null) return "—";
  if (m < 60) return `${m}m`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const pad = (n: number) => String(n).padStart(2, "0");

const toISO = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const todayISO = () => toISO(new Date());

const shiftDate = (iso: string, days: number) => {
  const [y, m, d] = iso.split("-").map(Number);
  return toISO(new Date(y, m - 1, d + days));
};

const formatTime = (value: string | null) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const timeValue = (value: string | null) => {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
};

const csvCell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const pct = (part: number, total: number) =>
  total > 0 ? Math.round((part / total) * 100) : 0;

/* ------------------------------------------------------------------ */
/* Shift timing (office: 9:30 – 6:00)                                  */
/* Day   : 9:30 AM → 6:00 PM (same day)                                */
/* Night : 9:30 PM → 6:00 AM (ends NEXT day, belongs to start date)    */
/* ------------------------------------------------------------------ */

type ShiftMode = "active" | "all" | "day" | "night";

const DAY_START = 9 * 60 + 30;
const DAY_END = 18 * 60;
const NIGHT_START = 21 * 60 + 30;
const NIGHT_END = 6 * 60;

const SHIFT_TEXT = {
  day: "9:30 AM – 6:00 PM",
  night: "9:30 PM – 6:00 AM",
};

const parseISO = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// The shift that started most recently, whether it is still running,
// and the "business date" it belongs to. A night shift that started at
// 9:30 PM on 1 Oct is still the 1 Oct shift at 2 AM on 2 Oct.
const getShiftContext = (ms: number) => {
  const d = new Date(ms);
  const m = d.getHours() * 60 + d.getMinutes();
  const iso = toISO(d);

  let focus: "day" | "night";
  let live: boolean;
  if (m >= DAY_START && m < NIGHT_START) {
    focus = "day";
    live = m < DAY_END;
  } else {
    focus = "night";
    live = m >= NIGHT_START || m < NIGHT_END;
  }
  const businessDate = m < DAY_START ? shiftDate(iso, -1) : iso;
  const next = live ? null : focus === "day" ? "night" : "day";
  return { focus, live, businessDate, next } as const;
};

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

// Time label; adds "(+1d)" when the punch happened on a later calendar day
// than the shift's date (e.g. night logout at 6:02 AM on 2 Oct for 1 Oct).
const formatTimeOn = (value: string | null, baseISO: string) => {
  const base = formatTime(value);
  if (!value || base === "—") return base;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return base;
  const diff = Math.round(
    (startOfDay(d) - startOfDay(parseISO(baseISO))) / 86400000
  );
  return diff > 0 ? `${base} (+${diff}d)` : base;
};

// Anyone with no attendance mark counts as Absent.
const normalize = (d: DashboardData): DashboardData => {
  const fix = (s: ShiftStats): ShiftStats => ({
    ...s,
    absent: s.absent + s.notMarked,
    notMarked: 0,
    officeOff: s.officeOff ?? 0,
  });
  return {
    ...d,
    summary: {
      ...d.summary,
      absent: d.summary.absent + d.summary.notMarked,
      notMarked: 0,
      officeOff: d.summary.officeOff ?? 0,
    },
    shiftWise: { day: fix(d.shiftWise.day), night: fix(d.shiftWise.night) },
    employees: d.employees.map((e) => ({
      ...e,
      loginTime: e.loginTime ?? (e as any).loggingTime ?? null,
      status: (e.status as string) === "Not Marked" ? "Absent" : e.status,
    })),
  };
};

const statsFor = (list: EmployeeRow[]): ShiftStats => {
  const c = { present: 0, late: 0, halfDay: 0, leave: 0, absent: 0, officeOff: 0 };
  list.forEach((e) => {
    if (e.status === "Present") c.present++;
    else if (e.status === "Late") c.late++;
    else if (e.status === "Half Day") c.halfDay++;
    else if (e.status === "Leave") c.leave++;
    else if (e.status === "Office Off") c.officeOff++;
    else c.absent++;
  });
  const total = list.length;
  const attended = c.present + c.late + c.halfDay;
  return {
    total,
    ...c,
    notMarked: 0,
    attendancePercentage:
      total - c.officeOff > 0
        ? Math.round((attended / (total - c.officeOff)) * 1000) / 10
        : 0,
  };
};

const isShift = (e: EmployeeRow, k: "day" | "night") =>
  String(e.workingShift).toLowerCase() === k;

// Rebuild summary + shift stats from the employee list for the chosen shift
const derive = (d: DashboardData, shift: "all" | "day" | "night"): DashboardData => {
  const list =
    shift === "all" ? d.employees : d.employees.filter((e) => isShift(e, shift));
  const s = statsFor(list);
  return {
    ...d,
    employees: list,
    summary: {
      totalEmployees: s.total,
      present: s.present,
      absent: s.absent,
      late: s.late,
      halfDay: s.halfDay,
      leave: s.leave,
      officeOff: s.officeOff,
      notMarked: 0,
      attendancePercentage: s.attendancePercentage,
    },
    shiftWise: {
      day: statsFor(d.employees.filter((e) => isShift(e, "day"))),
      night: statsFor(d.employees.filter((e) => isShift(e, "night"))),
    },
  };
};

/* ------------------------------------------------------------------ */
/* Small chart helpers                                                 */
/* ------------------------------------------------------------------ */

const RADIAN = Math.PI / 180;

// Percentage label drawn on the donut ring (hidden for thin slices)
const renderRingLabel = (p: any) => {
  if (p.percent < 0.07) return null;
  const r = p.innerRadius + (p.outerRadius - p.innerRadius) / 2;
  const x = p.cx + r * Math.cos(-p.midAngle * RADIAN);
  const y = p.cy + r * Math.sin(-p.midAngle * RADIAN);
  return (
    <text
      x={x}
      y={y}
      fill="#fff"
      fontSize={12}
      fontWeight={700}
      textAnchor="middle"
      dominantBaseline="central"
    >
      {Math.round(p.percent * 100)}%
    </text>
  );
};

function PieTip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const total = p.payload.__total as number;
  return (
    <div className="ad-tip">
      <i style={{ background: p.payload.fill || p.payload.color }} />
      <span>{p.name}</span>
      <b>
        {p.value}
        {total ? ` · ${pct(p.value, total)}%` : ""}
      </b>
    </div>
  );
}

interface DonutDatum {
  name: string;
  value: number;
  color: string;
}

function Donut({
  data,
  centerValue,
  centerLabel,
  onSlice,
  height = 260,
  label = true,
}: {
  data: DonutDatum[];
  centerValue: string | number;
  centerLabel: string;
  onSlice?: (name: string) => void;
  height?: number;
  label?: boolean;
}) {
  const visible = data.filter((d) => d.value > 0);
  const total = visible.reduce((a, b) => a + b.value, 0);
  const withTotal = visible.map((d) => ({ ...d, __total: total }));

  if (visible.length === 0) {
    return <p className="ad-empty">Nothing to show for this selection.</p>;
  }

  return (
    <div className="ad-chart" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={withTotal}
            dataKey="value"
            nameKey="name"
            innerRadius="58%"
            outerRadius="88%"
            paddingAngle={visible.length > 1 ? 2 : 0}
            stroke="none"
            labelLine={false}
            label={label ? renderRingLabel : false}
            isAnimationActive={false}
            onClick={(d: any) => onSlice?.(d?.name)}
          >
            {withTotal.map((d) => (
              <Cell
                key={d.name}
                fill={d.color}
                style={{ cursor: onSlice ? "pointer" : "default", outline: "none" }}
              />
            ))}
          </Pie>
          <Tooltip content={<PieTip />} />
        </PieChart>
      </ResponsiveContainer>
      <div className="ad-donut-center">
        <b>{centerValue}</b>
        <span>{centerLabel}</span>
      </div>
    </div>
  );
}

function Legend2({ items }: { items: DonutDatum[] }) {
  return (
    <ul className="ad-legend ad-legend-sm">
      {items.map((s) => (
        <li key={s.name}>
          <i style={{ background: s.color }} />
          <span>{s.name}</span>
          <b>{s.value}</b>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AttendanceDashboard() {
  const [date, setDate] = useState(() => getShiftContext(Date.now()).businessDate);
  const [shift, setShift] = useState<ShiftMode>("active");
  const [raw, setRaw] = useState<DashboardData | null>(null);
  const [prevRaw, setPrevRaw] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "All">("All");
  const [lunchFilter, setLunchFilter] = useState<LunchState | "all">("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({
    key: "name",
    dir: 1,
  });
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<EmpWithLunch | null>(null);

  const tableRef = useRef<HTMLElement | null>(null);

  // Ticks every 30s so lunch minutes and the active shift stay live
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const ctx = getShiftContext(now);
  const effShift: "all" | "day" | "night" = shift === "active" ? ctx.focus : shift;
  const liveDate = ctx.businessDate;
  const isToday = date === liveDate; // "viewing the current shift day"
  const fmt = (v: string | null) => formatTimeOn(v, date);

  // Always fetch everyone, then slice by shift here. Switching shift is instant
  // and no longer depends on the API's own shift filter.
  const data = useMemo(() => (raw ? derive(raw, effShift) : null), [raw, effShift]);
  const prev = useMemo(
    () => (prevRaw ? derive(prevRaw, effShift).summary : null),
    [prevRaw, effShift]
  );

  // If the person is on the live date and it rolls over (9:30 AM), follow it
  const prevLive = useRef(liveDate);
  useEffect(() => {
    if (prevLive.current === liveDate) return;
    const old = prevLive.current;
    prevLive.current = liveDate;
    setDate((d) => (d === old ? liveDate : d));
  }, [liveDate]);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/attendence/dashboard?date=${date}&shift=all`,
          { signal, cache: "no-store" }
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.message || "Failed to load attendance");
        }
        setRaw(normalize(json.data));
        setLastUpdated(Date.now());
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        setError(e?.message || "Failed to load attendance");
      } finally {
        setLoading(false);
      }
    },
    [date]
  );

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // Previous day summary, used only for the "vs yesterday" deltas.
  // Fails silently: the dashboard works fine without it.
  useEffect(() => {
    const controller = new AbortController();
    setPrevRaw(null);
    (async () => {
      try {
        const res = await fetch(
          `/api/attendence/dashboard?date=${shiftDate(date, -1)}&shift=all`,
          { signal: controller.signal, cache: "no-store" }
        );
        const json = await res.json();
        if (res.ok && json.success) setPrevRaw(normalize(json.data));
      } catch {
        /* ignore */
      }
    })();
    return () => controller.abort();
  }, [date]);

  // Auto refresh every minute while viewing today
  useEffect(() => {
    if (!isToday || !autoRefresh) return;
    const t = setInterval(() => load(), 60_000);
    return () => clearInterval(t);
  }, [isToday, autoRefresh, load]);

  // Close the detail drawer with Escape
  useEffect(() => {
    if (!selected) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setSelected(null);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected]);

  // Back to page 1 whenever the table's filters change
  useEffect(() => {
    setPage(0);
  }, [search, statusFilter, lunchFilter, roleFilter, sort, data]);

  /* ---------------- derived data ---------------- */

  const employeesWithLunch: EmpWithLunch[] = useMemo(
    () => (data?.employees ?? []).map((e) => ({ ...e, lunch: getLunch(e, now) })),
    [data, now]
  );

  const roles = useMemo(
    () =>
      Array.from(
        new Set((data?.employees ?? []).map((e) => e.role).filter(Boolean))
      ).sort(),
    [data]
  );

  const statusData: DonutDatum[] = useMemo(() => {
    const s = data?.summary;
    const v: Record<Status, number> = {
      Present: s?.present ?? 0,
      Late: s?.late ?? 0,
      "Half Day": s?.halfDay ?? 0,
      Leave: s?.leave ?? 0,
      Absent: s?.absent ?? 0,
      "Office Off": s?.officeOff ?? 0,
    };
    return STATUS_ORDER.map((n) => ({
      name: n,
      value: v[n],
      color: STATUS_COLORS[n],
    }));
  }, [data]);

  const lunchData: DonutDatum[] = useMemo(() => {
    // Lunch only matters for people who attended
    const counts: Record<LunchState, number> = {
      none: 0,
      on: 0,
      completed: 0,
      exceeded: 0,
      overdue: 0,
    };
    employeesWithLunch.forEach((e) => {
      if (isAttended(e.status)) counts[e.lunch.state] += 1;
    });
    return LUNCH_ORDER.map((k) => ({
      name: LUNCH_BADGE[k].label,
      value: counts[k],
      color: LUNCH_BADGE[k].color,
    }));
  }, [employeesWithLunch]);

  const lunchKeyByLabel = useMemo(() => {
    const m: Record<string, LunchState> = {};
    LUNCH_ORDER.forEach((k) => (m[LUNCH_BADGE[k].label] = k));
    return m;
  }, []);

  const roleData: DonutDatum[] = useMemo(() => {
    const m = new Map<string, number>();
    employeesWithLunch.forEach((e) =>
      m.set(e.role || "unassigned", (m.get(e.role || "unassigned") ?? 0) + 1)
    );
    return Array.from(m.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], i) => ({
        name: name.replace(/-/g, " "),
        value,
        color: ROLE_PALETTE[i % ROLE_PALETTE.length],
      }));
  }, [employeesWithLunch]);

  const roleAttendance = useMemo(() => {
    const m = new Map<string, { total: number; in: number }>();
    employeesWithLunch.forEach((e) => {
      if (e.status === "Office Off") return; // not expected at work
      const k = e.role || "unassigned";
      const row = m.get(k) ?? { total: 0, in: 0 };
      row.total += 1;
      if (isAttended(e.status)) row.in += 1;
      m.set(k, row);
    });
    return Array.from(m.entries())
      .map(([role, r]) => ({
        role: role.replace(/-/g, " "),
        Attendance: pct(r.in, r.total),
        count: `${r.in}/${r.total}`,
      }))
      .sort((a, b) => b.Attendance - a.Attendance);
  }, [employeesWithLunch]);

  const shiftDonut = (s: ShiftStats): DonutDatum[] => [
    { name: "Present", value: s.present, color: STATUS_COLORS.Present },
    { name: "Late", value: s.late, color: STATUS_COLORS.Late },
    { name: "Half Day", value: s.halfDay, color: STATUS_COLORS["Half Day"] },
    { name: "Leave", value: s.leave, color: STATUS_COLORS.Leave },
    { name: "Absent", value: s.absent, color: STATUS_COLORS.Absent },
    { name: "Office Off", value: s.officeOff, color: STATUS_COLORS["Office Off"] },
  ];

  // Arrivals grouped by clock hour
  const loginHistogram = useMemo(() => {
    // Ordered by hours since 6 AM so night logins (9 PM → 5 AM) stay in sequence
    const buckets = new Map<number, number>();
    employeesWithLunch.forEach((e) => {
      const t = timeValue(e.loginTime);
      if (t === null) return;
      const k = (new Date(t).getHours() + 18) % 24;
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    });
    if (buckets.size === 0) return [];
    const keys = Array.from(buckets.keys());
    const lo = Math.min(...keys);
    const hi = Math.max(...keys);
    const out: { hour: string; Logins: number }[] = [];
    for (let k = lo; k <= hi; k++) {
      const label = new Date(2000, 0, 1, (k + 6) % 24).toLocaleTimeString("en-IN", {
        hour: "numeric",
        hour12: true,
      });
      out.push({ hour: label, Logins: buckets.get(k) ?? 0 });
    }
    return out;
  }, [employeesWithLunch]);

  const lunchOverdue = useMemo(
    () =>
      employeesWithLunch
        .filter((e) => e.lunch.state === "overdue")
        .sort((a, b) => (b.lunch.minutes ?? 0) - (a.lunch.minutes ?? 0)),
    [employeesWithLunch]
  );

  const onLunchNow = useMemo(
    () => employeesWithLunch.filter((e) => e.lunch.state === "on").length,
    [employeesWithLunch]
  );

  const lateList = useMemo(
    () =>
      employeesWithLunch
        .filter((e) => e.status === "Late")
        .sort((a, b) => (timeValue(b.loginTime) ?? 0) - (timeValue(a.loginTime) ?? 0))
        .slice(0, 6),
    [employeesWithLunch]
  );

  const absentList = useMemo(
    () => employeesWithLunch.filter((e) => e.status === "Absent"),
    [employeesWithLunch]
  );

  const filteredEmployees = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = employeesWithLunch.filter((e) => {
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      if (lunchFilter !== "all" && e.lunch.state !== lunchFilter) return false;
      if (roleFilter !== "all" && e.role !== roleFilter) return false;
      if (!q) return true;
      return (
        e.name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.employeeId?.toLowerCase().includes(q)
      );
    });

    const val = (e: EmpWithLunch): string | number | null => {
      switch (sort.key) {
        case "name":
          return e.name?.toLowerCase() ?? "";
        case "role":
          return e.role?.toLowerCase() ?? "";
        case "shift":
          return e.workingShift;
        case "login":
          return timeValue(e.loginTime);
        case "logout":
          return timeValue(e.logoutTime);
        case "lunch":
          return e.lunch.minutes;
        case "status":
          return STATUS_ORDER.indexOf(e.status);
      }
    };

    return rows.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x === null && y === null) return 0;
      if (x === null) return 1; // empty values always last
      if (y === null) return -1;
      if (x < y) return -1 * sort.dir;
      if (x > y) return 1 * sort.dir;
      return 0;
    });
  }, [employeesWithLunch, search, statusFilter, lunchFilter, roleFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filteredEmployees.slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  const filtersActive =
    search !== "" ||
    statusFilter !== "All" ||
    lunchFilter !== "all" ||
    roleFilter !== "all";

  /* ---------------- actions ---------------- */

  const scrollToTable = () =>
    tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const applyStatus = (s: Status | "All") => {
    setLunchFilter("all");
    setStatusFilter(s);
    scrollToTable();
  };

  const applyLunch = (l: LunchState | "all") => {
    setStatusFilter("All");
    setLunchFilter(l);
    scrollToTable();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("All");
    setLunchFilter("all");
    setRoleFilter("all");
  };

  const toggleSort = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: 1 }));

  const exportCSV = () => {
    const header = [
      "Name",
      "Employee ID",
      "Email",
      "Role",
      "Shift",
      "Login",
      "Logout",
      "Lunch start",
      "Lunch end",
      "Lunch minutes",
      "Lunch state",
      "Status",
    ];
    const lines = filteredEmployees.map((e) =>
      [
        e.name,
        e.employeeId,
        e.email,
        e.role,
        e.workingShift,
        fmt(e.loginTime),
        fmt(e.logoutTime),
        fmt(e.lunchStart),
        fmt(e.lunchEnd),
        e.lunch.minutes ?? "",
        LUNCH_BADGE[e.lunch.state].label,
        e.status,
      ]
        .map(csvCell)
        .join(",")
    );
    const blob = new Blob(["\uFEFF" + [header.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${date}-${shift}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  /* ---------------- delta chips ---------------- */

  const delta = (
    cur: number,
    before: number | undefined,
    goodWhen: "up" | "down",
    suffix = ""
  ) => {
    if (before === undefined) return null;
    const d = Math.round((cur - before) * 10) / 10;
    if (d === 0) return <em className="ad-delta flat">no change vs prev. day</em>;
    const good = goodWhen === "up" ? d > 0 : d < 0;
    return (
      <em className={`ad-delta ${good ? "good" : "bad"}`}>
        {d > 0 ? "▲" : "▼"} {Math.abs(d)}
        {suffix} vs prev. day
      </em>
    );
  };

  const inToday = data
    ? data.summary.present + data.summary.late + data.summary.halfDay
    : 0;
  const prevIn = prev ? prev.present + prev.late + prev.halfDay : undefined;

  const kpis: {
    key: string;
    label: string;
    value: number;
    color: string;
    note?: React.ReactNode;
    onClick: () => void;
  }[] = data
    ? [
        {
          key: "in",
          label: "In today",
          value: inToday,
          color: STATUS_COLORS.Present,
          note: delta(inToday, prevIn, "up"),
          onClick: () => applyStatus("All"),
        },
        {
          key: "late",
          label: "Late",
          value: data.summary.late,
          color: STATUS_COLORS.Late,
          note: delta(data.summary.late, prev?.late, "down"),
          onClick: () => applyStatus("Late"),
        },
        {
          key: "absent",
          label: "Absent (incl. not marked)",
          value: data.summary.absent,
          color: STATUS_COLORS.Absent,
          note: delta(data.summary.absent, prev?.absent, "down"),
          onClick: () => applyStatus("Absent"),
        },
        {
          key: "leave",
          label: "On leave",
          value: data.summary.leave,
          color: STATUS_COLORS.Leave,
          note: delta(data.summary.leave, prev?.leave, "down"),
          onClick: () => applyStatus("Leave"),
        },
        ...(data.summary.officeOff > 0
          ? [
              {
                key: "off",
                label: "Office off",
                value: data.summary.officeOff,
                color: STATUS_COLORS["Office Off"],
                onClick: () => applyStatus("Office Off"),
              },
            ]
          : []),
        {
          key: "lunch",
          label: "On lunch now",
          value: onLunchNow,
          color: LUNCH_BADGE.on.color,
          onClick: () => applyLunch("on"),
        },
      ]
    : [];

  /* ---------------- render ---------------- */

  const SortTh = ({ k, children }: { k: SortKey; children: React.ReactNode }) => (
    <th
      aria-sort={
        sort.key === k ? (sort.dir === 1 ? "ascending" : "descending") : "none"
      }
    >
      <button type="button" className="ad-th" onClick={() => toggleSort(k)}>
        {children}
        <span aria-hidden>{sort.key === k ? (sort.dir === 1 ? " ▲" : " ▼") : ""}</span>
      </button>
    </th>
  );

  return (
    <div className="ad-root">
      <style>{css}</style>

      {/* Header + controls */}
      <header className="ad-header">
        <div>
          <h1>Attendance</h1>
          <p>
            {data
              ? parseISO(date).toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "Loading…"}
            {lastUpdated && (
              <span className="ad-updated">
                {" "}
                · updated{" "}
                {new Date(lastUpdated).toLocaleTimeString("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </p>
          <div className="ad-shiftline">
            <span className={`ad-live ${ctx.live ? "on" : ""}`}>
              <i />
              {ctx.focus === "day" ? "Day shift" : "Night shift"}
              {ctx.live
                ? " · live now"
                : ` · ended · ${ctx.next === "night" ? "Night" : "Day"} starts 9:30 ${ctx.next === "night" ? "PM" : "AM"}`}
            </span>
            {effShift === "night" && (
              <span className="ad-range">
                Night shift: {parseISO(date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} 9:30 PM →{" "}
                {parseISO(shiftDate(date, 1)).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} 6:00 AM
              </span>
            )}
            {effShift === "day" && (
              <span className="ad-range">Day shift: 9:30 AM → 6:00 PM</span>
            )}
          </div>
        </div>

        <div className="ad-controls">
          <div className="ad-datenav">
            <button
              type="button"
              className="ad-btn ad-icon"
              aria-label="Previous day"
              onClick={() => setDate((d) => shiftDate(d, -1))}
            >
              ‹
            </button>
            <input
              type="date"
              aria-label="Date"
              value={date}
              max={todayISO()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <button
              type="button"
              className="ad-btn ad-icon"
              aria-label="Next day"
              disabled={isToday}
              onClick={() => setDate((d) => shiftDate(d, 1))}
            >
              ›
            </button>
            {!isToday && (
              <button
                type="button"
                className="ad-btn"
                onClick={() => setDate(liveDate)}
              >
                Latest
              </button>
            )}
          </div>

          <div className="ad-seg" role="group" aria-label="Shift">
            {(["active", "all", "day", "night"] as const).map((s) => (
              <button
                key={s}
                type="button"
                className={shift === s ? "active" : ""}
                aria-pressed={shift === s}
                onClick={() => setShift(s)}
              >
                {s === "active" ? "Active shift" : s === "all" ? "All shifts" : s === "day" ? "Day" : "Night"}
              </button>
            ))}
          </div>

          <label className="ad-check" title="Refreshes every minute when viewing today">
            <input
              type="checkbox"
              checked={autoRefresh}
              disabled={!isToday}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-refresh
          </label>

          <button type="button" className="ad-btn" onClick={() => load()}>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="ad-error" role="alert">
          <strong>Couldn’t load attendance.</strong> {error}
          <button type="button" className="ad-btn" onClick={() => load()}>
            Try again
          </button>
        </div>
      )}

      {loading && !data && <div className="ad-skeleton">Loading attendance…</div>}

      {data && (
        <div className={loading ? "ad-fade" : ""}>
          {/* Composition strip */}
          <section className="ad-panel">
            <div className="ad-strip-head">
              <div>
                <span className="ad-big">{data.summary.attendancePercentage}%</span>
                <span className="ad-sub">
                  attended · {data.summary.totalEmployees} active employees
                </span>
              </div>
              {prev && (
                <div className="ad-prev">
                  {delta(
                    data.summary.attendancePercentage,
                    prev.attendancePercentage,
                    "up",
                    " pts"
                  )}
                </div>
              )}
            </div>

            <div
              className="ad-strip"
              role="img"
              aria-label="Attendance composition by status"
            >
              {statusData.map((s) =>
                s.value > 0 ? (
                  <div
                    key={s.name}
                    style={{ flexGrow: s.value, background: s.color }}
                    title={`${s.name}: ${s.value}`}
                  />
                ) : null
              )}
            </div>

            <ul className="ad-legend">
              {statusData.map((s) => (
                <li key={s.name}>
                  <i style={{ background: s.color }} />
                  <span>{s.name}</span>
                  <b>{s.value}</b>
                </li>
              ))}
            </ul>
          </section>

          {/* KPI cards (click to filter the table) */}
          <div className="ad-kpis">
            {kpis.map((k) => (
              <button
                key={k.key}
                type="button"
                className="ad-kpi"
                style={{ ["--c" as any]: k.color }}
                onClick={k.onClick}
              >
                <span>{k.label}</span>
                <b>{k.value}</b>
                {k.note}
              </button>
            ))}
          </div>

          {/* Needs attention */}
          {(lunchOverdue.length > 0 ||
            lateList.length > 0 ||
            absentList.length > 0) && (
            <div className="ad-attn">
              {lunchOverdue.length > 0 && (
                <section className="ad-panel ad-alert" aria-live="polite">
                  <h2>
                    Lunch not ended
                    <small>
                      {" "}
                      · {lunchOverdue.length} over {LUNCH_LIMIT} min
                    </small>
                  </h2>
                  <ul className="ad-rows">
                    {lunchOverdue.map((e) => (
                      <li key={e._id}>
                        <button type="button" onClick={() => setSelected(e)}>
                          <span>
                            <span className="ad-name">{e.name}</span>
                            <span className="ad-email">
                              {e.employeeId} · started {fmt(e.lunchStart)}
                            </span>
                          </span>
                          <b className="ad-red">
                            {formatDuration(e.lunch.minutes)}
                            <small> (+{(e.lunch.minutes ?? 0) - LUNCH_LIMIT}m)</small>
                          </b>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {lateList.length > 0 && (
                <section className="ad-panel">
                  <h2>
                    Latest arrivals
                    <small> · {data.summary.late} late</small>
                  </h2>
                  <ul className="ad-rows">
                    {lateList.map((e) => (
                      <li key={e._id}>
                        <button type="button" onClick={() => setSelected(e)}>
                          <span>
                            <span className="ad-name">{e.name}</span>
                            <span className="ad-email capitalize">
                              {e.role} · {e.workingShift} shift
                            </span>
                          </span>
                          <b style={{ color: STATUS_COLORS.Late }}>
                            {fmt(e.loginTime)}
                          </b>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {data.summary.late > lateList.length && (
                    <button
                      type="button"
                      className="ad-link"
                      onClick={() => applyStatus("Late")}
                    >
                      View all late employees
                    </button>
                  )}
                </section>
              )}

              {absentList.length > 0 && (
                <section className="ad-panel">
                  <h2>
                    Absent
                    <small> · {absentList.length}</small>
                  </h2>
                  <ul className="ad-rows">
                    {absentList.slice(0, 6).map((e) => (
                      <li key={e._id}>
                        <button type="button" onClick={() => setSelected(e)}>
                          <span>
                            <span className="ad-name">{e.name}</span>
                            <span className="ad-email capitalize">
                              {e.role} · {e.workingShift} shift
                            </span>
                          </span>
                          <b className="ad-red">{e.attendanceId ? "Marked absent" : "Not marked"}</b>
                        </button>
                      </li>
                    ))}
                  </ul>
                  {absentList.length > 6 && (
                    <button
                      type="button"
                      className="ad-link"
                      onClick={() => applyStatus("Absent")}
                    >
                      View all {absentList.length}
                    </button>
                  )}
                </section>
              )}
            </div>
          )}

          {/* Pie charts: status + lunch + role */}
          <div className="ad-grid3">
            <section className="ad-panel">
              <h2>
                Status split <small>· click a slice to filter</small>
              </h2>
              <Donut
                data={statusData}
                centerValue={inToday}
                centerLabel={isToday ? "in today" : "attended"}
                onSlice={(n) => applyStatus(n as Status)}
              />
              <Legend2 items={statusData} />
            </section>

            <section className="ad-panel">
              <h2>
                Lunch status <small>· attended staff</small>
              </h2>
              <Donut
                data={lunchData}
                centerValue={lunchData.reduce((a, b) => a + b.value, 0)}
                centerLabel="employees"
                onSlice={(n) => applyLunch(lunchKeyByLabel[n])}
              />
              <Legend2 items={lunchData} />
            </section>

            <section className="ad-panel">
              <h2>
                Team by role <small>· headcount</small>
              </h2>
              <Donut
                data={roleData}
                centerValue={data.summary.totalEmployees}
                centerLabel="employees"
                onSlice={(n) => {
                  const match = roles.find((r) => r.replace(/-/g, " ") === n);
                  if (match) {
                    setRoleFilter(match);
                    scrollToTable();
                  }
                }}
              />
              <Legend2 items={roleData} />
            </section>
          </div>

          {/* Shift pies */}
          <div className="ad-grid2">
            {(["day", "night"] as const).map((k) => {
              const s = data.shiftWise[k];
              const items = shiftDonut(s);
              return (
                <section className="ad-panel" key={k}>
                  <h2 className="capitalize">
                    {k} shift
                    <small>
                      {" "}
                      · {s.total} staff · {s.attendancePercentage}% attended
                    </small>
                  </h2>
                  <div className="ad-shift-row">
                    <Donut
                      data={items}
                      centerValue={s.present + s.late + s.halfDay}
                      centerLabel="in"
                      height={200}
                      label={false}
                    />
                    <Legend2 items={items} />
                  </div>
                </section>
              );
            })}
          </div>

          {/* Bar charts */}
          <div className="ad-grid2">
            <section className="ad-panel">
              <h2>Attendance by role</h2>
              {roleAttendance.length === 0 ? (
                <p className="ad-empty">No data.</p>
              ) : (
                <div className="ad-chart" style={{ height: Math.max(180, roleAttendance.length * 44 + 40) }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={roleAttendance}
                      layout="vertical"
                      margin={{ left: 8, right: 24 }}
                    >
                      <CartesianGrid horizontal={false} stroke="var(--line)" />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        unit="%"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis
                        type="category"
                        dataKey="role"
                        width={96}
                        tick={{ fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        cursor={{ fill: "rgba(127,140,160,0.1)" }}
                        formatter={(v: any, _n: any, p: any) => [
                          `${v}% (${p.payload.count})`,
                          "Attended",
                        ]}
                      />
                      <Bar dataKey="Attendance" fill={STATUS_COLORS.Present} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            <section className="ad-panel">
              <h2>Arrival times</h2>
              {loginHistogram.length === 0 ? (
                <p className="ad-empty">No logins recorded yet.</p>
              ) : (
                <div className="ad-chart" style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={loginHistogram} margin={{ left: -16, right: 8 }}>
                      <CartesianGrid vertical={false} stroke="var(--line)" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: "rgba(127,140,160,0.1)" }} />
                      <Bar dataKey="Logins" fill="#2f7de1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>
          </div>

          {/* Stacked shift comparison */}
          <section className="ad-panel">
            <h2>Shift comparison</h2>
            <div className="ad-chart" style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={(["day", "night"] as const).map((k) => {
                    const s = data.shiftWise[k];
                    return {
                      shift: k === "day" ? "Day shift" : "Night shift",
                      Present: s.present,
                      Late: s.late,
                      "Half Day": s.halfDay,
                      Leave: s.leave,
                      Absent: s.absent,
                      "Office Off": s.officeOff,
                    };
                  })}
                  layout="vertical"
                  margin={{ left: 8, right: 16 }}
                >
                  <CartesianGrid horizontal={false} stroke="var(--line)" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="shift"
                    width={84}
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip cursor={{ fill: "rgba(127,140,160,0.1)" }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {STATUS_ORDER.map((s) => (
                    <Bar key={s} dataKey={s} stackId="a" fill={STATUS_COLORS[s]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Employee table */}
          <section className="ad-panel" ref={tableRef as any}>
            <div className="ad-table-head">
              <h2>
                Employees <small>({filteredEmployees.length})</small>
              </h2>
              <div className="ad-table-tools">
                <input
                  type="search"
                  placeholder="Search name, email or ID"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search employees"
                />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as Status | "All")}
                  aria-label="Filter by status"
                >
                  <option value="All">All statuses</option>
                  {STATUS_ORDER.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  aria-label="Filter by role"
                >
                  <option value="all">All roles</option>
                  {roles.map((r) => (
                    <option key={r} value={r}>
                      {r.replace(/-/g, " ")}
                    </option>
                  ))}
                </select>
                <select
                  value={lunchFilter}
                  onChange={(e) => setLunchFilter(e.target.value as LunchState | "all")}
                  aria-label="Filter by lunch"
                >
                  <option value="all">All lunch states</option>
                  <option value="overdue">Not ended (over {LUNCH_LIMIT}m)</option>
                  <option value="exceeded">Exceeded (ended late)</option>
                  <option value="on">On lunch</option>
                  <option value="completed">Completed</option>
                  <option value="none">Not started</option>
                </select>
                {filtersActive && (
                  <button type="button" className="ad-btn" onClick={clearFilters}>
                    Clear filters
                  </button>
                )}
                <button
                  type="button"
                  className="ad-btn"
                  onClick={exportCSV}
                  disabled={filteredEmployees.length === 0}
                >
                  Export CSV
                </button>
              </div>
            </div>

            <div className="ad-table-wrap">
              <table>
                <thead>
                  <tr>
                    <SortTh k="name">Employee</SortTh>
                    <th>ID</th>
                    <SortTh k="role">Role</SortTh>
                    <SortTh k="shift">Shift</SortTh>
                    <SortTh k="login">Login</SortTh>
                    <SortTh k="logout">Logout</SortTh>
                    <th>Lunch start</th>
                    <th>Lunch end</th>
                    <SortTh k="lunch">Lunch</SortTh>
                    <SortTh k="status">Status</SortTh>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="ad-empty">
                        No employees match these filters.
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((e) => (
                      <tr
                        key={e._id}
                        className="ad-click"
                        tabIndex={0}
                        onClick={() => setSelected(e)}
                        onKeyDown={(ev) => ev.key === "Enter" && setSelected(e)}
                      >
                        <td>
                          <div className="ad-name">{e.name}</div>
                          <div className="ad-email">{e.email}</div>
                        </td>
                        <td>{e.employeeId}</td>
                        <td className="ad-cap">{e.role}</td>
                        <td className="ad-cap">{e.workingShift}</td>
                        <td>{fmt(e.loginTime)}</td>
                        <td>{fmt(e.logoutTime)}</td>
                        <td>{fmt(e.lunchStart)}</td>
                        <td>
                          {e.lunchStart && !e.lunchEnd ? (
                            <span className="ad-missing">Not marked</span>
                          ) : (
                            fmt(e.lunchEnd)
                          )}
                        </td>
                        <td>
                          <span
                            className="ad-badge"
                            style={{
                              color: LUNCH_BADGE[e.lunch.state].color,
                              background: `${LUNCH_BADGE[e.lunch.state].color}1a`,
                            }}
                          >
                            {LUNCH_BADGE[e.lunch.state].label}
                            {e.lunch.minutes !== null && ` · ${formatDuration(e.lunch.minutes)}`}
                          </span>
                        </td>
                        <td>
                          <span
                            className="ad-badge"
                            title={e.statusNote ?? undefined}
                            style={{
                              color: STATUS_COLORS[e.status],
                              background: `${STATUS_COLORS[e.status]}1a`,
                            }}
                          >
                            {e.status}
                            {e.status === "Absent" && !e.attendanceId && !e.loginTime && " · no punch"}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {filteredEmployees.length > PAGE_SIZE && (
              <div className="ad-pager">
                <span>
                  {safePage * PAGE_SIZE + 1}–
                  {Math.min((safePage + 1) * PAGE_SIZE, filteredEmployees.length)} of{" "}
                  {filteredEmployees.length}
                </span>
                <div>
                  <button
                    type="button"
                    className="ad-btn"
                    disabled={safePage === 0}
                    onClick={() => setPage(safePage - 1)}
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    className="ad-btn"
                    disabled={safePage >= pageCount - 1}
                    onClick={() => setPage(safePage + 1)}
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Employee detail drawer */}
      {selected && (
        <div className="ad-overlay" onClick={() => setSelected(null)}>
          <aside
            className="ad-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.name} attendance details`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ad-drawer-head">
              <div className="ad-avatar">{selected.name?.charAt(0)}</div>
              <div>
                <h2>{selected.name}</h2>
                <p>
                  {selected.employeeId} · <span className="capitalize">{selected.role}</span>
                </p>
              </div>
              <button
                type="button"
                className="ad-btn ad-icon"
                aria-label="Close"
                onClick={() => setSelected(null)}
              >
                ✕
              </button>
            </div>

            <div className="ad-drawer-badges">
              <span
                className="ad-badge"
                style={{
                  color: STATUS_COLORS[selected.status],
                  background: `${STATUS_COLORS[selected.status]}1a`,
                }}
              >
                {selected.status}
              </span>
              <span
                className="ad-badge"
                style={{
                  color: LUNCH_BADGE[selected.lunch.state].color,
                  background: `${LUNCH_BADGE[selected.lunch.state].color}1a`,
                }}
              >
                Lunch: {LUNCH_BADGE[selected.lunch.state].label}
              </span>
            </div>

            {selected.statusNote && <p className="ad-note">{selected.statusNote}</p>}

            <dl className="ad-dl">
              <div><dt>Email</dt><dd>{selected.email || "—"}</dd></div>
              <div><dt>Shift</dt><dd className="capitalize">{selected.workingShift}</dd></div>
              <div><dt>Login</dt><dd>{fmt(selected.loginTime)}</dd></div>
              <div><dt>Logout</dt><dd>{fmt(selected.logoutTime)}</dd></div>
              <div><dt>Lunch start</dt><dd>{fmt(selected.lunchStart)}</dd></div>
              <div>
                <dt>Lunch end</dt>
                <dd>
                  {selected.lunchStart && !selected.lunchEnd
                    ? "Not marked"
                    : fmt(selected.lunchEnd)}
                </dd>
              </div>
              <div>
                <dt>Lunch length</dt>
                <dd>
                  {formatDuration(selected.lunch.minutes)}
                  {selected.lunch.minutes !== null &&
                    selected.lunch.minutes > LUNCH_LIMIT &&
                    ` (+${selected.lunch.minutes - LUNCH_LIMIT}m over ${LUNCH_LIMIT}m limit)`}
                </dd>
              </div>
              <div>
                <dt>Time at work</dt>
                <dd>
                  {(() => {
                    const a = timeValue(selected.loginTime);
                    if (a === null) return "—";
                    const b = timeValue(selected.logoutTime) ?? now;
                    return formatDuration(Math.max(0, Math.floor((b - a) / 60000)));
                  })()}
                  {selected.loginTime && !selected.logoutTime && isToday && " (still in)"}
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles (scoped by the ad- prefix, no Tailwind needed)               */
/* ------------------------------------------------------------------ */

const css = `
.ad-root{
  --ink:#1b2430; --muted:#6b7686; --line:#e3e7ec; --bg:#f3f5f8; --panel:#fff;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color:var(--ink); background:var(--bg); min-height:100vh;
  padding:24px clamp(16px,4vw,40px) 48px; box-sizing:border-box;
}
.ad-root *{box-sizing:border-box}
.ad-root .capitalize,.ad-root .ad-cap{text-transform:capitalize}
@media (prefers-color-scheme: dark){
  .ad-root{--ink:#e8ecf2; --muted:#98a3b3; --line:#2a3340; --bg:#12171e; --panel:#1a2029}
  .ad-root input,.ad-root select{color-scheme:dark}
}
.ad-header{display:flex;flex-wrap:wrap;gap:16px;justify-content:space-between;align-items:flex-end;margin-bottom:20px}
.ad-header h1{margin:0;font-size:28px;letter-spacing:-0.02em}
.ad-header p{margin:4px 0 0;color:var(--muted);font-size:14px}
.ad-controls{display:flex;flex-wrap:wrap;gap:12px;align-items:center}
.ad-datenav{display:flex;gap:6px;align-items:center}
.ad-check{display:flex;align-items:center;gap:6px;font-size:13px;color:var(--muted);cursor:pointer}
.ad-check input{height:auto;width:auto;accent-color:#2f7de1}
.ad-root input,.ad-root select{
  height:36px;padding:0 10px;border:1px solid var(--line);border-radius:8px;
  background:var(--panel);color:var(--ink);font:inherit;font-size:14px;
}
.ad-root :is(input,select,button,tr):focus-visible{outline:2px solid #2f7de1;outline-offset:2px}
.ad-seg{display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;background:var(--panel)}
.ad-seg button{height:34px;padding:0 14px;border:0;background:transparent;color:var(--muted);font:inherit;font-size:14px;cursor:pointer}
.ad-seg button.active{background:var(--ink);color:var(--panel)}
.ad-btn{height:36px;padding:0 14px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font:inherit;font-size:14px;cursor:pointer;white-space:nowrap}
.ad-btn:hover:not(:disabled){border-color:var(--muted)}
.ad-btn:disabled{opacity:.45;cursor:not-allowed}
.ad-icon{width:36px;padding:0;font-size:18px;line-height:1}
.ad-panel{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:20px;margin-bottom:16px;min-width:0}
.ad-panel h2{margin:0 0 12px;font-size:16px}
.ad-panel h2 small{color:var(--muted);font-weight:400;font-size:13px}
.ad-strip-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:14px}
.ad-big{font-size:48px;font-weight:700;letter-spacing:-0.03em;line-height:1}
.ad-sub{margin-left:12px;color:var(--muted);font-size:14px}
.ad-strip{display:flex;gap:3px;height:22px;border-radius:6px;overflow:hidden}
.ad-strip>div{min-width:4px;transition:flex-grow .3s}
.ad-legend{display:flex;flex-wrap:wrap;gap:8px 24px;list-style:none;margin:14px 0 0;padding:0}
.ad-legend li{display:flex;align-items:center;gap:8px;font-size:14px}
.ad-legend i{width:10px;height:10px;border-radius:3px;display:inline-block;flex:none}
.ad-legend span{color:var(--muted)}
.ad-legend-sm{gap:6px 16px;margin-top:8px}
.ad-legend-sm li{font-size:13px}

/* delta chips + KPI cards */
.ad-delta{font-style:normal;font-size:12px;font-weight:600}
.ad-delta.good{color:#0f9d7a}
.ad-delta.bad{color:#d9475f}
.ad-delta.flat{color:var(--muted);font-weight:500}
.ad-kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:16px}
.ad-kpi{display:flex;flex-direction:column;gap:2px;text-align:left;padding:14px 16px;border:1px solid var(--line);border-left:4px solid var(--c);border-radius:10px;background:var(--panel);color:var(--ink);font:inherit;cursor:pointer}
.ad-kpi:hover{border-color:var(--c)}
.ad-kpi span{font-size:13px;color:var(--muted)}
.ad-kpi b{font-size:28px;line-height:1.1;letter-spacing:-0.02em}
.ad-root :is(.ad-kpi,.ad-link,.ad-rows button):focus-visible{outline:2px solid #2f7de1;outline-offset:2px}

/* attention lists */
.ad-attn{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px;margin-bottom:0}
.ad-rows{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.ad-rows button{display:flex;width:100%;justify-content:space-between;align-items:center;gap:12px;text-align:left;padding:9px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:var(--ink);font:inherit;cursor:pointer}
.ad-rows button:hover{background:rgba(127,140,160,.08)}
.ad-rows button>span{display:flex;flex-direction:column;min-width:0}
.ad-rows b{white-space:nowrap}
.ad-rows small{font-weight:500}
.ad-red{color:#d9475f}
.ad-muted{color:var(--muted)}
.ad-link{margin-top:10px;padding:0;border:0;background:none;color:#2f7de1;font:inherit;font-size:13px;cursor:pointer}
.ad-link:hover{text-decoration:underline}
.ad-alert{border-color:#d9475f66}
.ad-alert h2{color:#d9475f}
.ad-alert .ad-rows button{border-left:3px solid #d9475f}

/* charts */
.ad-grid3{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
.ad-grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}
@media (max-width:1100px){.ad-grid3{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:760px){.ad-grid3,.ad-grid2{grid-template-columns:1fr}}
.ad-chart{position:relative;height:280px}
.ad-shift-row{display:grid;grid-template-columns:minmax(0,200px) 1fr;gap:16px;align-items:center}
.ad-shift-row .ad-legend{flex-direction:column;margin:0}
@media (max-width:480px){.ad-shift-row{grid-template-columns:1fr}}
.ad-donut-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;pointer-events:none}
.ad-donut-center b{font-size:30px;line-height:1}
.ad-donut-center span{font-size:12px;color:var(--muted);margin-top:4px}
.ad-tip{display:flex;align-items:center;gap:8px;padding:8px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font-size:13px;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.ad-tip i{width:10px;height:10px;border-radius:3px}
.ad-tip span{color:var(--muted)}
.ad-root .recharts-surface:focus,.ad-root .recharts-wrapper *:focus{outline:none}

/* table */
.ad-table-head{display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;align-items:center;margin-bottom:12px}
.ad-table-head h2{margin:0}
.ad-table-tools{display:flex;gap:8px;flex-wrap:wrap}
.ad-table-tools input{width:220px;max-width:100%}
.ad-table-wrap{overflow-x:auto}
.ad-table-wrap table{width:100%;border-collapse:collapse;font-size:14px;min-width:820px}
.ad-table-wrap th{text-align:left;font-weight:600;font-size:13px;color:var(--muted);padding:10px 12px;border-bottom:1px solid var(--line);white-space:nowrap}
.ad-th{padding:0;border:0;background:none;color:inherit;font:inherit;font-weight:600;cursor:pointer}
.ad-th:hover{color:var(--ink)}
.ad-table-wrap td{padding:10px 12px;border-bottom:1px solid var(--line);vertical-align:middle;white-space:nowrap}
.ad-click{cursor:pointer}
.ad-table-wrap tbody tr:hover{background:rgba(127,140,160,.07)}
.ad-name{font-weight:600;display:block}
.ad-email{font-size:12px;color:var(--muted);display:block}
.ad-badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
.ad-empty{color:var(--muted);text-align:center;padding:24px 0;font-size:14px}
.ad-pager{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-top:12px;font-size:13px;color:var(--muted)}
.ad-pager>div{display:flex;gap:8px}
.ad-error{display:flex;flex-wrap:wrap;gap:12px;align-items:center;padding:12px 16px;margin-bottom:16px;border-radius:10px;background:#d9475f1a;color:#d9475f;font-size:14px}
.ad-skeleton{padding:60px 0;text-align:center;color:var(--muted)}
.ad-fade{opacity:.6;transition:opacity .2s}
.ad-missing{color:#d9475f;font-weight:600}
.ad-attn + .ad-grid3{margin-top:16px}

/* shift status */
.ad-shiftline{display:flex;flex-wrap:wrap;gap:8px 14px;align-items:center;margin-top:8px}
.ad-live{display:inline-flex;align-items:center;gap:8px;padding:3px 12px;border-radius:999px;font-size:13px;font-weight:600;background:rgba(127,140,160,.14);color:var(--muted)}
.ad-live i{width:8px;height:8px;border-radius:50%;background:var(--muted)}
.ad-live.on{background:#0f9d7a1f;color:#0f9d7a}
.ad-live.on i{background:#0f9d7a;box-shadow:0 0 0 0 #0f9d7a88;animation:ad-pulse 1.8s infinite}
@keyframes ad-pulse{70%{box-shadow:0 0 0 7px #0f9d7a00}100%{box-shadow:0 0 0 0 #0f9d7a00}}
.ad-range{font-size:13px;color:var(--muted)}

/* drawer */
.ad-note{margin:0 0 14px;padding:10px 12px;border-radius:8px;background:rgba(127,140,160,.12);font-size:13px}
.ad-overlay{position:fixed;inset:0;z-index:50;background:rgba(10,14,20,.45);display:flex;justify-content:flex-end}
.ad-drawer{width:min(420px,100%);height:100%;overflow-y:auto;background:var(--panel);color:var(--ink);padding:24px;border-left:1px solid var(--line);box-shadow:-8px 0 30px rgba(0,0,0,.2);animation:ad-slide .18s ease-out}
@keyframes ad-slide{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}
.ad-drawer-head{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.ad-drawer-head>div:nth-child(2){flex:1;min-width:0}
.ad-drawer-head h2{margin:0;font-size:20px}
.ad-drawer-head p{margin:2px 0 0;color:var(--muted);font-size:13px}
.ad-avatar{width:44px;height:44px;border-radius:50%;background:#2f7de11f;color:#2f7de1;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:18px;flex:none}
.ad-drawer-badges{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px}
.ad-dl{margin:0;display:flex;flex-direction:column}
.ad-dl>div{display:flex;justify-content:space-between;gap:16px;padding:11px 0;border-bottom:1px solid var(--line);font-size:14px}
.ad-dl dt{color:var(--muted)}
.ad-dl dd{margin:0;font-weight:600;text-align:right}

@media (prefers-reduced-motion: reduce){.ad-strip>div,.ad-fade{transition:none}.ad-drawer,.ad-live.on i{animation:none}}
`;