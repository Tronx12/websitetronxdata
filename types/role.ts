

export type UserRole = "survey-tester" | "team-lead" | "senior-teamlead" | "data-quality-analyst" | "hr" | "admin";

export const ROLE_REDIRECT: Record<UserRole, string> = {
  admin: "/admin/survey-data",
  hr: "/hr/survey-data",
  "team-lead": "/team-lead/survey-data",
  "senior-teamlead": "/senior-teamlead/survey-data",
  "data-quality-analyst": "/data-quality-analyst/survey-data",
  "survey-tester": "/survey-tester/survey-data",
};

export function isRouteAllowedForRole(pathname: string, role: UserRole): boolean {
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    return role === "admin";
  }
  if (pathname === "/hr" || pathname.startsWith("/hr/")) {
    return role === "hr" || role === "admin";
  }
  if (pathname === "/team-lead" || pathname.startsWith("/team-lead/")) {
    return role === "team-lead" || role === "admin";
  }
  if (pathname === "/senior-teamlead" || pathname.startsWith("/senior-teamlead/")) {
    return role === "senior-teamlead" || role === "admin";
  }
  if (pathname === "/data-quality-analyst" || pathname.startsWith("/data-quality-analyst/")) {
    return role === "data-quality-analyst" || role === "admin";
  }
  if (pathname === "/survey-tester" || pathname.startsWith("/survey-tester/")) {
    return role === "survey-tester" || role === "admin";
  }
  return true;
}

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
    label: "Surveys Data",
    path: "/survey-tester/survey-data",
    icon: "FileSpreadsheet",
    roles: ["survey-tester"],
  },

  {
    label: "Survey Data Performance",
    path: "/survey-tester/survey-performance",
    icon: "ClipboardList",
    roles: ["survey-tester"],
  },

  {
    label: "OE Submit Panel",
    path: "/survey-tester/oe",
    icon: "ClipboardList",
    roles: ["survey-tester"],
  },

  {
    label: "OE Result Panel",
    path: "/survey-tester/oe/results",
    icon: "ClipboardList",
    roles: ["survey-tester"],
  },
  {
    label: "OE Performance",
    path: "/survey-tester/oe/oe-performance",
    icon: "ClipboardList",
    roles: ["survey-tester"],
  },



  // =========================================================
  // TEAM LEAD
  // =========================================================
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
    label: "Team Surveys Data",
    path: "/team-lead/survey-data",
    icon: "Users",
    roles: ["team-lead"],
  },


  {
    label: "Team-Member Survey-Performance",
    path: "/team-lead/survey-performance",
    icon: "CalendarPlus",
    roles: ["team-lead"],
  },




  {
    label: "OE DQA Panel",
    path: "/team-lead/oe/dqa",
    icon: "BadgeCheck",
    roles: ["team-lead"],
  },

  {
    label: "OE Performance",
    path: "/team-lead/oe/oe-performance",
    icon: "ClipboardList",
    roles: ["team-lead"],
  },
  {
    label: "OE SubmissionsDateWise",
    path: "/team-lead/oe/OESubmissionsByDate",
    icon: "ClipboardList",
    roles: ["team-lead"],
  },

  // =========================================================
  // SENIOR TEAM LEAD
  // =========================================================

  {
    label: "Attendance",
    path: "/senior-teamlead/attendence",
    icon: "CalendarCheck",
    roles: ["senior-teamlead"],
  },

  {
    label: "Manage Team Attendance",
    path: "/senior-teamlead/attendance",
    icon: "CalendarCog",
    roles: ["senior-teamlead"],
  },

  {
    label: "Team Surveys Data",
    path: "/senior-teamlead/survey-data",
    icon: "Users",
    roles: ["senior-teamlead"],
  },

  {
    label: "Survey Target",
    path: "/senior-teamlead/survey-target",
    icon: "CalendarPlus",
    roles: ["senior-teamlead"],
  },

  {
    label: "Manage Teams",
    path: "/senior-teamlead/teams",
    icon: "Network",
    roles: ["senior-teamlead"],
  },

  {
    label: "OE DQA Panel",
    path: "/senior-teamlead/oe/dqa",
    icon: "BadgeCheck",
    roles: ["senior-teamlead"],
  },

  {
    label: "OE Performance",
    path: "/senior-teamlead/oe/oe-performance",
    icon: "ClipboardList",
    roles: ["senior-teamlead"],
  },

  {
    label: "IP Whitelist",
    path: "/senior-teamlead/ip-whitelist",
    icon: "Network",
    roles: ["senior-teamlead"],
  },

  {
    label: "My Profile",
    path: "/senior-teamlead/profile",
    icon: "UserCircle",
    roles: ["senior-teamlead"],
  },

  // =========================================================
  // DATA QUALITY ANALYST
  // =========================================================

  {
    label: "Attendance",
    path: "/data-quality-analyst/attendence",
    icon: "CalendarCheck",
    roles: ["data-quality-analyst"],
  },

  {
    label: "Manage Team Attendance",
    path: "/data-quality-analyst/attendance",
    icon: "CalendarCog",
    roles: ["data-quality-analyst"],
  },

  {
    label: "Team Surveys Data",
    path: "/data-quality-analyst/survey-data",
    icon: "Users",
    roles: ["data-quality-analyst"],
  },

  {
    label: "Survey Target",
    path: "/data-quality-analyst/survey-target",
    icon: "CalendarPlus",
    roles: ["data-quality-analyst"],
  },

  {
    label: "Manage Teams",
    path: "/data-quality-analyst/teams",
    icon: "Network",
    roles: ["data-quality-analyst"],
  },

  {
    label: "OE DQA Panel",
    path: "/data-quality-analyst/oe",
    icon: "BadgeCheck",
    roles: ["data-quality-analyst"],
  },

  {
    label: "OE Performance",
    path: "/data-quality-analyst/oe/oe-performance",
    icon: "ClipboardList",
    roles: ["data-quality-analyst"],
  },

  {
    label: "IP Whitelist",
    path: "/data-quality-analyst/ip-whitelist",
    icon: "Network",
    roles: ["data-quality-analyst"],
  },

  {
    label: "My Profile",
    path: "/data-quality-analyst/profile",
    icon: "UserCircle",
    roles: ["data-quality-analyst"],
  },

  // =========================================================
  // HR
  // =========================================================

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
    label: "Manage Attendance",
    path: "/hr/attendance",
    icon: "CalendarCog",
    roles: ["hr"],
  },

  {
    label: "Manage Users",
    path: "/hr/users",
    icon: "UsersRound",
    roles: ["hr"],
  },

  {
    label: "Manage Teams",
    path: "/hr/teams",
    icon: "Network",
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
    label: "Manage Users",
    path: "/admin/users",
    icon: "UsersRound",
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
    label: "Manage Missing Attendance",
    path: "/admin/missing-attendence",
    icon: "CalendarPlus",
    roles: ["admin"],
  },

  {
    label: " Add Survey-Target",
    path: "/admin/survey-target",
    icon: "CalendarPlus",
    roles: ["admin"],
  },

  {
    label: "Manage Survey Data",
    path: "/admin/survey-data",
    icon: "Database",
    roles: ["admin"],
  },


  {
    label: "OE SubmissionsByDate",
    path: "/admin/oe/OESubmissionsByDate",
    icon: "ClipboardList",
    roles: ["admin"],
  },

  // {
  //   label: "OE Panel",
  //   path: "/admin/oe",
  //   icon: "ClipboardList",
  //   roles: ["admin"],
  // },

  {
    label: "OE Submit Panel",
    path: "/admin/oe",
    icon: "ClipboardList",
    roles: ["admin"],
  },

  {
    label: "OE Result Panel",
    path: "/admin/oe/results",
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
    label: "IP Whitelist",
    path: "/admin/ip-whitelist",
    icon: "Network",
    roles: ["admin"],
  },



  {
    label: "My Profile",
    path: "/admin/profile",
    icon: "UserCircle",
    roles: ["admin"],
  },

  // -------------------------------------------
  // ==============================================
  // -------------------------------------------------

  {
    label: "My Profile",
    path: "/survey-tester/profile",
    icon: "UserCircle",
    roles: ["survey-tester"],
  },
  {
    label: "My Profile",
    path: "/team-lead/profile",
    icon: "UserCircle",
    roles: ["team-lead"],
  },
  {
    label: "My Profile",
    path: "/hr/profile",
    icon: "UserCircle",
    roles: ["hr"],
  }
];