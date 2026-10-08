"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";

import {

  FileText,

  RefreshCw,

  Search,

  ShieldCheck,

  ThumbsDown,

  ThumbsUp,

  X,

  // Eye,

  Image as ImageIcon,

  RotateCcw,

  ExternalLink,

  Sparkles,

} from "lucide-react";

import { api } from "@/lib/api";

import { StatusBadge } from "./StatusBadge";

type OE = {

  id?: string;

  rowIndex?: number;

  memberName?: string;

  pid?: string;

  qNumber?: string;

  question?: string;

  questionText?: string;

  questionTitle?: string;

  actualQuestion?: string;

  oeResponse?: string;

  status?: string;

  aiScore?: number | string;

  aiReason?: string;

  relScore?: number | string;

  relReason?: string;

  imageUrl?: string;

  dqaCorrection?: string;

  rejectReason?: string;

  dqaViewedTime?: string;

  timestamp?: string;

  approvedBy?: string;

  approvedTime?: string;

  oldOEId?: string;

  dqaLockedBy?: string;

dqaLockedAt?: string;

};

const PREDEFINED_REASONS = [

  "🔁 Duplicate response — same or very similar OE already submitted",

  "❌ Irrelevant response — answer does not match the question",

  "🔤 Same starting words — your last few responses started the same way",

  "📋 Same topic already used by another person",

];

export default function DqaView() {

  const [dqaName, setDqaName] = useState("");

  const [loaded, setLoaded] = useState(false);

  const [items, setItems] = useState<OE[]>([]);

  const [stats, setStats] = useState<any>(null);

  const [status, setStatus] = useState("PENDING");

  const [employee, setEmployee] = useState("ALL");

  const [search, setSearch] = useState("");

  const [empDropdownOpen, setEmpDropdownOpen] = useState(false);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  const [reject, setReject] = useState<OE | null>(null);

  const [reason, setReason] = useState("");

  const [customReason, setCustomReason] = useState("");

  const [toast, setToast] = useState("");

  const [pidRef, setPidRef] = useState("");

  const [imgModal, setImgModal] = useState<{ url: string; q: string } | null>(null);

  const [suggestions, setSuggestions] = useState<Record<number, string[]>>({});

  const [sugLoading, setSugLoading] = useState<Record<number, boolean>>({});

  const [corrections, setCorrections] = useState<Record<number, string>>({});

  const [viewingMarked, setViewingMarked] = useState<Record<string, boolean>>({});

  const typingRef = useRef(false);

  const lastPendingCount = useRef(-1);

  // Keeps visible data stable during background refresh.

  const refreshInFlightRef = useRef(false);

  const itemsRef = useRef<OE[]>([]);

const wsRef = useRef<WebSocket | null>(null);

const [wsConnected, setWsConnected] =

  useState(false);

const [oeLocks, setOeLocks] = useState<

  Record<

    string,

    {

      dqaName: string;

      startedAt: string;

    }

  >

>({});

  // ── helpers ──────────────────────────────────────────────

  const showToast = (msg: string) => {

    setToast(msg);

    setTimeout(() => setToast(""), 4500);

  };

  const parseTS = (ts?: string) => {

    if (!ts) return null;

    const d = new Date(ts);

    if (!isNaN(d.getTime())) return d;

    const m = String(ts).match(

      /^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2}):(\d{2})/

      // /^(\d{1,2})\/(\d{1,2})\/(\d{4})[,\s]+(\d{1,2}):(\d{2}):(\d{2})/

    );

    if (m) {

      const d2 = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);

      return isNaN(d2.getTime()) ? null : d2;

    }

    return null;

  };

  const formatTS = (ts?: string) => {

    const d = parseTS(ts);

    if (!d) return "";

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const yest = new Date(today);

    yest.setDate(yest.getDate() - 1);

    const day = new Date(d);

    day.setHours(0, 0, 0, 0);

    const t = d.toLocaleTimeString("en-US", {

      hour: "2-digit",

      minute: "2-digit",

      hour12: true,

    });

    if (day.getTime() === today.getTime()) return `Today ${t}`;

    if (day.getTime() === yest.getTime()) return `Yesterday ${t}`;

    return (

      d.toLocaleDateString("en-US", { day: "numeric", month: "short" }) +

      " " +

      t

    );

  };

  const waitingTime = (ts?: string) => {

    const d = parseTS(ts);

    if (!d) return "";

    const mins = Math.floor((Date.now() - d.getTime()) / 60000);

    if (mins < 1) return "Just now";

    if (mins < 60) return `${mins} min`;

    const hrs = Math.floor(mins / 60);

    const rem = mins % 60;

    if (hrs < 24) return `${hrs}h${rem > 0 ? ` ${rem}m` : ""}`;

    const days = Math.floor(hrs / 24);

    const rh = hrs % 24;

    return `${days}d${rh > 0 ? ` ${rh}h` : ""}`;

  };

  const waitClass = (ts?: string) => {

    const d = parseTS(ts);

    if (!d) return "ok";

    const hrs = (Date.now() - d.getTime()) / 3600000;

    if (hrs >= 4) return "urgent";

    if (hrs >= 1) return "warn";

    return "ok";

  };

  const priorityTag = (ts?: string) => {

    const d = parseTS(ts);

    if (!d) return null;

    const hrs = (Date.now() - d.getTime()) / 3600000;

    if (hrs >= 4)

      return (

        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">

          🔴 HIGH

        </span>

      );

    if (hrs >= 1)

      return (

        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">

          🟡 MED

        </span>

      );

    return (

      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">

        🟢 NEW

      </span>

    );

  };

  const getQuestionText = (oe: OE) => {

    // New rows store the real question in Column T.

    // Keep all backend aliases for compatibility.

    const candidates = [

      oe.questionText,

      oe.question,

      oe.actualQuestion,

      oe.questionTitle,

    ];

    for (const value of candidates) {

      const text = String(value ?? "").trim();

      // Q1/Q2/etc. are question numbers, not question text.

      if (text && !/^Q\s*\d+[A-Z]?$/i.test(text)) {

        return text;

      }

    }

    // Old rows created before Column T was added only have Q1 in Column E.

    // Q1's actual text is known from the existing survey question source.

    const legacyQuestions: Record<string, string> = {

      Q1: "What do you enjoy most about working?",

    };

    return legacyQuestions[String(oe.qNumber || "").trim().toUpperCase()] || "";

  };

  const wcBadge = (cc: number) => {

    const ok = cc >= 100 && cc <= 300;

    return (

      <span className={`text-[11px] ${ok ? "text-green-700 font-bold" : "text-orange-600"}`}>

        {cc} chars {ok ? "✓" : <span className="text-slate-400">(aim 100–300)</span>}

      </span>

    );

  };

  const sameStartAlert = (memberName: string, currentOE: string) => {

    if (!currentOE) return null;

    const curStart = currentOE

      .trim()

      .toLowerCase()

      .split(/\s+/)

      .slice(0, 2)

      .join(" ");

    const matches = items.filter(

      (o) =>

        o.memberName?.trim().toLowerCase() === memberName.trim().toLowerCase() &&

        o.oeResponse &&

        o.oeResponse.trim() !== currentOE.trim() &&

        o.oeResponse

          .trim()

          .toLowerCase()

          .split(/\s+/)

          .slice(0, 2)

          .join(" ") === curStart

    );

    if (matches.length === 0) return null;

    return (

      <div className="mb-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">

        ⚠️ <b>Same starting words</b> as another OE by this member: <b>"{curStart}"</b> — check for pattern

      </div>

    );

  };

  // ── load ─────────────────────────────────────────────────

// const load = useCallback(
//   async (silent = false, force = false) => {
//     if (!dqaName.trim()) {
//       setError("Please enter your DQA name.");
//       return;
//     }

