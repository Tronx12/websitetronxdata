"use client";

import { useEffect, useMemo,   useRef,useState } from "react";
import {
  CheckCircle2,
  Clock3,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  XCircle,
  AlertCircle,
  Image as ImageIcon,
  Send,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api";

type OERecord = {
  id?: string;
  pid?: string;
  qNumber?: string;

  // Question fields — same fields supported by the DQA panel
  question?: string;
  questionText?: string;
  questionTitle?: string;
  actualQuestion?: string;

  originalOE?: string;
  approvedOE?: string;

  status?: string;
  approvedBy?: string;

  aiScore?: string | number;
  aiReason?: string;

  relScore?: string | number;
  relReason?: string;

  rejectReason?: string;

  timestamp?: string;
  imageUrl?: string;
  dqaViewedTime?: string;
};

type FilterStatus =
  | "all"
  | "approved"
  | "pending"
  | "rejected";

type ResultsViewProps = {
  memberName?: string;
};

export default function ResultsView({
  memberName,
}: ResultsViewProps) {
  const [results, setResults] = useState<OERecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<FilterStatus>("all");

  const [message, setMessage] = useState("");

  // Edit / resubmit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  // AI human-style suggestions
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [suggestionLoading, setSuggestionLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
  const name = String(memberName || "").trim();

  if (!name) return;

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
        console.log("Result realtime connected");

        ws?.send(
          JSON.stringify({
            type: "identify",
            role: "employee",
            memberName: name,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);

          if (
            message.type === "oe-submitted" ||
            message.type === "oe-status-changed" ||
            message.type === "result-updated"
          ) {
            const eventMember =
              String(message.memberName || "").trim().toLowerCase();

            const currentMember = name.toLowerCase();

            if (
              !eventMember ||
              eventMember === currentMember
            ) {
              // Immediately reload.
              loadResults(false, true);
            }
          }
        } catch (error) {
          console.error(
            "Result websocket message error:",
            error
          );
        }
      };

      ws.onclose = () => {
        if (!stopped) {
          reconnectTimer = setTimeout(connect, 2000);
        }
      };

      ws.onerror = () => {
        ws?.close();
      };
    } catch (error) {
      console.error(
        "Result websocket connection error:",
        error
      );

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
  };
}, [memberName]);

  const isFetchingRef = useState<boolean>(false)[0];
  const fetchingRef = useState<{ inFlight: boolean }>({ inFlight: false })[0];

  // =========================================================
  // LOAD RESULTS
  // =========================================================

  const loadResults = async (showRefresh = false, silent = false) => {
    const name = String(memberName || "").trim();

    if (!name) {
      setResults([]);
      setMessage(
        "Member name is not available. Please login again."
      );
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (fetchingRef.inFlight) return;
    fetchingRef.inFlight = true;

    try {
      if (!silent) {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setMessage("");
      }

      // IMPORTANT:
      // Backend action is getMyResults
      // NOT getOEResults / getMyOEResults

      const response = await api<any>("getMyResults", {
        memberName: name,
        _t: Date.now(),
      });

      const data = Array.isArray(response)
        ? response
        : response?.results ||
          response?.data ||
          [];

      const normalizedResults: OERecord[] = (
        Array.isArray(data) ? data : []
      ).map((item: any) => {
        const candidates = [
          item.questionText,
          item.question,
          item.actualQuestion,
          item.questionTitle,
        ];

        let questionText = "";

        for (const value of candidates) {
          const text = String(value ?? "").trim();

          if (
            text &&
            !/^Q\s*\d+[A-Z]?$/i.test(text)
          ) {
            questionText = text;
            break;
          }
        }

        // Legacy records where Column E contains
        // the complete question instead of Q1/Q2.
        if (
          !questionText &&
          item.qNumber &&
          !/^Q\s*\d+[A-Z]?$/i.test(
            String(item.qNumber).trim()
          )
        ) {
          questionText = String(item.qNumber).trim();
        }

        return {
          ...item,

          qNumber: String(item.qNumber || "").trim(),

          // Keep all aliases so the UI/DQA logic can use them
          questionText,
          question: questionText,
          actualQuestion: questionText,
        };
      });

      setResults(normalizedResults);
      if (silent) setMessage("");
    } catch (error: any) {
      console.error("getMyResults error:", error);

      if (!silent) {
        setMessage(
          error?.message ||
            "Unable to load your OE results."
        );
        setResults([]);
      }
    } finally {
      fetchingRef.inFlight = false;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (memberName?.trim()) {
      loadResults();

      // Auto-poll results every 5 seconds so employee immediately sees status updates
      const pollInterval = setInterval(() => {
        loadResults(false, true);
      }, 5000);

      const handleOeSubmitted = () => {
        loadResults(true, false);
      };

      const handleVisibilityChange = () => {
        if (document.visibilityState === "visible") {
          loadResults(false, true);
        }
      };

      if (typeof window !== "undefined") {
        window.addEventListener("oe_submitted", handleOeSubmitted);
        window.addEventListener("visibilitychange", handleVisibilityChange);
      }

      return () => {
        clearInterval(pollInterval);
        if (typeof window !== "undefined") {
          window.removeEventListener("oe_submitted", handleOeSubmitted);
          window.removeEventListener("visibilitychange", handleVisibilityChange);
        }
      };
    } else {
      setLoading(false);
    }
  }, [memberName]);

  // =========================================================
  // STATUS
  // =========================================================

  const getStatus = (
    item: OERecord
  ): FilterStatus => {
    const status = String(
      item.status || ""
    )
      .trim()
      .toLowerCase();

    if (
      status === "approved" ||
      status === "approve"
    ) {
      return "approved";
    }

    if (
      status === "rejected" ||
      status === "reject" ||
      status === "declined"
    ) {
      return "rejected";
    }

    return "pending";
  };

  // =========================================================
  // QUESTION
  // =========================================================

  // Use the same question resolution logic as the DQA panel.
  // Priority:
  // 1. questionText
  // 2. question
  // 3. actualQuestion
  // 4. questionTitle
  //
  // Q1 / Q2 / Q3 etc. are ignored because they are
  // question numbers, not the actual question text.
  const getQuestionText = (item: OERecord) => {
    const candidates = [
      item.questionText,
      item.question,
      item.actualQuestion,
      item.questionTitle,
    ];

    for (const value of candidates) {
      const text = String(value ?? "").trim();

      if (text && !/^Q\s*\d+[A-Z]?$/i.test(text)) {
        return text;
      }
    }

    // Legacy submissions created before Column T was introduced.
    const legacyQuestions: Record<string, string> = {
      Q1: "What do you enjoy most about working?",
    };

    return legacyQuestions[String(item.qNumber || "").trim().toUpperCase()] || "";
  };

  // =========================================================
  // EDIT / RESUBMIT
  // =========================================================

  const startEdit = (item: OERecord) => {
    setEditingId(item.id || null);
    setEditText(item.originalOE || "");
    setMessage("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const resubmit = async (item: OERecord) => {
    const oeId = String(item.id || "").trim();
    const newText = editText.trim();

    if (!oeId) {
      setMessage("OE ID is missing. Please refresh and try again.");
      return;
    }

    if (!newText) {
      setMessage("Please enter your revised OE response.");
      return;
    }

    try {
      setSavingEdit(true);
      setMessage("");

      await api("updateOE", {
        oeId,
        newText,
      });

      cancelEdit();
      await loadResults(true);
    } catch (error: any) {
      setMessage(error?.message || "Unable to resubmit the OE.");
    } finally {
      setSavingEdit(false);
    }
  };

  // =========================================================
  // AI SUGGESTIONS
  // =========================================================

  const getSuggestionKey = (item: OERecord, index: number) =>
    String(item.id || `${item.pid || "oe"}-${item.qNumber || "q"}-${index}`);

  // const loadSuggestions = async (item: OERecord, index: number) => {
  //   const key = getSuggestionKey(item, index);
  //   const question = getQuestionText(item);

  //   try {
  //     setSuggestionLoading((prev) => ({ ...prev, [key]: true }));
  //     setMessage("");

  //     const response = await api<any>("rewriteOEAsHuman", {
  //       oeResponse: item.originalOE || "",
  //       question,
  //       qText: question,
  //       qNumber: item.qNumber || "",
  //     });

  //     const list =
  //       response?.suggestions ||
  //       response?.data?.suggestions ||
  //       (Array.isArray(response) ? response : []);

  //     setSuggestions((prev) => ({
  //       ...prev,
  //       [key]: Array.isArray(list) ? list.filter(Boolean).slice(0, 5) : [],
  //     }));
  //   } catch (error: any) {
  //     setSuggestions((prev) => ({ ...prev, [key]: [] }));
  //     setMessage(error?.message || "Unable to generate AI suggestions.");
  //   } finally {
  //     setSuggestionLoading((prev) => ({ ...prev, [key]: false }));
  //   }
  // };

  // =========================================================
  // FILTER
  // =========================================================
const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const loadSuggestions = async (
  item: OERecord,
  index: number
) => {
  const key = getSuggestionKey(item, index);

  const oeResponse = String(
    item.originalOE || ""
  ).trim();

  const question = String(
    getQuestionText(item) || ""
  ).trim();

  const qNumber = String(
    item.qNumber || ""
  ).trim();

  if (!oeResponse) {
    setMessage("Original OE response is missing.");
    return;
  }

  if (!question) {
    setMessage("Question is missing.");
    return;
  }

  try {
    setSuggestionLoading((prev) => ({
      ...prev,
      [key]: true,
    }));

    setMessage("");

    let lastError: any = null;

    // Retry up to 3 times
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const requestId =
          `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

        console.log(
          `rewriteOEAsHuman attempt ${attempt}/3`,
          {
            requestId,
            key,
            oeResponse,
            question,
            qNumber,
          }
        );

        const response = await api<any>(
          "rewriteOEAsHuman",
          {
            oeResponse,
            question,
            qText: question,
            qNumber,
            requestId,
          }
        );

        console.log(
          "rewriteOEAsHuman response:",
          response
        );

        const list =
          response?.suggestions ||
          response?.data?.suggestions ||
          (Array.isArray(response)
            ? response
            : []);

        const finalSuggestions =
          Array.isArray(list)
            ? list
                .map((value: any) =>
                  String(value || "").trim()
                )
                .filter(Boolean)
                .slice(0, 5)
            : [];

        if (finalSuggestions.length > 0) {
          setSuggestions((prev) => ({
            ...prev,
            [key]: finalSuggestions,
          }));

          // SUCCESS
          setMessage("");

          return;
        }

        throw new Error(
          "AI returned no suggestions."
        );
      } catch (error: any) {
        lastError = error;

        console.warn(
          `rewriteOEAsHuman attempt ${attempt} failed:`,
          error
        );

        // Don't wait after the final attempt
        if (attempt < 3) {
          // Increasing delay:
          // 1st retry -> 2 sec
          // 2nd retry -> 4 sec
          await sleep(attempt * 2000);
        }
      }
    }

    throw lastError ||
      new Error(
        "Unable to generate AI suggestions."
      );
  } catch (error: any) {
    console.error(
      "rewriteOEAsHuman final error:",
      error
    );

    setSuggestions((prev) => ({
      ...prev,
      [key]: [],
    }));

    setMessage(
      error?.message ||
        "Unable to generate AI suggestions. Please try again."
    );
  } finally {
    setSuggestionLoading((prev) => ({
      ...prev,
      [key]: false,
    }));
  }
};
  const filteredResults = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    return results.filter((item) => {
      const status = getStatus(item);

      const matchesStatus =
        statusFilter === "all" ||
        status === statusFilter;

      if (!matchesStatus) {
        return false;
      }

      if (!query) {
        return true;
      }

      return [
        item.id,
        item.pid,
        item.qNumber,
        item.questionText,
        item.question,
        item.actualQuestion,
        item.questionTitle,
        item.originalOE,
        item.approvedOE,
        item.status,
        item.approvedBy,
        item.rejectReason,
      ]
        .filter(Boolean)
        .some((value) =>
          String(value)
            .toLowerCase()
            .includes(query)
        );
    });
  }, [
    results,
    search,
    statusFilter,
  ]);

  // =========================================================
  // COUNTS
  // =========================================================

  const counts = useMemo(() => {
    let approved = 0;
    let pending = 0;
    let rejected = 0;

    results.forEach((item) => {
      const status = getStatus(item);

      if (status === "approved") {
        approved++;
      } else if (status === "rejected") {
        rejected++;
      } else {
        pending++;
      }
    });

    return {
      total: results.length,
      approved,
      pending,
      rejected,
    };
  }, [results]);

  // =========================================================
  // DATE
  // =========================================================

  const formatDate = (value?: string) => {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // =========================================================
  // STATUS UI
  // =========================================================

  const statusConfig = (
    status: FilterStatus
  ) => {
    if (status === "approved") {
      return {
        label: "Approved",
        icon: CheckCircle2,
        className:
          "bg-emerald-50 text-emerald-700 border-emerald-200",
      };
    }

    if (status === "rejected") {
      return {
        label: "Rejected",
        icon: XCircle,
        className:
          "bg-red-50 text-red-700 border-red-200",
      };
    }

    return {
      label: "Pending",
      icon: Clock3,
      className:
        "bg-amber-50 text-amber-700 border-amber-200",
    };
  };

  // =========================================================
  // LOADING
  // =========================================================

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-2xl border border-slate-200 bg-white p-10">
        <div className="flex flex-col items-center justify-center gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-blue-600" />

          <p className="text-sm text-slate-500">
            Loading your results...
          </p>
        </div>
      </div>
    );
  }

  // =========================================================
  // MAIN
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">

      {/* MEMBER */}
      {memberName && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-blue-500">
            Member
          </p>

          <p className="mt-1 font-semibold text-blue-900">
            {memberName}
          </p>
        </div>
      )}

      {/* ERROR */}
      {message && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />

          <div className="flex-1">
            <p className="font-medium text-red-800">
              Unable to load results
            </p>

            <p className="mt-1 text-sm text-red-700">
              {message}
            </p>
          </div>

          <button
            type="button"
            onClick={() => loadResults(true)}
            className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-red-700 shadow-sm ring-1 ring-red-200 hover:bg-red-50"
          >
            Retry
          </button>
        </div>
      )}

      {/* STATS */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">

        <StatCard
          label="Total"
          value={counts.total}
          icon={FileText}
        />

        <StatCard
          label="Approved"
          value={counts.approved}
          icon={CheckCircle2}
          className="text-emerald-600"
        />

        <StatCard
          label="Pending"
          value={counts.pending}
          icon={Clock3}
          className="text-amber-600"
        />

        <StatCard
          label="Rejected"
          value={counts.rejected}
          icon={XCircle}
          className="text-red-600"
        />

      </div>

      {/* TOOLBAR */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">

          {/* SEARCH */}
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              type="text"
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="Search PID, question, response..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* FILTER + REFRESH */}
          <div className="flex flex-wrap items-center gap-2">

            {(
              [
                ["all", "All"],
                ["approved", "Approved"],
                ["pending", "Pending"],
                ["rejected", "Rejected"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() =>
                  setStatusFilter(value)
                }
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  statusFilter === value
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}

            <button
              type="button"
              onClick={() =>
                loadResults(true)
              }
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                className={`h-4 w-4 ${
                  refreshing
                    ? "animate-spin"
                    : ""
                }`}
              />

              Refresh
            </button>

          </div>
        </div>
      </div>

      {/* EMPTY */}
      {filteredResults.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">

          <FileText className="mx-auto h-10 w-10 text-slate-300" />

          <h3 className="mt-4 text-base font-semibold text-slate-700">
            No results found
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            {results.length === 0
              ? "You have not submitted any OE responses yet."
              : "No results match your current search or filter."}
          </p>

        </div>
      ) : (
        <div className="space-y-4">

          {filteredResults.map(
            (item, index) => {
              const status = getStatus(item);
              const config =
                statusConfig(status);

              const StatusIcon =
                config.icon;

              const hasCorrection =
                Boolean(
                  item.approvedOE &&
                    item.originalOE &&
                    item.approvedOE.trim() !==
                      item.originalOE.trim()
                );

              return (
                <div
                  key={
                    item.id ||
                    `${item.pid}-${item.qNumber}-${index}`
                  }
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >

                  {/* HEADER */}
                  <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-center gap-3">

                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                        <FileText className="h-5 w-5 text-blue-600" />
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold text-slate-800">
                            {item.qNumber ||
                              "Question"}
                          </h3>

                          {item.pid && (
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                              {item.pid}
                            </span>
                          )}

                        </div>

                        <p className="mt-1 text-xs text-slate-400">
                          {formatDate(
                            item.timestamp
                          )}
                        </p>
                      </div>

                    </div>

                    <div
                      className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold ${config.className}`}
                    >
                      <StatusIcon className="h-4 w-4" />
                      {config.label}
                    </div>

                  </div>

                  {/* BODY */}
                  <div className="space-y-5 p-5">

                    {/* QUESTION — same logic as DQA */}
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-blue-700">
                        ❓ Question {item.qNumber ? `· ${item.qNumber}` : ""}
                      </div>

                      {getQuestionText(item) ? (
                        <div className="whitespace-pre-wrap text-sm font-semibold leading-relaxed text-slate-800">
                          {getQuestionText(item)}
                        </div>
                      ) : (
                        <div className="text-xs italic text-slate-500">
                          Question text is not available for this submission.
                          {item.qNumber
                            ? ` Question number: ${item.qNumber}`
                            : ""}
                          {item.imageUrl
                            ? " Use “View Attached Image” below."
                            : ""}
                        </div>
                      )}
                    </div>

                    {/* ORIGINAL */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Your Response
                      </p>

                      <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                        {item.originalOE ||
                          "No response available."}
                      </div>
                    </div>

                    {/* APPROVED / CORRECTED */}
                    {item.approvedOE && (
                      <div>
                        <div className="mb-2 flex items-center gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Final Response
                          </p>

                          {hasCorrection && (
                            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                              DQA Corrected
                            </span>
                          )}
                        </div>

                        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 text-sm leading-6 text-slate-700">
                          {item.approvedOE}
                        </div>
                      </div>
                    )}

                    {/* EDIT / RESUBMIT */}
                    {status === "rejected" && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                        {editingId === item.id ? (
                          <>
                            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-red-700">
                              ✏️ Edit rejected response
                            </div>

                            <textarea
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="min-h-32 w-full rounded-xl border border-red-200 bg-white p-3 text-sm leading-6 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                              placeholder="Rewrite your response..."
                            />

                            <div className="mt-2 flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => resubmit(item)}
                                disabled={savingEdit || !editText.trim()}
                                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                              >
                                {savingEdit ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                                {savingEdit ? "Resubmitting..." : "Resubmit for DQA"}
                              </button>

                              <button
                                type="button"
                                onClick={cancelEdit}
                                disabled={savingEdit}
                                className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                              >
                                Cancel
                              </button>
                            </div>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                          >
                            <Send className="h-4 w-4" />
                            Edit &amp; Resubmit
                          </button>
                        )}
                      </div>
                    )}

                    {/* AI SUGGESTIONS */}
                    {(status === "rejected" || status === "pending") && (
                      <div className="rounded-xl border border-purple-200 bg-purple-50 p-4">
                        <button
                          type="button"
                          onClick={() => loadSuggestions(item, index)}
                          disabled={Boolean(suggestionLoading[getSuggestionKey(item, index)])}
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {suggestionLoading[getSuggestionKey(item, index)] ? (
                            <>
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Generating suggestions...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Generate 5 Better Suggestions
                            </>
                          )}
                        </button>

                        {(suggestions[getSuggestionKey(item, index)] || []).length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-xs font-semibold text-purple-700">
                              💡 Click a suggestion to put it into the editor
                            </div>

                            {suggestions[getSuggestionKey(item, index)].map((suggestion, suggestionIndex) => (
                              <button
                                key={`${suggestionIndex}-${suggestion}`}
                                type="button"
                                onClick={() => {
                                  setEditingId(item.id || null);
                                  setEditText(suggestion);
                                }}
                                className="block w-full rounded-lg border border-purple-100 bg-white p-3 text-left text-sm leading-6 text-slate-700 hover:border-purple-400 hover:bg-purple-50"
                              >
                                <span className="mr-2 text-[10px] font-bold text-purple-500">
                                  #{suggestionIndex + 1}
                                </span>
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* SCORES */}
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                      <ScoreCard
                        title="AI / Human Score"
                        score={item.aiScore}
                        reason={item.aiReason}
                      />

                      <ScoreCard
                        title="Relevancy Score"
                        score={item.relScore}
                        reason={item.relReason}
                      />

                    </div>

                    {/* REJECTION */}
                    {item.rejectReason && (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4">

                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-600" />

                          <p className="text-sm font-semibold text-red-800">
                            Rejection Reason
                          </p>
                        </div>

                        <p className="mt-2 text-sm leading-6 text-red-700">
                          {item.rejectReason}
                        </p>

                      </div>
                    )}

                    {/* DQA / REVIEW STATUS */}
                    {(item.approvedBy || item.dqaViewedTime) && (
                      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4 text-xs">
                        {item.approvedBy && (
                          <span className="rounded-full bg-slate-100 px-3 py-1.5 text-slate-600">
                            Approved/Rejected by:{" "}
                            <strong className="text-slate-800">
                              {item.approvedBy}
                            </strong>
                          </span>
                        )}

                        {item.dqaViewedTime ? (
                          <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 font-semibold text-blue-700">
                            👁️ DQA Seen · {formatDate(item.dqaViewedTime)}
                          </span>
                        ) : (
                          String(item.status || "").toUpperCase() === "PENDING" && (
                            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 font-semibold text-amber-700">
                              ⏳ Not seen by DQA yet
                            </span>
                          )
                        )}
                      </div>
                    )}

                    {/* IMAGE */}
                    {item.imageUrl && (
                      <div className="border-t border-slate-100 pt-4">

                        <a
                          href={item.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ImageIcon className="h-4 w-4" />
                          View Attached Image
                        </a>

                      </div>
                    )}

                  </div>
                </div>
              );
            }
          )}

        </div>
      )}

    </div>
  );
}

// =========================================================
// STAT CARD
// =========================================================

function StatCard({
  label,
  value,
  icon: Icon,
  className = "",
}: {
  label: string;
  value: number;
  icon: any;
  className?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">

        <div>
          <p className="text-xs font-medium text-slate-500">
            {label}
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-800">
            {value}
          </p>
        </div>

        <Icon
          className={`h-5 w-5 ${className || "text-slate-400"}`}
        />

      </div>
    </div>
  );
}

// =========================================================
// SCORE CARD
// =========================================================

function ScoreCard({
  title,
  score,
  reason,
}: {
  title: string;
  score?: string | number;
  reason?: string;
}) {
  const hasScore =
    score !== undefined &&
    score !== null &&
    String(score).trim() !== "";

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">

      <div className="flex items-center justify-between gap-3">

        <p className="text-sm font-semibold text-slate-700">
          {title}
        </p>

        {hasScore && (
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-sm font-bold text-slate-800">
            {score}/100
          </span>
        )}

      </div>

      {reason && (
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {reason}
        </p>
      )}

      {!hasScore && !reason && (
        <p className="mt-2 text-xs text-slate-400">
          Not evaluated yet.
        </p>
      )}

    </div>
  );
}