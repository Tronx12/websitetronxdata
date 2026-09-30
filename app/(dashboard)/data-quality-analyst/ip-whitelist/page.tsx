
// "use client";

// import { useCallback, useEffect, useState } from "react";

// type IpWhitelist = {
//   _id: string;
//   ipAddress: string;
//   name: string;
//   description?: string;
//   isActive: boolean;
//   createdAt: string;
//   updatedAt: string;
// };

// type FormData = {
//   ipAddress: string;
//   name: string;
//   description: string;
// };

// const EMPTY_FORM: FormData = {
//   ipAddress: "",
//   name: "",
//   description: "",
// };

// export default function IpWhitelistPage() {
//   const [records, setRecords] = useState<IpWhitelist[]>([]);
//   const [currentIp, setCurrentIp] = useState("");

//   const [loading, setLoading] = useState(true);
//   const [ipLoading, setIpLoading] = useState(false);
//   const [saving, setSaving] = useState(false);

//   const [showModal, setShowModal] = useState(false);
//   const [editingId, setEditingId] = useState<string | null>(
//     null
//   );

//   const [form, setForm] =
//     useState<FormData>(EMPTY_FORM);

//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   /*
//    * Load whitelist
//    */
//   const loadRecords = useCallback(async () => {
//     try {
//       setLoading(true);
//       setError("");

//       const response = await fetch(
//         "/api/ip-whitelist",
//         {
//           method: "GET",
//           cache: "no-store",
//         }
//       );

//       const result = await response.json();

//       if (!response.ok || !result.success) {
//         throw new Error(
//           result.message ||
//             "Failed to load IP whitelist"
//         );
//       }

//       setRecords(result.data || []);
//     } catch (err) {
//       console.error(
//         "LOAD IP WHITELIST ERROR:",
//         err
//       );

//       setError(
//         err instanceof Error
//           ? err.message
//           : "Failed to load IP whitelist"
//       );
//     } finally {
//       setLoading(false);
//     }
//   }, []);

//   /*
//    * Get current public IP
//    */
//   const loadCurrentIp = useCallback(
//     async () => {
//       try {
//         setIpLoading(true);

//         const response = await fetch(
//           "/api/ip-whitelist/my-ip",
//           {
//             method: "GET",
//             cache: "no-store",
//           }
//         );

//         const result = await response.json();

//         if (!response.ok || !result.success) {
//           throw new Error(
//             result.message ||
//               "Unable to detect current IP"
//           );
//         }

//         setCurrentIp(result.ip || "");
//       } catch (err) {
//         console.error(
//           "CURRENT IP ERROR:",
//           err
//         );

//         setCurrentIp("");
//       } finally {
//         setIpLoading(false);
//       }
//     },
//     []
//   );

//   /*
//    * Initial load
//    */
//   useEffect(() => {
//     loadRecords();
//     loadCurrentIp();
//   }, [loadRecords, loadCurrentIp]);

//   /*
//    * Open Add modal
//    */
//   const openAddModal = () => {
//     setEditingId(null);

//     setForm({
//       ...EMPTY_FORM,
//       ipAddress: currentIp || "",
//     });

//     setMessage("");
//     setError("");
//     setShowModal(true);
//   };

//   /*
//    * Open Edit modal
//    */
//   const openEditModal = (
//     record: IpWhitelist
//   ) => {
//     setEditingId(record._id);

//     setForm({
//       ipAddress: record.ipAddress,
//       name: record.name,
//       description:
//         record.description || "",
//     });

//     setMessage("");
//     setError("");
//     setShowModal(true);
//   };

//   /*
//    * Close modal
//    */
//   const closeModal = () => {
//     if (saving) return;

//     setShowModal(false);
//     setEditingId(null);
//     setForm(EMPTY_FORM);
//     setError("");
//     setMessage("");
//   };

//   /*
//    * Form change
//    */
//   const handleChange = (
//     field: keyof FormData,
//     value: string
//   ) => {
//     setForm((previous) => ({
//       ...previous,
//       [field]: value,
//     }));
//   };

//   /*
//    * Save IP
//    */
//   const handleSubmit = async (
//     event: React.FormEvent
//   ) => {
//     event.preventDefault();

//     setError("");
//     setMessage("");

//     if (!form.ipAddress.trim()) {
//       setError("IP address is required.");
//       return;
//     }

//     if (!form.name.trim()) {
//       setError("Network name is required.");
//       return;
//     }

