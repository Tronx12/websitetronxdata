// app/page.tsx

import { headers } from "next/headers";
import Link from "next/link";
import { connectDB } from "@/config/db";
import IpWhitelist from "@/models/IpWhitelist";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export const dynamic = "force-dynamic";

/**
 * Check whether an IP is localhost.
 */
function isLocalIp(ip: string): boolean {
  const normalized = ip.trim().toLowerCase();
  return (
    normalized === "127.0.0.1" ||
    normalized === "::1" ||
    normalized === "::ffff:127.0.0.1"
  );
}

/**
 * Get public IP for LOCAL DEVELOPMENT only.
 */
async function getDevelopmentPublicIp(): Promise<string> {
  try {
    const response = await fetch("https://api.ipify.org", {
      cache: "no-store",
    });

    if (!response.ok) {
      return "";
    }

    return (await response.text()).trim();
  } catch {
    return "";
  }
}

/**
 * Get visitor/client IP.
 */
async function getClientIp(): Promise<string> {
  const requestHeaders = await headers();

  const forwardedFor = requestHeaders.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) {
      if (process.env.NODE_ENV !== "production" && isLocalIp(firstIp)) {
        return await getDevelopmentPublicIp();
      }
      return firstIp;
    }
  }

  const realIp = requestHeaders.get("x-real-ip");
  if (realIp) {
    const ip = realIp.trim();
    if (process.env.NODE_ENV !== "production" && isLocalIp(ip)) {
      return await getDevelopmentPublicIp();
    }
    return ip;
  }

  if (process.env.NODE_ENV !== "production") {
    return await getDevelopmentPublicIp();
  }

  return "";
}

/**
 * Check the current IP against MongoDB whitelist.
 */
async function isIpAllowed(): Promise<boolean> {
  try {
    const clientIp = await getClientIp();

    if (!clientIp) {
      return false;
    }

    await connectDB();

    const whitelistRecord = await IpWhitelist.findOne({
      ipAddress: clientIp,
      isActive: true,
    }).lean();

    return Boolean(whitelistRecord);
  } catch (error) {
    console.error("HOME IP WHITELIST ERROR:", error);
    return false;
  }
}

/**
 * Access Restricted screen (when on unauthorized network).
 */
function AccessDenied() {
  return (
    <main className="min-h-screen bg-[#0B1528] flex items-center justify-center p-6 text-white">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-8 text-center shadow-2xl">
          {/* Tronx Brand */}
          <div className="flex justify-center mb-6">
            <img src="/2.svg" alt="Tronx" className="h-10 w-auto" />
          </div>

          {/* Icon */}
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-2xl font-bold text-white">
            Access Restricted
          </h3>

          <p className="mt-3 text-sm text-gray-400 leading-relaxed">
            Your current network is not recognized as an authorized office network for Tronx CRM.
          </p>

          <div className="mt-6 rounded-xl bg-[#0B1528] border border-gray-800 p-4 text-left">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              Office Network Required
            </div>
            <p className="mt-1.5 text-xs text-gray-400">
              Please connect to an authorized office Wi-Fi or company VPN and retry.
            </p>
          </div>

          <a
            href="/"
            className="mt-6 block w-full rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-500 shadow-lg shadow-blue-600/25"
          >
            Check Network Again
          </a>

          <p className="mt-5 text-xs text-gray-500">
            If you believe this is an error, please contact your System Administrator.
          </p>
        </div>
      </div>
    </main>
  );
}

/**
 * Main Tronx CRM Home Page
 */
