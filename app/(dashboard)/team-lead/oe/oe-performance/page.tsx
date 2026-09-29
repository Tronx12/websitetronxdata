import { getCurrentUser } from "@/lib/getuser";
import TeamLeadOEPerformance from "@/components/oe/TeamLeadOEPerformance";

export default async function TeamLeadOEPerformancePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Authentication Required
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please login again.
          </p>
        </div>
      </main>
    );
  }

  if (user.role !== "team-lead") {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h3 className="text-xl font-bold text-red-600">
            Access Denied
          </h3>

          <p className="mt-2 text-sm text-slate-500">
            Only team leads can access team OE performance.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <TeamLeadOEPerformance />
      </div>
    </main>
  );
}