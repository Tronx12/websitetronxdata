"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { SIDEBAR_ITEMS, UserRole } from "../types/role";

import {
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  CalendarCheck,
  CalendarPlus,
  UserCircle,
  FileSpreadsheet,
  Users,
  BarChart3,
  Settings,
  UsersRound,
  Network,
  CalendarCog,
  Database,
  ScrollText,
  CalendarOff,
  ClipboardList,
  BadgeCheck,
  Home,
} from "lucide-react";

interface SidebarProps {
  role: UserRole;
  email: string;
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

// =====================================================
// ICON MAP
// =====================================================
// Keys must exactly match the icon names in types/role.ts

const iconMap = {
  LayoutDashboard,
  CalendarCheck,
  CalendarPlus,
  UserCircle,
  FileSpreadsheet,
  Users,
  BarChart3,
  Settings,
  UsersRound,
  Network,
  CalendarCog,
  Database,
  ScrollText,
  CalendarOff,

  // OE Panel
  ClipboardList,

  // OE DQA Panel
  BadgeCheck,
};

export function Sidebar({
  role,
  email,
  isCollapsed,
  onCollapsedChange,
}: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // =====================================================
  // AUTO COLLAPSE ON SMALL SCREENS
  // =====================================================

  useEffect(() => {
    const handleResize = () => {
      onCollapsedChange(window.innerWidth < 768);
    };

    handleResize();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [onCollapsedChange]);

  // =====================================================
  // VISIBLE SIDEBAR ITEMS
  // =====================================================

  const visibleItems = useMemo(() => {
    return SIDEBAR_ITEMS.filter((item) =>
      item.roles.includes(role)
    );
  }, [role]);

  // =====================================================
  // ACTIVE ROUTE
  // =====================================================
  // IMPORTANT:
  //
  // /team-lead/oe
  // /team-lead/oe/dqa
  //
  // Both technically match startsWith().
  //
  // We therefore select the LONGEST matching path.
  // This makes only the most specific menu item active.
  // =====================================================

  const activePath = useMemo(() => {
    return visibleItems
      .filter(
        (item) =>
          pathname === item.path ||
          pathname.startsWith(`${item.path}/`)
      )
      .sort((a, b) => b.path.length - a.path.length)[0]?.path;
  }, [pathname, visibleItems]);

  // =====================================================
  // LOGOUT
  // =====================================================

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);

      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        router.push("/");
        router.refresh();
      } else {
        console.error("Logout failed");
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // =====================================================
  // SIDEBAR TOGGLE
  // =====================================================

  const toggleSidebar = () => {
    onCollapsedChange(!isCollapsed);
  };

  // =====================================================
  // MOBILE TOGGLE
  // =====================================================

  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // =====================================================
  // ICON HELPER
  // =====================================================

  const getIcon = (iconName?: string) => {
    if (!iconName) {
      return <Home className="w-5 h-5" />;
    }

    const IconComponent =
      iconMap[iconName as keyof typeof iconMap];

    if (!IconComponent) {
      return <Home className="w-5 h-5" />;
    }

    return <IconComponent className="w-5 h-5" />;
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <>
      {/* ================================================= */}
      {/* MOBILE MENU BUTTON */}
      {/* ================================================= */}

      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-900 text-white md:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* ================================================= */}
      {/* MOBILE OVERLAY */}
      {/* ================================================= */}

      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* ================================================= */}
      {/* SIDEBAR */}
      {/* ================================================= */}

      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 flex flex-col z-50
          ${isCollapsed ? "w-16" : "w-64"}
          ${
            isMobileOpen
              ? "translate-x-0"
              : "-translate-x-full md:translate-x-0"
          }
        `}
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div className="flex items-center justify-between h-16 px-3 border-b border-gray-700 flex-shrink-0">
          {!isCollapsed && (
                <a className="brand " href="#top" aria-label="Tronx home">
  <img src="/2.svg" alt="Tronx" className="bg-white rounded-lg w-36 h-12 flex items-center" />
</a>
          )}

          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg hover:bg-gray-700 transition-colors ${
              isCollapsed ? "mx-auto" : ""
            } hidden md:block`}
            aria-label={
              isCollapsed
                ? "Expand sidebar"
                : "Collapse sidebar"
            }
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* ================================================= */}
        {/* NAVIGATION */}
        {/* ================================================= */}

        <nav className="flex-1 mt-4 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            // IMPORTANT:
            // Compare against activePath instead of startsWith()
            const isActive = item.path === activePath;

            return (
              <Link
                key={item.path}
                href={item.path}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                } ${isCollapsed ? "justify-center" : ""}`}
                title={
                  isCollapsed ? item.label : undefined
                }
              >
                <span className="w-5 h-5 flex-shrink-0">
                  {getIcon(item.icon)}
                </span>

                {!isCollapsed && (
                  <span className="text-sm font-medium truncate">
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* ================================================= */}
        {/* USER INFO + LOGOUT */}
        {/* ================================================= */}

        <div className="border-t border-gray-700 pt-3 pb-4 px-2 space-y-2 flex-shrink-0">
          {!isCollapsed && (
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400">
              <div className="truncate">
                Role:{" "}
                <span className="text-white capitalize">
                  {role.replace("-", " ")}
                </span>
              </div>

              <div className="truncate mt-1">
                Email:{" "}
                <span className="text-white">
                  {email}
                </span>
              </div>
            </div>
          )}

          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-300 hover:bg-red-600 hover:text-white ${
              isCollapsed ? "justify-center" : ""
            } ${
              isLoggingOut
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />

            {!isCollapsed && (
              <span className="text-sm font-medium">
                {isLoggingOut
                  ? "Logging out..."
                  : "Logout"}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}