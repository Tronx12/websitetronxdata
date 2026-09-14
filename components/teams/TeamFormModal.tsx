"use client";

import { useEffect, useState } from "react";
import { Team, UserRef } from "@/types/team";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onClose: () => void;
  team: Team | null;
  onSuccess: () => void;
}

export default function TeamFormModal({ open, onClose, team, onSuccess }: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [teamLeadId, setTeamLeadId] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [leads, setLeads] = useState<UserRef[]>([]);
  const [members, setMembers] = useState<UserRef[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingUsers, setFetchingUsers] = useState(false);

  // Load available leads & members
  useEffect(() => {
    if (!open) return;

    const loadUsers = async () => {
      setFetchingUsers(true);
      try {
        const exclude = team?._id || "";
        const [leadsRes, membersRes] = await Promise.all([
          fetch(`/api/auth/users/available?role=team-lead&excludeTeamId=${exclude}`),
          fetch(`/api/auth/users/available?role=survey-tester&excludeTeamId=${exclude}`),
        ]);
        const leadsData = await leadsRes.json();
        const membersData = await membersRes.json();

        if (leadsData.success) setLeads(leadsData.data);
        if (membersData.success) setMembers(membersData.data);
      } catch {
        toast.error("Failed to load users");
      } finally {
        setFetchingUsers(false);
      }
    };

    loadUsers();
  }, [open, team]);

  // Prefill when editing
  useEffect(() => {
    if (team) {
      setName(team.name);
      setDescription(team.description || "");
      setTeamLeadId(team.teamLead._id);
      setMemberIds(team.members.map((m) => m._id));
    } else {
      setName("");
      setDescription("");
      setTeamLeadId("");
      setMemberIds([]);
    }
  }, [team, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamLeadId) {
      toast.error("Name and Team Lead are required");
      return;
    }

    setLoading(true);
    try {
      const url = team ? `/api/teams/${team._id}` : "/api/teams";
      const method = team ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          teamLeadId,
          memberIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(team ? "Team updated" : "Team created");
        onSuccess();
      } else {
        toast.error(data.message || "Something went wrong");
      }
    } catch {
      toast.error("Request failed");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold">
            {team ? "Edit Team" : "Create New Team"}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              rows={3}
            />
          </div>

          {/* Team Lead */}
          <div>
            <label className="block text-sm font-medium mb-1">Team Lead *</label>
            <select
              value={teamLeadId}
              onChange={(e) => setTeamLeadId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              required
              disabled={fetchingUsers}
            >
              <option value="">Select Team Lead</option>
              {leads.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Members (multi-select) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Team Members
            </label>
            <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
              {fetchingUsers ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No available survey-testers
                </p>
              ) : (
                members.map((u) => (
                  <label
                    key={u._id}
                    className="flex items-center gap-2 p-1.5 hover:bg-muted rounded cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={memberIds.includes(u._id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setMemberIds([...memberIds, u._id]);
                        } else {
                          setMemberIds(memberIds.filter((id) => id !== u._id));
                        }
                      }}
                    />
                    <span className="text-sm">
                      {u.name}{" "}
                      <span className="text-muted-foreground text-xs">
                        ({u.email})
                      </span>
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border rounded-md text-sm font-medium hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? "Saving..." : team ? "Update Team" : "Create Team"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}