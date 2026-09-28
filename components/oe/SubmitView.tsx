// "use client";

// import { useEffect, useMemo, useState } from "react";
// import {
//   ChevronDown,
//   ChevronUp,
//   ImagePlus,
//   Lightbulb,
//   Search,
//   Send,
//   Sparkles,
//   X,
// } from "lucide-react";
// import { api } from "@/lib/api";

// export default function SubmitView() {
//   const [names, setNames] = useState<string[]>([]);
//   const [pids, setPids] = useState<string[]>([]);

//   const [name, setName] = useState("");
//   const [pid, setPid] = useState("");
//   const [qNo, setQNo] = useState("Q1");
//   const [qText, setQText] = useState("");

//   const [oe, setOe] = useState("");
//   const [related, setRelated] = useState(false);
//   const [image, setImage] = useState<string | null>(null);

//   const [quality, setQuality] = useState<any>(null);
//   const [checking, setChecking] = useState(false);
//   const [message, setMessage] = useState("");

//   const [showPID, setShowPID] = useState(false);
//   const [approved, setApproved] = useState<any[]>([]);

//   const [nameOpen, setNameOpen] = useState(false);
//   const [pidOpen, setPidOpen] = useState(false);

//   // =========================================================
//   // INITIAL DATA
//   // =========================================================

//   useEffect(() => {
//     let active = true;

//     api<any>("getInitialData")
//       .then((data) => {
//         if (!active) return;

//         setNames(data?.names || []);
//         setPids(data?.pids || []);
//       })
//       .catch((error: any) => {
//         if (!active) return;

//         setMessage(
//           error?.message || "Failed to load initial data."
//         );
//       });

//     return () => {
//       active = false;
//     };
//   }, []);

//   // =========================================================
//   // FILTER NAME
//   // =========================================================

//   const filteredNames = useMemo(() => {
//     const search = name.toLowerCase().trim();

//     return names
//       .filter((item) =>
//         item.toLowerCase().includes(search)
//       )
//       .slice(0, 12);
//   }, [names, name]);

//   // =========================================================
//   // FILTER PID
//   // =========================================================

//   const filteredPids = useMemo(() => {
//     const search = pid.toLowerCase().trim();

//     return pids
//       .filter((item) =>
//         item.toLowerCase().includes(search)
//       )
//       .slice(0, 12);
//   }, [pids, pid]);

//   // =========================================================
//   // CHECK QUALITY
//   // =========================================================

//   const check = async () => {
//     setMessage("");

//     if (!oe.trim() || !qNo || !qText.trim()) {
//       setMessage(
//         "Enter the question and OE response first."
//       );
//       return;
//     }

//     setChecking(true);
//     setQuality(null);

//     try {
//       const result = await api<any>(
//         "checkOEQuality",
//         {
//           oeResponse: oe.trim(),
//           qNumber: qNo,
//           isRelatedToPrevious: related,
//         }
//       );

//       setQuality(result);
//     } catch (error: any) {
//       setMessage(
//         error?.message ||
//           "Unable to check OE quality."
//       );
//     } finally {
//       setChecking(false);
//     }
//   };

//   // =========================================================
//   // SUBMIT
//   // =========================================================

//   const submit = async () => {
//     setMessage("");

//     if (
//       !name.trim() ||
//       !pid.trim() ||
//       !oe.trim() ||
//       !qText.trim()
//     ) {
//       setMessage(
//         "Please complete Name, PID, Question and OE."
//       );
//       return;
//     }

//     if (!quality) {
//       setMessage(
//         "Please check the OE quality before submitting."
//       );
//       return;
//     }

//     setChecking(true);

//     try {
//       let imageUrl = "";

//       if (image) {
//         imageUrl = await api<string>(
//           "uploadImageToDrive",
//           {
//             base64Data: image,
//             fileName: `oe-${Date.now()}.jpg`,
//           }
//         );
//       }

//       const result = await api<any>(
//         "submitOE",
//         {
//           memberName: name.trim(),
//           pid: pid.trim(),
//           qNumber: qNo,
//           qText: qText.trim(),
//           oeResponse: oe.trim(),
//           isRelatedToPrevious: related,
//           imageUrl,
//           qualityResult: quality,
//         }
//       );