//     // NEVER allow overlapping requests.
//     // Even force/manual refresh should wait for the current request.
//     if (refreshInFlightRef.current) {
//       return;
//     }

//     refreshInFlightRef.current = true;

//     // Only show loading UI for the initial/manual load.
//     if (!silent) {
//       setLoading(true);
//     }

//     setError("");

//     try {
//       const d = await api<any>("getDQAData");

//       let oes: any[] = [];

//       if (Array.isArray(d)) {
//         oes = d;
//       } else if (Array.isArray(d?.oes)) {
//         oes = d.oes;
//       } else if (Array.isArray(d?.pendingOEs)) {
//         oes = d.pendingOEs;
//       } else if (Array.isArray(d?.data)) {
//         oes = d.data;
//       } else if (Array.isArray(d?.data?.oes)) {
//         oes = d.data.oes;
//       }

//       const nextItems = oes as OE[];

//       /*
//        * IMPORTANT:
//        *
//        * Keep the current OE list visible while background
//        * refresh is happening.
//        *
//        * If API returns an empty list during a SILENT refresh,
//        * don't destroy the currently displayed data.
//        */
//       if (nextItems.length === 0 && itemsRef.current.length > 0) {
//         if (force) {
//           // Manual refresh explicitly accepts the API result.
//           itemsRef.current = [];
//           setItems([]);
//         }

//         // Silent refresh: keep current data.
//       } else {
//         const getSignature = (list: OE[]) =>
//           list
//             .map((o) =>
//               [
//                 o.id ?? "",
//                 o.rowIndex ?? "",
//                 o.memberName ?? "",
//                 o.pid ?? "",
//                 o.qNumber ?? "",
//                 o.question ?? "",
//                 o.questionText ?? "",
//                 o.questionTitle ?? "",
//                 o.actualQuestion ?? "",
//                 o.oeResponse ?? "",
//                 o.status ?? "",
//                 o.aiScore ?? "",
//                 o.aiReason ?? "",
//                 o.relScore ?? "",
//                 o.relReason ?? "",
//                 o.imageUrl ?? "",
//                 o.dqaCorrection ?? "",
//                 o.rejectReason ?? "",
//                 o.dqaViewedTime ?? "",
//                 o.timestamp ?? "",
//                 o.approvedBy ?? "",
//                 o.approvedTime ?? "",
//                 o.oldOEId ?? "",
//               ].join("¦")
//             )
//             .sort()
//             .join("¶");

//         const previousSignature = getSignature(itemsRef.current);
//         const nextSignature = getSignature(nextItems);

//         if (previousSignature !== nextSignature) {
//           itemsRef.current = nextItems;
//           setItems(nextItems);
//         } else if (force) {
//           // Manual refresh: sync state even if unchanged.
//           itemsRef.current = nextItems;
//           setItems(nextItems);
//         }
//       }

//       /*
//        * Update stats independently.
//        */
//       if (d?.stats && typeof d.stats === "object") {
//         setStats(d.stats);
//       }

//       setLoaded(true);

//       /*
//        * Calculate pending count from the NEW API response.
//        */
//       const pending = nextItems.filter(
//         (o) => o.status === "PENDING"
//       ).length;

//       if (
//         lastPendingCount.current >= 0 &&
//         pending > lastPendingCount.current
//       ) {
//         const diff = pending - lastPendingCount.current;

//         showToast(
//           `🔔 ${diff} new OE${diff > 1 ? "s" : ""} received!`
//         );
//       }

//       lastPendingCount.current = pending;

//       /*
//        * Only show toast for an actual manual refresh.
//        */
//       if (force) {
//         showToast("🔄 DQA data refreshed");
//       }
//     } catch (e: any) {
//       console.error("getDQAData failed:", e);

//       /*
//        * IMPORTANT:
//        * Never clear existing OEs when API fails.
//        */
//       if (!silent || force) {
//         setError(
//           e?.message || "Failed to load DQA data."
//         );
//       }
//     } finally {
//       refreshInFlightRef.current = false;

//       if (!silent) {
//         setLoading(false);
//       }
//     }
//   },
//   [dqaName]
// );

const load = useCallback(
  async (silent = false) => {
    if (!dqaName.trim()) {
      setError("Please enter your DQA name.");
      return;
    }

    // Never allow two getDQAData requests at the same time.
    if (refreshInFlightRef.current) {
      return;
    }

    refreshInFlightRef.current = true;

    // Only show the loader on the initial/manual load.
    if (!silent) {
      setLoading(true);
    }

    setError("");

    try {
      const d = await api<any>("getDQAData");

      let oes: any[] | null = null;

      if (Array.isArray(d)) {
        oes = d;
      } else if (Array.isArray(d?.oes)) {
        oes = d.oes;
      } else if (Array.isArray(d?.pendingOEs)) {
        oes = d.pendingOEs;
      } else if (Array.isArray(d?.data)) {
        oes = d.data;
      } else if (Array.isArray(d?.data?.oes)) {
        oes = d.data.oes;
      }

      /*
       * IMPORTANT:
       * If the API response is not in a valid OE-array format,
       * do NOT touch the currently displayed OEs.
       */
      if (!Array.isArray(oes)) {
        console.warn("getDQAData returned an invalid OE response:", d);
        return;
      }

      const nextItems = oes as OE[];

      /*
       * IMPORTANT:
       *
       * Never clear existing OEs just because a background
       * API request temporarily returns [].
       *
       * Existing data stays visible.
       */
      if (nextItems.length > 0) {
        const getSignature = (list: OE[]) =>
          list
            .map((o) =>
              [
                o.id ?? "",
                o.rowIndex ?? "",
                o.memberName ?? "",
                o.pid ?? "",
                o.qNumber ?? "",
                o.question ?? "",
                o.questionText ?? "",
                o.questionTitle ?? "",
                o.actualQuestion ?? "",
                o.oeResponse ?? "",
                o.status ?? "",
                o.aiScore ?? "",
                o.aiReason ?? "",
                o.relScore ?? "",
                o.relReason ?? "",
                o.imageUrl ?? "",
                o.dqaCorrection ?? "",
                o.rejectReason ?? "",
                o.dqaViewedTime ?? "",
                o.timestamp ?? "",
                o.approvedBy ?? "",
                o.approvedTime ?? "",
                o.oldOEId ?? "",
              ].join("¦")
            )
            .sort()
            .join("¶");

        const previousSignature = getSignature(itemsRef.current);
        const nextSignature = getSignature(nextItems);

        if (previousSignature !== nextSignature) {
          itemsRef.current = nextItems;
          setItems(nextItems);
        }
      } else if (itemsRef.current.length === 0) {
        /*
         * Only show an empty list if there was no existing data.
         *
         * This prevents existing OEs from disappearing during
         * a background refresh.
         */
        itemsRef.current = [];
        setItems([]);
      }

      if (d?.stats && typeof d.stats === "object") {
        setStats(d.stats);
      }

      setLoaded(true);

      /*
       * Use the displayed/current list for pending count.
       */
      const currentItems =
        nextItems.length > 0 ? nextItems : itemsRef.current;

      const pending = currentItems.filter(
        (o) => o.status === "PENDING"
      ).length;

      if (
        lastPendingCount.current >= 0 &&
        pending > lastPendingCount.current
      ) {
        const diff = pending - lastPendingCount.current;

        showToast(
          `🔔 ${diff} new OE${diff > 1 ? "s" : ""} received!`
        );
      }

      lastPendingCount.current = pending;
    } catch (e: any) {
      console.error("getDQAData failed:", e);

      /*
       * Keep existing OEs visible when refresh fails.
       */
      if (!silent) {
        setError(
          e?.message || "Failed to load DQA data."
        );
      }
    } finally {
      refreshInFlightRef.current = false;

      if (!silent) {
        setLoading(false);
      }
    }
  },
  [dqaName]
);