//     try {
//       setSaving(true);

//       const isEditing =
//         Boolean(editingId);

//       const url = isEditing
//         ? `/api/ip-whitelist/${editingId}`
//         : "/api/ip-whitelist";

//       const response = await fetch(url, {
//         method: isEditing ? "PUT" : "POST",
//         headers: {
//           "Content-Type": "application/json",
//         },
//         body: JSON.stringify({
//           ipAddress:
//             form.ipAddress.trim(),
//           name: form.name.trim(),
//           description:
//             form.description.trim(),
//         }),
//       });

//       const result = await response.json();

//       if (!response.ok || !result.success) {
//         throw new Error(
//           result.message ||
//             "Failed to save IP address"
//         );
//       }

//       setMessage(
//         isEditing
//           ? "IP address updated successfully."
//           : "IP address added successfully."
//       );

//       await loadRecords();

//       setTimeout(() => {
//         closeModal();
//       }, 500);
//     } catch (err) {
//       console.error(
//         "SAVE IP ERROR:",
//         err
//       );

//       setError(
//         err instanceof Error
//           ? err.message
//           : "Failed to save IP address"
//       );
//     } finally {
//       setSaving(false);
//     }
//   };

//   /*
//    * Toggle active status
//    */
//   const toggleStatus = async (
//     record: IpWhitelist
//   ) => {
//     try {
//       setError("");
//       setMessage("");

//       const response = await fetch(
//         `/api/ip-whitelist/${record._id}`,
//         {
//           method: "PUT",
//           headers: {
//             "Content-Type":
//               "application/json",
//           },
//           body: JSON.stringify({
//             isActive:
//               !record.isActive,
//           }),
//         }
//       );

//       const result = await response.json();

//       if (!response.ok || !result.success) {
//         throw new Error(
//           result.message ||
//             "Failed to update status"
//         );
//       }

//       setMessage(
//         `IP address ${
//           !record.isActive
//             ? "enabled"
//             : "disabled"
//         } successfully.`
//       );

//       await loadRecords();
//     } catch (err) {
//       console.error(
//         "TOGGLE IP ERROR:",
//         err
//       );

//       setError(
//         err instanceof Error
//           ? err.message
//           : "Failed to update IP status"
//       );
//     }
//   };

//   /*
//    * Delete IP
//    */
//   const deleteRecord = async (
//     record: IpWhitelist
//   ) => {
//     const confirmed = window.confirm(
//       `Are you sure you want to delete "${record.name}" (${record.ipAddress})?`
//     );

//     if (!confirmed) return;

//     try {
//       setError("");
//       setMessage("");

//       const response = await fetch(
//         `/api/ip-whitelist/${record._id}`,
//         {
//           method: "DELETE",
//         }
//       );

//       const result = await response.json();

//       if (!response.ok || !result.success) {
//         throw new Error(
//           result.message ||
//             "Failed to delete IP"
//         );
//       }

//       setMessage(
//         "IP address deleted successfully."
//       );

//       await loadRecords();
//     } catch (err) {
//       console.error(
//         "DELETE IP ERROR:",
//         err
//       );

//       setError(
//         err instanceof Error
//           ? err.message
//           : "Failed to delete IP"
//       );
//     }
//   };

//   return (
//     <main className="min-h-screen bg-gray-50 p-6 md:p-8">
//       <div className="mx-auto max-w-7xl">

//         {/* Header */}
//         <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
//           <div>
//             <h1 className="text-2xl font-bold text-gray-900">
//               IP Whitelist
//             </h1>

//             <p className="mt-1 text-sm text-gray-500">
//               Manage the office networks that are
//               allowed to access attendance.
//             </p>
//           </div>

//           <button
//             type="button"
//             onClick={openAddModal}
//             className="inline-flex items-center justify-center rounded-lg bg-black px-5 py-3 text-sm font-medium text-white transition hover:bg-gray-800"
//           >
//             <span className="mr-2 text-lg">
//               +
//             </span>
//             Add IP Address
//           </button>
//         </div>

//         {/* Messages */}
//         {message && (
//           <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
//             {message}
//           </div>
//         )}

//         {error && (
//           <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
//             {error}
//           </div>
//         )}

//         {/* Current IP */}
//         <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
//           <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">

//             <div>
//               <p className="text-sm font-medium text-gray-500">
//                 Current Public IP
//               </p>

