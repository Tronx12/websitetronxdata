
// // types/role.ts

// export type UserRole = "survey-tester" | "team-lead" | "hr" | "admin";

// export interface SidebarItem {
//   label: string;
//   path: string;
//   icon?: string; // lucide-react icon name
//   roles: UserRole[];
// }

// export const SIDEBAR_ITEMS: SidebarItem[] = [
//   {
//     label: "Surveys Data",
//     path: "/survey-tester/survey-data",
//     icon: "FileSpreadsheet",
//     roles: ["survey-tester"],
//   },
//   {
//     label: "Team Surveys Data",
//     path: "/team-lead/survey-data",
//     icon: "Users",
//     roles: ["team-lead"],
//   },
//   {
//     label: "Manage Survey Data",
//     path: "/admin/survey-data",
//     icon: "Database",
//     roles: ["admin", "hr"],
//   },

//   {
//     label: "Attendance",
//     path: "/survey-tester/attendence",
//     icon: "CalendarCheck",
//     roles: ["survey-tester", "team-lead", "hr"],
//   },


  
//   {
//     label: "Request Missing Attendance",
//     path: "/survey-tester/missing-attendence",
//     icon: "CalendarPlus",
//     roles: ["survey-tester", "team-lead", "hr", "admin"],
//   },
//   {
//     label: "Manage Team Attendance",
//     path: "/team-lead/manage-attendance",
//     icon: "CalendarPlus",
//     roles: ["team-lead"],
//   },
//   {
//     label: "My Profile",
//     path: "/survey-tester/profile",
//     icon: "UserCircle",
//     roles: ["survey-tester", "team-lead", "hr", "admin"],
//   },

//   // Admin / HR
//   {
//     label: "Manage Users",
//     path: "/admin/users",
//     icon: "UsersRound",
//     roles: ["admin", "hr"],
//   },

//   // OE Panel
//   {
//     label: "OE Panel",
//     path: "/admin/oe",
//     icon: "ClipboardList",
//     roles: ["admin"],
//   },
//   {
//     label: "OE Panel",
//     path: "/hr/oe",
//     icon: "ClipboardList",
//     roles: ["hr"],
//   },
//   {
//     label: "OE Panel",
//     path: "/team-lead/oe",
//     icon: "ClipboardList",
//     roles: ["team-lead"],
//   },
//   {
//     label: "OE Panel",
//     path: "/survey-tester/oe",
//     icon: "ClipboardList",
//     roles: ["survey-tester"],
//   },

//   // OE DQA Panel
//   {
//     label: "OE DQA Panel",
//     path: "/admin/oe/dqa",
//     icon: "BadgeCheck",
//     roles: ["admin"],
//   },
//   // {
//   //   label: "OE DQA Panel",
//   //   path: "/hr/oe/dqa",
//   //   icon: "BadgeCheck",
//   //   roles: ["hr"],
//   // },
//   {
//     label: "OE DQA Panel",
//     path: "/team-lead/oe/dqa",
//     icon: "BadgeCheck",
//     roles: ["team-lead"],
//   },
//   // {
//   //   label: "OE DQA Panel",
//   //   path: "/survey-tester/oe/dqa",
//   //   icon: "BadgeCheck",
//   //   roles: ["survey-tester"],
//   // },

//   {
//     label: "Manage Teams",
//     path: "/admin/teams",
//     icon: "Network",
//     roles: ["admin", "hr"],
//   },
//   {
//     label: "Manage Attendance",
//     path: "/admin/attendance",
//     icon: "CalendarCog",
//     roles: ["admin", "hr"],
//   },
//   {
//     label: "Office Off Manage",
//     path: "/admin/office-off",
//     icon: "CalendarOff",
//     roles: ["admin", "hr"],
//   },
//   {
//     label: "Audit Logs",
//     path: "/admin/audit-logs",
//     icon: "ScrollText",
//     roles: ["admin", "hr"],
//   },
// ];

// types/role.ts

export type UserRole = "survey-tester" | "team-lead" | "hr" | "admin";

export interface SidebarItem {
  label: string;
  path: string;
  icon?: string; // lucide-react icon name
  roles: UserRole[];
}

