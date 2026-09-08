// app/(auth)/reset-password/page.tsx
"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import OTPInput from "@/components/auth/OTPInput";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [email] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit OTP");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await authApi.resetPassword(email, otp, password);
      router.push("/login?reset=success");
    } catch (err: any) {
      setError(err.message || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    return (
      <AuthShell title="Invalid link">
        <p className="auth-subtitle">
          Missing email. Please start again from the forgot-password page.
        </p>
        <Link href="/forgot-password" className="button">
          Go to forgot password
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle={`Enter the code we sent to ${email} and set a new password.`}
    >
      <form onSubmit={onSubmit} className="auth-form">
        <div className="form-field">
          <label>One-time code</label>
          <OTPInput value={otp} onChange={setOtp} disabled={loading} />
        </div>

        <FormField
          label="New password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
          required
        />
        <FormField
          label="Confirm password"
          name="confirm"
          type="password"
          placeholder="Repeat password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          required
        />

        {error && <div className="auth-alert error">{error}</div>}

        <AuthButton type="submit" loading={loading}>
          Reset password
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="auth-shell">Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}