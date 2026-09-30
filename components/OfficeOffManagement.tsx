


"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";

type OfficeOffType =
  | "festival"
  | "holiday"
  | "special";

type OfficeOffScope =
  | "all"
  | "team"
  | "shift"
  | "employee";

type WeekDay =
  | "SUNDAY"
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY";

interface OfficeOff {
  _id: string;
  date: string;
  title: string;
  type: OfficeOffType;
  description?: string | null;
  groupId?: string | null;

  scope?: OfficeOffScope;

  teamIds?: any[];
  shiftIds?: any[];
  employeeIds?: any[];

  isPaid?: boolean;

  isActive: boolean;
}

interface Team {
  _id: string;
  name: string;
}

interface Employee {
  _id: string;
  name?: string;
  email?: string;
}

interface Shift {
  _id: string;
  name: string;
  code: string;
  startTime: string;
  endTime: string;
  crossesMidnight: boolean;
  graceMinutes: number;
  isActive: boolean;
}

interface WeeklyPolicy {
  _id: string;

  name: string;

  scope:
    | "company"
    | "team"
    | "employee";

  teamId?: any;

  employeeId?: any;

  days: WeekDay[];

  rotational: boolean;

  rotationWeeks?: WeekDay[][];

  effectiveFrom: string;

  effectiveTo?: string | null;

  isActive: boolean;
}

interface Props {
  currentUserId: string;
}

const WEEK_DAYS: {
  value: WeekDay;
  label: string;
}[] = [
  {
    value: "MONDAY",
    label: "Monday",
  },
  {
    value: "TUESDAY",
    label: "Tuesday",
  },
  {
    value: "WEDNESDAY",
    label: "Wednesday",
  },
  {
    value: "THURSDAY",
    label: "Thursday",
  },
  {
    value: "FRIDAY",
    label: "Friday",
  },
  {
    value: "SATURDAY",
    label: "Saturday",
  },
  {
    value: "SUNDAY",
    label: "Sunday",
  },
];