//   const load = useCallback(

//   async (silent = false, force = false) => {

//     if (!dqaName.trim()) {

//       setError("Please enter your DQA name.");

//       return;

//     }

//     // Only block overlapping requests for automatic refresh.

//     if (!force && refreshInFlightRef.current) return;

//     refreshInFlightRef.current = true;

//     if (!silent) setLoading(true);

//     setError("");

//     try {

//       const d = await api<any>("getDQAData");

//       let oes: any[] = [];

//       if (Array.isArray(d)) oes = d;

//       else if (Array.isArray(d?.oes)) oes = d.oes;

//       else if (Array.isArray(d?.pendingOEs)) oes = d.pendingOEs;

//       else if (Array.isArray(d?.data)) oes = d.data;

//       else if (Array.isArray(d?.data?.oes)) oes = d.data.oes;

//       /*

//        * IMPORTANT:

//        * Do not ignore an empty response during MANUAL refresh.

//        * The old code could make the refresh button appear broken.

//        */

//       const nextItems = oes as OE[];

//       const getSignature = (list: OE[]) =>

//         list

//           .map((o) =>

//             [

//               o.id ?? "",

//               o.rowIndex ?? "",

//               o.memberName ?? "",

//               o.pid ?? "",

//               o.qNumber ?? "",

//               o.question ?? "",

//               o.questionText ?? "",

//               o.questionTitle ?? "",

//               o.actualQuestion ?? "",

//               o.oeResponse ?? "",

//               o.status ?? "",

//               o.aiScore ?? "",

//               o.aiReason ?? "",

//               o.relScore ?? "",

//               o.relReason ?? "",

//               o.imageUrl ?? "",

//               o.dqaCorrection ?? "",

//               o.rejectReason ?? "",

//               o.dqaViewedTime ?? "",

//               o.timestamp ?? "",

//               o.approvedBy ?? "",

//               o.approvedTime ?? "",

//               o.oldOEId ?? "",

//             ].join("¦")

//           )

//           .sort()

//           .join("¶");

//       const previousSignature = getSignature(itemsRef.current);

//       const nextSignature = getSignature(nextItems);

//       if (previousSignature !== nextSignature) {

//         itemsRef.current = nextItems;

//         setItems(nextItems);

//       } else {

//         // Still make sure state is synced on manual refresh.

//         if (force) {

//           itemsRef.current = nextItems;

//           setItems(nextItems);

//         }

//       }

//       if (d?.stats && typeof d.stats === "object") {

//         setStats(d.stats);

//       }

//       setLoaded(true);

//       const pending = nextItems.filter(

//         (o) => o.status === "PENDING"

//       ).length;

//       if (

//         lastPendingCount.current >= 0 &&

//         pending > lastPendingCount.current

//       ) {

//         const diff = pending - lastPendingCount.current;

//         showToast(

//           `🔔 ${diff} new OE${diff > 1 ? "s" : ""} received!`

//         );

//       }

//       lastPendingCount.current = pending;

//       // Show confirmation for manual refresh.

//       if (force) {

//         showToast("🔄 DQA data refreshed");

//       }

//     } catch (e: any) {

//       if (!silent || force) {

//         setError(e?.message || "Failed to load DQA data.");

//       }

//     } finally {

//       refreshInFlightRef.current = false;

//       if (!silent || force) {

//         setLoading(false);

//       }

//     }

//   },

//   [dqaName]

// );

useEffect(() => {

  if (!dqaName.trim()) return;

  let ws: WebSocket | null = null;

  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  let stopped = false;

  const connect = () => {

    if (stopped) return;

    try {

      const url =

        process.env.NEXT_PUBLIC_DQA_WS_URL ||

        "https://oe-websocket.onrender.com";

      ws = new WebSocket(url);

      wsRef.current = ws;

      ws.onopen = () => {

        console.log("DQA realtime connected");

        setWsConnected(true);

        ws?.send(

          JSON.stringify({

            type: "identify",

            role: "dqa",

            memberName: dqaName.trim(),

          })

        );

      };

      ws.onmessage = (event) => {

        try {

          const message = JSON.parse(event.data);

          // ================================================

          // CURRENT LOCKS

          // ================================================

          if (message.type === "current-locks") {

            const next: Record<

              string,

              {

                dqaName: string;

                startedAt: string;

              }

            > = {};

            for (const lock of message.locks || []) {

              next[String(lock.oeId)] = {

                dqaName: lock.dqaName,

                startedAt: lock.startedAt,

              };

            }

            setOeLocks(next);

            return;

          }

          // ================================================

          // OE LOCKED

          // ================================================

          if (message.type === "oe-locked") {

            const oeId = String(message.oeId);

            setOeLocks((prev) => ({

              ...prev,

              [oeId]: {

                dqaName: message.dqaName,

                startedAt: message.startedAt,

              },

            }));

            const currentUser =

              dqaName.trim().toLowerCase();

            const owner =

              String(message.dqaName || "")

                .trim()

                .toLowerCase();

            if (owner !== currentUser) {

              showToast(

                `🔒 ${message.dqaName} started working on this OE.`

              );

            }

            return;

          }

          // ================================================

          // OE UNLOCKED

          // ================================================

          if (message.type === "oe-unlocked") {

            const oeId = String(message.oeId);

            setOeLocks((prev) => {

              const next = { ...prev };

              delete next[oeId];

              return next;

            });

            return;

          }

          // ================================================

          // START RESULT

          // ================================================

          if (message.type === "oe-start-result") {
            const oeId = String(message.oeId || "").trim();

            if (message.success && oeId) {
              setOeLocks((prev) => ({
                ...prev,
                [oeId]: {
                  dqaName: String(message.dqaName || dqaName).trim(),
                  startedAt: String(message.startedAt || new Date().toISOString()),
                },
              }));
            }

            // if (!message.success) {

            //   const oeId = String(message.oeId || "");

            //   setOeLocks((prev) => {

            //     const next = { ...prev };

            //     delete next[oeId];

            //     return next;

            //   });

            //   showToast(

            //     `🔒 ${message.lockedBy || "Another DQA"} is already working on this OE.`

            //   );

            //   load(true);

            // }

            if (!message.success) {
  const oeId = String(message.oeId || "");

  setOeLocks((prev) => {
    const next = { ...prev };
    delete next[oeId];
    return next;
  });

  showToast(
    `🔒 ${message.lockedBy || "Another DQA"} is already working on this OE.`
  );

  load(true);
}

return;

            return;

          }

          // ================================================

          // NEW OE SUBMITTED

          // ================================================

          if (message.type === "oe-submitted") {

            load(true);

            showToast(

              `🔔 New OE submitted by ${message.memberName || "employee"}`

            );

            return;

          }

          // ================================================

          // STATUS CHANGED

          // ================================================

          if (message.type === "oe-status-changed") {

            load(true);

            return;

          }

        } catch (error) {

          console.error(

            "DQA realtime message error:",

            error

          );

        }

      };

      ws.onclose = () => {

        setWsConnected(false);

        if (!stopped) {

          reconnectTimer = setTimeout(connect, 2000);

        }

      };

      ws.onerror = () => {

        setWsConnected(false);

        ws?.close();

      };

    } catch (error) {

      console.error("DQA websocket error:", error);

      setWsConnected(false);

      reconnectTimer = setTimeout(connect, 2000);

    }

  };

  connect();

  return () => {

    stopped = true;

    if (reconnectTimer) {

      clearTimeout(reconnectTimer);

    }

    ws?.close();

    wsRef.current = null;

    setWsConnected(false);

  };

}, [dqaName, load]);

  // auto-refresh

