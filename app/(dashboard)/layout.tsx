import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <DashboardShell role={user.role} email={user.email}>
      {children}
    </DashboardShell>
  );
}