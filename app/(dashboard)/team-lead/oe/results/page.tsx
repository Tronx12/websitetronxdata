import { getCurrentUser } from "@/lib/getuser";
import ResultsView from "@/components/oe/ResultsView";

export default async function OEResultsPage() {
  const user = await getCurrentUser();

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-2xl border border-red-200 bg-white p-8 text-center">

            <h4 className="text-xl font-bold text-slate-800">
              Authentication Required
            </h4>

            <p className="mt-2 text-sm text-slate-500">
              Your session has expired.
              Please login again.
            </p>

          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // NAME NOT FOUND
  // =====================================================

  if (!user.name?.trim()) {
    return (
      <main className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="mx-auto w-full max-w-7xl">
          <div className="rounded-2xl border border-amber-200 bg-white p-8 text-center">

            <h1 className="text-xl font-bold text-slate-800">
              Member Name Not Found
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Your account does not have a member name.
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Please contact the administrator.
            </p>

          </div>
        </div>
      </main>
    );
  }

  // =====================================================
  // RESULTS
  // =====================================================
  return (
  <main className="min-h-screen bg-slate-50 p-4 md:p-6">
    <div className="mx-auto w-full max-w-3xl">

      <div className="mb-5 flex justify-center flex-col">
        <h4 className="text-2xl font-bold text-slate-800">
          My Results
        </h4>

        <p className="mt-1 text-sm text-slate-500">
          View your submitted OE responses and their current status.
        </p>
      </div>

      <ResultsView
        memberName={user.name}
      />

    </div>
  </main>
);

  // return (
  //   <main className="min-h-screen bg-slate-50 p-4 md:p-6">
  //     <div className="mx-auto w-full max-w-7xl">

  //       <div className="mb-5">
  //         <h4 className="text-2xl font-bold text-slate-800">
  //           My Results
  //         </h4>

  //         <p className="mt-1 text-sm text-slate-500">
  //           View your submitted OE responses and their current status.
  //         </p>
  //       </div>

  //       <ResultsView
  //         memberName={user.name}
  //       />

  //     </div>
  //   </main>
  // );
}