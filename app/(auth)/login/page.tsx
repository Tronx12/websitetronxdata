

// "use client";

// import { useState } from "react";
// import { useRouter } from "next/navigation";
// import Link from "next/link";
// import AuthShell from "@/components/auth/AuthShell";
// import FormField from "@/components/auth/FormField";
// import AuthButton from "@/components/auth/AuthButton";
// import { authApi } from "@/lib/auth-client";
// import { ROLE_REDIRECT, UserRole } from "@/types/role";

// export default function LoginPage() {
//   const router = useRouter();

//   const [form, setForm] = useState({
//     email: "",
//     password: "",
//   });

//   const [error, setError] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [needsVerify, setNeedsVerify] = useState(false);
//   const [accountPending, setAccountPending] = useState(false);

//   const handleChange = (
//     e: React.ChangeEvent<HTMLInputElement>
//   ) => {
//     setForm((p) => ({
//       ...p,
//       [e.target.name]: e.target.value,
//     }));

//     setError("");
//     setNeedsVerify(false);
//     setAccountPending(false);
//   };

//   const onSubmit = async (
//     e: React.FormEvent
//   ) => {
//     e.preventDefault();

//     setLoading(true);
//     setError("");
//     setNeedsVerify(false);
//     setAccountPending(false);

//     try {
//       const res = await authApi.login(
//         form.email.trim(),
//         form.password
//       );

//       console.log("LOGIN RESPONSE:", res.data);

//       const role = res.data?.role as UserRole;

//       console.log("ROLE FROM API:", role);

//       const destination =
//         ROLE_REDIRECT[role] ??
//         "/survey-tester/survey-data";

//       console.log("DESTINATION:", destination);

//       router.push(destination);
//       router.refresh();
//     } catch (err: any) {
//       console.error("LOGIN ERROR:", err);

//       /*
//        * Email verification
//        */
//       if (err.code === "EMAIL_NOT_VERIFIED") {
//         setNeedsVerify(true);
//         setError(
//           "Please verify your email first."
//         );
//         return;
//       }

//       /*
//        * Account waiting for admin approval
//        */
//       if (err.code === "ACCOUNT_NOT_ACTIVE") {
//         setAccountPending(true);
//         setError(
//           "Your account is waiting for admin approval. Please contact the administrator to verify and activate your account."
//         );
//         return;
//       }

//       /*
//        * IP whitelist restriction
//        *
//        * This error MUST come from the backend.
//        */
//       if (
//         err.code === "IP_NOT_WHITELISTED" ||
//         err.code === "IP_NOT_ALLOWED"
//       ) {
//         setError(
//           "Access denied. Your current IP address is not whitelisted. Please connect to the authorized network or contact the administrator."
//         );
//         return;
//       }

//       /*
//        * Invalid credentials / other errors
//        */
//       setError(
//         err.message ||
//           "Invalid email or password"
//       );
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <AuthShell
//       title="Welcome back"
//       subtitle="Sign in to continue building momentum with your team."
//     >
//       <form
//         onSubmit={onSubmit}
//         className="auth-form"
//         noValidate
//       >
//         <FormField
//           label="Email"
//           name="email"
//           type="email"
//           placeholder="you@company.com"
//           value={form.email}
//           onChange={handleChange}
//           autoComplete="email"
//           required
//         />

//         <FormField
//           label="Password"
//           name="password"
//           type="password"
//           placeholder="••••••••"
//           value={form.password}
//           onChange={handleChange}
//           autoComplete="current-password"
//           required
//         />

//         <div className="auth-row">
//           <Link
//             href="/forgot-password"
//             className="text-link subtle"
//           >
//             Forgot password?
//           </Link>
//         </div>

//         {error && (
//           <div
//             className={`auth-alert ${
//               needsVerify
//                 ? "warning"
//                 : "error"
//             }`}
//           >
//             {error}

//             {needsVerify && (
//               <Link
//                 href={`/verify-email?email=${encodeURIComponent(
//                   form.email
//                 )}`}
//                 className="text-link"
//               >
//                 Verify email →
//               </Link>
//             )}
//           </div>
//         )}

//         <AuthButton
//           type="submit"
//           loading={loading}
//         >
//           Sign in{" "}
//           <span aria-hidden="true">
//             →
//           </span>
//         </AuthButton>
//       </form>

//       <p className="auth-switch">
//         New to Tronx?{" "}
//         <Link
//           href="/register"
//           className="text-link"
//         >
//           Create an account
//         </Link>
//       </p>
//     </AuthShell>
//   );
// }



"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";
import { ROLE_REDIRECT, UserRole } from "@/types/role";

/**
 * Only follow callbackUrl if it is a local path the user's role may open.
 * Otherwise middleware would send them to /unauthorized.
 */
function resolveDestination(
  role: UserRole,
  callbackUrl: string | null
): string {
  const roleDefault = ROLE_REDIRECT[role] ?? "/survey-tester/survey-data";

  if (
    !callbackUrl ||
    !callbackUrl.startsWith("/") ||
    callbackUrl.startsWith("//") ||
    callbackUrl.startsWith("/login")
  ) {
    return roleDefault;
  }

  if (role === "admin") return callbackUrl;

  // e.g. "/team-lead/survey-data" -> "/team-lead"
  const section = "/" + roleDefault.split("/")[1];

  const allowed =
    callbackUrl === section || callbackUrl.startsWith(section + "/");

  return allowed ? callbackUrl : roleDefault;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl");

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);
  const [accountPending, setAccountPending] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({
      ...p,
      [e.target.name]: e.target.value,
    }));

    setError("");
    setNeedsVerify(false);
    setAccountPending(false);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");
    setNeedsVerify(false);
    setAccountPending(false);

    try {
      const res = await authApi.login(form.email.trim(), form.password);

      const role = res.data?.role as UserRole;
      const destination = resolveDestination(role, callbackUrl);

      router.push(destination);
      router.refresh();
    } catch (err: any) {
      // Email verification
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerify(true);
        setError("Please verify your email first.");
        return;
      }

      // Account waiting for admin approval
      if (err.code === "ACCOUNT_NOT_ACTIVE") {
        setAccountPending(true);
        setError(
          "Your account is waiting for admin approval. Please contact the administrator to verify and activate your account."
        );
        return;
      }

      // IP whitelist restriction (must come from the backend)
      if (err.code === "IP_NOT_WHITELISTED" || err.code === "IP_NOT_ALLOWED") {
        setError(
          "Access denied. Your current IP address is not whitelisted. Please connect to the authorized network or contact the administrator."
        );
        return;
      }

      // Invalid credentials / other errors
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to continue building momentum with your team."
    >
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
        />

        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={handleChange}
          autoComplete="current-password"
          required
        />

        <div className="auth-row">
          <Link href="/forgot-password" className="text-link subtle">
            Forgot password?
          </Link>
        </div>

        {error && (
          <div className={`auth-alert ${needsVerify ? "warning" : "error"}`}>
            {error}

            {needsVerify && (
              <Link
                href={`/verify-email?email=${encodeURIComponent(form.email)}`}
                className="text-link"
              >
                Verify email →
              </Link>
            )}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>
          Sign in <span aria-hidden="true">→</span>
        </AuthButton>
      </form>

      <p className="auth-switch">
        New to Tronx?{" "}
        <Link href="/register" className="text-link">
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}

// useSearchParams() must be inside a Suspense boundary in the App Router,
// otherwise the page can fail to render in production builds.
export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}