//   useEffect(() => {

//   if (!loaded) return;

//   const refresh = () => {

//     if (typingRef.current) return;

//     if (refreshInFlightRef.current) return;

//     load(false);

//   };

//   const t = setInterval(refresh, 4000);

//   return () => clearInterval(t);

// }, [loaded, load]);

useEffect(() => {
  if (!loaded) return;

  const refresh = () => {
    // Never refresh while DQA is typing.
    if (typingRef.current) return;

    // Never start another request while one is already running.
    if (refreshInFlightRef.current) return;

    // Background refresh MUST be silent.
    load(true);
  };

  const t = setInterval(refresh, 4000);

  return () => clearInterval(t);
}, [loaded, load]);

  

  // ── filters ──────────────────────────────────────────────

  const employees = useMemo(() => {

    const names = items

      .map((x) => String(x?.memberName ?? "").trim())

      .filter(Boolean);

    return Array.from(new Set(names)).sort();

  }, [items]);

  const empMatches = useMemo(() => {

    const v = search.trim().toLowerCase();

    if (!v) return [];

    return employees.filter((n) => n.toLowerCase().includes(v));

  }, [search, employees]);

  // const shown = useMemo(() => {

  //   const today = new Date();

  //   today.setHours(0, 0, 0, 0);

  //   let list = items.filter((x) => {

  //     const memberName = String(x?.memberName ?? "").trim();

  //     const empMatch =

  //       employee === "ALL" ||

  //       memberName.toLowerCase() === employee.toLowerCase();

  //     if (!empMatch) return false;

  //     if (status === "PENDING") return x.status === "PENDING";

  //     if (status === "APPROVED") return x.status === "APPROVED";

  //     if (status === "REJECTED") return x.status === "REJECTED";

  //     if (status === "TODAY") {

  //       const d = parseTS(x.timestamp);

  //       if (!d) return false;

  //       d.setHours(0, 0, 0, 0);

  //       return d.getTime() === today.getTime();

  //     }

  //     if (status === "APPROVED_TODAY") {

  //       if (x.status !== "APPROVED" || !x.approvedTime) return false;

  //       const a = parseTS(x.approvedTime);

  //       if (!a) return false;

  //       a.setHours(0, 0, 0, 0);

  //       return a.getTime() === today.getTime();

  //     }

  //     return true;

  //   });

  //   if (status === "PENDING" || status === "TODAY") {

  //     list = [...list].sort((a, b) => {

  //       const da = parseTS(a.timestamp)?.getTime() || 0;

  //       const db = parseTS(b.timestamp)?.getTime() || 0;

  //       return da - db;

  //     });

  //   }

  //   return list;

  // }, [items, status, employee]);

  // PID reference


  const shown = useMemo(() => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const searchValue = search.trim().toLowerCase();

  let list = items.filter((x) => {
    const memberName = String(x?.memberName ?? "").trim();

    const empMatch =
      employee === "ALL" ||
      memberName.toLowerCase() === employee.toLowerCase();

    // When an employee is not explicitly selected,
    // typing in search should also filter the cards.
    const searchMatch =
      !searchValue ||
      memberName.toLowerCase().includes(searchValue);

    if (!empMatch || !searchMatch) {
      return false;
    }

    if (status === "PENDING") {
      return x.status === "PENDING";
    }

    if (status === "APPROVED") {
      return x.status === "APPROVED";
    }

    if (status === "REJECTED") {
      return x.status === "REJECTED";
    }

    if (status === "TODAY") {
      const d = parseTS(x.timestamp);

      if (!d) return false;

      d.setHours(0, 0, 0, 0);

      return d.getTime() === today.getTime();
    }

    if (status === "APPROVED_TODAY") {
      if (
        x.status !== "APPROVED" ||
        !x.approvedTime
      ) {
        return false;
      }

      const a = parseTS(x.approvedTime);

      if (!a) return false;

      a.setHours(0, 0, 0, 0);

      return a.getTime() === today.getTime();
    }

    return true;
  });

  if (
    status === "PENDING" ||
    status === "TODAY"
  ) {
    list = [...list].sort((a, b) => {
      const da =
        parseTS(a.timestamp)?.getTime() || 0;

      const db =
        parseTS(b.timestamp)?.getTime() || 0;

      return da - db;
    });
  }

  return list;
}, [items, status, employee, search]);

  const pidApproved = useMemo(() => {

    if (!pidRef.trim()) return [];

    return items

      .filter(

        (o) =>

          o.status === "APPROVED" &&

          o.pid?.trim().toLowerCase() === pidRef.trim().toLowerCase()

      )

      .sort((a, b) => {

        const da = parseTS(a.approvedTime || a.timestamp)?.getTime() || 0;

        const db = parseTS(b.approvedTime || b.timestamp)?.getTime() || 0;

        return db - da;

      });

  }, [items, pidRef]);

  // ── actions ──────────────────────────────────────────────

  const markViewing = (oe: OE) => {

    const key = `r${oe.rowIndex}`;

    if (viewingMarked[key] || !oe.id) return;

    setViewingMarked((p) => ({ ...p, [key]: true }));

    api("markDQAViewing", { oeId: oe.id }).catch(() => {});

  };

  const approve = async (oe: OE) => {
  if (!isLockedByMe(oe)) {
    showToast("🔒 You must click Start Working before approving this OE.");
    return;
  }


    const correction =

      corrections[oe.rowIndex!] ?? oe.dqaCorrection ?? "";

    setLoading(true);

    const now = new Date().toISOString();

    const updatedItems = itemsRef.current.map((item) =>

      item.rowIndex === oe.rowIndex

        ? {

            ...item,

            status: "APPROVED",

            approvedBy: dqaName.trim(),

            approvedTime: now,

            dqaCorrection: correction.trim() || item.dqaCorrection,

          }

        : item

    );

    itemsRef.current = updatedItems;

    setItems(updatedItems);

    try {

      await api("approveOE", {

        rowIndex: oe.rowIndex,

        dqaName: dqaName.trim(),

        correction: correction.trim() || "",

      });

      showToast("✅ OE approved successfully!");
      unlockOE(oe);

if (wsRef.current?.readyState === WebSocket.OPEN) {
  wsRef.current.send(
    JSON.stringify({
      type: "oe-status-changed",
      oeId: oe.id,
      memberName: oe.memberName,
      status: "APPROVED",
      approvedBy: dqaName.trim(),
      timestamp: now,
    })
  );
}

      // setTimeout(() => load(true), 600);

    } catch (e: any) {

      setError(e?.message || "Failed to approve.");

      await load(false);

    } finally {

      setLoading(false);

    }

  };

  const doReject = async (r: string) => {

    if (!reject || !r.trim()) return;

    if (!isLockedByMe(reject)) {
      showToast("🔒 You must click Start Working before rejecting this OE.");
      setReject(null);
      return;
    }

    setLoading(true);

    const now = new Date().toISOString();

    const targetOE = reject;

    const updatedItems = itemsRef.current.map((item) =>

      item.rowIndex === targetOE.rowIndex

        ? {

            ...item,

            status: "REJECTED",

            approvedBy: dqaName.trim(),

            approvedTime: now,

            rejectReason: r.trim(),

          }

        : item

    );

    itemsRef.current = updatedItems;

    setItems(updatedItems);

    setReject(null);

    setReason("");

    setCustomReason("");

    try {

      await api("rejectOE", {

        rowIndex: targetOE.rowIndex,

        dqaName: dqaName.trim(),

        reason: r.trim(),

      });

      showToast("❌ OE rejected — reason sent to employee");

      unlockOE(targetOE);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "oe-status-changed",
          oeId: targetOE.id,
          memberName: targetOE.memberName,
          status: "REJECTED",
          approvedBy: dqaName.trim(),
          rejectReason: r.trim(),
          timestamp: now,
        }));
      }

      // setTimeout(() => load(true), 600);

    } catch (e: any) {

      setError(e?.message || "Failed to reject.");

      await load(false);

    } finally {

      setLoading(false);

    }

  };

  // const recall = async (oe: OE) => {

  //   if (!confirm("Recall this decision?\nOE will go back to PENDING.")) return;

  //   setLoading(true);

  //   const updatedItems = itemsRef.current.map((item) =>

  //     item.rowIndex === oe.rowIndex

  //       ? {

  //           ...item,

  //           status: "PENDING",

  //           approvedBy: "",

  //           approvedTime: "",

  //           rejectReason: "",

  //           dqaCorrection: "",

  //         }

  //       : item

  //   );

  //   itemsRef.current = updatedItems;

  //   setItems(updatedItems);

  //   try {

  //     await api("recallOE", { rowIndex: oe.rowIndex });

  //     showToast("↩️ Recalled — OE is back to PENDING");

  //     setTimeout(() => load(true), 600);

  //   } catch (e: any) {

  //     setError(e?.message || "Failed to recall.");

  //     await load(false);

  //   } finally {

  //     setLoading(false);

  //   }

  // };


  const recall = async (oe: OE) => {
  if (
    oe.status !== "APPROVED" &&
    oe.status !== "REJECTED"
  ) {
    return;
  }

  if (
    !confirm(
      "Recall this decision?\nOE will go back to PENDING."
    )
  ) {
    return;
  }

  setLoading(true);

  const updatedItems = itemsRef.current.map((item) =>
    item.rowIndex === oe.rowIndex
      ? {
          ...item,
          status: "PENDING",
          approvedBy: "",
          approvedTime: "",
          rejectReason: "",
          dqaCorrection: "",
        }
      : item
  );

  itemsRef.current = updatedItems;
  setItems(updatedItems);

  try {
    await api("recallOE", {
      rowIndex: oe.rowIndex,
    });

    showToast("↩️ Recalled — OE is back to PENDING");

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "oe-status-changed",
          oeId: oe.id,
          memberName: oe.memberName,
          status: "PENDING",
          timestamp: new Date().toISOString(),
        })
      );
    }
  } catch (e: any) {
    setError(e?.message || "Failed to recall.");

    await load(false);
  } finally {
    setLoading(false);
  }
};

  const loadSuggestions = async (oe: OE) => {

    const idx = oe.rowIndex!;

    setSugLoading((p) => ({ ...p, [idx]: true }));

    try {

      const question = getQuestionText(oe);

      const res = await api<any>("rewriteOEAsHuman", {

        oeResponse: oe.oeResponse,

        oeText: oe.oeResponse,

        question,

        qText: question,

        qNumber: oe.qNumber,

      });

      const list =

        res?.suggestions ||

        res?.data?.suggestions ||

        (Array.isArray(res) ? res : []);

      setSuggestions((p) => ({ ...p, [idx]: list }));

    } catch {

      setSuggestions((p) => ({ ...p, [idx]: [] }));

    } finally {

      setSugLoading((p) => ({ ...p, [idx]: false }));

    }

  };

