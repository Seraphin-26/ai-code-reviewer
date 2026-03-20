import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-6">
      <p className="text-7xl font-bold tracking-tight text-[var(--text-tertiary)]">404</p>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <p className="text-[var(--text-secondary)] max-w-sm text-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
      </div>
      <Link href="/" className="btn btn-primary px-6 py-2.5 text-sm">
        Back to Home
      </Link>
    </div>
  );
}
