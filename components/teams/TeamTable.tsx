

"use client";

import { Team } from "@/types/team";
import { Pencil, Trash2, Users } from "lucide-react";

interface Props {
  teams: Team[];
  loading: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
  onStatusChange: (id: string, isActive: boolean) => void;
}

// export default function TeamTable({ teams, loading, onEdit, onDelete }: Props) {
export default function TeamTable({
  teams,
  loading,
  onEdit,
  onDelete,
  onStatusChange,
}: Props) {
  if (loading) {
    return (
      <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-6 py-5 animate-pulse"
          >
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-64 rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
            <div className="hidden w-40 space-y-2 sm:block">
              <div className="h-4 w-32 rounded bg-neutral-200 dark:bg-neutral-800" />
              <div className="h-3 w-40 rounded bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
            <div className="hidden h-6 w-16 rounded-full bg-neutral-100 md:block dark:bg-neutral-800/60" />
            <div className="hidden h-6 w-16 rounded-full bg-neutral-100 md:block dark:bg-neutral-800/60" />
            <div className="flex gap-2">
              <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
              <div className="h-8 w-8 rounded-lg bg-neutral-100 dark:bg-neutral-800/60" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
          <Users className="h-6 w-6 text-neutral-400" />
        </div>
        <p className="text-base font-medium text-neutral-900 dark:text-neutral-100">
          No teams found
        </p>
        <p className="mt-1 max-w-xs text-sm text-neutral-500 dark:text-neutral-400">
          Create your first team to get started.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Desktop table */}
      <table className="hidden w-full text-sm sm:table">
        <thead>
          <tr className="text-left text-xs font-medium uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            <th className="px-6 py-3 font-medium">Team</th>
            <th className="px-6 py-3 font-medium">Team Lead</th>
            <th className="px-6 py-3 font-medium">Members</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr
              key={team._id}
              className="group transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
            >
              <td className="px-6 py-4">
                <div className="font-medium text-neutral-900 dark:text-neutral-100">
                  {team.name}
                </div>
                {team.description && (
                  <div className="mt-0.5 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {team.description}
                  </div>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="font-medium text-neutral-700 dark:text-neutral-300">
                  {team.teamLead?.name ?? "—"}
                </div>
                {team.teamLead?.email && (
                  <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                    {team.teamLead.email}
                  </div>
                )}
              </td>

              <td className="px-6 py-4">
                <div className="inline-flex items-center gap-1.5 text-neutral-600 dark:text-neutral-400">
                  <Users className="h-3.5 w-3.5" />
                  <span className="tabular-nums font-medium">
                    {team.members?.length || 0}
                  </span>
                </div>
              </td>

              <td className="px-6 py-4">
                <select
                  value={team.isActive ? "active" : "inactive"}
                  onChange={(e) =>
                    onStatusChange(team._id, e.target.value === "active")
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium outline-none transition-colors focus:ring-2 ${
                    team.isActive
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-500/20 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
                      : "border-neutral-200 bg-neutral-100 text-neutral-600 focus:ring-neutral-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                  }`}
                  aria-label={`Change ${team.name} status`}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </td>

              <td className="px-6 py-4">
                <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  <button
                    type="button"
                    onClick={() => onEdit(team)}
                    title="Edit"
                    aria-label={`Edit ${team.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900/10 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(team._id)}
                    title="Delete"
                    aria-label={`Delete ${team.name}`}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="divide-y divide-neutral-100 sm:hidden dark:divide-neutral-800">
        {teams.map((team) => (
          <div key={team._id} className="p-5 transition-colors active:bg-neutral-50 dark:active:bg-neutral-800/40">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-medium text-neutral-900 dark:text-neutral-100">
                    {team.name}
                  </h3>
                  <select
                    value={team.isActive ? "active" : "inactive"}
                    onChange={(e) =>
                      onStatusChange(team._id, e.target.value === "active")
                    }
                    className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-medium outline-none transition-colors focus:ring-2 ${
                      team.isActive
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700 focus:ring-emerald-500/20 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-400"
                        : "border-neutral-200 bg-neutral-100 text-neutral-600 focus:ring-neutral-500/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                    aria-label={`Change ${team.name} status`}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                {team.description && (
                  <p className="mt-1 line-clamp-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {team.description}
                  </p>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => onEdit(team)}
                  aria-label={`Edit ${team.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(team._id)}
                  aria-label={`Delete ${team.name}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
              <div className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                <span className="tabular-nums">
                  {team.members?.length || 0} members
                </span>
              </div>
              {team.teamLead?.name && (
                <>
                  <span className="text-neutral-300 dark:text-neutral-700">·</span>
                  <span className="truncate">Lead: {team.teamLead.name}</span>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}