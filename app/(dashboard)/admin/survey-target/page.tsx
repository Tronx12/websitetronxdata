"use client";

import {
  useEffect,
  useState,
} from "react";


// ============================================================
// TYPES
// ============================================================

type User = {
  _id: string;
  name: string;
  email: string;
  role: string;
  teamId?: string | null;
  target: number;
};

type SurveyRecord = {
  _id: string;
  createdAt?: string;
  createdBy?: string;

  [key: string]: any;
};


// ============================================================
// PAGE
// ============================================================

export default function SurveyTargetPage() {

  const [users, setUsers] =
    useState<User[]>([]);

  const [month, setMonth] =
    useState(
      new Date()
        .toISOString()
        .slice(0, 7)
    );

  const [
    selectedUser,
    setSelectedUser,
  ] = useState("");

  const [target, setTarget] =
    useState("");

  const [records, setRecords] =
    useState<SurveyRecord[]>(
      []
    );

  const [
    selectedUserInfo,
    setSelectedUserInfo,
  ] =
    useState<User | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [
    dataLoading,
    setDataLoading,
  ] = useState(false);

  const [saving, setSaving] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");

  // ==========================================================
  // LOAD USERS
  // ==========================================================

  const loadUsers =
    async () => {

      try {

        setLoading(true);

        setError("");

        const response =
          await fetch(
            `/api/survey/targets?month=${month}`,
            {
              method: "GET",

              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load users"
          );
        }

        setUsers(
          data.users || []
        );

      } catch (
        err: any
      ) {

        setError(
          err?.message ||
            "Failed to load users"
        );

      } finally {

        setLoading(false);

      }
    };


  // ==========================================================
  // LOAD USERS WHEN MONTH CHANGES
  // ==========================================================

  useEffect(() => {

    loadUsers();

  }, [month]);


  // ==========================================================
  // SELECT USER
  // ==========================================================

  const handleUserChange =
    async (
      userId: string
    ) => {

      setSelectedUser(
        userId
      );

      setMessage("");

      setError("");

      const user =
        users.find(
          (item) =>
            item._id ===
            userId
        );

      if (user) {

        setSelectedUserInfo(
          user
        );

        setTarget(
          String(
            user.target || ""
          )
        );

      } else {

        setSelectedUserInfo(
          null
        );

        setTarget("");

      }

      // ======================================================
      // NO USER
      // ======================================================

      if (!userId) {

        setRecords([]);

        return;
      }

      // ======================================================
      // LOAD ALL USER DATA
      // ======================================================

      try {

        setDataLoading(
          true
        );

        const response =
          await fetch(
            `/api/survey/user-data?userId=${userId}`,
            {
              method: "GET",

              credentials:
                "include",
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {
          throw new Error(
            data.message ||
              "Failed to load user data"
          );
        }

        setRecords(
          data.records || []
        );

      } catch (
        err: any
      ) {

        setError(
          err?.message ||
            "Failed to load user data"
        );

        setRecords([]);

      } finally {

        setDataLoading(
          false
        );

      }
    };


  // ==========================================================
  // ASSIGN TARGET
  // ==========================================================

  const handleAssignTarget =
    async (
      e: React.FormEvent
    ) => {

      e.preventDefault();

      setMessage("");

      setError("");

      if (!selectedUser) {

        setError(
          "Please select a user"
        );

        return;
      }

      if (
        target === ""
      ) {

        setError(
          "Please enter target"
        );

        return;
      }

      const numericTarget =
        Number(target);

      if (
        !Number.isFinite(
          numericTarget
        ) ||
        numericTarget < 0
      ) {

        setError(
          "Target must be a valid number"
        );

        return;
      }

      try {

        setSaving(true);

        const response =
          await fetch(
            "/api/survey/targets",
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json",
              },

              credentials:
                "include",

              body:
                JSON.stringify({
                  userId:
                    selectedUser,

                  month,

                  target:
                    numericTarget,
                }),
            }
          );

        const data =
          await response.json();

        if (
          !response.ok ||
          !data.success
        ) {

          throw new Error(
            data.message ||
              "Failed to save target"
          );

        }

        setMessage(
          "Target saved successfully"
        );

        // Refresh users
        await loadUsers();

      } catch (
        err: any
      ) {

        setError(
          err?.message ||
            "Failed to save target"
        );

      } finally {

        setSaving(false);

      }
    };


  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      <div className="mx-auto max-w-7xl">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="mb-6">

          <h1 className="text-2xl font-bold text-gray-900">
            Survey Target Management
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Assign target and view user's complete survey data.
          </p>

        </div>


        {/* ====================================================
            MESSAGE
        ==================================================== */}

        {message && (

          <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">

            {message}

          </div>

        )}


        {error && (

          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-700">

            {error}

          </div>

        )}


        {/* ====================================================
            TARGET FORM
        ==================================================== */}

        <div className="rounded-xl border bg-white p-6 shadow-sm">

          <h2 className="mb-5 text-lg font-semibold">
            Assign Survey Target
          </h2>


          <form
            onSubmit={
              handleAssignTarget
            }
            className="grid grid-cols-1 gap-5 md:grid-cols-4"
          >

            {/* MONTH */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Month
              </label>

              <input
                type="month"
                value={month}
                onChange={(e) =>
                  setMonth(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />

            </div>


            {/* USER */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                User
              </label>

              <select
                value={selectedUser}
                onChange={(e) =>
                  handleUserChange(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              >

                <option value="">
                  Select User
                </option>

                {users.map(
                  (user) => (

                    <option
                      key={
                        user._id
                      }
                      value={
                        user._id
                      }
                    >

                      {user.name ||
                        user.email}

                      {" - "}

                      {user.role}

                    </option>

                  )
                )}

              </select>

            </div>


            {/* TARGET */}

            <div>

              <label className="mb-2 block text-sm font-medium text-gray-700">
                Monthly Target
              </label>

              <input
                type="number"
                min="0"
                value={target}
                placeholder="500"
                onChange={(e) =>
                  setTarget(
                    e.target.value
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2"
              />

            </div>


            {/* BUTTON */}

            <div className="flex items-end">

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >

                {saving
                  ? "Saving..."
                  : "Assign Target"}

              </button>

            </div>

          </form>

        </div>


        {/* ====================================================
            USERS
        ==================================================== */}

        <div className="mt-6 rounded-xl border bg-white shadow-sm">

          <div className="border-b p-6">

            <h2 className="text-lg font-semibold">
              Users
            </h2>

            <p className="text-sm text-gray-500">
              Click View Data to see all surveys submitted by that user.
            </p>

          </div>


          {loading ? (

            <div className="p-8 text-center text-gray-500">
              Loading users...
            </div>

          ) : (

            <div className="overflow-x-auto">

              <table className="w-full text-sm">

                <thead className="bg-gray-50">

                  <tr>

                    <th className="px-6 py-3 text-left">
                      User
                    </th>

                    <th className="px-6 py-3 text-left">
                      Email
                    </th>

                    <th className="px-6 py-3 text-left">
                      Role
                    </th>

                    <th className="px-6 py-3 text-right">
                      Target
                    </th>

                    <th className="px-6 py-3 text-right">
                      Action
                    </th>

                  </tr>

                </thead>


                <tbody className="divide-y">

                  {users.map(
                    (user) => (

                      <tr
                        key={
                          user._id
                        }
                        className={
                          selectedUser ===
                          user._id
                            ? "bg-blue-50"
                            : "hover:bg-gray-50"
                        }
                      >

                        <td className="px-6 py-4">

                          <div className="font-medium text-gray-900">
                            {user.name ||
                              "Unnamed User"}
                          </div>

                        </td>


                        <td className="px-6 py-4 text-gray-600">
                          {user.email}
                        </td>


                        <td className="px-6 py-4">

                          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs">
                            {user.role}
                          </span>

                        </td>


                        <td className="px-6 py-4 text-right font-semibold">
                          {user.target}
                        </td>


                        <td className="px-6 py-4 text-right">

                          <button
                            type="button"
                            onClick={() =>
                              handleUserChange(
                                user._id
                              )
                            }
                            className="rounded-lg bg-gray-900 px-4 py-2 text-xs font-medium text-white hover:bg-gray-700"
                          >

                            View Data

                          </button>

                        </td>

                      </tr>

                    )
                  )}

                </tbody>

              </table>

            </div>

          )}

        </div>


        {/* ====================================================
            SELECTED USER
        ==================================================== */}

        {selectedUserInfo && (

          <div className="mt-6 rounded-xl border bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b p-6 md:flex-row md:items-center md:justify-between">

              <div>

                <h2 className="text-lg font-semibold">

                  {selectedUserInfo.name ||
                    selectedUserInfo.email}

                </h2>

                <p className="text-sm text-gray-500">

                  {selectedUserInfo.email}

                  {" • "}

                  {selectedUserInfo.role}

                </p>

              </div>


              <div className="rounded-lg bg-blue-50 px-4 py-2">

                <span className="text-xs text-gray-500">
                  Total Surveys
                </span>

                <div className="text-xl font-bold text-blue-600">
                  {records.length}
                </div>

              </div>

            </div>


            {/* =================================================
                DATA
            ================================================= */}

            {dataLoading ? (

              <div className="p-10 text-center text-gray-500">

                Loading survey data...

              </div>

            ) : records.length ===
              0 ? (

              <div className="p-10 text-center text-gray-500">

                No survey data found for this user.

              </div>

            ) : (

              <div className="overflow-x-auto">

                <table className="w-full text-sm">

                  <thead className="bg-gray-50">

                    <tr>

                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        #
                      </th>

                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        Submitted At
                      </th>

                      <th className="whitespace-nowrap px-5 py-3 text-left">
                        Survey ID
                      </th>

                      {/* Dynamic columns */}

                      {Object.keys(
                        records[0]
                      )
                        .filter(
                          (key) =>
                            ![
                              "_id",
                              "createdAt",
                              "updatedAt",
                              "createdBy",
                              "__v",
                            ].includes(
                              key
                            )
                        )
                        .slice(0, 10)
                        .map(
                          (key) => (

                            <th
                              key={
                                key
                              }
                              className="whitespace-nowrap px-5 py-3 text-left"
                            >
                              {key}
                            </th>

                          )
                        )}

                    </tr>

                  </thead>


                  <tbody className="divide-y">

                    {records.map(
                      (
                        record,
                        index
                      ) => {

                        const columns =
                          Object.keys(
                            records[0]
                          )
                            .filter(
                              (
                                key
                              ) =>
                                ![
                                  "_id",
                                  "createdAt",
                                  "updatedAt",
                                  "createdBy",
                                  "__v",
                                ].includes(
                                  key
                                )
                            )
                            .slice(
                              0,
                              10
                            );

                        return (

                          <tr
                            key={
                              record._id
                            }
                            className="hover:bg-gray-50"
                          >

                            <td className="whitespace-nowrap px-5 py-4">
                              {index +
                                1}
                            </td>


                            <td className="whitespace-nowrap px-5 py-4">

                              {record.createdAt
                                ? new Date(
                                    record.createdAt
                                  ).toLocaleString(
                                    "en-IN"
                                  )
                                : "-"}

                            </td>


                            <td className="whitespace-nowrap px-5 py-4 font-mono text-xs">

                              {record._id}

                            </td>


                            {columns.map(
                              (
                                key
                              ) => (

                                <td
                                  key={
                                    key
                                  }
                                  className="max-w-xs px-5 py-4"
                                >

                                  <div className="max-w-xs truncate">

                                    {typeof record[
                                      key
                                    ] ===
                                    "object"
                                      ? JSON.stringify(
                                          record[
                                            key
                                          ]
                                        )
                                      : String(
                                          record[
                                            key
                                          ] ??
                                            "-"
                                        )}

                                  </div>

                                </td>

                              )
                            )}

                          </tr>

                        );

                      }
                    )}

                  </tbody>

                </table>

              </div>

            )}

          </div>

        )}

      </div>

    </div>
  );
}