//               {ipLoading ? (
//                 <div className="mt-2 h-7 w-40 animate-pulse rounded bg-gray-200" />
//               ) : (
//                 <p className="mt-1 font-mono text-xl font-semibold text-gray-900">
//                   {currentIp || "Unable to detect"}
//                 </p>
//               )}

//               <p className="mt-2 text-xs text-gray-400">
//                 This is the IP address seen by
//                 your Next.js server.
//               </p>
//             </div>

//             <div className="flex gap-3">
//               <button
//                 type="button"
//                 onClick={loadCurrentIp}
//                 disabled={ipLoading}
//                 className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
//               >
//                 {ipLoading
//                   ? "Checking..."
//                   : "Refresh IP"}
//               </button>

//               <button
//                 type="button"
//                 onClick={openAddModal}
//                 className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
//               >
//                 Add Current IP
//               </button>
//             </div>
//           </div>
//         </section>

//         {/* Statistics */}
//         <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

//           <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
//             <p className="text-sm text-gray-500">
//               Total Networks
//             </p>

//             <p className="mt-2 text-3xl font-bold text-gray-900">
//               {records.length}
//             </p>
//           </div>

//           <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
//             <p className="text-sm text-gray-500">
//               Active
//             </p>

//             <p className="mt-2 text-3xl font-bold text-green-600">
//               {
//                 records.filter(
//                   (record) =>
//                     record.isActive
//                 ).length
//               }
//             </p>
//           </div>

//           <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
//             <p className="text-sm text-gray-500">
//               Disabled
//             </p>

//             <p className="mt-2 text-3xl font-bold text-gray-500">
//               {
//                 records.filter(
//                   (record) =>
//                     !record.isActive
//                 ).length
//               }
//             </p>
//           </div>

//         </div>

//         {/* Table */}
//         <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">

//           <div className="border-b border-gray-200 px-6 py-5">
//             <h2 className="font-semibold text-gray-900">
//               Authorized Networks
//             </h2>

//             <p className="mt-1 text-sm text-gray-500">
//               Only active IP addresses should be
//               permitted to mark attendance.
//             </p>
//           </div>

//           {loading ? (
//             <div className="p-10 text-center text-sm text-gray-500">
//               Loading IP whitelist...
//             </div>
//           ) : records.length === 0 ? (
//             <div className="p-12 text-center">

//               <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
//                 <span className="text-2xl">
//                   🌐
//                 </span>
//               </div>

//               <h3 className="mt-4 font-semibold text-gray-900">
//                 No IP addresses configured
//               </h3>

//               <p className="mt-2 text-sm text-gray-500">
//                 Add your office public IP address
//                 to enable IP-based attendance.
//               </p>

//               <button
//                 type="button"
//                 onClick={openAddModal}
//                 className="mt-5 rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800"
//               >
//                 Add First IP
//               </button>

//             </div>
//           ) : (
//             <div className="overflow-x-auto">
//               <table className="w-full min-w-[800px]">

//                 <thead>
//                   <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
//                     <th className="px-6 py-4">
//                       Network
//                     </th>

//                     <th className="px-6 py-4">
//                       IP Address
//                     </th>

//                     <th className="px-6 py-4">
//                       Description
//                     </th>

//                     <th className="px-6 py-4">
//                       Status
//                     </th>

//                     <th className="px-6 py-4 text-right">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>

//                 <tbody>
//                   {records.map(
//                     (record) => (
//                       <tr
//                         key={record._id}
//                         className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
//                       >

//                         <td className="px-6 py-5">
//                           <p className="font-medium text-gray-900">
//                             {record.name}
//                           </p>
//                         </td>

//                         <td className="px-6 py-5">
//                           <span className="rounded-md bg-gray-100 px-3 py-1.5 font-mono text-sm text-gray-800">
//                             {record.ipAddress}
//                           </span>
//                         </td>

//                         <td className="max-w-xs px-6 py-5 text-sm text-gray-500">
//                           {record.description ||
//                             "—"}
//                         </td>

//                         <td className="px-6 py-5">
//                           <button
//                             type="button"
//                             onClick={() =>
//                               toggleStatus(
//                                 record
//                               )
//                             }
//                             className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium ${
//                               record.isActive
//                                 ? "bg-green-100 text-green-700"
//                                 : "bg-gray-100 text-gray-600"
//                             }`}
//                           >
//                             <span
//                               className={`h-2 w-2 rounded-full ${
//                                 record.isActive
//                                   ? "bg-green-500"
//                                   : "bg-gray-400"
//                               }`}
//                             />

