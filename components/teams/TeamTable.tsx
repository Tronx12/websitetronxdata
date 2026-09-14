"use client";

import { Team } from "@/types/team";
import { Pencil, Trash2, Users } from "lucide-react";

interface Props {
  teams: Team[];
  loading: boolean;
  onEdit: (team: Team) => void;
  onDelete: (id: string) => void;
}

export default function TeamTable({ teams, loading, onEdit, onDelete }: Props) {
  if (loading) {
    return <div className="text-center py-12">Loading teams...</div>;
  }

  if (teams.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No teams found. Create your first team.
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-3 font-medium">Team Name</th>
            <th className="text-left p-3 font-medium">Team Lead</th>
            <th className="text-left p-3 font-medium">Members</th>
            <th className="text-left p-3 font-medium">Status</th>
            <th className="text-right p-3 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((team) => (
            <tr key={team._id} className="border-t hover:bg-muted/30">
              <td className="p-3">
                <div className="font-medium">{team.name}</div>
                {team.description && (
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {team.description}
                  </div>
                )}
              </td>
              <td className="p-3">
                <div>{team.teamLead?.name}</div>
                <div className="text-xs text-muted-foreground">
                  {team.teamLead?.email}
                </div>
              </td>
              <td className="p-3">
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  <span>{team.members?.length || 0}</span>
                </div>
              </td>
              <td className="p-3">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    team.isActive
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }`}
                >
                  {team.isActive ? "Active" : "Inactive"}
                </span>
              </td>
              <td className="p-3 text-right space-x-2">
                <button
                  type="button"
                  onClick={() => onEdit(team)}
                  className="inline-flex items-center justify-center p-2 rounded-md hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(team._id)}
                  className="inline-flex items-center justify-center p-2 rounded-md text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  title="Delete"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}