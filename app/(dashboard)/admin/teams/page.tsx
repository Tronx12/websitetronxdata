import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";
import TeamsPageClient from "@/components/teams/TeamsPageClient";

export default async function TeamsPage() {
  const user = await getCurrentUser();

  // Only admin & hr can manage teams
  if (!user || !["admin", "hr"].includes(user.role)) {
    redirect("/unauthorized"); // or "/login"
  }

  return <TeamsPageClient currentUser={user} />;
}