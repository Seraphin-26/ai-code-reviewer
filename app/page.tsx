import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Code Reviewer — Instant Code Reviews",
};

const FEATURES = [
  {
    title: "Bug Detection",
    description:
      "Catch null pointer exceptions, off-by-one errors, and logic flaws before they reach production.",
    stat: "99.1% accuracy",
    color: "var(--danger)",
    bg: "rgba(239,68,68,0.08)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 4.5C8.3 4.5 7 5.8 7 7.5v3.5c0 1.7 1.3 3 3 3s3-1.3 3-3V7.5c0-1.7-1.3-3-3-3z" stroke="currentColor" strokeWidth="1.3"/>
        <path d="M4 9h3M13 9h3M7 6.5L4 4M13 6.5L16 4M7 13L4 15.5M13 13l3 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Security Analysis",
    description:
      "Identify SQL injections, XSS vulnerabilities, and OWASP Top 10 risks automatically.",
    stat: "10k+ CVEs caught",
    color: "var(--warning)",
    bg: "rgba(245,158,11,0.08)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M10 2L3 5.5V10c0 4 3 6.5 7 8 4-1.5 7-4 7-8V5.5L10 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
        <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    title: "Performance Hints",
    description:
      "Surface O(n²) loops, memory leaks, and N+1 queries with precise line numbers and fixes.",
    stat: "<2s analysis",
    color: "var(--accent)",
    bg: "rgba(124,106,247,0.08)",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M11.5 3L6 11h5l-2 6 7-10h-5L11.5 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
      </svg>
    ),
  },
];

const STEPS = [
  { num: "01", title: "Paste your code", desc: "Drop any snippet — a function, a file, a diff. Supports 50+ languages." },
  { num: "02", title: "AI analyses instantly", desc: "Gemini scans for security issues, performance bottlenecks, and style violations." },
  { num: "03", title: "Get actionable results", desc: "Every finding includes the exact line, severity level, and a concrete fix." },
];

export default function HomePage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-20 space-y-28">
      {/* Hero */}
      <section className="text-center space-y-7">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[var(--accent-muted)] bg-[var(--accent-muted)] text-xs font-medium text-[var(--accent)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)] animate-pulse" />
          Powered by Groq · Llama 3.3 70B
        </span>

        <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.06]">
          Review your code
          <br />
          <span className="text-gradient">instantly with AI.</span>
        </h1>

        <p className="mx-auto max-w-lg text-[var(--text-secondary)] text-lg leading-relaxed">
          Paste any snippet. Get a full security, performance, and style analysis
          in under&nbsp;2&nbsp;seconds. No sign-up required.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Link href="/review" className="btn btn-primary px-6 py-2.5 text-sm">
            Start Reviewing — Free
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7H11M7 3L11 7L7 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link href="/docs" className="btn btn-secondary px-6 py-2.5 text-sm">
            Read the Docs
          </Link>
        </div>

        <div className="flex flex-wrap justify-center gap-6 text-xs text-[var(--text-tertiary)] pt-1">
          {["No account needed", "Works with any language", "Private by default"].map((t) => (
            <span key={t} className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 6l3 3 5-5" stroke="var(--success)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t}
            </span>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium">What it catches</p>
          <h2 className="text-3xl font-bold tracking-tight">Your silent code guardian</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: f.bg, color: f.color }}>
                  {f.icon}
                </div>
                <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{f.stat}</span>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)] mb-1.5">{f.title}</h3>
                <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{f.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="space-y-10">
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest text-[var(--text-tertiary)] font-medium">Process</p>
          <h2 className="text-3xl font-bold tracking-tight">Three steps, zero friction.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {STEPS.map((s, i) => (
            <div key={s.num} className="space-y-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center font-mono text-sm font-bold"
                style={{ background: "var(--accent-muted)", color: "var(--accent)", border: "1px solid rgba(124,106,247,0.25)" }}>
                {s.num}
              </div>
              <h3 className="font-semibold text-[var(--text-primary)]">{s.title}</h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="card p-12 text-center space-y-5"
        style={{ background: "radial-gradient(ellipse 100% 120% at 50% 120%, rgba(124,106,247,0.1) 0%, var(--surface) 70%)" }}>
        <h2 className="text-3xl font-bold tracking-tight">
          Ship code you can stand behind.
        </h2>
        <p className="text-[var(--text-secondary)] max-w-sm mx-auto text-sm">
          No account. No setup. Paste your first snippet right now.
        </p>
        <Link href="/review" className="btn btn-primary px-8 py-3 text-sm inline-flex mx-auto"
          style={{ boxShadow: "0 0 32px var(--accent-glow)" }}>
          Open Code Reviewer →
        </Link>
      </section>
    </div>
  );
}
