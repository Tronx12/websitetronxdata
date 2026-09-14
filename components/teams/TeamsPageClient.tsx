"use client";

import { useEffect, useState } from "react";
import { Team } from "@/types/team";
import TeamTable from "./TeamTable";
import TeamFormModal from "./TeamFormModal";
import { Plus } from "lucide-react";
import { toast } from "sonner";

interface CurrentUser {
  userId: string;
  role: string;
}

interface Props {
  currentUser: CurrentUser;
}

export default function TeamsPageClient({ currentUser }: Props) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [search, setSearch] = useState("");

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/teams?search=${search}`);
      const data = await res.json();
      if (data.success) setTeams(data.data);
    } catch (err) {
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, [search]);

  const handleCreate = () => {
    setEditingTeam(null);
    setIsModalOpen(true);
  };

  const handleEdit = (team: Team) => {
    setEditingTeam(team);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this team?")) return;

    try {
      const res = await fetch(`/api/teams/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Team deleted");
        fetchTeams();
      } else {
        toast.error(data.message);
      }
    } catch {
      toast.error("Delete failed");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-2xl font-bold">Team Management</h4>
          <p className="text-muted-foreground">
            Create and manage teams, assign leads & members
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Team
        </button>
      </div>

      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search teams..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border rounded-md px-3 py-2 w-72"
        />
      </div>

      <TeamTable
        teams={teams}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <TeamFormModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        team={editingTeam}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchTeams();
        }}
      />
    </div>
  );
}