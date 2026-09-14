// types/role.ts

export type UserRole = "survey-tester" | "team-lead" | "hr" | "admin";

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string; // lucide-react icon name
  roles: UserRole[]; // which roles can see this item
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  // ─────────────────────────────
  // Shared (visible to multiple roles)
  // ─────────────────────────────
  // {
  //   label: "Dashboard",
  //   path: "/survey-tester",
  //   icon: "LayoutDashboard",
  //   roles: ["survey-tester", "team-lead", "hr", "admin"],
  // },
  {
    label: "Attendance",
    path: "/survey-tester/attendence",
    icon: "CalendarCheck",
    roles: ["survey-tester", "team-lead", "hr"],
  },
  {
    label: "Request Missing Attendance",
    path: "/survey-tester/missing-attendence",
    icon: "CalendarPlus",
    roles: ["survey-tester", "team-lead", "hr", "admin"],
  },
  {
    label: "Manage Team Attendance",
    path: "/team-lead/manage-attendance",
    icon: "CalendarPlus",
    roles: ["team-lead"],
  },
  {
    label: "My Profile",
    path: "/survey-tester/profile",
    icon: "UserCircle",
    roles: ["survey-tester", "team-lead", "hr", "admin"],
  },

  // ─────────────────────────────
  // Survey Tester
  // ─────────────────────────────
  {
    label: "Surveys Data",
    path: "/survey-tester/survey-data",
    icon: "FileSpreadsheet",
    roles: ["survey-tester"],
  },

  // ─────────────────────────────
  // Team Lead
  // ─────────────────────────────
  {
    label: "Team Surveys Data",
    path: "/team-lead/survey-data",
    icon: "Users",
    roles: ["team-lead"],
  },
  // {
  //   label: "Settings",
  //   path: "/settings",
  //   icon: "Settings",
  //   roles: ["team-lead"],
  // },

  // ─────────────────────────────
  // HR
  // ─────────────────────────────
  // {
  //   label: "HR Reports",
  //   path: "/hr/reports",
  //   icon: "BarChart3",
  //   roles: ["hr"],
  // },

  // ─────────────────────────────
  // Admin (HR shares admin management screens)
  // ─────────────────────────────
  {
    label: "Manage Users",
    path: "/admin/users",
    icon: "UsersRound",
    roles: ["admin", "hr"],
  },
  {
    label: "Manage Teams",
    path: "/admin/teams",
    icon: "Network",
    roles: ["admin", "hr"],
  },
  {
    label: "Manage Attendance",
    path: "/admin/attendance",
    icon: "CalendarCog",
    roles: ["admin", "hr"],
  },
  {
    label: "Manage Survey Data",
    path: "/admin/survey-data",
    icon: "Database",
    roles: ["admin", "hr"],
  },
  {
    label: "Office Off Manage",
    path: "/admin/office-off",
    icon: "CalendarOff",
    roles: ["admin", "hr"],
  },
  {
    label: "Audit Logs",
    path: "/admin/audit-logs",
    icon: "ScrollText",
    roles: ["admin", "hr"],
  },
];