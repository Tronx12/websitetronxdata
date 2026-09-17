
import SurveyPageTeamLead from "@/components/SurveyPageTeamLead";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  console.log("===== TEAM LEAD SERVER USER =====");
  console.log(user);

  /*
   * =====================================================
   * AUTHENTICATION
   * =====================================================
   */

  if (!user?.userId) {
    redirect("/login");
  }

  /*
   * =====================================================
   * TEAM LEAD ACCESS
   * =====================================================
   */

  if (user.role !== "team-lead") {
    redirect("/login");
  }

  /*
   * =====================================================
   * PASS REAL LOGGED-IN USER
   * =====================================================
   */

  return (
    <SurveyPageTeamLead
      currentUserId={String(user.userId)}
      currentUserName={
        user.name ||
        (user as any).fullName ||
        "Team Lead"
      }
    />

  );
}

