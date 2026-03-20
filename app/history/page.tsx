import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "History" };

const MOCK = [
  { id: "1", filename: "auth.service.ts",    language: "TypeScript", danger: 1, warning: 1, accent: 1, lines: 84,  ms: 1320, when: "2 min ago"  },
  { id: "2", filename: "api/users.py",        language: "Python",     danger: 2, warning: 2, accent: 1, lines: 120, ms: 1800, when: "1 hr ago"   },
  { id: "3", filename: "main.go",             language: "Go",         danger: 0, warning: 0, accent: 0, lines: 56,  ms: 900,  when: "3 hr ago"   },
  { id: "4", filename: "UserController.java", language: "Java",       danger: 0, warning: 2, accent: 0, lines: 203, ms: 2100, when: "Yesterday"  },
  { id: "5", filename: "Form.tsx",            language: "TypeScript", danger: 0, warning: 0, accent: 1, lines: 67,  ms: 1050, when: "2 days ago" },
];

export default function HistoryPage() {
  return (
    <div className="mx-auto max-w-4xl px-6 py-12 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">History</h1>
          <p className="text-[var(--text-secondary)] text-sm mt-1">Your recent code reviews.</p>
        </div>
        <Link href="/review" className="btn btn-primary text-sm">+ New Review</Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Reviews", value: "5"    },
          { label: "Issues Found",  value: "11"   },
          { label: "Avg Duration",  value: "1.4s" },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center space-y-1">
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs text-[var(--text-tertiary)]">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
                {["File", "Language", "Issues", "Lines", "Duration", "When"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-[var(--text-tertiary)] uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {MOCK.map((row) => (
                <tr key={row.id} className="hover:bg-[var(--surface-2)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{row.filename}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.language}</td>
                  <td className="px-4 py-3">
                    {row.danger === 0 && row.warning === 0 && row.accent === 0 ? (
                      <span className="badge badge-success">Clean</span>
                    ) : (
                      <div className="flex gap-1.5 flex-wrap">
                        {row.danger  > 0 && <span className="badge badge-danger">{row.danger}</span>}
                        {row.warning > 0 && <span className="badge badge-warning">{row.warning}</span>}
                        {row.accent  > 0 && <span className="badge badge-accent">{row.accent}</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-[var(--text-secondary)]">{row.lines}</td>
                  <td className="px-4 py-3 text-[var(--text-secondary)] font-mono text-xs">{(row.ms / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 text-[var(--text-tertiary)] text-xs">{row.when}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
