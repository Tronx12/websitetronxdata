// // app/(dashboard)/team-lead/layout.tsx
// import { redirect } from "next/navigation";
// import { getCurrentUser } from "@/lib/getuser";
// import { ROLE_REDIRECT } from "@/types/role";

// export default async function TeamLeadLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const user = await getCurrentUser();

//   if (!user) {
//     redirect("/login");
//   }

//   // Only team-lead and admin roles are authorized to access Team Lead section
//   if (user.role !== "team-lead" && user.role !== "admin") {
//     redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
//   }

//   return <>{children}</>;
// }
// app/(dashboard)/team-lead/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function TeamLeadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Only team-lead and admin roles are authorized
  if (user.role !== "team-lead" && user.role !== "admin") {
    redirect(ROLE_REDIRECT[user.role] ?? "/unauthorized");
  }

  return <>{children}</>;
}