//                             {record.isActive
//                               ? "Active"
//                               : "Disabled"}
//                           </button>
//                         </td>

//                         <td className="px-6 py-5">
//                           <div className="flex justify-end gap-2">

//                             <button
//                               type="button"
//                               onClick={() =>
//                                 openEditModal(
//                                   record
//                                 )
//                               }
//                               className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
//                             >
//                               Edit
//                             </button>

//                             <button
//                               type="button"
//                               onClick={() =>
//                                 deleteRecord(
//                                   record
//                                 )
//                               }
//                               className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
//                             >
//                               Delete
//                             </button>

//                           </div>
//                         </td>

//                       </tr>
//                     )
//                   )}
//                 </tbody>

//               </table>
//             </div>
//           )}

//         </section>

//       </div>

//       {/* Modal */}
//       {showModal && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

//           <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">

//             {/* Modal Header */}
//             <div className="flex items-center justify-between border-b border-gray-200 px-6 py-5">

//               <div>
//                 <h2 className="text-lg font-semibold text-gray-900">
//                   {editingId
//                     ? "Edit IP Address"
//                     : "Add IP Address"}
//                 </h2>

//                 <p className="mt-1 text-sm text-gray-500">
//                   Configure an authorized office
//                   network.
//                 </p>
//               </div>

//               <button
//                 type="button"
//                 onClick={closeModal}
//                 disabled={saving}
//                 className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-900 disabled:opacity-50"
//               >
//                 ✕
//               </button>

//             </div>

//             {/* Form */}
//             <form
//               onSubmit={handleSubmit}
//               className="space-y-5 p-6"
//             >

//               {error && (
//                 <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                   {error}
//                 </div>
//               )}

//               <div>
//                 <label className="mb-2 block text-sm font-medium text-gray-700">
//                   IP Address
//                 </label>

//                 <input
//                   type="text"
//                   value={form.ipAddress}
//                   onChange={(event) =>
//                     handleChange(
//                       "ipAddress",
//                       event.target.value
//                     )
//                   }
//                   placeholder="103.123.45.67"
//                   className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
//                 />

//                 <p className="mt-1.5 text-xs text-gray-400">
//                   Enter the public IP address of
//                   the office network.
//                 </p>
//               </div>

//               <div>
//                 <label className="mb-2 block text-sm font-medium text-gray-700">
//                   Network Name
//                 </label>

//                 <input
//                   type="text"
//                   value={form.name}
//                   onChange={(event) =>
//                     handleChange(
//                       "name",
//                       event.target.value
//                     )
//                   }
//                   placeholder="Office WiFi 1"
//                   className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
//                 />
//               </div>

//               <div>
//                 <label className="mb-2 block text-sm font-medium text-gray-700">
//                   Description
//                   <span className="ml-1 text-gray-400">
//                     (optional)
//                   </span>
//                 </label>

//                 <textarea
//                   value={form.description}
//                   onChange={(event) =>
//                     handleChange(
//                       "description",
//                       event.target.value
//                     )
//                   }
//                   placeholder="Main office network"
//                   rows={3}
//                   className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none transition focus:border-black focus:ring-1 focus:ring-black"
//                 />
//               </div>

//               <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
//                 <p className="text-sm font-medium text-blue-800">
//                   Current detected IP
//                 </p>

//                 <p className="mt-1 font-mono text-sm text-blue-700">
//                   {currentIp ||
//                     "Unable to detect"}
//                 </p>

//                 {!editingId && currentIp && (
//                   <button
//                     type="button"
//                     onClick={() =>
//                       handleChange(
//                         "ipAddress",
//                         currentIp
//                       )
//                     }
//                     className="mt-2 text-xs font-medium text-blue-700 underline"
//                   >
//                     Use this IP
//                   </button>
//                 )}
//               </div>

//               {/* Actions */}
//               <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">

//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   disabled={saving}
//                   className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
//                 >
//                   Cancel
//                 </button>

//                 <button
//                   type="submit"
//                   disabled={saving}
//                   className="rounded-lg bg-black px-5 py-2.5 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
//                 >
//                   {saving
//                     ? "Saving..."
//                     : editingId
//                       ? "Update IP"
//                       : "Add IP"}
//                 </button>

//               </div>

//             </form>

//           </div>

//         </div>
//       )}
//     </main>
//   );
// }

"use client";

import { useCallback, useEffect, useState } from "react";

