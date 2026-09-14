import AuditLogs from "@/components/AuditLogs";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user?.userId) {
    redirect("/login");
  }

  return (
    <AuditLogs
      userId={user.userId}
    />
  );
}