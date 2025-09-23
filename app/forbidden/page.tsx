// app/forbidden/page.tsx
import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white shadow-lg rounded-2xl p-6 space-y-4 text-center">
        <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          {/* lock icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-red-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M16 11V7a4 4 0 10-8 0v4M6 11h12a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5a2 2 0 012-2z"
            />
          </svg>
        </div>

        <h1 className="text-2xl font-semibold">Access denied</h1>
        <p className="text-sm text-gray-600">
          You don't have permission to view this page. If you believe this is an
          error, contact an admin.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 hover:bg-gray-50"
          >
            Go home
          </Link>
          <Link
            href="/login"
            className="rounded-xl bg-gray-900 text-white px-4 py-2 hover:opacity-90"
          >
            Sign in as different user
          </Link>
        </div>

  {/* Optional "request access" mailto */}
        <div className="pt-2 text-xs text-gray-500">
          Need access?{" "}
          <a
            className="underline"
            href="mailto:admin@yourdomain.com?subject=Access%20Request"
          >
            Request it
          </a>
          .
        </div>
      </div>
    </div>
  );
}