const getOELock = (oe: OE) => {
  const oeId = String(oe.id || "").trim();
  return oeLocks[oeId] || null;
};

const isLockedByOther = (oe: OE) => {
  const lock = getOELock(oe);
  if (!lock) return false;
  return lock.dqaName.trim().toLowerCase() !== dqaName.trim().toLowerCase();
};

const isLockedByMe = (oe: OE) => {
  const lock = getOELock(oe);
  if (!lock) return false;
  return lock.dqaName.trim().toLowerCase() === dqaName.trim().toLowerCase();
};

// const startWorking = (oe: OE) => {
//   const oeId = String(oe.id || "").trim();
//   if (!oeId) { showToast("OE ID is missing."); return; }
//   if (!dqaName.trim()) { showToast("Please enter your DQA name first."); return; }
//   if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
//     showToast("Realtime connection is not available.");
//     return;
//   }
//   const existing = oeLocks[oeId];
//   if (existing && existing.dqaName.trim().toLowerCase() !== dqaName.trim().toLowerCase()) {
//     showToast(`🔒 ${existing.dqaName} is already working on this OE.`);
//     return;
//   }
//   wsRef.current.send(JSON.stringify({ type: "oe-start", oeId, dqaName: dqaName.trim() }));
//   markViewing(oe);
// };


const startWorking = (oe: OE) => {
  const oeId = String(oe.id || "").trim();

  if (!oeId) {
    showToast("OE ID is missing.");
    return;
  }

  const currentDqa = dqaName.trim();

  if (!currentDqa) {
    showToast("Please enter your DQA name first.");
    return;
  }

  if (
    !wsRef.current ||
    wsRef.current.readyState !== WebSocket.OPEN
  ) {
    showToast("Realtime connection is not available.");
    return;
  }

  const existing = oeLocks[oeId];

  if (
    existing &&
    existing.dqaName.trim().toLowerCase() !==
      currentDqa.toLowerCase()
  ) {
    showToast(
      `🔒 ${existing.dqaName} is already working on this OE.`
    );
    return;
  }

  // ONLY this action starts the lock.
  wsRef.current.send(
    JSON.stringify({
      type: "oe-start",
      oeId,
      dqaName: currentDqa,
    })
  );

  // Viewing is separate from locking.
  markViewing(oe);
};


const unlockOE = (oe: OE) => {
  const oeId = String(oe.id || "").trim();
  if (!oeId) return;
  if (wsRef.current?.readyState === WebSocket.OPEN) {
    wsRef.current.send(JSON.stringify({ type: "oe-unlock", oeId, dqaName: dqaName.trim() }));
  }
};

