// app/admin/survey/page.tsx
import SurveyPageAdmin from "@/components/SurveyPageAdmin";
import { getCurrentUser } from "@/lib/getuser";

export default async function Page() {
  const user = await getCurrentUser();
  return (
    <SurveyPageAdmin
      currentUserId={user.userId}
      currentUserName={user.name}
    />
  );
}