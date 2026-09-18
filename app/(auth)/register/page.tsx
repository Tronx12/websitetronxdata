// app/(auth)/register/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthShell from "@/components/auth/AuthShell";
import FormField from "@/components/auth/FormField";
import AuthButton from "@/components/auth/AuthButton";
import { authApi } from "@/lib/auth-client";

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    email: "",
    employeeId: "",
    phoneNumber: "",
    password: "",
    workingShift: "day" as "day" | "night",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const employeeId = form.employeeId.trim() || undefined;
    const phoneNumber = form.phoneNumber.trim() || undefined;
    const password = form.password;
    const workingShift = form.workingShift;

    if (!name || !email || !password) {
      setError("Name, email and password are required");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authApi.register({
        name,
        email,
        employeeId,
        phoneNumber,
        password,
        workingShift,
      });

      router.push(
        `/verify-email?email=${encodeURIComponent(email)}`
      );
    } catch (err: any) {
      setError(err?.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Create your workspace"
      subtitle="Start free. Bring your pipeline into one clear view."
    >
      <form onSubmit={onSubmit} className="auth-form" noValidate>
        <FormField
          label="Full name"
          name="name"
          placeholder="Amina Okoro"
          value={form.name}
          onChange={handleChange}
          autoComplete="name"
          required
          disabled={loading}
        />

        <FormField
          label="Employee ID (optional)"
          name="employeeId"
          placeholder="EMP-001"
          value={form.employeeId}
          onChange={handleChange}
          autoComplete="off"
          disabled={loading}
        />

        <FormField
          label="Work email"
          name="email"
          type="email"
          placeholder="you@company.com"
          value={form.email}
          onChange={handleChange}
          autoComplete="email"
          required
          disabled={loading}
        />

        <FormField
          label="Phone (optional)"
          name="phoneNumber"
          type="tel"
          placeholder="+1 555 000 0000"
          value={form.phoneNumber}
          onChange={handleChange}
          autoComplete="tel"
          disabled={loading}
        />

        {/* Working Shift Select */}
        {/* <div className="form-field">
          <label htmlFor="workingShift" className="form-label">
            Working Shift
          </label>
          <select
            id="workingShift"
            name="workingShift"
            value={form.workingShift}
            onChange={handleChange}
            disabled={loading}
            className="form-input"
            required
          >
            <option value="day">Day Shift</option>
            <option value="night">Night Shift</option>
          </select>
        </div> */}
        <div className="form-field">
  <label htmlFor="workingShift" className="form-label">
    Working Shift
  </label>

  <select
    id="workingShift"
    name="workingShift"
    value={form.workingShift}
    onChange={handleChange}
    disabled={loading}
    className="form-input"
    required
  >
    <option value="day">Day Shift</option>
    <option value="night">Night Shift</option>
  </select>
</div>

        <FormField
          label="Password"
          name="password"
          type="password"
          placeholder="At least 8 characters"
          value={form.password}
          onChange={handleChange}
          autoComplete="new-password"
          required
          disabled={loading}
        />

        {error && (
          <div className="auth-alert error" role="alert">
            {error}
          </div>
        )}

        <AuthButton type="submit" loading={loading}>
          Create account <span aria-hidden="true">→</span>
        </AuthButton>
      </form>

      <p className="auth-switch">
        Already have an account?{" "}
        <Link href="/login" className="text-link">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}