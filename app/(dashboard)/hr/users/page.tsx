// app/admin/users/page.tsx

import AdminUsersPage from "@/components/Users";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";
import { UserRole } from "@/types/role";

export default async function Page() {
  const user = await getCurrentUser();

  console.log("===== SERVER USER =====");
  console.log(user);

  if (!user?.userId) {
    redirect("/login");
  }

  const allowedRoles: UserRole[] = [
    "admin",
    "hr",
    "team-lead",
  ];

  if (!allowedRoles.includes(user.role as UserRole)) {
    redirect("/unauthorized");
  }

  return <AdminUsersPage />;
}