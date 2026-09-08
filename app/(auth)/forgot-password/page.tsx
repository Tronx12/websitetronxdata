// app/(auth)/forgot-password/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword(email.trim());
      // Always proceed (API never reveals whether email exists)
      router.push(
        `/reset-password?email=${encodeURIComponent(email.trim())}`
      );
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter the email associated with your account and we’ll send a one-time code."
    >
      <form onSubmit={onSubmit} className="auth-form">
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          autoComplete="email"
          required
        />

        {error && <div className="auth-alert error">{error}</div>}

        <AuthButton type="submit" loading={loading}>
          Send reset code <span aria-hidden="true">→</span>
        </AuthButton>
      </form>

      <p className="auth-switch">
        <Link href="/login" className="text-link">
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}