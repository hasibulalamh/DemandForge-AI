import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <p className="text-xs font-semibold tracking-widest text-violet-600 uppercase">404</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900">Page not found</h1>
        <p className="mt-2 text-sm text-zinc-500">
          The page or record you requested does not exist, or you do not have access to it.
        </p>
        <Link
          href="/dashboard"
          className="mt-6 inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