const openSheet = (pid?: string) => {

  // Main Google Sheet

  const SHEET_ID = "154f6pemEnid-mgnv3CGEuC4pAv0XjlNIdcRpONb3KAo";

  const baseUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit`;

  if (!pid?.trim()) {

    // Open main sheet

    window.open(baseUrl, "_blank");

    return;

  }

  // Open the sheet (you can later improve this to open specific PID tab)

  window.open(baseUrl, "_blank");

};

  // ── dashboard numbers ────────────────────────────────────

  const dash = useMemo(() => {

    const s = stats || {};

    return [

      {

        label: "⏳ Pending",

        val: s.totalPending ?? items.filter((x) => x.status === "PENDING").length,

        bg: "bg-amber-50 border-amber-300",

        color: "text-amber-800",

        key: "PENDING",

      },

      {

        label: "✅ Total Approved",

        val: s.totalApproved ?? items.filter((x) => x.status === "APPROVED").length,

        bg: "bg-green-50 border-green-300",

        color: "text-green-800",

        key: "APPROVED",

      },

      {

        label: "❌ Rejected",

        val: s.totalRejected ?? items.filter((x) => x.status === "REJECTED").length,

        bg: "bg-red-50 border-red-300",

        color: "text-red-700",

        key: "REJECTED",

      },

      {

        label: "📥 Today Submitted",

        val: s.submittedToday ?? 0,

        bg: "bg-blue-50 border-blue-300",

        color: "text-blue-800",

        key: "TODAY",

      },

      {

        label: "✅ Approved Today",

        val: s.approvedToday ?? 0,

        bg: "bg-green-50 border-green-300",

        color: "text-green-800",

        key: "APPROVED_TODAY",

      },

    ];

  }, [stats, items]);

  // ── render ───────────────────────────────────────────────

  return (

    <div className="mx-auto w-full max-w-3xl px-3 py-4">

      {/* Toast */}

      {toast && (

        <div className="fixed right-4 top-4 z-[9999] max-w-xs rounded-xl bg-slate-800 px-4 py-3 text-sm text-white shadow-lg">

          {toast}

        </div>

      )}

      {/* Header */}

      <div className="rounded-t-2xl bg-black px-5 py-5 text-center text-white">

        <div className="flex items-center justify-center gap-2">

          <ShieldCheck size={22} />

          <h3 className="text-xl font-bold">DQA Review Panel</h3>

        </div>

        <p className="mt-1 text-xs opacity-85">

          Review, correct, approve or reject team OE submissions

        </p>

      </div>

      <div className="rounded-b-2xl border border-t-0 bg-white p-5 shadow-md">

        {/* Login */}

        {!loaded ? (

          <div className="flex gap-2">

            <input

              className="input flex-1"

              placeholder="Enter your DQA name..."

              value={dqaName}

              onChange={(e) => setDqaName(e.target.value)}

              onKeyDown={(e) => e.key === "Enter" && load()}

            />

            <button

              className="btn-primary whitespace-nowrap"

              onClick={() => load()}

              disabled={loading}

            >

              {loading ? "Loading..." : "Load Panel"}

            </button>

          </div>

        ) : (

          <>

            {/* Dashboard cards */}

            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">

              {dash.map((c) => (

                <button

                  key={c.key}

                  onClick={() => setStatus(c.key)}

                  className={`rounded-xl border-2 p-3 text-center transition hover:-translate-y-0.5 hover:shadow-md ${

                    status === c.key ? "ring-2 ring-slate-700" : ""

                  } ${c.bg}`}

                >

                  <div className="text-[11px] font-bold text-slate-600">

                    {c.label}

                  </div>

                  <div className={`text-2xl font-bold ${c.color}`}>{c.val}</div>

                  <div className="mt-0.5 text-[10px] text-slate-400">

                    click to filter

                  </div>

                </button>

              ))}

            </div>

            {/* Filters */}

            <div className="mb-3 flex flex-wrap items-center gap-2">

              <div className="relative min-w-[180px] flex-1">

                <Search

                  className="absolute left-3 top-2.5 text-slate-400"

                  size={16}

                />

                <input

                  className="input pl-9"

                  value={search}

                  onChange={(e) => {

                    setSearch(e.target.value);

                    setEmpDropdownOpen(true);

                    if (!e.target.value) setEmployee("ALL");

                  }}

                  onFocus={() => setEmpDropdownOpen(true)}

                  placeholder="🔍 Search employee name..."

                />

                {empDropdownOpen && empMatches.length > 0 && (

                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto rounded-lg border-2 border-[#e06666] bg-white shadow-lg">

                    <div

                      className="cursor-pointer border-b px-3 py-2 text-sm text-slate-500 hover:bg-slate-50"

                      onClick={() => {

                        setEmployee("ALL");

                        setSearch("");

                        setEmpDropdownOpen(false);

                      }}

                    >

                      👥 Show All

                    </div>

                    {empMatches.map((n) => (

                      <div

                        key={n}

                        className="cursor-pointer border-b px-3 py-2.5 text-sm hover:bg-red-50"

                        onClick={() => {

                          setEmployee(n);

                          setSearch(n);

                          setEmpDropdownOpen(false);

                        }}

                      >

                        {n}

                      </div>

                    ))}

                  </div>

                )}

              </div>

              <span className="whitespace-nowrap text-sm text-slate-500">

                {shown.length} shown

              </span>

              {/* <button

                className="btn-muted"

                onClick={() => load()}

                disabled={loading}

              >

                <RefreshCw

                  size={16}

                  className={loading ? "animate-spin" : ""}

                />

              </button> */}

              <button

  type="button"

  className="btn-muted"

  onClick={() => load(false)}

  disabled={loading}

  title="Refresh DQA data"

>

  <RefreshCw

    size={16}

    className={loading ? "animate-spin" : ""}

  />

</button>

            </div>

            {/* PID Reference Panel */}

            <div className="mb-4 rounded-xl border-2 border-purple-300 bg-purple-50 p-4">

              <div className="mb-2 text-sm font-bold text-black">

                📋 Check Approved OEs by PID — see what’s already approved

              </div>

              <div className="flex gap-2">

                <input

                  className="input flex-1 border-purple-400"

                  placeholder="🔍 Type exact PID..."

                  value={pidRef}

                  onChange={(e) => setPidRef(e.target.value)}

                />

                <button

                  className="btn-muted"

                  onClick={() => setPidRef("")}

                >

                  ✕

                </button>

                <button

                  className="btn-primary"

                  onClick={() => openSheet(pidRef)}

                >

                  📋 Sheet

                </button>

              </div>

              {pidRef && (

                <div className="mt-3 max-h-60 overflow-y-auto">

                  {pidApproved.length === 0 ? (

                    <div className="py-4 text-center text-sm text-slate-500">

                      📭 No approved OEs for this PID yet

                    </div>

                  ) : (

                    <>

                      <div className="mb-2 text-xs font-bold text-purple-600">

                        ✅ {pidApproved.length} approved — new submission must be DIFFERENT

                      </div>

                      {pidApproved.map((oe) => (

                        <div

                          key={oe.id || oe.rowIndex}

                          className="mb-2 rounded-lg border border-purple-200 bg-white p-3 text-sm"

                        >

                          <div className="mb-1 text-[11px] text-slate-500">

                            📅 {formatTS(oe.approvedTime || oe.timestamp)} ·{" "}

                            {oe.approvedBy || "DQA"}

                          </div>

                          <div className="mb-1 font-bold text-purple-700">

                            {oe.qNumber}

                          </div>

                          <div className="rounded bg-purple-50 p-2 text-sm">

                            {oe.dqaCorrection?.trim() || oe.oeResponse}

                          </div>

                        </div>

                      ))}

                    </>

                  )}

                </div>

              )}

            </div>

            {/* Count bar */}

            {shown.length > 0 && (

              <div

                className={`mb-4 rounded-lg px-4 py-3 text-sm font-bold ${

                  status === "REJECTED"

                    ? "bg-red-50 text-red-700"

                    : shown.some((o) => o.status === "PENDING")

                    ? "bg-amber-50 text-amber-800"

                    : "bg-green-50 text-green-800"

                }`}

              >

                {status === "REJECTED"

                  ? `❌ ${shown.length} rejected OE(s)`

                  : shown.some((o) => o.status === "PENDING")

                  ? `⏳ ${

                      shown.filter((o) => o.status === "PENDING").length

                    } OE(s) waiting — sorted oldest first`

                  : `✅ ${shown.length} OE(s) shown`}

              </div>

            )}

            {/* OE Cards */}

            <div className="space-y-4">

              {shown.map((oe, idx) => {

                // const isPending = oe.status === "PENDING";

                // const isApp = oe.status === "APPROVED";

                // const isRej = oe.status === "REJECTED";

                // const corr =

                //   corrections[oe.rowIndex!] ??

                //   oe.dqaCorrection ??

                //   "";

                // const aiC =

                //   Number(oe.aiScore) >= 65

                //     ? "text-green-700"

                //     : Number(oe.aiScore) >= 50

                //     ? "text-orange-600"

                //     : "text-red-600";

                // const relC =

                //   Number(oe.relScore) >= 65

                //     ? "text-green-700"

                //     : Number(oe.relScore) >= 50

                //     ? "text-orange-600"

                //     : "text-red-600";

                  const isPending = oe.status === "PENDING";
  const isApp = oe.status === "APPROVED";
  const isRej = oe.status === "REJECTED";

  // Realtime DQA lock state for this OE
  const lock = getOELock(oe);
  const lockedByOther = isLockedByOther(oe);
  const lockedByMe = isLockedByMe(oe);

  const corr =
    corrections[oe.rowIndex!] ??
    oe.dqaCorrection ??
    "";

  const aiC =
    Number(oe.aiScore) >= 65
      ? "text-green-700"
      : Number(oe.aiScore) >= 50
      ? "text-orange-600"
      : "text-red-600";

  const relC =
    Number(oe.relScore) >= 65
      ? "text-green-700"
      : Number(oe.relScore) >= 50
      ? "text-orange-600"
      : "text-red-600";


                return (

                  <div

                    key={oe.id ?? `${oe.rowIndex}-${idx}`}
className={`rounded-xl border-2 p-4 ${

                      isApp

                        ? "border-green-400 bg-green-50"

                        : isRej

                        ? "border-red-400 bg-red-50"

                        : "border-slate-200 bg-amber-50/40"

                    }`}

                  >

                    {/* Header */}

                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">

                      <span className="rounded-full bg-blue-500 px-3 py-1 text-xs font-bold text-white">

                        {oe.pid}

                      </span>

                      <span className="text-xs text-slate-500">

                        By <b>{oe.memberName}</b> · Ref: {oe.id}

                        {oe.oldOEId && (

                          <span className="ml-2 rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">

                            🔄 Resubmission

                          </span>

                        )}

                      </span>

                    </div>

                    {/* Timestamp + wait */}

                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">

                      🕐 {formatTS(oe.timestamp)}

                      {isPending && (

                        <>

                          <span

                            className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${

                              waitClass(oe.timestamp) === "urgent"

                                ? "border-red-300 bg-red-50 text-red-700"

                                : waitClass(oe.timestamp) === "warn"

                                ? "border-amber-300 bg-amber-50 text-amber-700"

                                : "border-blue-300 bg-blue-50 text-blue-700"

                            }`}

                          >

                            ⏱ {waitingTime(oe.timestamp)}

                          </span>

                          {priorityTag(oe.timestamp)}

                        </>

                      )}

                    </div>

                    {/* Question */}

                    <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">

                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">

                        ❓ Question {oe.qNumber ? `· ${oe.qNumber}` : ""}

                      </div>

                      {getQuestionText(oe) ? (

                        <div className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">

                          {getQuestionText(oe)}

                        </div>

                      ) : (

                        <div className="text-xs italic text-slate-500">

                          Question text is not available for this submission.

                          {oe.qNumber ? ` Question number: ${oe.qNumber}` : ""}

                          {oe.imageUrl ? " Use “View Question Screenshot” below." : ""}

                        </div>

                      )}

                    </div>

                    {/* Scores */}

                    {(oe.aiScore !== "" && oe.aiScore != null) ||

                    (oe.relScore !== "" && oe.relScore != null) ? (

                      <div className="mb-3 flex gap-2">

                        {oe.aiScore != null && oe.aiScore !== "" && (

                          <div

                            className="flex-1 rounded-md border bg-white px-2 py-1.5 text-center text-[11px]"

                            title={oe.aiReason || ""}

                          >

                            <div className="text-slate-500">🤖 Human</div>

                            <b className={`text-base ${aiC}`}>

                              {oe.aiScore}/100

                            </b>

                            {oe.aiReason && (

                              <div className="truncate text-[9px] text-slate-400">

                                {oe.aiReason.slice(0, 40)}

                                {oe.aiReason.length > 40 ? "…" : ""}

                              </div>

                            )}

                          </div>

                        )}

                        {oe.relScore != null && oe.relScore !== "" && (

                          <div

                            className="flex-1 rounded-md border bg-white px-2 py-1.5 text-center text-[11px]"

                            title={oe.relReason || ""}

                          >

                            <div className="text-slate-500">🎯 Relevancy</div>

                            <b className={`text-base ${relC}`}>

                              {oe.relScore}/100

                            </b>

                            {oe.relReason && (

                              <div className="truncate text-[9px] text-slate-400">

                                {oe.relReason.slice(0, 40)}

                                {oe.relReason.length > 40 ? "…" : ""}

                              </div>

                            )}

                          </div>

                        )}

                      </div>

                    ) : null}

                    {/* Reject reason */}

                    {isRej && oe.rejectReason && (

                      <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">

                        <b>❌ Rejection Reason:</b> {oe.rejectReason}

                      </div>

                    )}

                    {/* Previous rejected version */}

                    {oe.oldOEId && (

                      <div className="mb-3">

                        {(() => {

                          const old = items.find((o) => o.id === oe.oldOEId);

                          if (!old) return null;

                          return (

                            <div className="rounded-lg border border-red-300 bg-red-50 p-3">

                              <div className="mb-1 text-[11px] font-bold uppercase text-red-600">

                                ❌ Previous Rejected Version

                              </div>

                              <div className="text-sm text-red-700 opacity-80">

                                {old.oeResponse}

                              </div>

                              {old.rejectReason && (

                                <div className="mt-1 text-[11px] italic text-slate-500">

                                  Reason: {old.rejectReason}

                                </div>

                              )}

                            </div>

                          );

                        })()}

                        <div className="my-1 text-center text-xs text-slate-400">

                          ⬇️ New resubmitted version

                        </div>

                      </div>

                    )}

                    {/* Same start alert */}

                    {isPending && sameStartAlert(oe.memberName || "", oe.oeResponse || "")}

                    {/* DQA viewed */}

                    {isPending && oe.dqaViewedTime && (

                      <div className="mb-2 inline-block rounded-md border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] text-blue-700">

                        👁️ You viewed this at {formatTS(oe.dqaViewedTime)}

                      </div>

                    )}

                    {/* Image button */}

                    {oe.imageUrl && (

                      <button

                        className="mb-2 inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 hover:bg-blue-100"

                        onClick={() =>

                          setImgModal({

                            url: oe.imageUrl!,

                            q: getQuestionText(oe) || oe.qNumber || "",

                          })

                        }

                      >

                        <ImageIcon size={14} /> View Question Screenshot

                      </button>

                    )}

                    {/* Original OE */}

                    <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">

                      Original OE Response

                    </div>

                    <div className="mb-1 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm leading-relaxed">

                      {oe.oeResponse}

                    </div>

                    <div className="mb-3 text-right">

                      {wcBadge((oe.oeResponse || "").length)}

                    </div>

                    {/* Realtime DQA lock */}
                    {isPending && (
                      <div className="mb-3">
                        {!lock && (
                          <button type="button" onClick={() => startWorking(oe)} disabled={!wsConnected} className="w-full rounded-lg bg-black px-4 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
                            {wsConnected ? "▶️ Start Working on this OE" : "🔌 Connecting realtime..."}
                          </button>
                        )}
                        {lockedByOther && (
                          <div className="rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3 text-center">
                            <div className="text-sm font-bold text-red-700">🔒 Currently Someone is working</div>
                            {/* <div className="mt-1 text-xs text-red-600">{lock?.dqaName} is working on this OE</div>
                            <div className="mt-1 text-[10px] text-slate-500">Other DQAs cannot edit, suggest, approve, or reject this OE.</div> */}
                          </div>
                        )}
                        {lockedByMe && (
                          <div className="rounded-lg border-2 border-green-300 bg-green-50 px-4 py-3">
                            <div className="text-center text-sm font-bold text-green-700">🟢 You are working on this OE</div>
                            {lock?.startedAt && <div className="mt-1 text-center text-[10px] text-slate-500">Started {formatTS(lock.startedAt)}</div>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Pending actions */}
                    {isPending && lockedByMe && (

                      <>

                        <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">

                          DQA Correction

                        </div>

                        <p className="mb-1 text-xs text-slate-500">

                          Leave blank if already correct. Or type / pick an improved version.

                        </p>

                        <textarea

                          className="input h-24"

                          placeholder="Type corrected OE here or leave blank..."

                          value={corr}

                          onChange={(e) => {

                            typingRef.current = true;

                            setCorrections((p) => ({

                              ...p,

                              [oe.rowIndex!]: e.target.value,

                            }));

                          }}

                          onFocus={() => {

                            markViewing(oe);

                            typingRef.current = true;

                          }}

                          onBlur={() => {

                            setTimeout(() => {

                              typingRef.current = false;

                            }, 300);

                          }}

                        />

                        <div className="mb-2 text-right">

                          {wcBadge(corr.length)}

                        </div>

                        {/* Suggestions */}

                        <button

                          className="mb-2 flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-700 disabled:opacity-60"

                          disabled={sugLoading[oe.rowIndex!]}

                          onClick={() => loadSuggestions(oe)}

                        >

                          {sugLoading[oe.rowIndex!] ? (

                            <>

                              <RefreshCw size={14} className="animate-spin" />{" "}

                              Generating...

                            </>

                          ) : (

                            <>

                              <Sparkles size={14} /> Generate 5 Better Suggestions

                            </>

                          )}

                        </button>

                        {suggestions[oe.rowIndex!] && (

                          <div className="mb-3 space-y-2">

                            <div className="rounded-md bg-purple-50 px-3 py-1.5 text-xs font-bold text-purple-700">

                              💡 Click any suggestion to use

                            </div>

                            {suggestions[oe.rowIndex!].map((txt, i) => (

                              <div

                                key={i}

                                className="cursor-pointer rounded-lg border bg-white p-3 text-sm hover:border-purple-400 hover:bg-purple-50"

                                onClick={() => {

                                  setCorrections((p) => ({

                                    ...p,

                                    [oe.rowIndex!]: txt,

                                  }));

                                }}

                              >

                                <div className="mb-1 text-[10px] text-slate-400">

                                  {wcBadge(txt.length)}

                                </div>

                                {txt}

                              </div>

                            ))}

                          </div>

                        )}

                        <div className="flex flex-wrap gap-2">

                          <button

                            className="btn-success flex-1"

                            onClick={() => approve(oe)}

                            disabled={loading}

                          >

                            <ThumbsUp size={16} /> Approve &amp; Send Green Signal

                          </button>

                          <button

                            className="btn-danger"

                            onClick={() => setReject(oe)}

                            disabled={loading}

                          >

                            <ThumbsDown size={16} /> Reject

                          </button>

                          <button

                            className="btn-muted"

                            onClick={() => openSheet(oe.pid)}

                          >

                            <ExternalLink size={14} /> Sheet

                          </button>

                        </div>

                      </>

                    )}

                    {/* Approved state */}

                    {isApp && (

                      <div>

                        <div className="rounded-lg border border-green-400 bg-green-100 p-3 text-center">

                          <b className="text-green-800">

                            ✅ Approved by {oe.approvedBy || "DQA"}

                          </b>

                          {oe.approvedTime && (

                            <div className="mt-1 text-xs text-slate-500">

                              🕐 {formatTS(oe.approvedTime)}

                            </div>

                          )}

                          {oe.dqaCorrection?.trim() && (

                            <div className="mt-2 rounded bg-white p-2 text-left text-sm">

                              <b>✏️ DQA Correction used:</b>

                              <br />

                              {oe.dqaCorrection}

                            </div>

                          )}

                        </div>

                        <button

                          className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100"

                          onClick={() => recall(oe)}

                        >

                          <RotateCcw size={14} className="mr-1 inline" /> Recall —

                          Move back to Pending

                        </button>

                      </div>

                    )}

                    {/* Rejected state */}

                    {isRej && (

                      <div>

                        <div className="rounded-lg border border-red-300 bg-red-50 p-3">

                          <b className="text-red-700">

                            ❌ Rejected by {oe.approvedBy || "DQA"}

                          </b>

                          {oe.rejectReason && (

                            <div className="mt-1 text-sm text-slate-600">

                              <b>Reason:</b> {oe.rejectReason}

                            </div>

                          )}

                          {oe.dqaCorrection?.trim() ? (

                            <div className="mt-2 rounded bg-white p-2 text-sm">

                              <b>✏️ DQA Suggested Edit:</b>

                              <br />

                              {oe.dqaCorrection}

                            </div>

                          ) : (

                            <div className="mt-1 text-xs italic text-slate-500">

                              No correction was suggested.

                            </div>

                          )}

                        </div>

                        <button

                          className="mt-2 w-full rounded-lg border border-amber-300 bg-amber-50 py-2 text-sm font-bold text-amber-800 hover:bg-amber-100"

                          onClick={() => recall(oe)}

                        >

                          <RotateCcw size={14} className="mr-1 inline" /> Recall —

                          Move back to Pending

                        </button>

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

            {!shown.length && (

              <div className="py-12 text-center text-slate-400">

                <FileText className="mx-auto mb-2" size={36} />

                <p>No OEs found for this filter.</p>

              </div>

            )}

          </>

        )}

        {error && (

          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">

            {error}

          </div>

        )}

      </div>

      {/* Reject Modal */}

      {reject && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">

          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">

            <div className="mb-1 flex items-center justify-between">

              <h2 className="text-lg font-bold text-red-700">

                ❌ Reject OE — Select Reason

              </h2>

              <button

                onClick={() => {

                  setReject(null);

                  setReason("");

                  setCustomReason("");

                }}

              >

                <X size={20} />

              </button>

            </div>

            <p className="mb-4 text-xs text-slate-500">

              This reason will be shown to the employee so they can improve.

            </p>

            <div className="space-y-2">

              {PREDEFINED_REASONS.map((r) => (

                <button

                  key={r}

                  className="w-full rounded-lg border-2 border-slate-200 bg-white p-3 text-left text-sm hover:border-red-400 hover:bg-red-50 hover:text-red-700"

                  onClick={() => doReject(r)}

                >

                  {r}

                </button>

              ))}

            </div>

            <div className="mt-3">

              <div className="mb-1 text-[11px] font-bold uppercase text-slate-500">

                ✏️ Or type a custom reason:

              </div>

              <textarea

                className="input h-20"

                placeholder="Type your own rejection reason..."

                value={customReason}

                onChange={(e) => setCustomReason(e.target.value)}

              />

              <button

                className="mt-2 w-full rounded-lg border-2 border-red-400 bg-red-50 py-2.5 text-sm font-bold text-red-700 hover:bg-red-100"

                disabled={!customReason.trim() || loading}

                onClick={() => doReject(customReason)}

              >

                ✉️ Send Custom Reason

              </button>

            </div>

            <button

              className="mt-3 w-full rounded-lg bg-slate-100 py-2.5 text-sm text-slate-600"

              onClick={() => {

                setReject(null);

                setReason("");

                setCustomReason("");

              }}

            >

              Cancel

            </button>

          </div>

        </div>

      )}

      {/* Image Modal */}

      {imgModal && (

        <div

          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 p-5"

          onClick={() => setImgModal(null)}

        >

          <img

            src={imgModal.url}

            alt="Question screenshot"

            className="max-h-[72vh] max-w-full rounded-lg border-4 border-white"

            onClick={(e) => e.stopPropagation()}

          />

          {imgModal.q && (

            <div className="mt-4 max-w-xl rounded-lg bg-white/15 px-4 py-3 text-center text-sm text-white">

              ❓ {imgModal.q}

            </div>

          )}

          <button

            className="mt-4 rounded-lg bg-white px-8 py-2.5 font-bold text-slate-800"

            onClick={() => setImgModal(null)}

          >

            ✕ Close

          </button>

        </div>

      )}

    </div>

  );

}