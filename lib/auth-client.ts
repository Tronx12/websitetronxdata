// lib/auth-client.ts
type ApiResponse<T = any> = {
  success: boolean;
  message: string;
  data?: T;
  code?: string;
};

async function api<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    credentials: "include", // important for httpOnly cookies
  });

  const json = await res.json();
  if (!res.ok) {
    throw Object.assign(new Error(json.message || "Request failed"), {
      status: res.status,
      code: json.code,
      data: json,
    });
  }
  return json;
}

export const authApi = {
  login: (email: string, password: string) =>
    api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (payload: {
    name: string;
    email: string;
    phoneNumber?: string;
    password: string;
    workingShift?: "day" | "night";
  }) =>
    api("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  sendVerificationOtp: (email: string) =>
    api("/api/auth/send-verification-otp", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  verifyEmail: (email: string, otp: string) =>
    api("/api/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ email, otp }),
    }),

  forgotPassword: (email: string) =>
    api("/api/auth/forget-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  resetPassword: (email: string, otp: string, newPassword: string) =>
    api("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, otp, newPassword }),
    }),

  logout: () =>
    api("/api/auth/logout", { method: "POST" }),

  me: () => api("/api/auth/me"),
};