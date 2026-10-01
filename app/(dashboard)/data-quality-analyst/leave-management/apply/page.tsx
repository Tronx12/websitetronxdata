import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import ApplyLeaveClient from "@/components/ApplyLeaveClient";

export default async function ApplyLeavePage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <ApplyLeaveClient role={currentUser.role} />;
}