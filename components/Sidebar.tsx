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
  Home,
  FileText,
  Users,
  Settings,
  BarChart,
  User,
} from "lucide-react";

interface SidebarProps {
  role: UserRole;
}

// Map icon names to actual components
const iconMap = {
  home: Home,
  surveys: FileText,
  responses: BarChart,
  users: Users,
  profile: User,
  settings: Settings,
};

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  // Auto-collapse on smaller screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Filter menu items based on current role
  const visibleItems = useMemo(() => {
    return SIDEBAR_ITEMS.filter((item) => item.roles.includes(role));
  }, [role]);

  // Handle logout
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

  // Toggle collapse state
  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  // Toggle mobile menu
  const toggleMobile = () => {
    setIsMobileOpen(!isMobileOpen);
  };

  // Get icon component
  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="w-5 h-5" /> : <Home className="w-5 h-5" />;
  };

  return (
    <>
      {/* Mobile hamburger menu button */}
      <button
        onClick={toggleMobile}
        className="fixed top-4 left-4 z-50 p-2 rounded-lg bg-gray-900 text-white md:hidden"
        aria-label="Toggle menu"
      >
        {isMobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={toggleMobile}
        />
      )}

      {/* Sidebar - now properly fixed on left */}
      <aside
        className={`fixed left-0 top-0 h-screen bg-gray-900 text-white transition-all duration-300 flex flex-col z-50
          ${isCollapsed ? "w-16" : "w-64"}
          ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header with toggle button */}
        <div className="flex items-center justify-between h-16 px-3 border-b border-gray-700 flex-shrink-0">
          {!isCollapsed && (
            <span className="text-xl font-bold whitespace-nowrap">SurveyApp</span>
          )}

          <button
            onClick={toggleSidebar}
            className={`p-1.5 rounded-lg hover:bg-gray-700 transition-colors ${
              isCollapsed ? "mx-auto" : ""
            } hidden md:block`}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 mt-4 px-2 space-y-1 overflow-y-auto">
          {visibleItems.map((item) => {
            const isActive = pathname.startsWith(item.path);

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
                title={isCollapsed ? item.label : undefined}
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

        {/* Bottom section */}
        <div className="border-t border-gray-700 pt-3 pb-4 px-2 space-y-2 flex-shrink-0">
          {/* Role badge */}
          {!isCollapsed && (
            <div className="bg-gray-800 rounded-lg px-3 py-2 text-xs text-gray-400 truncate">
              Role:{" "}
              <span className="text-white capitalize">{role.replace("-", " ")}</span>
            </div>
          )}

          {/* Logout button */}
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-300 hover:bg-red-600 hover:text-white ${
              isCollapsed ? "justify-center" : ""
            } ${isLoggingOut ? "opacity-50 cursor-not-allowed" : ""}`}
            title={isCollapsed ? "Logout" : undefined}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && (
              <span className="text-sm font-medium">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </span>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}