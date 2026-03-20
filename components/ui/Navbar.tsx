"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",        label: "Home"    },
  { href: "/review",  label: "Review"  },
  { href: "/history", label: "History" },
  { href: "/docs",    label: "Docs"    },
] as const;

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 glass border-b border-[var(--border)]">
      <nav className="mx-auto max-w-6xl px-6 h-14 flex items-center justify-between gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="var(--accent)" />
            <path
              d="M6 7L4 10L6 13M14 7L16 10L14 13M11 6L9 14"
              stroke="white"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-semibold tracking-tight text-[var(--text-primary)] group-hover:text-white transition-colors">
            AI Code Reviewer
          </span>
          <span className="badge badge-accent hidden sm:inline-flex">Beta</span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(({ href, label }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-3 py-1.5 rounded-md text-sm transition-all duration-150 ${
                  active
                    ? "text-[var(--text-primary)] bg-[var(--surface-2)]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/review" className="btn btn-primary text-xs py-1.5 px-3">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M6 1V11M1 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            New Review
          </Link>
        </div>
      </nav>
    </header>
  );
}
