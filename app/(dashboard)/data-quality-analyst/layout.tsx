// app/(dashboard)/data-quality-analyst/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function DataQualityAnalystLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only data-quality-analyst and admin roles are authorized to access this section
  if (user.role !== "data-quality-analyst" && user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
  }

  return <>{children}</>;
}
