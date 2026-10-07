

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import LeaveManagementClient from "@/components/LeaveManagementClient";

export default async function LeaveManagementPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <LeaveManagementClient
      userId={currentUser.userId}
      role={currentUser.role}
      name={currentUser.name}
      email={currentUser.email}
    />
  );
}