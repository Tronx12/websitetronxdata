// app/attendence/page.tsx

import AttendencePage from "@/components/Attendence";
import { getCurrentUser } from "@/lib/getuser"; // or "@/lib/getuser"
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  console.log("===== SERVER USER =====");
  console.log(user);

  if (!user || !user.userId) {
    redirect("/login");
  }

  return <AttendencePage currentUserId={user.userId} />;
}