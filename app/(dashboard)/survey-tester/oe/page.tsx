// import SubmitView from "@/components/SubmitView";
// export default function Page(){return <main className="min-h-screen p-4 md:p-8"><SubmitView/></main>}

import { getCurrentUser } from "@/lib/getuser";
import SubmitView from "@/components/oe/SubmitView";

export default async function OESubmitPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Authentication Required
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Please login again to submit an OE response.
          </p>
        </div>
      </main>
    );
  }

  if (!user.name?.trim()) {
    return (
      <main className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-800">
            Member Name Not Found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Your account does not have a member name configured.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto w-full max-w-7xl">
        <SubmitView memberName={user.name} />
      </div>
    </main>
  );
}