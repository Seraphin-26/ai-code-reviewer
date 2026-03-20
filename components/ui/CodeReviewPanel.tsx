"use client";

import {
  useState, useCallback, useRef, useEffect, type ReactNode,
} from "react";
import { motion, AnimatePresence, useSpring, useTransform } from "framer-motion";
import { CodeEditor, type EditorLanguage } from "@/components/ui/CodeEditor";
import { useToast } from "@/components/ui/Toast";
import { useReviewHistory, parseScoreFromRaw } from "@/components/ui/useReviewHistory";
import { HistoryPanel } from "@/components/ui/HistoryPanel";
import { CopyButton, DownloadButton, buildDownloadText } from "@/components/ui/ActionButtons";
import type { HistoryEntry } from "@/components/ui/useReviewHistory";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════════════════════════ */
interface ApiResult {
  id: string; filename: string; language: string;
  linesAnalysed: number; durationMs: number; raw: string; createdAt: string;
}
interface ParsedReview {
  score: number | null; scoreLabel: string; scoreColor: string;
  bugs: BulletItem[]; performance: BulletItem[]; bestPractices: BulletItem[];
  refactoredCode: string | null; rawSections: { title: string; body: string }[];
}
interface BulletItem { text: string; severity?: "high" | "medium" | "low" }
type ReviewStatus = "idle" | "loading" | "success" | "error";
type ResultTab = "overview" | "refactored" | "raw";
type MobileTab = "editor" | "result";

