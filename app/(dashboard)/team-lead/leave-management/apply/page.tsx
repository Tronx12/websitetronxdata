// "use client";

// import { FormEvent, useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";

// type Summary = {
//   absentDays: number;
//   remaining: number;
//   eligible: boolean;
// };

// export default function ApplyLeavePage() {
//   const router = useRouter();

//   const [leaveType, setLeaveType] =
//     useState<"PAID" | "UNPAID">("PAID");
//   const [startDate, setStartDate] =
//     useState("");
//   const [endDate, setEndDate] =
//     useState("");
//   const [reason, setReason] =
//     useState("");
//   const [summary, setSummary] =
//     useState<Summary | null>(null);
//   const [loading, setLoading] =
//     useState(false);
//   const [message, setMessage] =
//     useState("");

//   useEffect(() => {
//     const userId =
//       localStorage.getItem("userId");

//     if (!userId) return;

//     fetch(
//       `/api/leaves/summary?userId=${userId}`
//     )
//       .then((r) => r.json())
//       .then(setSummary)
//       .catch(() => {});
//   }, []);

//   async function submit(
//     event: FormEvent
//   ) {
//     event.preventDefault();
//     setLoading(true);
//     setMessage("");

//     try {
//       const userId =
//         localStorage.getItem("userId");

//       if (!userId) {
//         throw new Error(
//           "User session not found."
//         );
//       }

//       const response = await fetch(
//         "/api/leaves",
//         {
//           method: "POST",
//           headers: {
//             "Content-Type": "application/json",
//             "x-user-id": userId,
//           },
//           body: JSON.stringify({
//             userId,
//             leaveType,
//             startDate,
//             endDate,
//             reason,
//           }),
//         }
//       );

//       const data = await response.json();

//       if (!response.ok) {
//         throw new Error(
//           data.error ||
//             "Failed to submit leave"
//         );
//       }

//       router.push(
//         "/leave-management"
//       );
//       router.refresh();
//     } catch (error: any) {
//       setMessage(
//         error.message ||
//           "Unable to submit leave"
//       );
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="max-w-2xl p-6">
//       <div className="mb-6">
//         <Link
//           href="/leave-management"
//           className="text-sm text-gray-500"
//         >
//           ← Back to Leave Management
//         </Link>

//         <h1 className="mt-3 text-2xl font-semibold">
//           Apply for Leave
//         </h1>
//       </div>

//       {summary && (
//         <div className="mb-6 rounded-xl border bg-white p-4">
//           <div className="text-sm text-gray-500">
//             Current Month Paid Leave
//           </div>

//           <div className="mt-1 text-xl font-semibold">
//             {summary.remaining} day(s)
//             remaining
//           </div>

//           <div className="mt-1 text-sm text-gray-500">
//             Absent days:{" "}
//             {summary.absentDays}
//           </div>

//           {!summary.eligible && (
//             <div className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
//               Paid leave is unavailable because
//               you have more than 3 absent days
//               this month.
//             </div>
//           )}
//         </div>
//       )}

//       <form
//         onSubmit={submit}
//         className="space-y-5 rounded-xl border bg-white p-6"
//       >
//         <div>
//           <label className="mb-2 block text-sm font-medium">
//             Leave Type
//           </label>

//           <select
//             value={leaveType}
//             onChange={(e) =>
//               setLeaveType(
//                 e.target.value as
//                   | "PAID"
//                   | "UNPAID"
//               )
//             }
//             className="w-full rounded-lg border px-3 py-2"
//           >
//             <option value="PAID">
//               Paid Leave
//             </option>
//             <option value="UNPAID">
//               Unpaid Leave
//             </option>
//           </select>
//         </div>

//         <div className="grid gap-4 md:grid-cols-2">
//           <div>
//             <label className="mb-2 block text-sm font-medium">
//               From Date
//             </label>

//             <input
//               type="date"
//               value={startDate}
//               onChange={(e) =>
//                 setStartDate(e.target.value)
//               }
//               required
//               className="w-full rounded-lg border px-3 py-2"
//             />
//           </div>

