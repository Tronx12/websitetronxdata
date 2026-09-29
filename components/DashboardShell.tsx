"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { isRouteAllowedForRole, ROLE_REDIRECT, type UserRole } from "../types/role";

interface DashboardShellProps {
  role: UserRole;
  email: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, email, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  const isAllowed = isRouteAllowedForRole(pathname, role);

  useEffect(() => {
    if (!isAllowed) {
      const destination = ROLE_REDIRECT[role] ?? "/login";
      router.replace(destination);
    }
  }, [isAllowed, role, router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        email={email}
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
      />

      {/* No margin on mobile (sidebar is an overlay there);
          margin only kicks in at md+, and tracks the actual collapsed state */}
      <main
        className={`flex-1 ml-0 ${isCollapsed ? "md:ml-16" : "md:ml-64"} bg-gray-50 transition-all duration-300 min-h-screen overflow-auto`}
      >
        <div className="p-6">
          {!isAllowed ? (
            <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
                <span className="text-2xl text-red-600">!</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Access Restricted</h2>
              <p className="mt-2 text-sm text-gray-500 max-w-md">
                You do not have permission to access this page with your current role ({role}).
                Redirecting you to your authorized dashboard...
              </p>
            </div>
          ) : (
            children
          )}
        </div>
      </main>
    </div>
  );
}