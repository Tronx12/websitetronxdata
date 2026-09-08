// types/role.ts
export type UserRole = "survey-tester" | "team-lead" | "hr" | "admin";

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string; // or ReactNode
  roles: UserRole[]; // which roles can see this item
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    label: "Dashboard",
    path: "/survey-tester",
    icon: "LayoutDashboard",
    roles: ["survey-tester", "team-lead", "hr", "admin"],
  },
  {
    label: "Attendence",
    path: "/survey-tester/attendence",
    icon: "ClipboardList",
    roles: ["survey-tester", "team-lead","hr"],
  },
  {
    label: "Request Missing Attendance",
    path: "/survey-tester/missing-attendence",
    icon: "ClipboardList",
    roles: ["survey-tester", "team-lead"],
  },
  {
    label: "My Profile",
    path: "/survey-tester/profile",
    icon: "ClipboardList",
    roles: ["survey-tester", "team-lead"],
  },
  {
    label: "Surveys Data",
    path: "/survey-tester/survey-data",
    icon: "ClipboardList",
    roles: ["survey-tester", "team-lead"],
  },
  {
    label: "Assigned Surveys",
    path: "/surveys/assigned",
    icon: "ListChecks",
    roles: ["survey-tester"],
  },
  {
    label: "Team Surveys",
    path: "/surveys/team",
    icon: "Users",
    roles: ["team-lead", "admin"],
  },
  {
    label: "Create Survey",
    path: "/surveys/create",
    icon: "PlusCircle",
    roles: ["team-lead", "admin"],
  },
  {
    label: "All Surveys",
    path: "/surveys/all",
    icon: "FolderOpen",
    roles: ["admin", "hr"],
  },
  {
    label: "Users & Roles",
    path: "/admin/users",
    icon: "UserCog",
    roles: ["admin"],
  },
  {
    label: "HR Reports",
    path: "/hr/reports",
    icon: "BarChart3",
    roles: ["hr", "admin"],
  },
  {
    label: "Settings",
    path: "/settings",
    icon: "Settings",
    roles: ["team-lead", "hr", "admin"],
  },
];