//           <div>
//             <label className="mb-2 block text-sm font-medium">
//               To Date
//             </label>

//             <input
//               type="date"
//               value={endDate}
//               onChange={(e) =>
//                 setEndDate(e.target.value)
//               }
//               required
//               className="w-full rounded-lg border px-3 py-2"
//             />
//           </div>
//         </div>

//         <div>
//           <label className="mb-2 block text-sm font-medium">
//             Reason
//           </label>

//           <textarea
//             value={reason}
//             onChange={(e) =>
//               setReason(e.target.value)
//             }
//             required
//             rows={5}
//             maxLength={1000}
//             placeholder="Enter reason for leave"
//             className="w-full rounded-lg border px-3 py-2"
//           />
//         </div>

//         {message && (
//           <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
//             {message}
//           </div>
//         )}

//         <button
//           type="submit"
//           disabled={loading}
//           className="rounded-lg bg-black px-5 py-2.5 text-white disabled:opacity-50"
//         >
//           {loading
//             ? "Submitting..."
//             : "Submit Leave Request"}
//         </button>
//       </form>
//     </div>
//   );
// }


"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Summary = {
  absentDays: number;
  remaining: number;
  eligible: boolean;
};

export default function ApplyLeavePage() {
  const router = useRouter();

  const [leaveType, setLeaveType] =
    useState<"PAID" | "UNPAID">("PAID");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [summary, setSummary] =
    useState<Summary | null>(null);

  const [loading, setLoading] = useState(false);
  const [summaryLoading, setSummaryLoading] =
    useState(true);

  const [message, setMessage] = useState("");
  const [messageType, setMessageType] =
    useState<"error" | "success">("error");

  /*
   * =====================================================
   * LOAD CURRENT USER'S LEAVE SUMMARY
   *
   * No localStorage.
   * No userId query parameter.
   *
   * Backend identifies the logged-in user from
   * access_token / refresh_token cookies.
   * =====================================================
   */

  useEffect(() => {
    async function loadSummary() {
      try {
        setSummaryLoading(true);

        const response = await fetch(
          "/api/leaves/summary",
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
              "Failed to load leave summary"
          );
        }

        setSummary(
          data?.data ?? data
        );
      } catch (error) {
        console.error(
          "Leave summary error:",
          error
        );

        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load leave summary"
        );

        setMessageType("error");
      } finally {
        setSummaryLoading(false);
      }
    }

    loadSummary();
  }, []);

  /*
   * =====================================================
   * SUBMIT LEAVE
   *
   * IMPORTANT:
   * Do NOT send userId.
   * Do NOT send x-user-id.
   *
   * Backend gets authenticated user using getCurrentUser().
   * =====================================================
   */

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      /*
       * Client-side validation
       */

      if (!startDate) {
        throw new Error(
          "Please select the start date."
        );
      }

      if (!endDate) {
        throw new Error(
          "Please select the end date."
        );
      }

      if (endDate < startDate) {
        throw new Error(
          "End date cannot be before start date."
        );
      }

      if (!reason.trim()) {
        throw new Error(
          "Please enter a reason for leave."
        );
      }

      /*
       * Paid leave validation
       */

      if (
        leaveType === "PAID" &&
        summary &&
        !summary.eligible
      ) {
        throw new Error(
          "Paid leave is unavailable because you have more than 3 absent days this month."
        );
      }

      if (
        leaveType === "PAID" &&
        summary &&
        summary.remaining <= 0
      ) {
        throw new Error(
          "You have no paid leave remaining this month."
        );
      }

      /*
       * API request
       *
       * Authentication comes from cookies.
       */

      const response = await fetch(
        "/api/leaves",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          credentials: "include",

          body: JSON.stringify({
            leaveType,
            startDate,
            endDate,
            reason: reason.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Failed to submit leave request."
        );
      }

      /*
       * Success
       */

      setMessage(
        "Leave request submitted successfully."
      );

      setMessageType("success");

      /*
       * Go back to Leave Management.
       *
       * Small delay lets user see the success message.
       */

      setTimeout(() => {
        router.push("/team-lead/leave-management");
        router.refresh();
      }, 500);
    } catch (error) {
      console.error(
        "Submit leave error:",
        error
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to submit leave request."
      );

      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl p-6">
      {/* =================================================
          HEADER
      ================================================= */}

      <div className="mb-6">
        <Link
          href="/team-lead/leave-management"
          className="text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back to Leave Management
        </Link>

        <h4 className="mt-3 text-2xl font-semibold">
          Apply for Leave
        </h4>

        <p className="mt-1 text-sm text-gray-500">
          Submit a leave request for approval.
        </p>
      </div>

      {/* =================================================
          SUMMARY LOADING
      ================================================= */}

      {summaryLoading && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">
            Loading your leave balance...
          </div>
        </div>
      )}

      {/* =================================================
          SUMMARY
      ================================================= */}

      {summary && (
        <div className="mb-6 rounded-xl border bg-white p-4">
          <div className="text-sm text-gray-500">
            Current Month Paid Leave
          </div>

          <div className="mt-1 text-xl font-semibold">
            {summary.remaining} day(s) remaining
          </div>

          <div className="mt-1 text-sm text-gray-500">
            Absent days:{" "}
            {summary.absentDays}
          </div>

          {!summary.eligible && (
            <div className="mt-3 rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
              Paid leave is unavailable because
              you have more than 3 absent days
              this month.
            </div>
          )}

          {summary.eligible &&
            summary.remaining <= 0 && (
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                You have already used your paid
                leave entitlement for this month.
              </div>
            )}
        </div>
      )}

      {/* =================================================
          FORM
      ================================================= */}

      <form
        onSubmit={submit}
        className="space-y-5 rounded-xl border bg-white p-6"
      >
        {/* LEAVE TYPE */}

        <div>
          <label
            htmlFor="leaveType"
            className="mb-2 block text-sm font-medium"
          >
            Leave Type
          </label>

          <select
            id="leaveType"
            value={leaveType}
            onChange={(event) =>
              setLeaveType(
                event.target.value as
                  | "PAID"
                  | "UNPAID"
              )
            }
            disabled={loading}
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
          >
            <option value="PAID">
              Paid Leave
            </option>

            <option value="UNPAID">
              Unpaid Leave
            </option>
          </select>

          {leaveType === "PAID" &&
            summary &&
            !summary.eligible && (
              <p className="mt-2 text-xs text-orange-700">
                Paid leave is currently unavailable.
              </p>
            )}
        </div>

        {/* DATES */}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="startDate"
              className="mb-2 block text-sm font-medium"
            >
              From Date
            </label>

            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              required
              disabled={loading}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
            />
          </div>

          <div>
            <label
              htmlFor="endDate"
              className="mb-2 block text-sm font-medium"
            >
              To Date
            </label>

            <input
              id="endDate"
              type="date"
              min={startDate || undefined}
              value={endDate}
              onChange={(event) =>
                setEndDate(event.target.value)
              }
              required
              disabled={loading}
              className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
            />
          </div>
        </div>

        {/* REASON */}

        <div>
          <label
            htmlFor="reason"
            className="mb-2 block text-sm font-medium"
          >
            Reason
          </label>

          <textarea
            id="reason"
            value={reason}
            onChange={(event) =>
              setReason(event.target.value)
            }
            required
            rows={5}
            maxLength={1000}
            disabled={loading}
            placeholder="Enter reason for leave"
            className="w-full rounded-lg border px-3 py-2 outline-none focus:border-black"
          />

          <div className="mt-1 text-right text-xs text-gray-400">
            {reason.length}/1000
          </div>
        </div>

        {/* MESSAGE */}

        {message && (
          <div
            className={
              messageType === "success"
                ? "rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
                : "rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            }
          >
            {message}
          </div>
        )}

        {/* SUBMIT */}

        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-black px-5 py-2.5 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Submitting..."
            : "Submit Leave Request"}
        </button>
      </form>
    </div>
  );
}