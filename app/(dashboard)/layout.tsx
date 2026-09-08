// app/(dashboard)/layout.tsx
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/getuser";
import { Sidebar } from "@/components/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      {/* Main content now properly adjusts based on sidebar width */}
      <main className="flex-1 ml-16 md:ml-64 bg-gray-50 transition-all duration-300 min-h-screen overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}