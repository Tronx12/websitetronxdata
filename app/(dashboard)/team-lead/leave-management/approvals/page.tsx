import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import LeaveApprovalsClient from "@/components/LeaveApprovalsClient";

export default async function TeamLeadLeaveApprovalsPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <LeaveApprovalsClient role={currentUser.role} />;
}