//       setMessage(
//         `Submitted successfully${
//           result?.id
//             ? ` — ID: ${result.id}`
//             : ""
//         }`
//       );

//       // Reset only response-specific fields.
//       setOe("");
//       setQuality(null);
//       setImage(null);
//       setRelated(false);
//     } catch (error: any) {
//       setMessage(
//         error?.message ||
//           "Failed to submit OE."
//       );
//     } finally {
//       setChecking(false);
//     }
//   };

//   // =========================================================
//   // APPROVED OE SEARCH
//   // =========================================================

//   const approvedSearch = async () => {
//     setMessage("");

//     if (!pid.trim()) {
//       setMessage("Please enter a PID first.");
//       return;
//     }

//     try {
//       const result = await api<any[]>(
//         "getApprovedOEsByPID",
//         {
//           pid: pid.trim(),
//         }
//       );

//       setApproved(result || []);
//     } catch (error: any) {
//       setMessage(
//         error?.message ||
//           "Failed to load approved OEs."
//       );
//     }
//   };

//   // =========================================================
//   // IMAGE UPLOAD
//   // =========================================================

//   const handleImageChange = (
//     event: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     const file = event.target.files?.[0];

//     if (!file) return;

//     if (!file.type.startsWith("image/")) {
//       setMessage("Please select a valid image.");
//       return;
//     }

//     const reader = new FileReader();

//     reader.onload = () => {
//       setImage(String(reader.result));
//     };

//     reader.onerror = () => {
//       setMessage("Failed to read image.");
//     };

//     reader.readAsDataURL(file);
//   };

//   // =========================================================
//   // UI
//   // =========================================================

//   return (
//     <div className="mx-auto w-full max-w-3xl">
//       {/* HEADER */}
//       <div className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white">
//         <h3 className="text-xl font-bold">
//           📋 Submit Open-End Response
//         </h3>

//         <p className="mt-1 text-xs opacity-85">
//           Submit your response and check its quality
//         </p>
//       </div>

//       <div className="card rounded-t-none">
//         {/* NAME */}
//         <Field label="Your Name">
//           <div className="relative">
//             <input
//               className="input"
//               value={name}
//               placeholder="Search your name..."
//               onFocus={() => setNameOpen(true)}
//               onChange={(event) => {
//                 setName(event.target.value);
//                 setNameOpen(true);
//               }}
//             />

//             {nameOpen &&
//               filteredNames.length > 0 && (
//                 <Dropdown
//                   items={filteredNames}
//                   onSelect={(value) => {
//                     setName(value);
//                     setNameOpen(false);
//                   }}
//                 />
//               )}
//           </div>
//         </Field>

//         {/* PID */}
//         <Field label="PID">
//           <div className="relative">
//             <input
//               className="input"
//               value={pid}
//               placeholder="Search or type PID..."
//               onFocus={() => setPidOpen(true)}
//               onChange={(event) => {
//                 setPid(event.target.value);
//                 setPidOpen(true);
//               }}
//             />

//             {pidOpen &&
//               filteredPids.length > 0 && (
//                 <Dropdown
//                   items={filteredPids}
//                   onSelect={(value) => {
//                     setPid(value);
//                     setPidOpen(false);
//                   }}
//                 />
//               )}
//           </div>
//         </Field>

//         {/* QUESTION */}
//         <Field label="Question">
//           <div className="flex gap-2">
//             <select
//               className="input w-24"
//               value={qNo}
//               onChange={(event) => {
//                 setQNo(event.target.value);
//                 setQuality(null);
//               }}
//             >
//               {Array.from(
//                 { length: 20 },
//                 (_, index) => (
//                   <option
//                     key={index}
//                     value={`Q${index + 1}`}
//                   >
//                     Q{index + 1}
//                   </option>
//                 )
//               )}
//             </select>

//             <input
//               className="input"
//               value={qText}
//               onChange={(event) => {
//                 setQText(event.target.value);
//                 setQuality(null);
//               }}
//               placeholder="What do you enjoy most about working?"
//             />
//           </div>
//         </Field>

//         {/* RELATED */}
//         <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-100 bg-slate-50 p-3 text-sm">
//           <input
//             type="checkbox"
//             checked={related}
//             onChange={(event) =>
//               setRelated(event.target.checked)
//             }
//           />

