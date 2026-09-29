// // // app/(auth)/layout.tsx
// // import { getCurrentUser } from "@/lib/getuser";
// // import { redirect } from "next/navigation";
// // import LocationGuard from "@/components/LocationGuard";
// // import { ROLE_REDIRECT } from "@/types/role";

// // export default async function AuthLayout({
// //   children,
// // }: {
// //   children: React.ReactNode;
// // }) {
// //   // If user is already logged in, redirect them directly to their role's dashboard
// //   const user = await getCurrentUser();

// //   if (user) {
// //     const destination = ROLE_REDIRECT[user.role] ?? "/survey-tester/survey-data";
// //     redirect(destination);
// //   }

// //   // Location guard protects the login and auth pages:
// //   // If user's location does not match the office location, they cannot go to or use login!
// //   return <LocationGuard>{children}</LocationGuard>;
// // }


// import { redirect } from "next/navigation";
// import { headers } from "next/headers";
// import { getCurrentUser } from "@/lib/getuser";
// import { isIpWhitelisted } from "@/lib/attendance-ip";

// export default async function DashboardLayout({
//   children,
// }: {
//   children: React.ReactNode;
// }) {
//   const user = await getCurrentUser();

//   if (!user) {
//     redirect("/login");
//   }

//   const requestHeaders = await headers();

//   const forwardedFor = requestHeaders.get("x-forwarded-for");
//   const realIp = requestHeaders.get("x-real-ip");

//   const clientIp =
//     forwardedFor?.split(",")[0]?.trim() ||
//     realIp?.trim() ||
//     "";

//   // The helper currently expects NextRequest,
//   // so we should adjust it to support server headers
//   // before using it here.
  
//   return <>{children}</>;
// }


// app/(auth)/layout.tsx

import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";
import { ROLE_REDIRECT } from "@/types/role";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  /*
   * If the user is already logged in,
   * send them to their role dashboard.
   */
  if (user) {
    const destination =
      ROLE_REDIRECT[user.role] ??
      "/survey-tester/survey-data";

    redirect(destination);
  }

  /*
   * IMPORTANT:
   *
   * Do NOT use LocationGuard here.
   * Do NOT check IP here.
   *
   * Login/register pages should render normally.
   *
   * IP protection belongs on:
   *   - Home page
   *   - Dashboard layout
   *   - Protected APIs
   */
  return <>{children}</>;
}

