"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";

interface OfficeOff {
  _id: string;
  date: string;
  title: string;
  type:
    | "festival"
    | "holiday"
    | "special";
  description?: string | null;
  groupId?: string | null;
  isActive: boolean;
}

interface Props {
  currentUserId: string;
}

export default function OfficeOffManagement({
  currentUserId,
}: Props) {
  const [officeOffs, setOfficeOffs] =
    useState<OfficeOff[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [dateLoading, setDateLoading] =
    useState(false);

  // ============================================
  // FORM
  // ============================================

  const [startDate, setStartDate] =
    useState("");

  const [endDate, setEndDate] =
    useState("");

  const [title, setTitle] =
    useState("");

  const [type, setType] = useState<
    "festival" | "holiday" | "special"
  >("festival");

  const [description, setDescription] =
    useState("");

  // ============================================
  // WEEKEND SETTING
  // ============================================

  const [weekendOff, setWeekendOff] =
    useState(false);

  // ============================================
  // YEAR
  // ============================================

  const currentYear =
    new Date().getFullYear();

  // ============================================
  // FETCH
  // ============================================

  const fetchOfficeOffs =
    async () => {
      setLoading(true);

      try {
        const res =
          await fetch(
            `/api/office-off?year=${currentYear}`,
            {
              cache: "no-store",
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to load office offs"
          );
        }

        setOfficeOffs(
          Array.isArray(
            data?.data
          )
            ? data.data
            : []
        );

        setWeekendOff(
          data?.settings
            ?.weekendOff === true
        );
      } catch (error) {
        console.error(
          "FETCH OFFICE OFF ERROR:",
          error
        );

        alert(
          "Failed to load office off settings"
        );
      } finally {
        setLoading(false);
      }
    };

  useEffect(() => {
    fetchOfficeOffs();
  }, []);

  // ============================================
  // TOGGLE WEEKEND
  // ============================================

  const handleWeekendToggle =
    async (
      checked: boolean
    ) => {
      setWeekendOff(checked);
      setDateLoading(true);

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
                weekendOff:
                  checked,
              }),
            }
          );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.message ||
              "Failed to update weekend setting"
          );
        }

        alert(
          checked
            ? "Saturday and Sunday are now office off"
            : "Saturday and Sunday office off disabled"
        );
      } catch (error) {
        console.error(
          "WEEKEND SETTING ERROR:",
          error
        );

        // Restore old value
        setWeekendOff(
          !checked
        );

        alert(
          "Failed to update weekend setting"
        );
      } finally {
        setDateLoading(false);
      }
    };

  // ============================================
  // CREATE HOLIDAY
  // ============================================

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

      if (startDate > endDate) {
        alert(
          "Start date cannot be after end date"
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

        // Reset
        setStartDate("");
        setEndDate("");
        setTitle("");
        setType("festival");
        setDescription("");

        await fetchOfficeOffs();
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

  // ============================================
  // DELETE
  // ============================================

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

        await fetchOfficeOffs();
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

  // ============================================
  // CALCULATE DAYS
  // ============================================

  const getSelectedDays =
    () => {
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

      const diff =
        end.getTime() -
        start.getTime();

      return (
        Math.floor(
          diff /
            (1000 *
              60 *
              60 *
              24)
        ) + 1
      );
    };

  const selectedDays =
    getSelectedDays();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ============================================
            HEADER
        ============================================ */}

        <div>
          <div className="flex items-center gap-3">
            <h4 className="text-3xl font-bold text-gray-900">
              Office Off Management
            </h4>

            <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-700 text-xs font-semibold">
              ADMIN
            </span>
          </div>

          <p className="text-gray-500 mt-1">
            Manage weekends, festivals,
            holidays and special office
            off days.
          </p>
        </div>

        {/* ============================================
            WEEKEND SETTINGS
        ============================================ */}

        <div className="bg-white rounded-2xl border shadow-sm p-6">

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Weekly Office Off
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Automatically mark every
                Saturday and Sunday as
                office off.
              </p>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">

              <span className="text-sm font-medium text-gray-700">
                Every Saturday & Sunday
              </span>

              <input
                type="checkbox"
                checked={
                  weekendOff
                }
                disabled={
                  dateLoading
                }
                onChange={(e) =>
                  handleWeekendToggle(
                    e.target.checked
                  )
                }
                className="w-5 h-5 accent-blue-600 cursor-pointer"
              />

            </label>

          </div>

          {/* STATUS */}

          <div className="mt-5 p-4 rounded-lg bg-gray-50 border">

            {weekendOff ? (
              <div className="text-sm text-green-700 font-medium">
                ✓ Saturday and Sunday
                are automatically Office
                Off.
              </div>
            ) : (
              <div className="text-sm text-gray-600">
                Weekend automatic office off
                is currently disabled.
              </div>
            )}

          </div>
        </div>

        {/* ============================================
            CREATE HOLIDAY
        ============================================ */}

        <div className="bg-white rounded-2xl border shadow-sm p-6">

          <h2 className="text-lg font-semibold text-gray-800 mb-5">
            Create Festival / Holiday
          </h2>

          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >

            {/* DATES */}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              {/* START DATE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date *
                </label>

                <input
                  type="date"
                  value={
                    startDate
                  }
                  onChange={(e) =>
                    setStartDate(
                      e.target.value
                    )
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* END DATE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                      e.target.value
                    )
                  }
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* TITLE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Holiday / Festival *
                </label>

                <input
                  type="text"
                  value={
                    title
                  }
                  onChange={(e) =>
                    setTitle(
                      e.target.value
                    )
                  }
                  placeholder="e.g. Diwali"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* TYPE */}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type
                </label>

                <select
                  value={
                    type
                  }
                  onChange={(e) =>
                    setType(
                      e.target.value as
                        | "festival"
                        | "holiday"
                        | "special"
                    )
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
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

            {/* SELECTED DAYS */}

            {selectedDays >
              0 && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 text-sm text-blue-700">
                This will create{" "}
                <strong>
                  {selectedDays}
                </strong>{" "}
                separate office-off
                record
                {selectedDays !== 1
                  ? "s"
                  : ""}.
              </div>
            )}

            {/* DESCRIPTION */}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>

              <textarea
                value={
                  description
                }
                onChange={(e) =>
                  setDescription(
                    e.target.value
                  )
                }
                rows={3}
                placeholder="Optional description..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* BUTTON */}

            <button
              type="submit"
              disabled={
                submitting
              }
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50"
            >
              {submitting
                ? "Creating..."
                : "Create Office Off"}
            </button>

          </form>
        </div>

        {/* ============================================
            HOLIDAY LIST
        ============================================ */}

        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">

          <div className="px-6 py-4 border-b flex items-center justify-between">

            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                Office Off -{" "}
                {currentYear}
              </h2>

              <p className="text-sm text-gray-500 mt-1">
                Each holiday date is stored
                separately.
              </p>
            </div>

            <button
              type="button"
              onClick={
                fetchOfficeOffs
              }
              disabled={
                loading
              }
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50"
            >
              {loading
                ? "Refreshing..."
                : "Refresh"}
            </button>

          </div>

          {/* WEEKEND INFO */}

          {weekendOff && (
            <div className="px-6 py-3 bg-blue-50 border-b text-sm text-blue-700">
              ✓ Every Saturday and Sunday
              is automatically Office Off.
            </div>
          )}

          <div className="overflow-x-auto">

            <table className="min-w-full divide-y divide-gray-200">

              <thead className="bg-gray-50">

                <tr>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Date
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Day
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Holiday
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Type
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Description
                  </th>

                  <th className="px-5 py-3 text-left text-xs font-semibold text-gray-600 uppercase">
                    Action
                  </th>

                </tr>

              </thead>

              <tbody className="divide-y divide-gray-200">

                {loading ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      Loading...
                    </td>
                  </tr>

                ) : officeOffs.length === 0 ? (

                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500"
                    >
                      No festival or holiday
                      office offs created
                      for{" "}
                      {currentYear}.
                    </td>
                  </tr>

                ) : (

                  officeOffs.map(
                    (item) => (
                      <tr
                        key={
                          item._id
                        }
                        className="hover:bg-gray-50"
                      >

                        <td className="px-5 py-4 text-sm font-medium">
                          {format(
                            new Date(
                              item.date
                            ),
                            "dd MMM yyyy"
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm">
                          {format(
                            new Date(
                              item.date
                            ),
                            "EEEE"
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm font-medium">
                          {item.title}
                        </td>

                        <td className="px-5 py-4 text-sm">

                          <span className="px-2.5 py-1 rounded-full bg-blue-100 text-blue-700 text-xs">
                            {
                              item.type
                            }
                          </span>

                        </td>

                        <td className="px-5 py-4 text-sm text-gray-600">
                          {
                            item.description ||
                            "—"
                          }
                        </td>

                        <td className="px-5 py-4">

                          <button
                            type="button"
                            onClick={() =>
                              handleDelete(
                                item._id
                              )
                            }
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs rounded-lg"
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
    </div>
  );
}