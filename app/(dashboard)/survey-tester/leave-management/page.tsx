// "use client";

// import { useEffect, useState } from "react";
// import Link from "next/link";

// type Summary = {
//   absentDays: number;
//   monthlyEntitlement: number;
//   eligible: boolean;
//   used: number;
//   remaining: number;
// };

// type Leave = {
//   _id: string;
//   leaveType: "PAID" | "UNPAID";
//   startDate: string;
//   endDate: string;
//   totalDays: number;
//   reason: string;
//   status: string;
//   currentApprovalLevel?: string | null;
//   createdAt: string;
// };

// export default function LeaveManagementPage() {
//   const [summary, setSummary] =
//     useState<Summary | null>(null);
//   const [leaves, setLeaves] =
//     useState<Leave[]>([]);
//   const [loading, setLoading] =
//     useState(true);
//   const [error, setError] =
//     useState("");

//   useEffect(() => {
//     async function load() {
//       try {
//         const userId =
//           localStorage.getItem("userId");

//         if (!userId) {
//           setError("User session not found.");
//           return;
//         }

//         const [summaryRes, leavesRes] =
//           await Promise.all([
//             fetch(
//               `/api/leaves/summary?userId=${userId}`
//             ),
//             fetch(
//               `/api/leaves?userId=${userId}`
//             ),
//           ]);

//         if (!summaryRes.ok)
//           throw new Error(
//             "Failed to load leave summary"
//           );

//         if (!leavesRes.ok)
//           throw new Error(
//             "Failed to load leaves"
//           );

//         setSummary(
//           await summaryRes.json()
//         );
//         setLeaves(
//           await leavesRes.json()
//         );
//       } catch (e: any) {
//         setError(
//           e.message ||
//             "Unable to load leave data"
//         );
//       } finally {
//         setLoading(false);
//       }
//     }

//     load();
//   }, []);

//   if (loading) {
//     return (
//       <div className="p-6">
//         Loading leave management...
//       </div>
//     );
//   }

//   return (
//     <div className="p-6 space-y-6">
//       <div className="flex items-center justify-between">
//         <div>
//           <h1 className="text-2xl font-semibold">
//             Leave Management
//           </h1>
//           <p className="text-sm text-gray-500">
//             Manage your monthly leave and leave requests.
//           </p>
//         </div>

//         <Link
//           href="/leave-management/apply"
//           className="rounded-lg bg-black px-4 py-2 text-white"
//         >
//           Apply for Leave
//         </Link>
//       </div>

//       {error && (
//         <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
//           {error}
//         </div>
//       )}

//       {summary && (
//         <div className="grid gap-4 md:grid-cols-4">
//           <Card
//             title="Monthly Paid Leave"
//             value={String(
//               summary.monthlyEntitlement
//             )}
//           />
//           <Card
//             title="Paid Leave Used"
//             value={String(summary.used)}
//           />
//           <Card
//             title="Remaining"
//             value={String(
//               summary.remaining
//             )}
//           />
//           <Card
//             title="Absent Days"
//             value={String(
//               summary.absentDays
//             )}
//           />
//         </div>
//       )}

//       {summary &&
//         !summary.eligible && (
//           <div className="rounded-lg border border-orange-200 bg-orange-50 p-4 text-orange-800">
//             Paid leave is unavailable because
//             you have more than 3 absent days this
//             month.
//           </div>
//         )}

//       <div className="rounded-xl border bg-white">
//         <div className="border-b p-4">
//           <h2 className="font-semibold">
//             My Leave Requests
//           </h2>
//         </div>

//         <div className="overflow-x-auto">
//           <table className="w-full text-sm">
//             <thead>
//               <tr className="border-b text-left">
//                 <th className="p-4">Type</th>
//                 <th className="p-4">From</th>
//                 <th className="p-4">To</th>
//                 <th className="p-4">Days</th>
//                 <th className="p-4">Status</th>
//                 <th className="p-4">Approval</th>
//               </tr>
//             </thead>

//             <tbody>
//               {leaves.map((leave) => (
//                 <tr
//                   key={leave._id}
//                   className="border-b"
//                 >
//                   <td className="p-4">
//                     {leave.leaveType}
//                   </td>
//                   <td className="p-4">
//                     {formatDate(
//                       leave.startDate
//                     )}
//                   </td>
//                   <td className="p-4">
//                     {formatDate(
//                       leave.endDate
//                     )}
//                   </td>
//                   <td className="p-4">
//                     {leave.totalDays}
//                   </td>
//                   <td className="p-4">
//                     {leave.status}
//                   </td>
//                   <td className="p-4">
//                     {leave.currentApprovalLevel ||
//                       "Completed"}
//                   </td>
//                 </tr>
//               ))}

//               {!leaves.length && (
//                 <tr>
//                   <td
//                     colSpan={6}
//                     className="p-8 text-center text-gray-500"
//                   >
//                     No leave requests found.
//                   </td>
//                 </tr>
//               )}
//             </tbody>
//           </table>
//         </div>
//       </div>
//     </div>
//   );
// }

// function Card({
//   title,
//   value,
// }: {
//   title: string;
//   value: string;
// }) {
//   return (
//     <div className="rounded-xl border bg-white p-5">
//       <div className="text-sm text-gray-500">
//         {title}
//       </div>
//       <div className="mt-2 text-2xl font-semibold">
//         {value}
//       </div>
//     </div>
//   );
// }

// function formatDate(value: string) {
//   return new Date(value).toLocaleDateString(
//     "en-IN"
//   );
// }

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import LeaveManagementClient from "@/components/LeaveManagementClient";

export default async function LeaveManagementPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <LeaveManagementClient
      userId={currentUser.userId}
      role={currentUser.role}
      name={currentUser.name}
      email={currentUser.email}
    />
  );
}