export default function OfficeOffManagement({
  currentUserId,
}: Props) {
  const [activeTab, setActiveTab] =
    useState<
      "calendar" | "weekly" | "shifts"
    >("calendar");

  const [officeOffs, setOfficeOffs] =
    useState<OfficeOff[]>([]);

  const [weeklyPolicies, setWeeklyPolicies] =
    useState<WeeklyPolicy[]>([]);

  const [shifts, setShifts] =
    useState<Shift[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [employees, setEmployees] =
    useState<Employee[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [policySubmitting, setPolicySubmitting] =
    useState(false);

  const [shiftSubmitting, setShiftSubmitting] =
    useState(false);

  /*
   * =====================================================
   * HOLIDAY FORM
   * =====================================================
   */

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [type, setType] =
    useState<OfficeOffType>("festival");

  const [description, setDescription] =
    useState("");

  const [holidayScope, setHolidayScope] =
    useState<OfficeOffScope>("all");

  const [selectedTeamIds, setSelectedTeamIds] =
    useState<string[]>([]);

  const [selectedShiftIds, setSelectedShiftIds] =
    useState<string[]>([]);

  const [selectedEmployeeIds, setSelectedEmployeeIds] =
    useState<string[]>([]);

  const [isPaid, setIsPaid] =
    useState(true);

  /*
   * =====================================================
   * COMPANY WEEKLY OFF
   * =====================================================
   */

  const [companyOffDays, setCompanyOffDays] =
    useState<WeekDay[]>([]);

  /*
   * =====================================================
   * TEAM / EMPLOYEE WEEKLY POLICY
   * =====================================================
   */

  const [policyName, setPolicyName] =
    useState("");

  const [policyScope, setPolicyScope] =
    useState<
      "company" | "team" | "employee"
    >("team");

  const [policyTeamId, setPolicyTeamId] =
    useState("");

  const [policyEmployeeId, setPolicyEmployeeId] =
    useState("");

  const [policyDays, setPolicyDays] =
    useState<WeekDay[]>([]);

  const [rotational, setRotational] =
    useState(false);

  const [rotationWeeks, setRotationWeeks] =
    useState<WeekDay[][]>([[]]);

  const [effectiveFrom, setEffectiveFrom] =
    useState(
      new Date()
        .toISOString()
        .split("T")[0]
    );

  /*
   * =====================================================
   * SHIFT FORM
   * =====================================================
   */

  const [shiftName, setShiftName] =
    useState("");

  const [shiftCode, setShiftCode] =
    useState("");

  const [shiftStart, setShiftStart] =
    useState("09:00");

  const [shiftEnd, setShiftEnd] =
    useState("18:00");

  const [crossesMidnight, setCrossesMidnight] =
    useState(false);

  const [graceMinutes, setGraceMinutes] =
    useState("15");

  /*
   * =====================================================
   * YEAR
   * =====================================================
   */

  const currentYear =
    new Date().getFullYear();



  const fetchOfficeData = async () => {
  setLoading(true);

  try {
    // =====================================================
    // OFFICE OFF + WEEKLY POLICIES
    // =====================================================

    const res = await fetch(
      `/api/office-off?year=${currentYear}`,
      {
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      throw new Error(
        data?.message ||
          "Failed to load office settings"
      );
    }

    setOfficeOffs(
      Array.isArray(data?.data)
        ? data.data
        : []
    );

    setWeeklyPolicies(
      Array.isArray(data?.weeklyPolicies)
        ? data.weeklyPolicies
        : []
    );

    // =====================================================
    // COMPANY WEEKLY POLICY
    // =====================================================

    const companyPolicy =
      Array.isArray(data?.weeklyPolicies)
        ? data.weeklyPolicies.find(
            (item: WeeklyPolicy) =>
              item.scope === "company"
          )
        : null;

    if (companyPolicy) {
      setCompanyOffDays(
        Array.isArray(companyPolicy.days)
          ? companyPolicy.days
          : []
      );
    } else if (
      data?.settings?.weekendOff === true
    ) {
      // Backward compatibility
      setCompanyOffDays([
        "SATURDAY",
        "SUNDAY",
      ]);
    } else {
      setCompanyOffDays([]);
    }

    // =====================================================
    // FETCH SHIFTS DIRECTLY
    // IMPORTANT FIX
    // =====================================================

    try {
      const shiftRes = await fetch(
        "/api/shifts",
        {
          cache: "no-store",
        }
      );

      const shiftData =
        await shiftRes.json();

      if (!shiftRes.ok) {
        throw new Error(
          shiftData?.message ||
            "Failed to load shifts"
        );
      }

      const shiftList =
        shiftData?.data ||
        shiftData?.shifts ||
        [];

      
    } catch (error) {
      console.error(
        "FETCH SHIFTS ERROR:",
        error
      );

      // Do not break the entire page
      setShifts([]);
    }

    // =====================================================
    // FETCH TEAMS
    // =====================================================

    try {
      const teamRes = await fetch(
        "/api/teams",
        {
          cache: "no-store",
        }
      );

      if (teamRes.ok) {
        const teamData =
          await teamRes.json();

        const teamList =
          teamData?.data ||
          teamData?.teams ||
          [];

        setTeams(
          Array.isArray(teamList)
            ? teamList
            : []
        );
      } else {
        setTeams([]);
      }
    } catch (error) {
      console.error(
        "FETCH TEAMS ERROR:",
        error
      );

      setTeams([]);
    }

    // =====================================================
    // FETCH EMPLOYEES
    // =====================================================

    try {
      const employeeRes =
        await fetch(
          "/api/auth/users",
          {
            cache: "no-store",
          }
        );

      if (employeeRes.ok) {
        const employeeData =
          await employeeRes.json();

        const employeeList =
          employeeData?.data ||
          employeeData?.users ||
          employeeData?.employees ||
          [];

        setEmployees(
          Array.isArray(employeeList)
            ? employeeList
            : []
        );
      } else {
        setEmployees([]);
      }
    } catch (error) {
      console.error(
        "FETCH EMPLOYEES ERROR:",
        error
      );

      setEmployees([]);
    }
  } catch (error) {
    console.error(
      "FETCH OFFICE DATA ERROR:",
      error
    );

    alert(
      error instanceof Error
        ? error.message
        : "Failed to load office settings"
    );
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    fetchOfficeData();
  }, []);

  /*
   * =====================================================
   * CALCULATE SELECTED DAYS
   * =====================================================
   */

  const selectedDays =
    useMemo(() => {
      if (
        !startDate ||
        !endDate
      ) {
        return 0;
      }

      const start =
        new Date(
          `${startDate}T00:00:00`
        );

      const end =
        new Date(
          `${endDate}T00:00:00`
        );

      if (start > end) {
        return 0;
      }

      return (
        Math.floor(
          (end.getTime() -
            start.getTime()) /
            (1000 *
              60 *
              60 *
              24)
        ) + 1
      );
    }, [
      startDate,
      endDate,
    ]);

  /*
   * =====================================================
   * TOGGLE ARRAY VALUE
   * =====================================================
   */

  const toggleArrayValue = <T,>(
    value: T,
    current: T[],
    setter: (
      value: T[]
    ) => void
  ) => {
    if (
      current.includes(value)
    ) {
      setter(
        current.filter(
          (item) =>
            item !== value
        )
      );
    } else {
      setter([
        ...current,
        value,
      ]);
    }
  };

  /*
   * =====================================================
   * CREATE HOLIDAY
   * =====================================================
   */

  const handleSubmit =
    async (
      e: React.FormEvent<HTMLFormElement>
    ) => {
      e.preventDefault();

      if (
        !startDate ||
        !endDate ||
        !title.trim()
      ) {
        alert(
          "Start date, end date and title are required"
        );

        return;
      }

      if (
        startDate > endDate
      ) {
        alert(
          "Start date cannot be after end date"
        );

        return;
      }

      if (
        holidayScope ===
          "team" &&
        selectedTeamIds.length === 0
      ) {
        alert(
          "Please select at least one team"
        );

        return;
      }

      if (
        holidayScope ===
          "shift" &&
        selectedShiftIds.length === 0
      ) {
        alert(
          "Please select at least one shift"
        );

        return;
      }

      if (
        holidayScope ===
          "employee" &&
        selectedEmployeeIds.length === 0
      ) {
        alert(
          "Please select at least one employee"
        );

        return;
      }

      setSubmitting(true);

      try {
        const res =
          await fetch(
            "/api/office-off",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                startDate,

                endDate,

                title:
                  title.trim(),

                type,

                description:
                  description.trim() ||
                  null,

                scope:
                  holidayScope,

                teamIds:
                  selectedTeamIds,

                shiftIds:
                  selectedShiftIds,

                employeeIds:
                  selectedEmployeeIds,

                isPaid,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          alert(
            data?.message ||
              "Failed to create office off"
          );

          return;
        }

        alert(
          data?.message ||
            "Office off created successfully"
        );

        setStartDate("");
        setEndDate("");
        setTitle("");
        setType("festival");
        setDescription("");
        setHolidayScope("all");
        setSelectedTeamIds([]);
        setSelectedShiftIds([]);
        setSelectedEmployeeIds([]);
        setIsPaid(true);

        await fetchOfficeData();
      } catch (error) {
        console.error(
          "CREATE OFFICE OFF ERROR:",
          error
        );

        alert(
          "Something went wrong"
        );
      } finally {
        setSubmitting(false);
      }
    };

  /*
   * =====================================================
   * DELETE HOLIDAY
   * =====================================================
   */

  const handleDelete =
    async (
      id: string
    ) => {
      const confirmed =
        window.confirm(
          "Are you sure you want to delete this office off?"
        );

      if (!confirmed) {
        return;
      }

      try {
        const res =
          await fetch(
            `/api/office-off/${id}`,
            {
              method: "DELETE",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          alert(
            data?.message ||
              "Failed to delete office off"
          );

          return;
        }

        alert(
          "Office off deleted successfully"
        );

        await fetchOfficeData();
      } catch (error) {
        console.error(
          "DELETE OFFICE OFF ERROR:",
          error
        );

        alert(
          "Something went wrong"
        );
      }
    };

  const handleDeletePolicy = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this weekly off policy?")) return;
    try {
      const res = await fetch(`/api/weekly-off?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to delete policy");
      alert("Weekly off policy deleted successfully");
      await fetchOfficeData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete policy");
    }
  };

  const handleDeleteShift = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    try {
      const res = await fetch(`/api/shifts?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Failed to delete shift");
      alert("Shift deleted successfully");
      await fetchOfficeData();
    } catch (err: any) {
      alert(err?.message || "Failed to delete shift");
    }
  };

  /*
   * =====================================================
   * SAVE COMPANY WEEKLY OFF
   * =====================================================
   */

  const saveCompanyWeeklyOff =
    async () => {
      setPolicySubmitting(true);

      try {
        const res =
          await fetch(
            "/api/office-off",
            {
              method: "PUT",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                action:
                  "weekly-policy",

                name:
                  "Company Default",

                scope:
                  "company",

                days:
                  companyOffDays,

                rotational: false,

                rotationWeeks: [],

                effectiveFrom:
                  `${currentYear}-01-01`,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to save company weekly off"
          );
        }

        alert(
          "Company weekly off saved successfully"
        );

        await fetchOfficeData();
      } catch (error) {
        console.error(
          "COMPANY WEEKLY OFF ERROR:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to save weekly off"
        );
      } finally {
        setPolicySubmitting(false);
      }
    };

  /*
   * =====================================================
   * CREATE TEAM / EMPLOYEE POLICY
   * =====================================================
   */

  const saveWeeklyPolicy =
    async () => {
      if (
        !policyName.trim()
      ) {
        alert(
          "Policy name is required"
        );

        return;
      }

      if (
        !rotational &&
        policyDays.length === 0
      ) {
        alert(
          "Select at least one weekly off day"
        );

        return;
      }

      if (
        policyScope ===
          "team" &&
        !policyTeamId
      ) {
        alert(
          "Please select a team"
        );

        return;
      }

      if (
        policyScope ===
          "employee" &&
        !policyEmployeeId
      ) {
        alert(
          "Please select an employee"
        );

        return;
      }

      setPolicySubmitting(true);

      try {
        const res =
          await fetch(
            "/api/weekly-off",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name:
                  policyName.trim(),

                scope:
                  policyScope,

                teamId:
                  policyScope ===
                  "team"
                    ? policyTeamId
                    : null,

                employeeId:
                  policyScope ===
                  "employee"
                    ? policyEmployeeId
                    : null,

                days:
                  policyDays,

                rotational,

                rotationWeeks:
                  rotational
                    ? rotationWeeks
                    : [],

                effectiveFrom:
                  effectiveFrom,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to create weekly policy"
          );
        }

        alert(
          "Weekly off policy created successfully"
        );

        setPolicyName("");
        setPolicyScope("team");
        setPolicyTeamId("");
        setPolicyEmployeeId("");
        setPolicyDays([]);
        setRotational(false);
        setRotationWeeks([[]]);

        await fetchOfficeData();
      } catch (error) {
        console.error(
          "CREATE WEEKLY POLICY ERROR:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to create policy"
        );
      } finally {
        setPolicySubmitting(false);
      }
    };

  /*
   * =====================================================
   * CREATE SHIFT
   * =====================================================
   */

  const saveShift =
    async () => {
      if (
        !shiftName.trim() ||
        !shiftCode.trim()
      ) {
        alert(
          "Shift name and code are required"
        );

        return;
      }

      setShiftSubmitting(true);

      try {
        const res =
          await fetch(
            "/api/shifts",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              body: JSON.stringify({
                name:
                  shiftName.trim(),

                code:
                  shiftCode
                    .trim()
                    .toUpperCase(),

                startTime:
                  shiftStart,

                endTime:
                  shiftEnd,

                crossesMidnight,

                graceMinutes:
                  Number(
                    graceMinutes
                  ) || 0,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to create shift"
          );
        }

        alert(
          "Shift created successfully"
        );

        setShiftName("");
        setShiftCode("");
        setShiftStart("09:00");
        setShiftEnd("18:00");
        setCrossesMidnight(false);
        setGraceMinutes("15");

        await fetchOfficeData();
      } catch (error) {
        console.error(
          "CREATE SHIFT ERROR:",
          error
        );

        alert(
          error instanceof Error
            ? error.message
            : "Failed to create shift"
        );
      } finally {
        setShiftSubmitting(false);
      }
    };

  /*
   * =====================================================
   * FORMAT SCOPE
   * =====================================================
   */

  const getScopeLabel = (
    scope?: OfficeOffScope
  ) => {
    switch (scope) {
      case "team":
        return "Team";

      case "shift":
        return "Shift";

      case "employee":
        return "Employee";

      default:
        return "Everyone";
    }
  };

  const getTypeClass = (
    itemType: OfficeOffType
  ) => {
    if (
      itemType ===
      "festival"
    ) {
      return "bg-purple-100 text-purple-700";
    }

    if (
      itemType ===
      "special"
    ) {
      return "bg-orange-100 text-orange-700";
    }

    return "bg-blue-100 text-blue-700";
  };

  /*
   * =====================================================
   * RENDER
   * =====================================================
   */

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* =================================================
            HEADER
        ================================================= */}

        <div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            <div>
              <div className="flex items-center gap-3">

                <h4 className="text-2xl md:text-3xl font-bold text-gray-900">
                  Office Calendar
                </h4>

                <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
                  ADMIN
                </span>

              </div>

              <p className="text-gray-500 mt-1">
                Manage holidays, weekly offs,
                shifts and employee schedules.
              </p>
            </div>

            <button
              type="button"
              onClick={
                fetchOfficeData
              }
              disabled={loading}
              className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 shadow-sm disabled:opacity-50"
            >
              {loading
                ? "Refreshing..."
                : "↻ Refresh"}
            </button>

          </div>
        </div>

        {/* =================================================
            TABS
        ================================================= */}

        <div className="bg-white border rounded-2xl shadow-sm p-2">

          <div className="flex flex-wrap gap-2">

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "calendar"
                )
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab ===
                "calendar"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Holidays
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "weekly"
                )
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab ===
                "weekly"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Weekly Off
            </button>

            <button
              type="button"
              onClick={() =>
                setActiveTab(
                  "shifts"
                )
              }
              className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
                activeTab ===
                "shifts"
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Shifts
            </button>

          </div>

        </div>

        {/* =================================================
            HOLIDAY TAB
        ================================================= */}

        {activeTab ===
          "calendar" && (
          <>
            {/* CREATE HOLIDAY */}

            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-6">

              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Create Holiday / Office Off
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Create company, team, shift or
                  employee-specific holidays.
                </p>
              </div>

              <form
                onSubmit={
                  handleSubmit
                }
                className="space-y-6"
              >

                {/* DATE + BASIC */}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Start Date *
                    </label>

                    <input
                      type="date"
                      value={
                        startDate
                      }
                      onChange={(e) =>
                        setStartDate(
                          e.target
                            .value
                        )
                      }
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      End Date *
                    </label>

                    <input
                      type="date"
                      value={
                        endDate
                      }
                      min={
                        startDate ||
                        undefined
                      }
                      onChange={(e) =>
                        setEndDate(
                          e.target
                            .value
                        )
                      }
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Holiday Name *
                    </label>

                    <input
                      type="text"
                      value={
                        title
                      }
                      onChange={(e) =>
                        setTitle(
                          e.target
                            .value
                        )
                      }
                      placeholder="e.g. Diwali"
                      required
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Type
                    </label>

                    <select
                      value={
                        type
                      }
                      onChange={(e) =>
                        setType(
                          e.target
                            .value as OfficeOffType
                        )
                      }
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="festival">
                        Festival
                      </option>

                      <option value="holiday">
                        Holiday
                      </option>

                      <option value="special">
                        Special
                      </option>
                    </select>
                  </div>

                </div>

                {/* SCOPE */}

                <div>
                  <label className="block text-sm font-semibold text-gray-800 mb-3">
                    Apply Holiday To
                  </label>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

                    {[
                      {
                        value:
                          "all",
                        title:
                          "Everyone",
                        desc:
                          "Entire office",
                      },
                      {
                        value:
                          "team",
                        title:
                          "Team",
                        desc:
                          "Selected teams",
                      },
                      {
                        value:
                          "shift",
                        title:
                          "Shift",
                        desc:
                          "Day / Night",
                      },
                      {
                        value:
                          "employee",
                        title:
                          "Employee",
                        desc:
                          "Specific employees",
                      },
                    ].map(
                      (item) => (
                        <button
                          key={
                            item.value
                          }
                          type="button"
                          onClick={() =>
                            setHolidayScope(
                              item.value as OfficeOffScope
                            )
                          }
                          className={`text-left rounded-xl border p-4 transition ${
                            holidayScope ===
                            item.value
                              ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                              : "border-gray-200 hover:border-gray-300"
                          }`}
                        >

                          <div className="font-semibold text-gray-800">
                            {
                              item.title
                            }
                          </div>

                          <div className="text-xs text-gray-500 mt-1">
                            {
                              item.desc
                            }
                          </div>

                        </button>
                      )
                    )}

                  </div>
                </div>

                {/* TEAM SELECTION */}

                {holidayScope ===
                  "team" && (
                  <div className="border rounded-xl p-4 bg-gray-50">

                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Select Teams
                    </label>

                    {teams.length ===
                    0 ? (
                      <div className="text-sm text-gray-500">
                        No teams loaded. Check
                        your team API endpoint.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">

                        {teams.map(
                          (
                            team
                          ) => (
                            <label
                              key={
                                team._id
                              }
                              className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 cursor-pointer hover:bg-gray-50"
                            >

                              <input
                                type="checkbox"
                                checked={selectedTeamIds.includes(
                                  team._id
                                )}
                                onChange={() =>
                                  toggleArrayValue(
                                    team._id,
                                    selectedTeamIds,
                                    setSelectedTeamIds
                                  )
                                }
                                className="w-4 h-4 accent-blue-600"
                              />

                              <span className="text-sm font-medium text-gray-700">
                                {
                                  team.name
                                }
                              </span>

                            </label>
                          )
                        )}

                      </div>
                    )}

                  </div>
                )}

                {/* SHIFT SELECTION */}
{/* 
                {holidayScope ===
                  "shift" && (
                  <div className="border rounded-xl p-4 bg-gray-50">

                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Select Shifts
                    </label>

                    {shifts.length ===
                    0 ? (
                      <div className="text-sm text-gray-500">
                        No shifts created yet.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">

                        {shifts.map(
                          (
                            shift
                          ) => (
                            <label
                              key={
                                shift._id
                              }
                              className="flex items-start gap-3 bg-white border rounded-xl p-4 cursor-pointer hover:bg-gray-50"
                            >

                              <input
                                type="checkbox"
                                checked={selectedShiftIds.includes(
                                  shift._id
                                )}
                                onChange={() =>
                                  toggleArrayValue(
                                    shift._id,
                                    selectedShiftIds,
                                    setSelectedShiftIds
                                  )
                                }
                                className="w-4 h-4 mt-1 accent-blue-600"
                              />

                              <div>

                                <div className="font-semibold text-gray-800">
                                  {
                                    shift.name
                                  }
                                  <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                    {
                                      shift.code
                                    }
                                  </span>
                                </div>

                                <div className="text-xs text-gray-500 mt-1">
                                  {
                                    shift.startTime
                                  }{" "}
                                  →{" "}
                                  {
                                    shift.endTime
                                  }

                                  {shift.crossesMidnight &&
                                    " · Overnight"}
                                </div>

                              </div>

                            </label>
                          )
                        )}

                      </div>
                    )}

                  </div>
                )} */}

                {/* SHIFT SELECTION */}

{holidayScope === "shift" && (
  <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50">
    <div className="flex items-center justify-between gap-3 mb-4">
      <div>
        <label className="block text-sm font-semibold text-gray-900">
          Select Shifts
        </label>

        <p className="text-xs text-gray-500 mt-1">
          Select which shifts should have this office off.
        </p>
      </div>

      {shifts.length > 0 && (
        <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
          {selectedShiftIds.length} selected
        </span>
      )}
    </div>

    {shifts.length === 0 ? (
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-6 text-center">
        <div className="text-2xl mb-2">
          🕐
        </div>

        <div className="text-sm font-semibold text-gray-800">
          No active shifts available
        </div>

        <p className="text-xs text-gray-500 mt-1">
          Create a shift from the{" "}
          <strong>Shifts</strong> tab first.
        </p>

        <button
          type="button"
          onClick={() =>
            setActiveTab("shifts")
          }
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition"
        >
          Create Shift
        </button>
      </div>
    ) : (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shifts.map((shift) => {
          const selected =
            selectedShiftIds.includes(
              shift._id
            );

          return (
            <label
              key={shift._id}
              className={`flex items-start gap-3 rounded-xl p-4 cursor-pointer transition border ${
                selected
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                  : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() =>
                  toggleArrayValue(
                    shift._id,
                    selectedShiftIds,
                    setSelectedShiftIds
                  )
                }
                className="w-4 h-4 mt-1 accent-blue-600"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-gray-900">
                    {shift.name}
                  </span>

                  <span className="text-[11px] font-semibold bg-gray-100 text-gray-600 px-2 py-1 rounded-md">
                    {shift.code}
                  </span>

                  {shift.crossesMidnight && (
                    <span className="text-[11px] font-semibold bg-purple-100 text-purple-700 px-2 py-1 rounded-md">
                      Overnight
                    </span>
                  )}
                </div>

                <div className="text-xs text-gray-500 mt-1">
                  {shift.startTime} →{" "}
                  {shift.endTime}
                </div>

                <div className="text-xs text-gray-400 mt-1">
                  Grace: {shift.graceMinutes} min
                </div>
              </div>
            </label>
          );
        })}
      </div>
    )}
  </div>
)}

                {/* EMPLOYEE SELECTION */}

                {holidayScope ===
                  "employee" && (
                  <div className="border rounded-xl p-4 bg-gray-50">

                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                      Select Employees
                    </label>

                    {employees.length ===
                    0 ? (
                      <div className="text-sm text-gray-500">
                        No employees loaded. Check
                        your employee API endpoint.
                      </div>
                    ) : (
                      <div className="max-h-56 overflow-y-auto space-y-2">

                        {employees.map(
                          (
                            employee
                          ) => (
                            <label
                              key={
                                employee._id
                              }
                              className="flex items-center gap-3 bg-white border rounded-lg px-3 py-2.5 cursor-pointer"
                            >

                              <input
                                type="checkbox"
                                checked={selectedEmployeeIds.includes(
                                  employee._id
                                )}
                                onChange={() =>
                                  toggleArrayValue(
                                    employee._id,
                                    selectedEmployeeIds,
                                    setSelectedEmployeeIds
                                  )
                                }
                                className="w-4 h-4 accent-blue-600"
                              />

                              <div>
                                <div className="text-sm font-medium text-gray-800">
                                  {
                                    employee.name ||
                                    "Unnamed Employee"
                                  }
                                </div>

                                {employee.email && (
                                  <div className="text-xs text-gray-500">
                                    {
                                      employee.email
                                    }
                                  </div>
                                )}
                              </div>

                            </label>
                          )
                        )}

                      </div>
                    )}

                  </div>
                )}

                {/* PAID + DESCRIPTION */}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                  <label className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer bg-white">
                    <input
                      type="checkbox"
                      checked={
                        isPaid
                      }
                      onChange={(e) =>
                        setIsPaid(
                          e.target
                            .checked
                        )
                      }
                      className="w-5 h-5 accent-blue-600"
                    />

                    <div>
                      <div className="text-sm font-semibold text-gray-800">
                        Paid Holiday
                      </div>

                      <div className="text-xs text-gray-500">
                        Count as paid office off
                      </div>
                    </div>
                  </label>

                  <div className="lg:col-span-2">

                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Description
                    </label>

                    <input
                      type="text"
                      value={
                        description
                      }
                      onChange={(e) =>
                        setDescription(
                          e.target
                            .value
                        )
                      }
                      placeholder="Optional description..."
                      className="w-full border border-gray-300 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500"
                    />

                  </div>

                </div>

                {/* PREVIEW */}

                {selectedDays >
                  0 && (
                  <div className="rounded-xl bg-blue-50 border border-blue-200 p-4">

                    <div className="flex flex-wrap items-center gap-2 text-sm text-blue-800">

                      <span className="font-semibold">
                        Preview:
                      </span>

                      <span>
                        {
                          selectedDays
                        }{" "}
                        day
                        {selectedDays !==
                        1
                          ? "s"
                          : ""}
                      </span>

                      <span>·</span>

                      <span>
                        {
                          getScopeLabel(
                            holidayScope
                          )
                        }
                      </span>

                      <span>·</span>

                      <span>
                        {isPaid
                          ? "Paid"
                          : "Unpaid"}
                      </span>

                    </div>

                  </div>
                )}

                <div className="flex justify-end">

                  <button
                    type="submit"
                    disabled={
                      submitting
                    }
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50"
                  >
                    {submitting
                      ? "Creating..."
                      : "Create Office Off"}
                  </button>

                </div>

              </form>

            </div>

            {/* HOLIDAY LIST */}

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

              <div className="px-5 md:px-6 py-4 border-b flex flex-col md:flex-row md:items-center md:justify-between gap-3">

                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Office Off Calendar{" "}
                    {currentYear}
                  </h2>

                  <p className="text-sm text-gray-500 mt-1">
                    Company and targeted holidays.
                  </p>
                </div>

                <span className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold">
                  {
                    officeOffs.length
                  }{" "}
                  Records
                </span>

              </div>

              <div className="overflow-x-auto">

                <table className="min-w-full divide-y divide-gray-200">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Date
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Holiday
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Type
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Applies To
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Paid
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {loading ? (
                      <tr>
                        <td
                          colSpan={
                            6
                          }
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          Loading...
                        </td>
                      </tr>
                    ) : officeOffs.length ===
                      0 ? (
                      <tr>
                        <td
                          colSpan={
                            6
                          }
                          className="px-6 py-12 text-center text-gray-500"
                        >
                          No office offs created
                          for{" "}
                          {
                            currentYear
                          }.
                        </td>
                      </tr>
                    ) : (
                      officeOffs.map(
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item._id
                            }
                            className="hover:bg-gray-50"
                          >

                            <td className="px-5 py-4 whitespace-nowrap">

                              <div className="text-sm font-semibold text-gray-800">
                                {format(
                                  new Date(
                                    item.date
                                  ),
                                  "dd MMM yyyy"
                                )}
                              </div>

                              <div className="text-xs text-gray-500">
                                {format(
                                  new Date(
                                    item.date
                                  ),
                                  "EEEE"
                                )}
                              </div>

                            </td>

                            <td className="px-5 py-4">

                              <div className="text-sm font-semibold text-gray-800">
                                {
                                  item.title
                                }
                              </div>

                              {item.description && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {
                                    item.description
                                  }
                                </div>
                              )}

                            </td>

                            <td className="px-5 py-4">

                              <span
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeClass(
                                  item.type
                                )}`}
                              >
                                {
                                  item.type
                                }
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold">
                                {
                                  getScopeLabel(
                                    item.scope
                                  )
                                }
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              {item.isPaid !==
                              false ? (
                                <span className="text-green-600 text-xs font-semibold">
                                  Paid
                                </span>
                              ) : (
                                <span className="text-gray-500 text-xs font-semibold">
                                  Unpaid
                                </span>
                              )}

                            </td>

                            <td className="px-5 py-4 text-right">

                              <button
                                type="button"
                                onClick={() =>
                                  handleDelete(
                                    item._id
                                  )
                                }
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-semibold rounded-lg"
                              >
                                Delete
                              </button>

                            </td>

                          </tr>
                        )
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>
          </>
        )}

        {/* =================================================
            WEEKLY OFF TAB
        ================================================= */}

        {activeTab ===
          "weekly" && (
          <div className="space-y-6">

            {/* COMPANY WEEKLY OFF */}

            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-6">

              <div className="mb-5">
                <h2 className="text-lg font-bold text-gray-900">
                  Company Default Weekly Off
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Employees without a team or
                  employee-specific rule will use this.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">

                {WEEK_DAYS.map(
                  (day) => (
                    <button
                      key={
                        day.value
                      }
                      type="button"
                      onClick={() =>
                        toggleArrayValue(
                          day.value,
                          companyOffDays,
                          setCompanyOffDays
                        )
                      }
                      className={`p-3 rounded-xl border text-sm font-semibold transition ${
                        companyOffDays.includes(
                          day.value
                        )
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {
                        day.label
                      }
                    </button>
                  )
                )}

              </div>

              <div className="mt-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

                <div className="text-sm text-gray-500">
                  Selected:{" "}
                  <span className="font-semibold text-gray-800">
                    {
                      companyOffDays.length
                    }{" "}
                    day
                    {companyOffDays.length !==
                    1
                      ? "s"
                      : ""}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={
                    saveCompanyWeeklyOff
                  }
                  disabled={
                    policySubmitting
                  }
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {policySubmitting
                    ? "Saving..."
                    : "Save Company Rule"}
                </button>

              </div>

            </div>

            {/* CREATE TEAM / EMPLOYEE RULE */}

            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-6">

              <div className="mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Create Weekly Off Rule
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Team and employee rules override
                  the company default.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Policy Name
                  </label>

                  <input
                    type="text"
                    value={
                      policyName
                    }
                    onChange={(e) =>
                      setPolicyName(
                        e.target
                          .value
                      )
                    }
                    placeholder="e.g. Night Support Off"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Applies To
                  </label>

                  <select
                    value={
                      policyScope
                    }
                    onChange={(e) =>
                      setPolicyScope(
                        e.target
                          .value as
                          | "company"
                          | "team"
                          | "employee"
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  >
                    <option value="team">
                      Team
                    </option>

                    <option value="employee">
                      Employee
                    </option>

                    <option value="company">
                      Company
                    </option>
                  </select>
                </div>

              </div>

              {policyScope ===
                "team" && (
                <div className="mt-4">

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Team
                  </label>

                  <select
                    value={
                      policyTeamId
                    }
                    onChange={(e) =>
                      setPolicyTeamId(
                        e.target
                          .value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  >

                    <option value="">
                      Select Team
                    </option>

                    {teams.map(
                      (team) => (
                        <option
                          key={
                            team._id
                          }
                          value={
                            team._id
                          }
                        >
                          {
                            team.name
                          }
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

              {policyScope ===
                "employee" && (
                <div className="mt-4">

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Employee
                  </label>

                  <select
                    value={
                      policyEmployeeId
                    }
                    onChange={(e) =>
                      setPolicyEmployeeId(
                        e.target
                          .value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  >

                    <option value="">
                      Select Employee
                    </option>

                    {employees.map(
                      (
                        employee
                      ) => (
                        <option
                          key={
                            employee._id
                          }
                          value={
                            employee._id
                          }
                        >
                          {
                            employee.name
                          }{" "}
                          {employee.email
                            ? `(${employee.email})`
                            : ""}
                        </option>
                      )
                    )}

                  </select>

                </div>
              )}

              {/* DAYS */}

              <div className="mt-5">

                <label className="block text-sm font-semibold text-gray-800 mb-3">
                  Weekly Off Days
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">

                  {WEEK_DAYS.map(
                    (day) => (
                      <button
                        key={
                          day.value
                        }
                        type="button"
                        disabled={
                          rotational
                        }
                        onClick={() =>
                          toggleArrayValue(
                            day.value,
                            policyDays,
                            setPolicyDays
                          )
                        }
                        className={`p-3 rounded-xl border text-sm font-semibold ${
                          policyDays.includes(
                            day.value
                          ) &&
                          !rotational
                            ? "bg-blue-600 border-blue-600 text-white"
                            : "border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                        }`}
                      >
                        {
                          day.label
                        }
                      </button>
                    )
                  )}

                </div>

              </div>

              {/* ROTATIONAL */}

              <div className="mt-5 border rounded-xl p-4">

                <label className="flex items-start gap-3 cursor-pointer">

                  <input
                    type="checkbox"
                    checked={
                      rotational
                    }
                    onChange={(e) =>
                      setRotational(
                        e.target
                          .checked
                      )
                    }
                    className="w-5 h-5 mt-0.5 accent-blue-600"
                  />

                  <div>
                    <div className="font-semibold text-gray-800">
                      Rotational Weekly Off
                    </div>

                    <div className="text-xs text-gray-500 mt-1">
                      Use different weekly offs
                      for different weeks.
                    </div>
                  </div>

                </label>

                {rotational && (
                  <div className="mt-4 space-y-3">

                    {rotationWeeks.map(
                      (
                        week,
                        weekIndex
                      ) => (
                        <div
                          key={
                            weekIndex
                          }
                          className="border rounded-xl p-3"
                        >

                          <div className="flex items-center justify-between mb-3">

                            <span className="text-sm font-semibold text-gray-800">
                              Week{" "}
                              {weekIndex +
                                1}
                            </span>

                            {rotationWeeks.length >
                              1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setRotationWeeks(
                                    rotationWeeks.filter(
                                      (
                                        _,
                                        index
                                      ) =>
                                        index !==
                                        weekIndex
                                    )
                                  )
                                }
                                className="text-xs text-red-600"
                              >
                                Remove
                              </button>
                            )}

                          </div>

                          <div className="flex flex-wrap gap-2">

                            {WEEK_DAYS.map(
                              (
                                day
                              ) => (
                                <button
                                  key={
                                    day.value
                                  }
                                  type="button"
                                  onClick={() => {
                                    const copy =
                                      rotationWeeks.map(
                                        (
                                          item
                                        ) =>
                                          [
                                            ...item,
                                          ]
                                      );

                                    if (
                                      copy[
                                        weekIndex
                                      ].includes(
                                        day.value
                                      )
                                    ) {
                                      copy[
                                        weekIndex
                                      ] =
                                        copy[
                                          weekIndex
                                        ].filter(
                                          (
                                            item
                                          ) =>
                                            item !==
                                            day.value
                                        );
                                    } else {
                                      copy[
                                        weekIndex
                                      ].push(
                                        day.value
                                      );
                                    }

                                    setRotationWeeks(
                                      copy
                                    );
                                  }}
                                  className={`px-3 py-2 rounded-lg border text-xs font-semibold ${
                                    week.includes(
                                      day.value
                                    )
                                      ? "bg-blue-600 text-white border-blue-600"
                                      : "border-gray-200 text-gray-600"
                                  }`}
                                >
                                  {
                                    day.label
                                  }
                                </button>
                              )
                            )}

                          </div>

                        </div>
                      )
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        setRotationWeeks([
                          ...rotationWeeks,
                          [],
                        ])
                      }
                      className="px-4 py-2 border rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      + Add Rotation Week
                    </button>

                  </div>
                )}

              </div>

              {/* EFFECTIVE DATE */}

              <div className="mt-5">

                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Effective From
                </label>

                <input
                  type="date"
                  value={
                    effectiveFrom
                  }
                  onChange={(e) =>
                    setEffectiveFrom(
                      e.target
                        .value
                    )
                  }
                  className="border border-gray-300 rounded-xl px-3 py-2.5"
                />

              </div>

              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={
                    saveWeeklyPolicy
                  }
                  disabled={
                    policySubmitting
                  }
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {policySubmitting
                    ? "Saving..."
                    : "Create Weekly Rule"}
                </button>

              </div>

            </div>

            {/* EXISTING POLICIES */}

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

              <div className="px-5 md:px-6 py-4 border-b">

                <h2 className="text-lg font-bold text-gray-900">
                  Active Weekly Off Policies
                </h2>

              </div>

              <div className="overflow-x-auto">

                <table className="min-w-full divide-y divide-gray-200">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Policy
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Scope
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Days
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Type
                      </th>

                      <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                        Effective
                      </th>

                      <th className="px-5 py-3 text-right text-xs font-semibold text-gray-600 uppercase">
                        Action
                      </th>

                    </tr>

                  </thead>

                  <tbody className="divide-y divide-gray-200">

                    {weeklyPolicies.length ===
                    0 ? (
                      <tr>
                        <td
                          colSpan={
                            6
                          }
                          className="px-5 py-10 text-center text-gray-500"
                        >
                          No weekly off policies
                          configured.
                        </td>
                      </tr>
                    ) : (
                      weeklyPolicies.map(
                        (
                          policy
                        ) => (
                          <tr
                            key={
                              policy._id
                            }
                            className="hover:bg-gray-50"
                          >

                            <td className="px-5 py-4 text-sm font-semibold text-gray-800">
                              {
                                policy.name
                              }
                            </td>

                            <td className="px-5 py-4">

                              <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                                {
                                  policy.scope
                                }
                              </span>

                            </td>

                            <td className="px-5 py-4">

                              <div className="flex flex-wrap gap-1">

                                {policy.days?.map(
                                  (
                                    day
                                  ) => (
                                    <span
                                      key={
                                        day
                                      }
                                      className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600"
                                    >
                                      {
                                        day
                                      }
                                    </span>
                                  )
                                )}

                                {policy.rotational && (
                                  <span className="px-2 py-1 bg-purple-100 rounded text-xs text-purple-700">
                                    Rotational
                                  </span>
                                )}

                              </div>

                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {policy.rotational
                                ? "Rotational"
                                : "Fixed"}
                            </td>

                            <td className="px-5 py-4 text-sm text-gray-600">
                              {policy.effectiveFrom
                                ? format(
                                    new Date(
                                      policy.effectiveFrom
                                    ),
                                    "dd MMM yyyy"
                                  )
                                : "—"}
                            </td>

                            <td className="px-5 py-4 text-right">
                              <button
                                type="button"
                                onClick={() =>
                                  handleDeletePolicy(
                                    policy._id
                                  )
                                }
                                className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition"
                              >
                                Delete
                              </button>
                            </td>

                          </tr>
                        )
                      )
                    )}

                  </tbody>

                </table>

              </div>

            </div>

          </div>
        )}

        {/* =================================================
            SHIFT TAB
        ================================================= */}

        {activeTab ===
          "shifts" && (
          <div className="space-y-6">

            {/* CREATE SHIFT */}

            <div className="bg-white rounded-2xl border shadow-sm p-5 md:p-6">

              <div className="mb-6">

                <h2 className="text-lg font-bold text-gray-900">
                  Shift Management
                </h2>

                <p className="text-sm text-gray-500 mt-1">
                  Create day and night shifts. Night
                  shifts can cross midnight.
                </p>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Shift Name
                  </label>

                  <input
                    type="text"
                    value={
                      shiftName
                    }
                    onChange={(e) =>
                      setShiftName(
                        e.target
                          .value
                      )
                    }
                    placeholder="Night Shift"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Shift Code
                  </label>

                  <input
                    type="text"
                    value={
                      shiftCode
                    }
                    onChange={(e) =>
                      setShiftCode(
                        e.target
                          .value
                          .toUpperCase()
                      )
                    }
                    placeholder="NIGHT"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Time
                  </label>

                  <input
                    type="time"
                    value={
                      shiftStart
                    }
                    onChange={(e) =>
                      setShiftStart(
                        e.target
                          .value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Time
                  </label>

                  <input
                    type="time"
                    value={
                      shiftEnd
                    }
                    onChange={(e) =>
                      setShiftEnd(
                        e.target
                          .value
                      )
                    }
                    className="w-full border border-gray-300 rounded-xl px-3 py-2.5"
                  />
                </div>

              </div>

              <div className="mt-5 flex flex-col md:flex-row gap-4">

                <label className="flex items-center gap-3 border rounded-xl px-4 py-3 cursor-pointer">

                  <input
                    type="checkbox"
                    checked={
                      crossesMidnight
                    }
                    onChange={(e) =>
                      setCrossesMidnight(
                        e.target
                          .checked
                      )
                    }
                    className="w-5 h-5 accent-blue-600"
                  />

                  <div>
                    <div className="text-sm font-semibold text-gray-800">
                      Overnight Shift
                    </div>

                    <div className="text-xs text-gray-500">
                      Example: 22:00 → 06:00
                    </div>
                  </div>

                </label>

                <div>

                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Grace Minutes
                  </label>

                  <input
                    type="number"
                    min="0"
                    value={
                      graceMinutes
                    }
                    onChange={(e) =>
                      setGraceMinutes(
                        e.target
                          .value
                      )
                    }
                    className="w-32 border border-gray-300 rounded-xl px-3 py-2.5"
                  />

                </div>

              </div>

              <div className="mt-6 flex justify-end">

                <button
                  type="button"
                  onClick={
                    saveShift
                  }
                  disabled={
                    shiftSubmitting
                  }
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold disabled:opacity-50"
                >
                  {shiftSubmitting
                    ? "Creating..."
                    : "Create Shift"}
                </button>

              </div>

            </div>

            {/* SHIFT LIST */}

            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

              <div className="px-5 md:px-6 py-4 border-b">

                <h2 className="text-lg font-bold text-gray-900">
                  Active Shifts
                </h2>

              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5 md:p-6">

                {shifts.length ===
                0 ? (
                  <div className="col-span-full text-center py-10 text-gray-500">
                    No shifts configured.
                  </div>
                ) : (
                  shifts.map(
                    (
                      shift
                    ) => (
                      <div
                        key={
                          shift._id
                        }
                        className="border rounded-2xl p-5 hover:shadow-sm transition"
                      >

                        <div className="flex items-start justify-between gap-3">

                          <div>

                            <h3 className="font-bold text-gray-900">
                              {
                                shift.name
                              }
                            </h3>

                            <span className="inline-block mt-1 px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                              {
                                shift.code
                              }
                            </span>

                          </div>

                          {shift.crossesMidnight && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                              Overnight
                            </span>
                          )}

                        </div>

                        <div className="mt-5 flex items-center justify-between">

                          <div>
                            <div className="text-xs text-gray-500">
                              Shift Time
                            </div>

                            <div className="text-lg font-bold text-gray-800 mt-1">
                              {
                                shift.startTime
                              }{" "}
                              →
                              {
                                shift.endTime
                              }
                            </div>
                          </div>

                          <div className="text-right">

                            <div className="text-xs text-gray-500">
                              Grace
                            </div>

                            <div className="font-semibold text-gray-800 mt-1">
                              {
                                shift.graceMinutes
                              }{" "}
                              min
                            </div>

                          </div>

                        </div>

                        <div className="mt-4 pt-3 border-t flex justify-end">
                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteShift(
                                shift._id
                              )
                            }
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-semibold rounded-lg transition"
                          >
                            Delete Shift
                          </button>
                        </div>

                      </div>
                    )
                  )
                )}

              </div>

            </div>

          </div>
        )}

      </div>
    </div>
  );
}
