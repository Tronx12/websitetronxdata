// app/admin/survey/page.tsx
import SurveyPageHr from "@/components/SurveyPageHr";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SurveyPageHr
      currentUserId={user.userId}
      currentUserName={user.name}
    />
  );
}