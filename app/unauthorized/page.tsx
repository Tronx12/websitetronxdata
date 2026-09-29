// app/unauthorized/page.tsx
import Link from "next/link";
import { getCurrentUser } from "@/lib/getuser";
import { ROLE_REDIRECT } from "@/types/role";

export default async function UnauthorizedPage() {
  const user = await getCurrentUser();
  const dashboardHref = user ? ROLE_REDIRECT[user.role] ?? "/survey-tester/survey-data" : "/login";

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-8 shadow-sm text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
          <svg
            className="h-8 w-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <span className="inline-block px-3 py-1 text-xs font-semibold text-red-700 bg-red-50 rounded-full mb-3">
          403 Forbidden
        </span>

        <h3 className="text-2xl font-bold text-gray-900">Access Denied</h3>

        <p className="mt-3 text-sm text-gray-600 leading-relaxed">
          You do not have the required permissions to view this resource. If you believe this is an error, please contact your administrator.
        </p>

        {user && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 text-left">
            <div><span className="font-semibold text-gray-700">Signed in as:</span> {user.email}</div>
            <div className="mt-1"><span className="font-semibold text-gray-700">Assigned Role:</span> {user.role}</div>
          </div>
        )}

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={dashboardHref}
            className="w-full rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-gray-800"
          >
            {user ? "Go to Authorized Dashboard" : "Go to Login"}
          </Link>

          <Link
            href="/"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Back to Homepage
          </Link>
        </div>
      </div>
    </main>
  );
}
