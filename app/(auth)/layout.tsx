// app/(auth)/layout.tsx
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";
import LocationGuard from "@/components/LocationGuard";
import { ROLE_REDIRECT } from "@/types/role";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // If user is already logged in, redirect them directly to their role's dashboard
  const user = await getCurrentUser();

  if (user) {
    const destination = ROLE_REDIRECT[user.role] ?? "/survey-tester/survey-data";
    redirect(destination);
  }

  // Location guard protects the login and auth pages:
  // If user's location does not match the office location, they cannot go to or use login!
  return <LocationGuard>{children}</LocationGuard>;
}