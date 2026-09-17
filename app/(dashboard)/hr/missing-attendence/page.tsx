import MissingAttendancePage from "@/components/MissingAttendancePage";
import { getCurrentUser } from "@/lib/getuser"; // adjust path if needed
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  // Debug (remove later)
  console.log("===== SERVER USER =====");
  console.log(user);

  if (!user || !user.userId) {
    redirect("/login");
  }

  return (
    <MissingAttendancePage
      currentUserId={user.userId}
      currentUserRole={user.role || "survey-tester"}
    />
  );
}