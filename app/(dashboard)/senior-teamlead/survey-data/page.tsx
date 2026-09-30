// app/admin/survey/page.tsx
import SurveyPageAdmin from "@/components/SurveyPageAdmin";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <SurveyPageAdmin
      currentUserId={user.userId}
      currentUserName={user.name}
    />
  );
}