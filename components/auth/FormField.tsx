// // components/auth/FormField.tsx
// "use client";

// import { useState } from "react";
// import { Eye, EyeOff } from "lucide-react";

// type Props = {
//   label: string;
//   name: string;
//   type?: string;
//   placeholder?: string;
//   value: string;
//   onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
//   error?: string;
//   autoComplete?: string;
//   required?: boolean;
//   disabled?: boolean;
// };

// export default function FormField({
//   label,
//   name,
//   type = "text",
//   placeholder,
//   value,
//   onChange,
//   error,
//   autoComplete,
//   required,
//   disabled,
// }: Props) {
//   const isPasswordField = type === "password";
//   const [showPassword, setShowPassword] = useState(false);

//   const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;

//   return (
//     <div className={`form-field ${error ? "has-error" : ""}`}>
//       <label htmlFor={name}>{label}</label>
//       <div className="form-field-input-wrap relative w-full flex items-center">
//         <input
//           id={name}
//           name={name}
//           type={inputType}
//           placeholder={placeholder}
//           value={value}
//           onChange={onChange}
//           autoComplete={autoComplete}
//           required={required}
//           disabled={disabled}
//           style={isPasswordField ? { paddingRight: "2.75rem" } : undefined}
//         />
//         {/* {isPasswordField && (
//           <button
//             type="button"
//             onClick={() => setShowPassword((prev) => !prev)}
//             disabled={disabled}
//             className="password-toggle-btn absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center p-1 text-slate-400 hover:text-white transition-colors focus:outline-none disabled:opacity-50"
//             aria-label={showPassword ? "Hide password" : "Show password"}
//             tabIndex={-1}
//           >
//             {showPassword ? (
//               <EyeOff size={18} className="cursor-pointer text-gray-500  mt-[45%]" />
//             ) : (
//               <Eye size={18} className="cursor-pointer text-blue-500 mt-40" />
//             )}
//           </button>
//         )} */}
//         {isPasswordField && (
//           <button
//             type="button"
//             onClick={() => setShowPassword((prev) => !prev)}
//             disabled={disabled}
//             className="
//       absolute
//       right-3
//       top-1/2
//       -translate-y-1/2
//       flex
//       items-center
//       justify-center
//       p-1
//       bg-transparent
//       border-0
//       text-slate-400
//       hover:text-blue-500
//       transition-colors
//       focus:outline-none
//       disabled:opacity-50
//     "
//             aria-label={showPassword ? "Hide password" : "Show password"}
//             tabIndex={-1}
//           >
//             {showPassword ? (
//               <EyeOff
//                 size={18}
//                 className="text-gray-500"
//               />
//             ) : (
//               <Eye
//                 size={18}
//                 className="text-blue-500"
//               />
//             )}
//           </button>
//         )}
//       </div>
//       {error && <span className="field-error">{error}</span>}
//     </div>
//   );
// }



// components/auth/FormField.tsx
"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type Props = {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
};

export default function FormField({
  label,
  name,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  autoComplete,
  required,
  disabled,
}: Props) {
  const isPasswordField = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const inputType = isPasswordField
    ? showPassword
      ? "text"
      : "password"
    : type;

  return (
    <div className={`form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={name}>{label}</label>

      <div className="form-field-input-wrap relative w-full flex items-center">
        <input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          disabled={disabled}
          style={
            isPasswordField
              ? { paddingRight: "2.75rem" }
              : undefined
          }
        />

        {isPasswordField && (
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            disabled={disabled}
            className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              flex
              items-center
              justify-center
              p-1
              bg-transparent
              border-0
              text-slate-400
              hover:text-blue-500
              transition-colors
              focus:outline-none
              disabled:opacity-50
            "
            aria-label={
              showPassword ? "Hide password" : "Show password"
            }
            tabIndex={-1}
          >
            {showPassword ? (
              // Password visible → OPEN eye
              <Eye
                size={18}
                className="cursor-pointer text-blue-500"
              />
            ) : (
              // Password hidden → eye-off
              <EyeOff
                size={18}
                className="cursor-pointer text-gray-500"
              />
            )}
          </button>
        )}
      </div>

      {error && <span className="field-error">{error}</span>}
    </div>
  );
}