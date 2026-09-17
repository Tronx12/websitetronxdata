import OfficeOffManagement from "@/components/OfficeOffManagement";
import { getCurrentUser } from "@/lib/getuser";
import { redirect } from "next/navigation";

export default async function OfficeOffPage() {
  const user = await getCurrentUser();

  if (!user?.userId) {
    redirect("/login");
  }

  if (!["admin", "hr"].includes(user.role)) {
  redirect("/login");
}

  return (
    <OfficeOffManagement
      currentUserId={user.userId}
    />
  );
}