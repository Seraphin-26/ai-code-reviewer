import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Navbar } from "@/components/ui/Navbar";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: {
    default: "AI Code Reviewer",
    template: "%s · AI Code Reviewer",
  },
  description:
    "Instant AI-powered code reviews. Catch bugs, security issues, and style violations before they ship.",
  keywords: ["code review", "AI", "developer tools", "static analysis"],
  authors: [{ name: "AI Code Reviewer" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} dark`}>
      <body className="font-sans antialiased">
        {/* Ambient grid */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Top glow */}
        <div
          aria-hidden
          className="fixed inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(124,106,247,0.08) 0%, transparent 70%)",
          }}
        />

        <ToastProvider>
          <div className="relative flex min-h-dvh flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

function Footer() {
  return (
    <footer className="border-t border-[var(--border)] py-8 mt-16">
      <div className="mx-auto max-w-6xl px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
            <rect width="20" height="20" rx="5" fill="var(--accent)" />
            <path
              d="M6 7L4 10L6 13M14 7L16 10L14 13M11 6L9 14"
              stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
          <span className="text-xs text-[var(--text-tertiary)]">AI Code Reviewer</span>
        </div>
        <p className="text-xs text-[var(--text-tertiary)]">
          Built with Next.js 14 · App Router · TypeScript
        </p>
      </div>
    </footer>
  );
}
