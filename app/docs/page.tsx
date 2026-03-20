import type { Metadata } from "next";

export const metadata: Metadata = { title: "Docs" };

export default function DocsPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-12 space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">Documentation</h1>
        <p className="text-[var(--text-secondary)] mt-3">
          Everything you need to use AI Code Reviewer.
        </p>
      </div>

      {/* Quickstart */}
      <section id="quickstart" className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-[var(--border)] pb-3">Quickstart</h2>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          No sign-up required. Go to the{" "}
          <a href="/review" className="text-[var(--accent)] hover:underline">Review</a> page, paste
          your code, choose a language, and click <strong>Review Code</strong>. Results appear in under 2 seconds.
        </p>
      </section>

      {/* Severity */}
      <section id="severity" className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-[var(--border)] pb-3">Severity Levels</h2>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-[var(--border)]">
              {[
                { badge: "danger",  label: "Error",   desc: "Bugs, crashes, security vulnerabilities. Fix before shipping." },
                { badge: "warning", label: "Warning",  desc: "Performance issues, deprecations, code smells." },
                { badge: "accent",  label: "Info",     desc: "Style, naming, unused vars, documentation gaps." },
                { badge: "success", label: "Pass",     desc: "No issues found in this file." },
              ].map((r) => (
                <tr key={r.badge} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3 w-28">
                    <span className={`badge badge-${r.badge}`}>{r.label}</span>
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* API */}
      <section id="api" className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-[var(--border)] pb-3">REST API</h2>
        <p className="text-[var(--text-secondary)] text-sm">Integrate into your CI/CD pipeline:</p>
        <div className="code-block text-xs leading-relaxed">
          <div className="text-[var(--text-tertiary)] mb-3">Request</div>
          <pre className="text-[var(--text-secondary)]">{`POST /api/review
Content-Type: application/json

{
  "code": "function hello() { eval(userInput) }",
  "language": "javascript",
  "filename": "utils.js"
}`}</pre>
          <div className="text-[var(--text-tertiary)] mt-4 mb-3">Response</div>
          <pre className="text-[var(--text-secondary)]">{`{
  "success": true,
  "result": {
    "id": "uuid",
    "linesAnalysed": 1,
    "durationMs": 1240,
    "raw": "1. Code quality score: 3/10\\n..."
  }
}`}</pre>
        </div>
      </section>

      {/* Privacy */}
      <section id="privacy" className="space-y-4">
        <h2 className="text-xl font-semibold border-b border-[var(--border)] pb-3">Privacy</h2>
        <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
          Your code is sent to the Gemini API for analysis and is never stored on our servers.
          Each review is stateless and processed in an isolated environment.
        </p>
      </section>
    </div>
  );
}