/* ═══════════════════════════════════════════════════════════════════════════
   PARSER
═══════════════════════════════════════════════════════════════════════════ */
function parseReview(raw: string): ParsedReview {
  const scoreMatch = raw.match(/(?:score[:\s*]*|quality.*?:?\s*)(\d+)\s*(?:\/\s*10|out of 10)/i);
  const score = scoreMatch ? Math.min(10, Math.max(0, parseInt(scoreMatch[1], 10))) : null;
  const [scoreLabel, scoreColor] =
    score === null ? ["Unrated", "#4a4a58"]
    : score >= 8  ? ["Excellent", "#22c55e"]
    : score >= 6  ? ["Good",      "#7c6af7"]
    : score >= 4  ? ["Fair",      "#f59e0b"]
    :               ["Poor",      "#ef4444"];

  const rawSections: { title: string; body: string }[] = [];
  const parts = raw.split(/\n(?=#{1,3}\s*\d+\.|\*{0,2}\d+[.)]\s)/);
  for (const part of parts) {
    const titleMatch = part.match(/^#{0,3}\s*\*{0,2}\d+[.)]\s*(.+?)\*{0,2}[\n:]/);
    if (titleMatch) {
      rawSections.push({
        title: titleMatch[1].replace(/\*+/g, "").trim(),
        body: part.slice(titleMatch[0].length).trim(),
      });
    }
  }

  const bullets = (body: string): BulletItem[] =>
    body.split("\n")
      .map((l) => l.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "").trim())
      .filter((l) => l.length > 10 && !l.match(/^#+/))
      .map((text) => ({
        text,
        severity: (text.toLowerCase().match(/critical|danger|vuln|inject|xss/)
          ? "high" : text.toLowerCase().match(/warning|should|consider/)
          ? "medium" : "low") as "high" | "medium" | "low",
      }));

  const codeBlocks = raw.match(/```(?:[a-zA-Z]*\n)?([\s\S]*?)```/g);
  const refactoredCode = codeBlocks
    ? codeBlocks[codeBlocks.length - 1]
        .replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim()
    : null;

  const find = (kws: string[]) =>
    rawSections.find((s) => kws.some((k) => s.title.toLowerCase().includes(k)));

  return {
    score, scoreLabel, scoreColor,
    bugs:          bullets(find(["bug","issue","potential","error"])?.body ?? ""),
    performance:   bullets(find(["performance","optim"])?.body ?? ""),
    bestPractices: bullets(find(["best practice","suggestion","recommend","style"])?.body ?? ""),
    refactoredCode, rawSections,
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   SYNTAX HIGHLIGHTER
═══════════════════════════════════════════════════════════════════════════ */
const TOKEN_PATTERNS: [RegExp, string][] = [
  [/(\/\/[^\n]*)/g, "cmt"],
  [/(#[^\n]*)/g, "cmt"],
  [/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g, "str"],
  [/\b(const|let|var|function|async|await|return|if|else|for|while|class|import|export|from|type|interface|extends|new|this|try|catch|throw|default|switch|case|break|continue|typeof|instanceof|in|of|void|null|undefined|true|false|def|print|pass|elif|with|as|lambda|yield|global|raise|except|finally|and|or|not|is)\b/g, "kw"],
  [/\b([A-Z][a-zA-Z0-9_]*)\b/g, "type"],
  [/\b(\d+\.?\d*)\b/g, "num"],
  [/([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, "fn"],
];

function tokenize(code: string): ReactNode[] {
  type Span = { start: number; end: number; cls: string; text: string };
  const spans: Span[] = [];
  for (const [re, cls] of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      spans.push({ start: m.index, end: m.index + m[0].length, cls, text: m[0] });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  const final: Span[] = [];
  let cursor = 0;
  for (const span of spans) {
    if (span.start < cursor) continue;
    final.push(span); cursor = span.end;
  }
  const COLOR: Record<string, string> = {
    cmt: "#4a5568", str: "#c3e88d", kw: "#c792ea",
    type: "#82aaff", num: "#f78c6c", fn: "#82aaff",
  };
  const nodes: ReactNode[] = [];
  let pos = 0;
  for (const span of final) {
    if (span.start > pos) nodes.push(code.slice(pos, span.start));
    nodes.push(<span key={span.start} style={{ color: COLOR[span.cls] }}>{span.text}</span>);
    pos = span.end;
  }
  if (pos < code.length) nodes.push(code.slice(pos));
  return nodes;
}

/* ═══════════════════════════════════════════════════════════════════════════
   ANIMATED SCORE RING
═══════════════════════════════════════════════════════════════════════════ */
function AnimatedScoreRing({ score, color }: { score: number | null; color: string }) {
  const radius = 32;
  const circ = 2 * Math.PI * radius;
  const pct = score !== null ? score / 10 : 0;
  const spring = useSpring(0, { stiffness: 60, damping: 18 });
  const dash = useTransform(spring, (v) => `${circ * v} ${circ}`);
  useEffect(() => { spring.set(pct); }, [pct, spring]);
  return (
    <div className="relative flex items-center justify-center" style={{ width: 88, height: 88 }}>
      <div className="absolute inset-0 rounded-full opacity-25 blur-xl" style={{ background: color }} />
      <svg width="88" height="88" viewBox="0 0 88 88" className="-rotate-90">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5" />
        <motion.circle cx="44" cy="44" r={radius} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={dash as unknown as string}
          style={{ filter: `drop-shadow(0 0 8px ${color}aa)` }} />
      </svg>
      <motion.span className="absolute font-bold font-mono text-xl" style={{ color }}
        initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, type: "spring", stiffness: 200 }}>
        {score !== null ? score : "—"}
      </motion.span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLASS CARD
═══════════════════════════════════════════════════════════════════════════ */
function GlassCard({ children, className = "", delay = 0 }: {
  children: ReactNode; className?: string; delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] ${className}`}
      style={{ background: "rgba(14,14,20,0.75)", backdropFilter: "blur(20px)" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent" />
      <div className="relative">{children}</div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SYNTAX CODE BLOCK
═══════════════════════════════════════════════════════════════════════════ */
function SyntaxCodeBlock({ code, language, onCopy }: {
  code: string; language: string; onCopy?: () => void;
}) {
  const tokens = tokenize(code);
  const lines = code.split("\n");
  return (
    <GlassCard className="overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.05]"
        style={{ background: "rgba(255,255,255,0.025)" }}>
        <div className="flex gap-1.5">
          <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <span className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="w-1.5 h-1.5 rounded-full bg-[#7c6af7] flex-shrink-0" />
          <span className="font-mono text-[11px] text-white/25 truncate">
            refactored.{language === "python" ? "py" : language === "javascript" ? "js" : "ts"}
          </span>
          <span className="ml-auto text-[10px] font-mono text-white/15 flex-shrink-0">{lines.length} lines</span>
        </div>
        <CopyButton text={code} onCopied={onCopy} />
      </div>
      <div className="flex overflow-x-auto" style={{ background: "rgba(7,7,11,0.7)" }}>
        <div className="flex-shrink-0 select-none px-3 py-4 text-right font-mono text-[11px]
                        leading-[1.75] text-white/12 border-r border-white/[0.04]" style={{ minWidth: "2.5rem" }}>
          {lines.map((_, i) => <div key={i}>{i + 1}</div>)}
        </div>
        <pre className="flex-1 p-4 text-[12px] leading-[1.75] font-mono text-[#c8c8e0] whitespace-pre">
          <code>{tokens}</code>
        </pre>
      </div>
    </GlassCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BULLET CARD
═══════════════════════════════════════════════════════════════════════════ */
const SEV_DOT: Record<string, string> = { high: "#ef4444", medium: "#f59e0b", low: "#7c6af7" };

function BulletCard({ icon, title, items, accentColor, emptyText, delay }: {
  icon: ReactNode; title: string; items: BulletItem[];
  accentColor: string; emptyText: string; delay: number;
}) {
  const [open, setOpen] = useState(true);
  return (
    <GlassCard delay={delay}>
      <button onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-4 hover:bg-white/[0.02] transition-colors rounded-2xl">
        <span className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: `${accentColor}18`, color: accentColor }}>{icon}</span>
        <span className="text-[13px] font-semibold text-white/75 flex-1 text-left">{title}</span>
        {items.length > 0 && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full flex-shrink-0"
            style={{ background: `${accentColor}15`, color: accentColor }}>{items.length}</span>
        )}
        <motion.span animate={{ rotate: open ? 0 : -90 }} transition={{ duration: 0.2 }}
          className="text-white/15 flex-shrink-0"><ChevronIcon size={12} /></motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: "hidden" }}>
            <div className="px-4 pb-4 border-t border-white/[0.04]">
              {items.length === 0 ? (
                <p className="text-[12px] text-white/18 italic pt-3">{emptyText}</p>
              ) : (
                <ul className="pt-3 space-y-2.5">
                  {items.map((item, i) => (
                    <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1 }} className="flex items-start gap-3">
                      <span className="mt-[6px] w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: SEV_DOT[item.severity ?? "low"] }} />
                      <span className="text-[12px] text-white/45 leading-relaxed">{item.text}</span>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOADING SKELETON
═══════════════════════════════════════════════════════════════════════════ */
function LoadingSkeleton() {
  return (
    <div className="p-4 space-y-3">
      <style>{`
        .sk{border-radius:10px;background:linear-gradient(90deg,rgba(255,255,255,0.04) 0%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 100%);background-size:200% 100%;animation:skshimmer 1.8s ease-in-out infinite;}
        @keyframes skshimmer{0%{background-position:200% center}100%{background-position:-200% center}}
      `}</style>
      <div style={{ background: "rgba(14,14,20,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: 20 }}>
        <div className="flex items-center gap-4">
          <div className="sk flex-shrink-0" style={{ width: 72, height: 72, borderRadius: "50%" }} />
          <div className="flex-1 space-y-2 min-w-0">
            <div className="sk" style={{ height: 18, width: 110 }} />
            <div className="sk" style={{ height: 11, width: 75 }} />
            <div className="sk" style={{ height: 5, width: "100%", borderRadius: 4, marginTop: 10 }} />
          </div>
        </div>
      </div>
      {[3, 2, 4].map((n, i) => (
        <div key={i} style={{ background: "rgba(14,14,20,0.75)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.07)", padding: 16 }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="sk" style={{ width: 32, height: 32, borderRadius: 10 }} />
            <div className="sk" style={{ height: 13, width: 130 }} />
          </div>
          <div className="space-y-2">
            {Array.from({ length: n }).map((_, j) => (
              <div key={j} className="sk" style={{ height: 10, width: `${90 - j * 10}%` }} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   IDLE STATE
═══════════════════════════════════════════════════════════════════════════ */
function IdleState({ isMobile }: { isMobile?: boolean }) {
  return (
    <motion.div className="flex flex-col items-center justify-center h-full gap-5 px-8 select-none py-12"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      <div className="relative w-16 h-16">
        <motion.div className="absolute inset-0 rounded-2xl"
          style={{ background: "rgba(124,106,247,0.1)", border: "1px solid rgba(124,106,247,0.18)" }}
          animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <SparkleIcon size={28} className="text-[#7c6af7]/50" />
        </div>
        <motion.div className="absolute w-2.5 h-2.5 rounded-full"
          style={{ background: "#7c6af7", top: -4, right: -4, boxShadow: "0 0 10px #7c6af755" }}
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }} />
      </div>
      <div className="text-center space-y-1.5">
        <p className="text-sm font-semibold text-white/40">Ready to analyse</p>
        <p className="text-xs text-white/18 max-w-[185px] leading-relaxed">
          {isMobile
            ? <>Tap <span className="text-white/30 font-medium">Editor</span>, paste code, then hit <span className="text-white/30 font-medium">Review</span>.</>
            : <>Paste code on the left, then click <span className="text-white/30 font-medium">Review Code</span>.</>}
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {[["Security","#ef4444"],["Performance","#f59e0b"],["Best Practices","#7c6af7"],["Refactoring","#22c55e"]].map(([label,color],i) => (
          <motion.span key={label}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1*i+0.3 }}
            className="text-[10px] px-2.5 py-1 rounded-full border"
            style={{ borderColor:`${color}22`, background:`${color}0c`, color:`${color}80` }}>
            {label}
          </motion.span>
        ))}
      </div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   REVIEW BUTTON
═══════════════════════════════════════════════════════════════════════════ */
function ReviewButton({ onClick, status, disabled }: {
  onClick: () => void; status: ReviewStatus; disabled: boolean;
}) {
  return (
    <motion.button onClick={onClick} disabled={disabled}
      whileHover={!disabled ? { scale: 1.02 } : undefined}
      whileTap={!disabled ? { scale: 0.97 } : undefined}
      className="relative flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-semibold
                 text-white overflow-hidden disabled:opacity-40 disabled:cursor-not-allowed select-none"
      style={{ background:"linear-gradient(135deg,#7c6af7 0%,#5b4fcf 100%)", boxShadow:"0 0 20px rgba(124,106,247,0.35)" }}>
      <motion.div className="absolute inset-0 pointer-events-none"
        style={{ background:"linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.14) 50%,transparent 60%)", backgroundSize:"200% 100%" }}
        animate={!disabled ? { backgroundPosition:["200% center","-200% center"] } : undefined}
        transition={{ duration:3, repeat:Infinity, ease:"linear" }} />
      <AnimatePresence mode="wait" initial={false}>
        {status === "loading" ? (
          <motion.div key="l" className="flex items-center gap-2"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <SpinnerIcon size={13} className="animate-spin" /><span className="hidden sm:inline">Reviewing…</span>
          </motion.div>
        ) : (
          <motion.div key="i" className="flex items-center gap-2"
            initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <SparkleIcon size={13} /><span className="hidden sm:inline">Review Code</span><span className="sm:hidden">Review</span>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULT TAB BAR
═══════════════════════════════════════════════════════════════════════════ */
function TabBar({ active, onChange }: { active: ResultTab; onChange: (t: ResultTab) => void }) {
  return (
    <div className="relative flex items-center gap-0.5 p-0.5 rounded-xl"
      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.06)" }}>
      {(["overview","refactored","raw"] as ResultTab[]).map((tab) => (
        <button key={tab} onClick={() => onChange(tab)}
          className="relative px-2.5 py-1.5 rounded-lg text-[10.5px] font-medium z-10 capitalize transition-colors duration-150"
          style={{ color: active===tab ? "rgba(255,255,255,0.82)" : "rgba(255,255,255,0.26)" }}>
          {active===tab && (
            <motion.div layoutId="tab-bg" className="absolute inset-0 rounded-lg"
              style={{ background:"rgba(255,255,255,0.09)" }}
              transition={{ type:"spring", stiffness:400, damping:35 }} />
          )}
          <span className="relative">{tab}</span>
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MOBILE TAB SWITCHER
═══════════════════════════════════════════════════════════════════════════ */
function MobileTabSwitcher({ active, onChange, hasResult }: {
  active: MobileTab; onChange: (t: MobileTab) => void; hasResult: boolean;
}) {
  return (
    <div className="flex border-b border-white/[0.06]" style={{ background:"rgba(7,7,11,0.9)" }}>
      {([
        { id:"editor" as MobileTab, label:"Editor",   icon:<CodeIcon size={13}/> },
        { id:"result" as MobileTab, label:"Analysis", icon:<ChartIcon size={13}/> },
      ]).map((tab) => (
        <button key={tab.id} onClick={() => onChange(tab.id)}
          className="relative flex-1 flex items-center justify-center gap-2 py-3 text-[12px] font-medium transition-colors"
          style={{ color: active===tab.id ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.3)" }}>
          {tab.icon}{tab.label}
          {tab.id==="result" && hasResult && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#7c6af7] absolute top-2 right-[calc(50%-20px)]" />
          )}
          {active===tab.id && (
            <motion.div layoutId="mob-tab" className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-[#7c6af7]"
              transition={{ type:"spring", stiffness:400, damping:35 }} />
          )}
        </button>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULT CONTENT
═══════════════════════════════════════════════════════════════════════════ */
function ResultContent({ status, parsed, apiResult, activeTab, setActiveTab, error, onReset, resultRef, isMobile, onCopyRefactored }: {
  status: ReviewStatus; parsed: ParsedReview | null; apiResult: ApiResult | null;
  activeTab: ResultTab; setActiveTab: (t: ResultTab) => void;
  error: string | null; onReset: () => void;
  resultRef: React.RefObject<HTMLDivElement>;
  isMobile?: boolean;
  onCopyRefactored?: () => void;
}) {
  const downloadContent = apiResult ? buildDownloadText(apiResult.raw, apiResult) : "";
  const downloadFilename = apiResult ? `review-${apiResult.filename}-${new Date(apiResult.createdAt).toISOString().slice(0,10)}.txt` : "review.txt";

  return (
    <div ref={resultRef} className="flex-1 overflow-y-auto" style={{ scrollbarWidth:"thin", scrollbarColor:"rgba(255,255,255,0.07) transparent" }}>
      <AnimatePresence mode="wait">
        {status==="idle" && (
          <motion.div key="idle" className="h-full min-h-[300px]" exit={{ opacity:0, transition:{ duration:0.15 } }}>
            <IdleState isMobile={isMobile} />
          </motion.div>
        )}
        {status==="loading" && (
          <motion.div key="loading" initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}>
            <LoadingSkeleton />
          </motion.div>
        )}
        {status==="error" && (
          <motion.div key="error" initial={{ opacity:0, scale:0.97 }} animate={{ opacity:1, scale:1 }}
            className="flex flex-col items-center justify-center min-h-[300px] gap-5 px-8 py-12">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)" }}>
              <ErrorIcon size={24} className="text-red-400" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-sm font-semibold text-white/50">Review failed</p>
              <p className="text-xs text-white/22 max-w-xs leading-relaxed">{error}</p>
            </div>
            <motion.button onClick={onReset} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
              className="px-5 py-2 rounded-xl text-xs font-medium text-white/38 border border-white/[0.08] hover:border-white/[0.16] hover:text-white/58 transition-all">
              Try again
            </motion.button>
          </motion.div>
        )}
        {status==="success" && parsed && apiResult && (
          <motion.div key="success" initial={{ opacity:0 }} animate={{ opacity:1 }} className="p-4 space-y-3">
            {/* Mobile tab bar */}
            {isMobile && (
              <div className="flex justify-center pb-1">
                <TabBar active={activeTab} onChange={setActiveTab} />
              </div>
            )}
            <AnimatePresence mode="wait">
              {activeTab==="overview" && (
                <motion.div key="ov" className="space-y-3"
                  initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-10 }} transition={{ duration:0.22 }}>
                  {/* Score card */}
                  <GlassCard delay={0}>
                    <div className="p-4 sm:p-5 flex items-center gap-4">
                      <AnimatedScoreRing score={parsed.score} color={parsed.scoreColor} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="text-2xl font-bold tracking-tight text-white/88">
                            {parsed.score!==null ? `${parsed.score}/10` : "—"}
                          </span>
                          <motion.span initial={{ opacity:0, scale:0.8 }} animate={{ opacity:1, scale:1 }}
                            transition={{ delay:0.4 }}
                            className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border"
                            style={{ color:parsed.scoreColor, background:`${parsed.scoreColor}15`, borderColor:`${parsed.scoreColor}30` }}>
                            {parsed.scoreLabel}
                          </motion.span>
                        </div>
                        <p className="text-[11px] text-white/22 mt-1">Code Quality Score</p>
                      </div>
                      {/* Actions: download + meta */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <DownloadButton
                          content={downloadContent}
                          filename={downloadFilename}
                          label="Download"
                        />
                        <div className="hidden sm:block text-right space-y-0.5">
                          <p className="text-[10px] font-mono text-white/16">{apiResult.linesAnalysed} lines · {(apiResult.durationMs/1000).toFixed(1)}s</p>
                          <p className="text-[10px] font-mono text-white/16 uppercase tracking-wide">{apiResult.language}</p>
                        </div>
                      </div>
                    </div>
                    <div className="px-4 sm:px-5 pb-4">
                      <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
                        <motion.div className="h-full rounded-full" style={{ background:parsed.scoreColor }}
                          initial={{ width:0 }} animate={{ width:`${(parsed.score??0)*10}%` }}
                          transition={{ duration:1, delay:0.2, ease:[0.16,1,0.3,1] }} />
                      </div>
                    </div>
                  </GlassCard>
                  <BulletCard icon={<BugIcon size={14}/>} title="Bugs & Issues"
                    items={parsed.bugs} accentColor="#ef4444" emptyText="No critical bugs detected." delay={0.07} />
                  <BulletCard icon={<ZapIcon size={14}/>} title="Performance"
                    items={parsed.performance} accentColor="#f59e0b" emptyText="No performance issues." delay={0.14} />
                  <BulletCard icon={<CheckIcon size={14}/>} title="Best Practices"
                    items={parsed.bestPractices} accentColor="#7c6af7" emptyText="Code follows best practices." delay={0.21} />
                </motion.div>
              )}
              {activeTab==="refactored" && (
                <motion.div key="rf" initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-10 }} transition={{ duration:0.22 }}>
                  {parsed.refactoredCode
                    ? <SyntaxCodeBlock code={parsed.refactoredCode} language={apiResult.language} onCopy={onCopyRefactored} />
                    : <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <p className="text-sm text-white/22">No refactored code returned.</p>
                        <p className="text-xs text-white/14">Check the Raw tab.</p>
                      </div>}
                </motion.div>
              )}
              {activeTab==="raw" && (
                <motion.div key="raw" initial={{ opacity:0, x:10 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-10 }} transition={{ duration:0.22 }}>
                  <GlassCard>
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.05]"
                      style={{ background:"rgba(255,255,255,0.025)" }}>
                      <span className="text-[11px] text-white/22 font-mono tracking-wide">raw · markdown</span>
                      <CopyButton text={apiResult.raw} label="Copy raw" />
                    </div>
                    <pre className="p-4 text-[11px] leading-[1.8] font-mono text-white/30 whitespace-pre-wrap break-words overflow-x-auto">
                      {apiResult.raw}
                    </pre>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════════════════ */
const DEFAULT_CODE = `// Example with multiple issues — try reviewing this!
async function fetchUserData(userId) {
  // SQL injection vulnerability
  const query = "SELECT * FROM users WHERE id = " + userId;
  const result = await db.query(query);

  // O(n²) nested loop
  let processedUsers = [];
  for (let i = 0; i < result.length; i++) {
    for (let j = 0; j < result.length; j++) {
      if (result[i].role === result[j].managerId) {
        processedUsers.push(result[i]);
      }
    }
  }

  // Unused variable
  const tempData = JSON.stringify(processedUsers);

  return processedUsers;
}`;

export default function CodeReviewPanel() {
  const toast                              = useToast();
  const { addEntry }                       = useReviewHistory();
  const [code, setCode]                    = useState(DEFAULT_CODE);
  const [language, setLanguage]            = useState<EditorLanguage>("javascript");
  const [status, setStatus]                = useState<ReviewStatus>("idle");
  const [apiResult, setApiResult]          = useState<ApiResult | null>(null);
  const [parsed, setParsed]                = useState<ParsedReview | null>(null);
  const [error, setError]                  = useState<string | null>(null);
  const [activeTab, setActiveTab]          = useState<ResultTab>("overview");
  const [mobileTab, setMobileTab]          = useState<MobileTab>("editor");
  const [elapsedMs, setElapsedMs]          = useState(0);
  const [historyOpen, setHistoryOpen]      = useState(false);
  const resultRef  = useRef<HTMLDivElement>(null);
  const timerRef   = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (status === "loading") {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsedMs(Date.now() - start), 80);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [status]);

  const handleReview = useCallback(async () => {
    if (!code.trim() || status === "loading") return;
    if (code.trim().length < 10) {
      toast.warning("Too short", "Please paste at least a few lines of code.");
      return;
    }
    setStatus("loading"); setError(null); setApiResult(null); setParsed(null);
    setActiveTab("overview"); setElapsedMs(0);
    try {
      const res = await fetch("/api/review", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error ?? `HTTP ${res.status}`);

      const result: ApiResult = json.result;
      const parsedResult = parseReview(result.raw);

      setApiResult(result);
      setParsed(parsedResult);
      setStatus("success");
      setMobileTab("result");

      // Save to history
      addEntry({
        filename: result.filename,
        language: result.language,
        code,
        raw: result.raw,
        score: parseScoreFromRaw(result.raw),
        linesAnalysed: result.linesAnalysed,
        durationMs: result.durationMs,
      });

      // Toast success
      const scoreMsg = parsedResult.score !== null ? ` Score: ${parsedResult.score}/10` : "";
      toast.success("Review complete!", `${result.linesAnalysed} lines analysed in ${(result.durationMs/1000).toFixed(1)}s.${scoreMsg}`);

      setTimeout(() => resultRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      setError(msg);
      setStatus("error");
      setMobileTab("result");
      toast.error("Review failed", msg.slice(0, 80));
    }
  }, [code, language, status, toast, addEntry]);

  const handleReset = () => {
    setStatus("idle"); setError(null); setApiResult(null); setParsed(null);
    setMobileTab("editor");
  };

  const handleRestore = (entry: HistoryEntry) => {
    setCode(entry.code);
    setLanguage(entry.language as EditorLanguage);
    handleReset();
    setMobileTab("editor");
    toast.info("Restored", `Loaded review from ${entry.filename}`);
  };

  const sharedResultProps = {
    status, parsed, apiResult, activeTab, setActiveTab,
    error, onReset: handleReset, resultRef,
    onCopyRefactored: () => toast.success("Copied!", "Refactored code copied to clipboard."),
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="pr-root">
        <div className="pr-bg">
          <div className="pr-orb pr-orb-1" /><div className="pr-orb pr-orb-2" /><div className="pr-grid" />
        </div>

        {/* Top bar */}
        <header className="pr-bar">
          <div className="pr-bar-inner">
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background:"linear-gradient(135deg,#7c6af7,#5b4fcf)" }}>
                <LogoIcon size={14} />
              </div>
              <span className="text-[13px] font-semibold tracking-tight text-white/65 hidden sm:block">AI Code Reviewer</span>
              <span className="text-[13px] font-semibold tracking-tight text-white/65 sm:hidden">Reviewer</span>
            </div>
            <div className="w-px h-4 bg-white/[0.07] flex-shrink-0" />

            {/* Timer */}
            <AnimatePresence>
              {status==="loading" && (
                <motion.div key="timer" initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0 }}
                  className="flex items-center gap-2 text-[11px] font-mono text-white/28">
                  <motion.span className="w-1.5 h-1.5 rounded-full bg-[#7c6af7] flex-shrink-0"
                    animate={{ opacity:[1,0.3,1] }} transition={{ duration:1, repeat:Infinity }} />
                  {(elapsedMs/1000).toFixed(1)}s
                </motion.div>
              )}
            </AnimatePresence>

            {/* Done meta */}
            <AnimatePresence>
              {status==="success" && apiResult && (
                <motion.div initial={{ opacity:0, x:-6 }} animate={{ opacity:1, x:0 }}
                  className="hidden sm:flex items-center gap-3 text-[11px] font-mono text-white/22">
                  <span>{apiResult.linesAnalysed} lines</span>
                  <span className="w-px h-3 bg-white/[0.08]" />
                  <span>{(apiResult.durationMs/1000).toFixed(1)}s</span>
                  <span className="w-px h-3 bg-white/[0.08]" />
                  <span className="uppercase tracking-wide">{apiResult.language}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="ml-auto flex items-center gap-2 flex-shrink-0">
              {/* History button */}
              <motion.button
                onClick={() => setHistoryOpen(true)}
                whileHover={{ scale:1.05 }} whileTap={{ scale:0.95 }}
                className="w-8 h-8 flex items-center justify-center rounded-xl text-white/30
                           hover:text-white/60 hover:bg-white/[0.06] border border-white/[0.07] transition-all"
                title="Review history"
              >
                <HistoryIcon size={14} />
              </motion.button>

              <AnimatePresence>
                {status==="success" && (
                  <motion.button key="reset"
                    initial={{ opacity:0, scale:0.88 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0, scale:0.88 }}
                    onClick={handleReset} whileHover={{ scale:1.03 }} whileTap={{ scale:0.97 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium
                               text-white/32 hover:text-white/58 border transition-colors"
                    style={{ borderColor:"rgba(255,255,255,0.08)", background:"rgba(255,255,255,0.03)" }}>
                    <ResetIcon size={11} />
                    <span className="hidden sm:inline">Reset</span>
                  </motion.button>
                )}
              </AnimatePresence>
              <ReviewButton onClick={handleReview} status={status} disabled={status==="loading" || !code.trim()} />
            </div>
          </div>
        </header>

        {/* Mobile */}
        <div className="pr-mobile-layout">
          <MobileTabSwitcher active={mobileTab} onChange={setMobileTab} hasResult={status==="success"||status==="error"} />
          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait" initial={false}>
              {mobileTab==="editor" ? (
                <motion.div key="mob-editor" className="flex-1 overflow-hidden flex flex-col"
                  initial={{ opacity:0, x:-16 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:-16 }} transition={{ duration:0.2 }}>
                  <CodeEditor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage}
                    className="!rounded-none !border-none flex-1"
                    filename={`review${language==="python"?".py":language==="javascript"?".js":".ts"}`} />
                </motion.div>
              ) : (
                <motion.div key="mob-result" className="flex-1 overflow-hidden flex flex-col"
                  initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }}
                  exit={{ opacity:0, x:16 }} transition={{ duration:0.2 }}>
                  <ResultContent {...sharedResultProps} isMobile />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Desktop */}
        <div className="pr-desktop-layout">
          <div className="pr-pane">
            <div className="pr-pane-hdr">
              <CodeIcon size={11} className="text-white/18" />
              <span className="pr-pane-lbl">Editor</span>
              <span className="ml-auto text-[10px] font-mono text-white/14">{code.split("\n").length} lines</span>
            </div>
            <div style={{ flex:1, overflow:"hidden" }}>
              <CodeEditor value={code} onChange={setCode} language={language} onLanguageChange={setLanguage}
                className="!rounded-none !border-none h-full"
                filename={`review${language==="python"?".py":language==="javascript"?".js":".ts"}`} />
            </div>
          </div>
          <div className="pr-divider" />
          <div className="pr-pane">
            <div className="pr-pane-hdr">
              <ChartIcon size={11} className="text-white/18" />
              <span className="pr-pane-lbl">Analysis</span>
              <AnimatePresence>
                {status==="success" && (
                  <motion.div initial={{ opacity:0, scale:0.9 }} animate={{ opacity:1, scale:1 }} className="ml-auto">
                    <TabBar active={activeTab} onChange={setActiveTab} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <ResultContent {...sharedResultProps} />
          </div>
        </div>
      </div>

      {/* History drawer */}
      <HistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} onRestore={handleRestore} />
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ICONS
═══════════════════════════════════════════════════════════════════════════ */
type IP = { size?: number; className?: string };
const LogoIcon    = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 14 14" fill="none" className={className}><path d="M4 5L2.5 7L4 9M10 5L11.5 7L10 9M8 3.5L6 10.5" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const SparkleIcon = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M8 2v2M8 12v2M2 8h2M12 8h2M3.8 3.8l1.4 1.4M10.8 10.8l1.4 1.4M3.8 12.2l1.4-1.4M10.8 5.2l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/></svg>;
const SpinnerIcon = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5" strokeOpacity=".2"/><path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>;
const ResetIcon   = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M3 8a5 5 0 1 0 .9-2.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M3 4.5V8h3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const BugIcon     = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M8 3.5C6.6 3.5 5.5 4.6 5.5 6v3c0 1.4 1.1 2.5 2.5 2.5s2.5-1.1 2.5-2.5V6c0-1.4-1.1-2.5-2.5-2.5z" stroke="currentColor" strokeWidth="1.2"/><path d="M3 7h2.5M10.5 7H13M5.5 5L3 3M10.5 5L13 3M5.5 10.5L3 12.5M10.5 10.5L13 12.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>;
const ZapIcon     = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M9.5 2L4 9h4l-1.5 5 5.5-8H8L9.5 2z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>;
const CheckIcon   = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M3 8.5l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const CodeIcon    = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M5 5.5L2 8l3 2.5M11 5.5L14 8l-3 2.5M9 3l-2 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const ChartIcon   = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M2 13h12M4 10V7M8 10V4M12 10V6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>;
const ErrorIcon   = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M8 5v3.5M8 10.5v.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>;
const ChevronIcon = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>;
const HistoryIcon = ({size=16,className=""}:IP) => <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className={className}><path d="M8 4v4l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 5A5.5 5.5 0 1 1 3 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M1 5h2.5V2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>;

/* ═══════════════════════════════════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════════════════════════════════ */
const STYLES = `
  .pr-root { position:relative;display:flex;flex-direction:column;height:100dvh;overflow:hidden;background:#07070b;font-family:system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased; }
  .pr-bg { position:fixed;inset:0;pointer-events:none;z-index:0; }
  .pr-orb { position:absolute;border-radius:50%;filter:blur(90px); }
  .pr-orb-1 { width:650px;height:500px;top:-150px;left:-80px;background:radial-gradient(circle,rgba(124,106,247,0.14) 0%,transparent 70%); }
  .pr-orb-2 { width:450px;height:350px;bottom:-80px;right:-60px;background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,transparent 70%); }
  .pr-grid { position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,0.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.02) 1px,transparent 1px);background-size:44px 44px;mask-image:radial-gradient(ellipse 100% 80% at 50% 0%,black,transparent 90%); }
  .pr-bar { position:relative;z-index:10;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.055);backdrop-filter:blur(24px);background:rgba(7,7,11,0.85); }
  .pr-bar-inner { display:flex;align-items:center;gap:10px;padding:0 16px;height:50px; }
  .pr-mobile-layout { position:relative;z-index:1;flex:1;overflow:hidden;display:flex;flex-direction:column; }
  .pr-desktop-layout { display:none; }
  .pr-pane { display:flex;flex-direction:column;overflow:hidden;flex:1; }
  .pr-pane-hdr { display:flex;align-items:center;gap:6px;padding:0 16px;height:34px;flex-shrink:0;border-bottom:1px solid rgba(255,255,255,0.04);background:rgba(255,255,255,0.012); }
  .pr-pane-lbl { font-size:10px;font-weight:500;text-transform:uppercase;letter-spacing:0.07em;color:rgba(255,255,255,0.2); }
  .pr-divider { width:1px;flex-shrink:0;background:linear-gradient(to bottom,transparent 0%,rgba(255,255,255,0.07) 20%,rgba(255,255,255,0.07) 80%,transparent 100%); }
  @media (min-width:768px) {
    .pr-mobile-layout { display:none; }
    .pr-desktop-layout { display:flex;position:relative;z-index:1;flex:1;overflow:hidden; }
    .pr-bar-inner { padding:0 20px;gap:14px;height:52px; }
  }
`;