//           <span>
//             <b className="text-brand">
//               Related to previous question
//             </b>{" "}
//             — my answer continues or relates to the
//             previous question
//           </span>
//         </label>

//         {/* TIPS */}
//         <div className="mb-4 rounded-lg border-l-4 border-brand bg-blue-50 p-3 text-sm">
//           <b>
//             <Lightbulb
//               className="mr-1 inline"
//               size={16}
//             />
//             Tips
//           </b>

//           <ul className="mt-1 list-disc pl-5 leading-7">
//             <li>
//               Write like you're talking to a friend
//             </li>

//             <li>
//               Use a different starting phrase each time
//             </li>

//             <li>
//               Focus on ONE main point
//             </li>

//             <li>
//               Avoid bullet points or structured answers
//             </li>

//             <li>
//               Make sure your answer matches the question
//             </li>
//           </ul>
//         </div>

//         {/* OE */}
//         <Field
//           label={`OE Response (${oe.length} chars)`}
//         >
//           <textarea
//             className="input h-32 resize-y"
//             value={oe}
//             onChange={(event) => {
//               setOe(event.target.value);
//               setQuality(null);
//             }}
//             placeholder="Write your open-ended response here..."
//             spellCheck
//           />
//         </Field>

//         {oe.length > 0 && (
//           <div
//             className={`mb-3 text-xs font-semibold ${
//               oe.length >= 100 &&
//               oe.length <= 300
//                 ? "text-success"
//                 : "text-orange-600"
//             }`}
//           >
//             {oe.length >= 100 &&
//             oe.length <= 300
//               ? "✓"
//               : "⚠"}{" "}
//             Recommended length: 100–300 characters
//           </div>
//         )}

//         {/* SCREENSHOT */}
//         <div className="mb-4 flex gap-2">
//           <label className="btn-muted flex-1 cursor-pointer">
//             <ImagePlus size={16} />
//             Attach screenshot

//             <input
//               hidden
//               type="file"
//               accept="image/*"
//               onChange={handleImageChange}
//             />
//           </label>

//           {image && (
//             <button
//               type="button"
//               className="btn-muted"
//               onClick={() => setImage(null)}
//             >
//               <X size={16} />
//             </button>
//           )}
//         </div>

//         {image && (
//           <img
//             src={image}
//             alt="Screenshot preview"
//             className="mb-4 max-h-36 rounded-lg border-2 border-brand object-contain"
//           />
//         )}

//         {/* APPROVED OEs */}
//         <div className="mb-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
//           <button
//             type="button"
//             className="flex w-full items-center justify-between text-sm font-bold text-brand"
//             onClick={() =>
//               setShowPID((previous) => !previous)
//             }
//           >
//             <span>
//               <Search
//                 size={15}
//                 className="mr-1 inline"
//               />
//               Check Approved OEs for this PID
//             </span>

//             {showPID ? (
//               <ChevronUp size={16} />
//             ) : (
//               <ChevronDown size={16} />
//             )}
//           </button>

//           {showPID && (
//             <div className="mt-3">
//               <div className="flex gap-2">
//                 <input
//                   className="input"
//                   value={pid}
//                   onChange={(event) =>
//                     setPid(event.target.value)
//                   }
//                   placeholder="PID"
//                 />

//                 <button
//                   type="button"
//                   className="btn-primary"
//                   onClick={approvedSearch}
//                 >
//                   <Search size={16} />
//                 </button>
//               </div>

//               <div className="mt-2 max-h-52 space-y-2 overflow-auto">
//                 {approved.length === 0 ? (
//                   <p className="p-2 text-center text-xs text-slate-500">
//                     No approved OEs found.
//                   </p>
//                 ) : (
//                   approved.map((item, index) => (
//                     <div
//                       key={
//                         item.id ||
//                         item._id ||
//                         `${item.qNumber}-${index}`
//                       }
//                       className="rounded-lg border border-green-200 bg-white p-3 text-sm"
//                     >
//                       <b className="text-brand">
//                         {item.qNumber}
//                       </b>

