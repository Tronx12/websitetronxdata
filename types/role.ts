

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