export const SIDEBAR_ITEMS: SidebarItem[] = [
  // =========================================================
  // SURVEY TESTER
  // =========================================================

  {
    label: "Surveys Data",
    path: "/survey-tester/survey-data",
    icon: "FileSpreadsheet",
    roles: ["survey-tester"],
  },

  {
    label: "Attendance",
    path: "/survey-tester/attendence",
    icon: "CalendarCheck",
    roles: ["survey-tester"],
  },

  {
    label: "Request Missing Attendance",
    path: "/survey-tester/missing-attendence",
    icon: "CalendarPlus",
    roles: ["survey-tester"],
  },

  {
    label: "My Profile",
    path: "/survey-tester/profile",
    icon: "UserCircle",
    roles: ["survey-tester"],
  },

  {
    label: "OE Panel",
    path: "/survey-tester/oe",
    icon: "ClipboardList",
    roles: ["survey-tester"],
  },

  // =========================================================
  // TEAM LEAD
  // =========================================================

  {
    label: "Team Surveys Data",
    path: "/team-lead/survey-data",
    icon: "Users",
    roles: ["team-lead"],
  },

  {
    label: "Attendance",
    path: "/team-lead/attendence",
    icon: "CalendarCheck",
    roles: ["team-lead"],
  },

  {
    label: "Request Missing Attendance",
    path: "/team-lead/missing-attendence",
    icon: "CalendarPlus",
    roles: ["team-lead"],
  },

  {
    label: "Manage Team Attendance",
    path: "/team-lead/manage-attendance",
    icon: "CalendarPlus",
    roles: ["team-lead"],
  },

  {
    label: "My Profile",
    path: "/team-lead/profile",
    icon: "UserCircle",
    roles: ["team-lead"],
  },

  {
    label: "OE Panel",
    path: "/team-lead/oe",
    icon: "ClipboardList",
    roles: ["team-lead"],
  },

  {
    label: "OE DQA Panel",
    path: "/team-lead/oe/dqa",
    icon: "BadgeCheck",
    roles: ["team-lead"],
  },

  // =========================================================
  // HR
  // =========================================================

  {
    label: "Manage Survey Data",
    path: "/hr/survey-data",
    icon: "Database",
    roles: ["hr"],
  },

  {
    label: "Attendance",
    path: "/hr/attendence",
    icon: "CalendarCheck",
    roles: ["hr"],
  },

  {
    label: "Request Missing Attendance",
    path: "/hr/missing-attendence",
    icon: "CalendarPlus",
    roles: ["hr"],
  },

  {
    label: "My Profile",
    path: "/hr/profile",
    icon: "UserCircle",
    roles: ["hr"],
  },

  {
    label: "Manage Users",
    path: "/hr/users",
    icon: "UsersRound",
    roles: ["hr"],
  },

  {
    label: "OE Panel",
    path: "/hr/oe",
    icon: "ClipboardList",
    roles: ["hr"],
  },

  {
    label: "Manage Teams",
    path: "/hr/teams",
    icon: "Network",
    roles: ["hr"],
  },

  {
    label: "Manage Attendance",
    path: "/hr/attendance",
    icon: "CalendarCog",
    roles: ["hr"],
  },

  {
    label: "Office Off Manage",
    path: "/hr/office-off",
    icon: "CalendarOff",
    roles: ["hr"],
  },

  {
    label: "Audit Logs",
    path: "/hr/audit-logs",
    icon: "ScrollText",
    roles: ["hr"],
  },

  // =========================================================
  // ADMIN
  // =========================================================

  {
    label: "Manage Survey Data",
    path: "/admin/survey-data",
    icon: "Database",
    roles: ["admin"],
  },

  {
    label: "Manage Users",
    path: "/admin/users",
    icon: "UsersRound",
    roles: ["admin"],
  },

  {
    label: "OE Panel",
    path: "/admin/oe",
    icon: "ClipboardList",
    roles: ["admin"],
  },

  {
    label: "OE DQA Panel",
    path: "/admin/oe/dqa",
    icon: "BadgeCheck",
    roles: ["admin"],
  },

  {
    label: "Manage Teams",
    path: "/admin/teams",
    icon: "Network",
    roles: ["admin"],
  },

  {
    label: "Manage Attendance",
    path: "/admin/attendance",
    icon: "CalendarCog",
    roles: ["admin"],
  },

  {
    label: "Office Off Manage",
    path: "/admin/office-off",
    icon: "CalendarOff",
    roles: ["admin"],
  },

  {
    label: "Audit Logs",
    path: "/admin/audit-logs",
    icon: "ScrollText",
    roles: ["admin"],
  },

  {
    label: "Request Missing Attendance",
    path: "/admin/missing-attendence",
    icon: "CalendarPlus",
    roles: ["admin"],
  },

  {
    label: "My Profile",
    path: "/admin/profile",
    icon: "UserCircle",
    roles: ["admin"],
  },
];