//                       <p className="mt-1 text-green-800">
//                         {item.approvedOE ||
//                           item.oeResponse}
//                       </p>
//                     </div>
//                   ))
//                 )}
//               </div>
//             </div>
//           )}
//         </div>

//         {/* QUALITY */}
//         {quality && (
//           <Quality data={quality} />
//         )}

//         {/* MESSAGE */}
//         {message && (
//           <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
//             {message}
//           </div>
//         )}

//         {/* BUTTONS */}
//         <div className="flex gap-2">
//           <button
//             type="button"
//             className="btn-muted flex-1"
//             onClick={check}
//             disabled={checking}
//           >
//             <Sparkles size={16} />

//             {checking
//               ? "Checking..."
//               : "Check Quality"}
//           </button>

//           <button
//             type="button"
//             className="btn-primary flex-1"
//             onClick={submit}
//             disabled={checking || !quality}
//           >
//             <Send size={16} />

//             {checking
//               ? "Submitting..."
//               : "Submit OE"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }

// /* =========================================================
//    FIELD
// ========================================================= */

// function Field({
//   label,
//   children,
// }: {
//   label: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <div className="field">
//       <label className="label">{label}</label>
//       {children}
//     </div>
//   );
// }

// /* =========================================================
//    DROPDOWN
// ========================================================= */

// function Dropdown({
//   items,
//   onSelect,
// }: {
//   items: string[];
//   onSelect: (value: string) => void;
// }) {
//   return (
//     <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border-2 border-brand bg-white shadow-lg">
//       {items.map((item) => (
//         <button
//           type="button"
//           key={item}
//           className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50"
//           onMouseDown={(event) => {
//             event.preventDefault();
//             onSelect(item);
//           }}
//         >
//           {item}
//         </button>
//       ))}
//     </div>
//   );
// }

// /* =========================================================
//    QUALITY
// ========================================================= */

// function Quality({
//   data,
// }: {
//   data: any;
// }) {
//   const humanScore = Number(
//     data?.ai_score ??
//       data?.aiScore ??
//       0
//   );

//   const relevancyScore = Number(
//     data?.relevancy_score ??
//       data?.relScore ??
//       0
//   );

//   const reason =
//     data?.ai_reason ||
//     data?.aiReason ||
//     "";

//   return (
//     <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
//       <div className="mb-3 font-bold">
//         Quality check
//       </div>

//       <div className="grid grid-cols-2 gap-3">
//         <Score
//           label="Human"
//           value={humanScore}
//         />

//         <Score
//           label="Relevancy"
//           value={relevancyScore}
//         />
//       </div>

//       {reason && (
//         <p className="mt-2 text-xs text-slate-600">
//           {reason}
//         </p>
//       )}
//     </div>
//   );
// }

// /* =========================================================
//    SCORE
// ========================================================= */

// function Score({
//   label,
//   value,
// }: {
//   label: string;
//   value: number;
// }) {
//   return (
//     <div className="rounded-lg bg-white p-3 text-center shadow-sm">
//       <div className="text-[10px] font-bold uppercase text-slate-400">
//         {label}
//       </div>

//       <div
//         className={`text-2xl font-bold ${
//           value >= 65
//             ? "text-success"
//             : value >= 50
//               ? "text-orange-600"
//               : "text-danger"
//         }`}
//       >
//         {value}/100
//       </div>
//     </div>
//   );
// }

"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  ImagePlus,
  Lightbulb,
  Search,
  Send,
  Sparkles,
  X,
} from "lucide-react";

import { api } from "@/lib/api";

type SubmitViewProps = {
  memberName: string;
};

