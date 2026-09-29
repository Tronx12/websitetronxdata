// app/(dashboard)/admin/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only admin role is authorized to access admin section
  if (user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
  }

  return <>{children}</>;
}