type IpWhitelist = {
  _id: string;
  ipAddress: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type FormData = {
  ipAddress: string;
  name: string;
  description: string;
};

const EMPTY_FORM: FormData = {
  ipAddress: "",
  name: "",
  description: "",
};

export default function IpWhitelistPage() {
  const [records, setRecords] = useState<IpWhitelist[]>([]);
  const [currentIp, setCurrentIp] = useState("");

  const [loading, setLoading] = useState(true);
  const [ipLoading, setIpLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [form, setForm] = useState<FormData>(EMPTY_FORM);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/ip-whitelist", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to load IP whitelist");
      }

      setRecords(result.data || []);
    } catch (err) {
      console.error("LOAD IP WHITELIST ERROR:", err);
      setError(err instanceof Error ? err.message : "Failed to load IP whitelist");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrentIp = useCallback(async () => {
    try {
      setIpLoading(true);

      const response = await fetch("/api/ip-whitelist/my-ip", {
        method: "GET",
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to detect current IP");
      }

      setCurrentIp(result.ip || "");
    } catch (err) {
      console.error("CURRENT IP ERROR:", err);
      setCurrentIp("");
    } finally {
      setIpLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
    loadCurrentIp();
  }, [loadRecords, loadCurrentIp]);

  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, ipAddress: currentIp || "" });
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const openEditModal = (record: IpWhitelist) => {
    setEditingId(record._id);
    setForm({
      ipAddress: record.ipAddress,
      name: record.name,
      description: record.description || "",
    });
    setMessage("");
    setError("");
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setMessage("");
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setForm((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.ipAddress.trim()) {
      setError("IP address is required.");
      return;
    }

    if (!form.name.trim()) {
      setError("Network name is required.");
      return;
    }

    try {
      setSaving(true);

      const isEditing = Boolean(editingId);
      const url = isEditing ? `/api/ip-whitelist/${editingId}` : "/api/ip-whitelist";

      const response = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ipAddress: form.ipAddress.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to save IP address");
      }

      setMessage(isEditing ? "IP address updated successfully." : "IP address added successfully.");
      await loadRecords();

      setTimeout(() => closeModal(), 500);
    } catch (err) {
      console.error("SAVE IP ERROR:", err);
      setError(err instanceof Error ? err.message : "Failed to save IP address");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (record: IpWhitelist) => {
    try {
      setError("");
      setMessage("");

      const response = await fetch(`/api/ip-whitelist/${record._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !record.isActive }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to update status");
      }

      setMessage(`IP address ${!record.isActive ? "enabled" : "disabled"} successfully.`);
      await loadRecords();
    } catch (err) {
      console.error("TOGGLE IP ERROR:", err);
      setError(err instanceof Error ? err.message : "Failed to update IP status");
    }
  };

  const deleteRecord = async (record: IpWhitelist) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${record.name}" (${record.ipAddress})?`
    );

    if (!confirmed) return;

    try {
      setDeletingId(record._id);
      setError("");
      setMessage("");

      const response = await fetch(`/api/ip-whitelist/${record._id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to delete IP");
      }

      setMessage("IP address deleted successfully.");
      await loadRecords();
    } catch (err) {
      console.error("DELETE IP ERROR:", err);
      setError(err instanceof Error ? err.message : "Failed to delete IP");
    } finally {
      setDeletingId(null);
    }
  };

  const activeCount = records.filter((r) => r.isActive).length;
  const disabledCount = records.length - activeCount;

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 p-4 md:p-8">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-900 to-gray-700 text-white shadow-lg">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h4 className="text-2xl font-bold tracking-tight text-gray-900">
                IP Whitelist
              </h4>
              <p className="mt-1 text-sm text-gray-500">
                Manage the office networks that are allowed to access attendance.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={openAddModal}
            className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-gray-800 hover:shadow-md active:scale-[0.98]"
          >
            <svg
              className="h-4 w-4 transition-transform group-hover:rotate-90"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add IP Address
          </button>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 shadow-sm">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {message}
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        )}

        {/* Current IP */}
        <section className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Current Public IP
                </p>
                {ipLoading ? (
                  <div className="mt-2 h-7 w-40 animate-pulse rounded-md bg-gray-200" />
                ) : (
                  <p className="mt-1 font-mono text-xl font-semibold text-gray-900">
                    {currentIp || "Unable to detect"}
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-400">
                  This is the IP address seen by your Next.js server.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={loadCurrentIp}
                disabled={ipLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg
                  className={`h-4 w-4 ${ipLoading ? "animate-spin" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                {ipLoading ? "Checking..." : "Refresh"}
              </button>

              <button
                type="button"
                onClick={openAddModal}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98]"
              >
                Add Current IP
              </button>
            </div>
          </div>
        </section>

        {/* Statistics */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Total Networks</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                  />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-gray-900">{records.length}</p>
          </div>

          <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-emerald-600">{activeCount}</p>
          </div>

          <div className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">Disabled</p>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-3xl font-bold tracking-tight text-gray-500">{disabledCount}</p>
          </div>
        </div>

        {/* Table */}
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-200 px-6 py-5">
            <h2 className="font-semibold text-gray-900">Authorized Networks</h2>
            <p className="mt-1 text-sm text-gray-500">
              Only active IP addresses should be permitted to mark attendance.
            </p>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-10 w-10 animate-pulse rounded-lg bg-gray-200" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/3 animate-pulse rounded bg-gray-200" />
                    <div className="h-3 w-1/4 animate-pulse rounded bg-gray-100" />
                  </div>
                  <div className="h-8 w-20 animate-pulse rounded-full bg-gray-100" />
                </div>
              ))}
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 text-3xl">
                🌐
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">No IP addresses configured</h3>
              <p className="mx-auto mt-2 max-w-sm text-sm text-gray-500">
                Add your office public IP address to enable IP-based attendance.
              </p>
              <button
                type="button"
                onClick={openAddModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98]"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add First IP
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-4">Network</th>
                    <th className="px-6 py-4">IP Address</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {records.map((record) => (
                    <tr key={record._id} className="group transition hover:bg-gray-50/70">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold ${record.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-gray-100 text-gray-500"
                              }`}
                          >
                            {record.name.charAt(0).toUpperCase()}
                          </div>
                          <p className="font-medium text-gray-900">{record.name}</p>
                        </div>
                      </td>

                      <td className="px-6 py-5">
                        <span className="inline-flex items-center rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-xs font-medium text-gray-800 ring-1 ring-inset ring-gray-200">
                          {record.ipAddress}
                        </span>
                      </td>

                      <td className="max-w-xs px-6 py-5 text-sm text-gray-500">
                        <span className="line-clamp-1">{record.description || "—"}</span>
                      </td>

                      <td className="px-6 py-5">
                        <button
                          type="button"
                          onClick={() => toggleStatus(record)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset transition ${record.isActive
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-600 ring-gray-200 hover:bg-gray-200"
                            }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${record.isActive ? "bg-emerald-500" : "bg-gray-400"
                              }`}
                          />
                          {record.isActive ? "Active" : "Disabled"}
                        </button>
                      </td>

                      <td className="px-6 py-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(record)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:shadow-sm"
                          >
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                              />
                            </svg>
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteRecord(record)}
                            disabled={deletingId === record._id}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {deletingId === record._id ? (
                              <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                              </svg>
                            ) : (
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            )}
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-lg animate-in overflow-hidden rounded-2xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-200 px-6 py-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-900 text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {editingId ? "Edit IP Address" : "Add IP Address"}
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Configure an authorized office network.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {error && (
                <div className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700">
                  <svg className="mt-0.5 h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  IP Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.ipAddress}
                  onChange={(event) => handleChange("ipAddress", event.target.value)}
                  placeholder="103.123.45.67"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 font-mono text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  Enter the public IP address of the office network.
                </p>
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Network Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(event) => handleChange("name", event.target.value)}
                  placeholder="Office WiFi 1"
                  className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700">
                  Description <span className="font-normal text-gray-400">(optional)</span>
                </label>
                <textarea
                  value={form.description}
                  onChange={(event) => handleChange("description", event.target.value)}
                  placeholder="Main office network"
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:border-gray-900 focus:ring-2 focus:ring-gray-900/10"
                />
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-blue-800">Current detected IP</p>
                </div>
                <p className="mt-1.5 font-mono text-sm text-blue-700">
                  {currentIp || "Unable to detect"}
                </p>
                {!editingId && currentIp && (
                  <button
                    type="button"
                    onClick={() => handleChange("ipAddress", currentIp)}
                    className="mt-2 text-xs font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 transition hover:text-blue-900"
                  >
                    Use this IP
                  </button>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 border-t border-gray-100 pt-5">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  )}
                  {saving ? "Saving..." : editingId ? "Update IP" : "Add IP"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