export default function SubmitView({
  memberName,
}: SubmitViewProps) {
  // =========================================================
  // USER
  // =========================================================

  const name = memberName.trim();

  // =========================================================
  // STATE
  // =========================================================

  const [pids, setPids] = useState<string[]>([]);

  const [pid, setPid] = useState("");
  const [qNo, setQNo] = useState("Q1");
  const [qText, setQText] = useState("");

  const [oe, setOe] = useState("");
  const [related, setRelated] = useState(false);
  const [image, setImage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const [quality, setQuality] = useState<any>(null);
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState("");

  const [showPID, setShowPID] = useState(false);
  const [approved, setApproved] = useState<any[]>([]);
  const [pidOpen, setPidOpen] = useState(false);

  // =========================================================
  // INITIAL DATA
  // =========================================================

  useEffect(() => {
    let active = true;

    api<any>("getInitialData")
      .then((data) => {
        if (!active) return;
        setPids(data?.pids || []);
      })
      .catch((error: any) => {
        if (!active) return;
        setMessage(
          error?.message || "Failed to load initial data."
        );
      });

    return () => {
      active = false;
    };
  }, []);

  // =========================================================
  // FILTER PID
  // =========================================================

  const filteredPids = useMemo(() => {
    const search = pid.toLowerCase().trim();

    return pids
      .filter((item) => item.toLowerCase().includes(search))
      .slice(0, 12);
  }, [pids, pid]);

  // =========================================================
  // CHECK QUALITY
  // =========================================================

  const check = async () => {
    setMessage("");

    if (!oe.trim() || !qNo || !qText.trim()) {
      setMessage("Enter the question and OE response first.");
      return;
    }

    setChecking(true);
    setQuality(null);

    try {
      const result = await api<any>("checkOEQuality", {
        oeResponse: oe.trim(),
        qNumber: qNo,
        qText: qText.trim(),
        isRelatedToPrevious: related,
        memberName: name,
      });

      setQuality(result);
    } catch (error: any) {
      setMessage(
        error?.message || "Unable to check OE quality."
      );
    } finally {
      setChecking(false);
    }
  };

  // =========================================================
  // SUBMIT
  // =========================================================

  const submit = async () => {
    setMessage("");

    if (!name) {
      setMessage("Unable to identify the logged-in user.");
      return;
    }

    if (!pid.trim() || !oe.trim() || !qText.trim()) {
      setMessage("Please complete PID, Question and OE.");
      return;
    }

    if (!quality) {
      setMessage("Please check the OE quality before submitting.");
      return;
    }

    setChecking(true);

    try {
      let imageUrl = "";

      if (image) {
        imageUrl = await api<string>("uploadImageToDrive", {
          base64Data: image,
          fileName: `oe-${Date.now()}.jpg`,
        });
      }

      const result = await api<any>("submitOE", {
        // Always use authenticated member name.
        memberName: name,
        pid: pid.trim(),
        qNumber: qNo,
        qText: qText.trim(),
        oeResponse: oe.trim(),
        isRelatedToPrevious: related,
        imageUrl,
        qualityResult: quality,
      });

      setMessage(
        `Submitted successfully${
          result?.id ? ` — ID: ${result.id}` : ""
        }`
      );

      // Reset response-specific fields.
      setOe("");
      setQuality(null);
      setImage(null);
      setRelated(false);
    } catch (error: any) {
      setMessage(error?.message || "Failed to submit OE.");
    } finally {
      setChecking(false);
    }
  };

  // =========================================================
  // APPROVED OE SEARCH
  // =========================================================

  const approvedSearch = async () => {
    setMessage("");

    if (!pid.trim()) {
      setMessage("Please enter a PID first.");
      return;
    }

    try {
      const result = await api<any[]>("getApprovedOEsByPID", {
        pid: pid.trim(),
      });

      setApproved(result || []);
    } catch (error: any) {
      setMessage(
        error?.message || "Failed to load approved OEs."
      );
    }
  };

  // =========================================================
  // IMAGE UPLOAD (click + drag & drop)
  // =========================================================

  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(String(reader.result));
      setMessage("");
    };

    reader.onerror = () => {
      setMessage("Failed to read image.");
    };

    reader.readAsDataURL(file);
  };

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    processImageFile(file);
    // allow selecting the same file again later
    event.target.value = "";
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    processImageFile(file);
  };

  // =========================================================
  // UI
  // =========================================================

  return (
    <div className="mx-auto w-full max-w-3xl">
      {/* HEADER */}
      <div className="rounded-t-2xl bg-brand px-5 py-5 text-center text-white">
        <h3 className="text-xl font-bold">
          📋 Submit Open-End Response
        </h3>
        <p className="mt-1 text-xs opacity-85">
          Submit your response and check its quality
        </p>
      </div>

      <div className="card rounded-t-none">
        {/* =================================================
            USER NAME
        ================================================= */}
        <Field label="Your Name">
          <div className="relative">
            <input
              className="input cursor-not-allowed bg-slate-100 text-slate-600"
              value={name}
              disabled
              readOnly
              placeholder="Logged-in user"
            />

            <div className="mt-1 flex items-center justify-between">
              <p className="text-xs text-slate-400">
                Name is linked to your account.
              </p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                🔒 Locked
              </span>
            </div>
          </div>
        </Field>

        {/* =================================================
            PID
        ================================================= */}
        <Field label="PID">
          <div className="relative">
            <input
              className="input"
              value={pid}
              placeholder="Search or type PID..."
              onFocus={() => setPidOpen(true)}
              onChange={(event) => {
                setPid(event.target.value);
                setPidOpen(true);
              }}
            />

            {pidOpen && filteredPids.length > 0 && (
              <Dropdown
                items={filteredPids}
                onSelect={(value) => {
                  setPid(value);
                  setPidOpen(false);
                }}
              />
            )}
          </div>
        </Field>

        {/* =================================================
            QUESTION
        ================================================= */}
        <Field label="Question">
          <div className="flex gap-2">
            <select
              className="input w-24"
              value={qNo}
              onChange={(event) => {
                setQNo(event.target.value);
                setQuality(null);
              }}
            >
              {Array.from({ length: 20 }, (_, index) => (
                <option key={index} value={`Q${index + 1}`}>
                  Q{index + 1}
                </option>
              ))}
            </select>

            <input
              className="input"
              value={qText}
              onChange={(event) => {
                setQText(event.target.value);
                setQuality(null);
              }}
              placeholder="What do you enjoy most about working?"
            />
          </div>
        </Field>

        {/* =================================================
            RELATED
        ================================================= */}
        <label className="mb-4 flex cursor-pointer items-center gap-2 rounded-lg border border-blue-100 bg-slate-50 p-3 text-sm">
          <input
            type="checkbox"
            checked={related}
            onChange={(event) => setRelated(event.target.checked)}
          />
          <span>
            <b className="text-brand">Related to previous question</b>{" "}
            — my answer continues or relates to the previous question
          </span>
        </label>

        {/* =================================================
            TIPS
        ================================================= */}
        <div className="mb-4 rounded-lg border-l-4 border-brand bg-blue-50 p-3 text-sm">
          <b>
            <Lightbulb className="mr-1 inline" size={16} />
            Tips
          </b>
          <ul className="mt-1 list-disc pl-5 leading-7">
            <li>Write like you&apos;re talking to a friend</li>
            <li>Use a different starting phrase each time</li>
            <li>Focus on ONE main point</li>
            <li>Avoid bullet points or structured answers</li>
            <li>Make sure your answer matches the question</li>
          </ul>
        </div>

        {/* =================================================
            OE
        ================================================= */}
        <Field label={`OE Response (${oe.length} chars)`}>
          <textarea
            className="input h-32 resize-y"
            value={oe}
            onChange={(event) => {
              setOe(event.target.value);
              setQuality(null);
            }}
            placeholder="Write your open-ended response here..."
            spellCheck
          />
        </Field>

        {oe.length > 0 && (
          <div
            className={`mb-3 text-xs font-semibold ${
              oe.length >= 100 && oe.length <= 300
                ? "text-success"
                : "text-orange-600"
            }`}
          >
            {oe.length >= 100 && oe.length <= 300 ? "✓" : "⚠"}{" "}
            Recommended length: 100–300 characters
          </div>
        )}

        {/* =================================================
            SCREENSHOT (click + drop)
        ================================================= */}
        <div className="mb-4 flex gap-2">
          <label
            className={`btn-muted flex-1 cursor-pointer transition-colors ${
              isDragging
                ? "border-brand bg-blue-50 ring-2 ring-brand/30"
                : ""
            }`}
            onDragOver={handleDragOver}
            onDragEnter={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <ImagePlus size={16} />
            {isDragging
              ? "Drop image here"
              : image
                ? "Replace screenshot"
                : "Attach screenshot"}

            <input
              hidden
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </label>

          {image && (
            <button
              type="button"
              className="btn-muted"
              onClick={() => setImage(null)}
            >
              <X size={16} />
            </button>
          )}
        </div>

        {image && (
          <img
            src={image}
            alt="Screenshot preview"
            className="mb-4 max-h-36 rounded-lg border-2 border-brand object-contain"
          />
        )}

        {/* =================================================
            APPROVED OEs
        ================================================= */}
        <div className="mb-4 rounded-xl border-2 border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            className="flex w-full items-center justify-between text-sm font-bold text-brand"
            onClick={() => setShowPID((previous) => !previous)}
          >
            <span>
              <Search size={15} className="mr-1 inline" />
              Check Approved OEs for this PID
            </span>
            {showPID ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}
          </button>

          {showPID && (
            <div className="mt-3">
              <div className="flex gap-2">
                <input
                  className="input"
                  value={pid}
                  onChange={(event) => setPid(event.target.value)}
                  placeholder="PID"
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={approvedSearch}
                >
                  <Search size={16} />
                </button>
              </div>

              <div className="mt-2 max-h-52 space-y-2 overflow-auto">
                {approved.length === 0 ? (
                  <p className="p-2 text-center text-xs text-slate-500">
                    No approved OEs found.
                  </p>
                ) : (
                  approved.map((item, index) => (
                    <div
                      key={
                        item.id ||
                        item._id ||
                        `${item.qNumber}-${index}`
                      }
                      className="rounded-lg border border-green-200 bg-white p-3 text-sm"
                    >
                      <b className="text-brand">{item.qNumber}</b>
                      <p className="mt-1 text-green-800">
                        {item.approvedOE || item.oeResponse}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* =================================================
            QUALITY
        ================================================= */}
        {quality && <Quality data={quality} />}

        {/* =================================================
            MESSAGE
        ================================================= */}
        {message && (
          <div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">
            {message}
          </div>
        )}

        {/* =================================================
            BUTTONS
        ================================================= */}
        <div className="flex gap-2">
          <button
            type="button"
            className="btn-muted flex-1"
            onClick={check}
            disabled={checking}
          >
            <Sparkles size={16} />
            {checking ? "Checking..." : "Check Quality"}
          </button>

          <button
            type="button"
            className="btn-primary flex-1"
            onClick={submit}
            disabled={checking || !quality}
          >
            <Send size={16} />
            {checking ? "Submitting..." : "Submit OE"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label className="label">{label}</label>
      {children}
    </div>
  );
}

/* =========================================================
   DROPDOWN
========================================================= */

function Dropdown({
  items,
  onSelect,
}: {
  items: string[];
  onSelect: (value: string) => void;
}) {
  return (
    <div className="absolute z-30 mt-1 max-h-48 w-full overflow-auto rounded-lg border-2 border-brand bg-white shadow-lg">
      {items.map((item) => (
        <button
          type="button"
          key={item}
          className="block w-full border-b border-slate-100 px-3 py-2 text-left text-sm hover:bg-blue-50"
          onMouseDown={(event) => {
            event.preventDefault();
            onSelect(item);
          }}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

/* =========================================================
   QUALITY
========================================================= */

function Quality({ data }: { data: any }) {
  const humanScore = Number(data?.ai_score ?? data?.aiScore ?? 0);
  const relevancyScore = Number(
    data?.relevancy_score ?? data?.relScore ?? 0
  );
  const reason = data?.ai_reason || data?.aiReason || "";

  return (
    <div className="mb-4 rounded-xl border-2 border-blue-200 bg-blue-50 p-4">
      <div className="mb-3 font-bold">Quality check</div>

      <div className="grid grid-cols-2 gap-3">
        <Score label="Human" value={humanScore} />
        <Score label="Relevancy" value={relevancyScore} />
      </div>

      {reason && (
        <p className="mt-2 text-xs text-slate-600">{reason}</p>
      )}
    </div>
  );
}

/* =========================================================
   SCORE
========================================================= */

function Score({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-lg bg-white p-3 text-center shadow-sm">
      <div className="text-[10px] font-bold uppercase text-slate-400">
        {label}
      </div>
      <div
        className={`text-2xl font-bold ${
          value >= 65
            ? "text-success"
            : value >= 50
              ? "text-orange-600"
              : "text-danger"
        }`}
      >
        {value}/100
      </div>
    </div>
  );
}