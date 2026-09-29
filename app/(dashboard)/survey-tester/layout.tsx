// app/(dashboard)/survey-tester/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function SurveyTesterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only survey-tester and admin roles are authorized to access Survey Tester section
  if (user.role !== "survey-tester" && user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
  }

  return <>{children}</>;
}
