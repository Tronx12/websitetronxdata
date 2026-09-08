// app/(auth)/verify-email/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import OTPInput from "@/components/auth/OTPInput";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailFromQuery);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!email) {
      setError("Email is required");
      return;
    }
    setResending(true);
    setError("");
    setSuccess("");
    try {
      await authApi.sendVerificationOtp(email.trim());
      setSuccess("OTP sent to your email");
      setCooldown(60);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP");
    } finally {
      setResending(false);
    }
  };

  // Auto-send on mount if email is present
  useEffect(() => {
    if (emailFromQuery) {
      sendOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError("Enter the 6-digit code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await authApi.verifyEmail(email.trim(), otp);
      setSuccess("Email verified! Redirecting…");
      setTimeout(() => router.push("/login"), 1200);
    } catch (err: any) {
      setError(err.message || "Verification failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Verify your email"
      subtitle="We sent a 6-digit code to your inbox. Enter it below."
    >
      <form onSubmit={onSubmit} className="auth-form">
        {!emailFromQuery && (
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
        )}

        {emailFromQuery && (
          <p className="auth-email-hint">
            Code sent to <strong>{email}</strong>
          </p>
        )}

        <OTPInput value={otp} onChange={setOtp} disabled={loading} />

        {error && <div className="auth-alert error">{error}</div>}
        {success && <div className="auth-alert success">{success}</div>}

        <AuthButton type="submit" loading={loading}>
          Verify email
        </AuthButton>

        <div className="auth-resend">
          <button
            type="button"
            className="text-link"
            onClick={sendOtp}
            disabled={resending || cooldown > 0}
          >
            {cooldown > 0
              ? `Resend in ${cooldown}s`
              : resending
              ? "Sending…"
              : "Resend code"}
          </button>
        </div>
      </form>

      <p className="auth-switch">
        <Link href="/login" className="text-link">
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="auth-shell">Loading…</div>}>
      <VerifyEmailForm />
    </Suspense>
  );
}