


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

