// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";

const ROLE_REDIRECT: Record<string, string> = {
  admin: "/admin",
  hr: "/hr",
  "team-lead": "/team-lead",
  "survey-tester": "/survey-tester",
};

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsVerify, setNeedsVerify] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNeedsVerify(false);

    try {
      // const res = await authApi.login(form.email.trim(), form.password);
      // const role = res.data?.role ?? "survey-tester";
      const res = await authApi.login(form.email.trim(), form.password);

console.log("LOGIN RESPONSE:", res.data);
console.log("ROLE FROM API:", res.data?.role);

const role = res.data?.role;
const destination = ROLE_REDIRECT[role] ?? "/tester";

console.log("ROLE:", role);
console.log("DESTINATION:", destination);

router.push(destination);

      // const destination = ROLE_REDIRECT[role] ?? "/tester";

      // router.push(destination);
      router.refresh();
    } catch (err: any) {
      if (err.code === "EMAIL_NOT_VERIFIED") {
        setNeedsVerify(true);
        setError("Please verify your email first.");
      } else {
        setError(err.message || "Invalid email or password");
      }
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