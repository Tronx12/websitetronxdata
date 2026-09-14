"use client";

import { useState } from "react";
import { Sidebar } from "./Sidebar";
import type { UserRole } from "../types/role";

interface DashboardShellProps {
  role: UserRole;
  email: string;
  children: React.ReactNode;
}

export function DashboardShell({ role, email, children }: DashboardShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}