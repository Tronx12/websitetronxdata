// app/(dashboard)/hr/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only hr and admin roles are authorized to access HR section
  if (user.role !== "hr" && user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
  }

  return <>{children}</>;
}