export default async function Home() {
  const ipAllowed = await isIpAllowed();

  if (!ipAllowed) {
    return <AccessDenied />;
  }

  // Check if user is currently logged in
  const currentUser = await getCurrentUser();
  const dashboardLink = currentUser ? (ROLE_REDIRECT[currentUser.role] ?? "/login") : "/login";

  return (
    <div className="min-h-screen bg-[#0B1528] text-white flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* =========================================================
          TOP NAVIGATION BAR
      ========================================================= */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-[#0B1528]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/2.svg" alt="Tronx" className="h-10 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-300">
            <a href="#features" className="hover:text-white transition">Features</a>
            <a href="#modules" className="hover:text-white transition">Modules</a>
            <a href="#hierarchy" className="hover:text-white transition">Approval Flow</a>
            <a href="#security" className="hover:text-white transition">Security</a>
          </nav>

          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Office Network Verified
            </div>

            {currentUser ? (
              <Link
                href={dashboardLink}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                Go to Dashboard
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            ) : (
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 transition hover:bg-blue-500"
              >
                Employee Login
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO SECTION
      ========================================================= */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-32">
        {/* Glow background accent */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold text-blue-400 mb-6">
              <span>🚀</span> Workforce & Operations Intelligence
            </div>

            <h4 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
              Workforce, Attendance & Leave Management Platform
            </h4>

            <p className="mt-6 text-lg sm:text-xl text-gray-300 leading-relaxed">
              Tronx unifies attendance logging, leave carry-forward tracking, survey data pipelines, and hierarchical approvals into one seamless operational workspace.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href={dashboardLink}
                className="rounded-xl bg-blue-600 px-8 py-3.5 text-base font-bold text-white shadow-xl shadow-blue-600/30 transition hover:bg-blue-500 hover:scale-[1.02] active:scale-[0.98]"
              >
                {currentUser ? "Open Your Dashboard →" : "Sign In to Tronx Portal →"}
              </Link>

              <a
                href="#modules"
                className="rounded-xl border border-gray-700 bg-[#111C38] px-6 py-3.5 text-base font-semibold text-gray-200 transition hover:bg-gray-800 hover:text-white"
              >
                Explore Modules ▾
              </a>
            </div>
          </div>

          {/* =========================================================
              LIVE DASHBOARD PREVIEW CARD
          ========================================================= */}
          <div className="mt-16 rounded-2xl border border-gray-800 bg-[#111C38] p-4 sm:p-6 shadow-2xl shadow-black/60 max-w-5xl mx-auto">
            {/* Window header */}
            <div className="flex items-center justify-between border-b border-gray-800 pb-4 mb-6">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-3 text-xs font-mono text-gray-400">tronx-crm.internal/dashboard</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                ● Live Operations
              </div>
            </div>

            {/* Dashboard Sample Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
              {/* Card 1 */}
              <div className="rounded-xl border border-gray-800 bg-[#0B1528] p-4">
                <div className="text-xs text-gray-400 font-medium">Leave Carry-Forward</div>
                <div className="mt-2 text-2xl font-bold text-emerald-400">3 Available</div>
                <div className="mt-1 text-[11px] text-gray-400">2 Carried Over + 1 This Month</div>
              </div>

              {/* Card 2 */}
              <div className="rounded-xl border border-gray-800 bg-[#0B1528] p-4">
                <div className="text-xs text-gray-400 font-medium">Today&apos;s Attendance</div>
                <div className="mt-2 text-2xl font-bold text-blue-400">Present</div>
                <div className="mt-1 text-[11px] text-gray-400">Shift: Day (09:30 - 18:30)</div>
              </div>

              {/* Card 3 */}
              <div className="rounded-xl border border-gray-800 bg-[#0B1528] p-4">
                <div className="text-xs text-gray-400 font-medium">Pending Approvals</div>
                <div className="mt-2 text-2xl font-bold text-amber-400">2 Requests</div>
                <div className="mt-1 text-[11px] text-gray-400">Assigned for your review</div>
              </div>

              {/* Card 4 */}
              <div className="rounded-xl border border-gray-800 bg-[#0B1528] p-4">
                <div className="text-xs text-gray-400 font-medium">Network Security</div>
                <div className="mt-2 text-2xl font-bold text-indigo-400">Protected</div>
                <div className="mt-1 text-[11px] text-gray-400">IP Whitelist Active</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          KEY MODULES SECTION
      ========================================================= */}
      <section id="modules" className="py-20 border-t border-gray-800/80 bg-[#080F1E]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Enterprise Modules Built for Velocity
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-400">
              Designed to optimize workforce operations, accountability, and real-time team synchronization.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Module 1 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-blue-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Smart Leave & Carry-Forward</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Automated monthly paid leave entitlement (1 leave/month if ≤3 absences) with automatic carry-forward accumulation, multi-granularity analytics, and status filters.
              </p>
            </div>

            {/* Module 2 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-emerald-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Attendance & Shift Engine</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Precision check-in/out, automated absent-marking crons 1 hour after shift close, late arrival calculation, lunch timers, and missing attendance resolution workflows.
              </p>
            </div>

            {/* Module 3 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-indigo-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Office IP Security & Geofence</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Secure access restricted to whitelisted office networks. Prevents unauthorized off-site access while maintaining an immutable audit log of administrative actions.
              </p>
            </div>

            {/* Module 4 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-amber-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Team & Roster Management</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Manage team compositions, assign Team Leads, configure weekly-off schedules, and oversee cross-departmental operations effortlessly.
              </p>
            </div>

            {/* Module 5 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-cyan-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-cyan-600/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Survey Data & QA Pipelines</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Track daily survey quotas, monitor tester deliverables, review quality scores, and inspect detailed submission data in real-time.
              </p>
            </div>

            {/* Module 6 */}
            <div className="rounded-2xl border border-gray-800 bg-[#111C38] p-6 shadow-sm hover:border-purple-500/50 transition">
              <div className="h-12 w-12 rounded-xl bg-purple-600/10 border border-purple-500/20 flex items-center justify-center text-purple-400 mb-5">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-white">Automated Work Reports</h3>
              <p className="mt-2 text-sm text-gray-400 leading-relaxed">
                Scheduled weekly and monthly work summary reports delivered to management for high-level visibility across all shifts and teams.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          APPROVAL HIERARCHY SECTION
      ========================================================= */}
      <section id="hierarchy" className="py-20 border-t border-gray-800/80 bg-[#0B1528]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Hierarchical Approval Framework
            </h2>
            <p className="mt-4 text-sm sm:text-base text-gray-400">
              Clear delegation matrix ensuring swift reviews without procedural bottlenecks.
            </p>
          </div>

          <div className="mt-12 max-w-4xl mx-auto space-y-3">
            <div className="rounded-xl border border-gray-800 bg-[#111C38] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-xs font-bold">
                  Survey Tester
                </span>
                <span className="text-sm font-medium text-gray-300">Leave Approvers</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                Team Lead (Same Team) · Senior Team Lead · HR · Admin
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#111C38] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 text-xs font-bold">
                  Team Lead
                </span>
                <span className="text-sm font-medium text-gray-300">Leave Approvers</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                Senior Team Lead · HR · Admin
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#111C38] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-1 text-xs font-bold">
                  Data Quality Analyst
                </span>
                <span className="text-sm font-medium text-gray-300">Leave Approvers</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                Senior Team Lead · HR · Admin
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#111C38] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-1 text-xs font-bold">
                  Senior Team Lead
                </span>
                <span className="text-sm font-medium text-gray-300">Leave Approvers</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                HR · Admin
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 bg-[#111C38] p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-1 text-xs font-bold">
                  HR
                </span>
                <span className="text-sm font-medium text-gray-300">Leave Approvers</span>
              </div>
              <div className="text-xs sm:text-sm text-gray-400">
                Admin
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CALL TO ACTION & FOOTER
      ========================================================= */}
      <footer className="mt-auto border-t border-gray-800 bg-[#080F1E] pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/2.svg" alt="Tronx" className="h-8 w-auto" />
              <span className="text-xs text-gray-500">| Enterprise CRM & Workforce Suite</span>
            </div>

            <div className="flex items-center gap-6 text-xs text-gray-400">
              <Link href="/login" className="hover:text-white transition">Sign In</Link>
              <a href="#features" className="hover:text-white transition">Documentation</a>
              <span className="text-gray-600">·</span>
              <span className="text-emerald-400">● System Operational</span>
            </div>
          </div>

          <div className="mt-8 border-t border-gray-800/60 pt-6 text-center text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Tronx CRM. All rights reserved. Authorized employee access only.
          </div>
        </div>
      </footer>
    </div>
  );
}
