// app/attendence/page.tsx

import SurveyPage from "@/components/SurveyPage";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  console.log("===== SERVER USER =====");
  console.log(user);

  if (!user?.userId) {
    redirect("/login");
  }

  return <SurveyPage userId={user.userId} />;
}