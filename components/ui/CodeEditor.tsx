"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  type FC,
} from "react";
import dynamic from "next/dynamic";
import type { OnMount, OnChange } from "@monaco-editor/react";

/* ─────────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────────── */
export type EditorLanguage = "typescript" | "javascript" | "python";

export interface CodeEditorProps {
  /** Controlled value */
  value: string;
  /** Called on every change */
  onChange: (value: string) => void;
  /** Active language */
  language?: EditorLanguage;
  /** Called when language is changed via the toolbar */
  onLanguageChange?: (lang: EditorLanguage) => void;
  /** Editor height in px (default 480) */
  height?: number;
  /** Optional filename shown in the tab bar */
  filename?: string;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Extra class on the outer wrapper */
  className?: string;
}

/* ─────────────────────────────────────────────────────────────
   Language config
───────────────────────────────────────────────────────────── */
const LANGUAGES: { id: EditorLanguage; label: string; ext: string; placeholder: string }[] = [
  {
    id: "typescript",
    label: "TypeScript",
    ext: ".ts",
    placeholder: `// TypeScript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,
  },
  {
    id: "javascript",
    label: "JavaScript",
    ext: ".js",
    placeholder: `// JavaScript
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet("World"));`,
  },
  {
    id: "python",
    label: "Python",
    ext: ".py",
    placeholder: `# Python
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))`,
  },
];

/* ─────────────────────────────────────────────────────────────
   Monaco — loaded only on client, never SSR
───────────────────────────────────────────────────────────── */
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => null }
);

/* ─────────────────────────────────────────────────────────────
   Custom Monaco theme definition
───────────────────────────────────────────────────────────── */
const THEME_NAME = "code-reviewer-dark";

function defineTheme(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",       foreground: "4a5568", fontStyle: "italic" },
      { token: "keyword",       foreground: "c792ea" },
      { token: "string",        foreground: "c3e88d" },
      { token: "number",        foreground: "f78c6c" },
      { token: "type",          foreground: "82aaff" },
      { token: "function",      foreground: "82aaff" },
      { token: "variable",      foreground: "eeffff" },
      { token: "operator",      foreground: "89ddff" },
      { token: "delimiter",     foreground: "89ddff" },
      { token: "tag",           foreground: "f07178" },
      { token: "attribute.name", foreground: "ffcb6b" },
    ],
    colors: {
      "editor.background":            "#0d0d12",
      "editor.foreground":            "#e0e0f0",
      "editor.lineHighlightBackground": "#161622",
      "editor.selectionBackground":   "#6366f133",
      "editor.inactiveSelectionBackground": "#6366f118",
      "editorCursor.foreground":      "#6366f1",
      "editorLineNumber.foreground":  "#30304a",
      "editorLineNumber.activeForeground": "#6366f1",
      "editorIndentGuide.background": "#1a1a28",
      "editorIndentGuide.activeBackground": "#2e2e4a",
      "editor.wordHighlightBackground": "#6366f120",
      "editorBracketMatch.background": "#6366f130",
      "editorBracketMatch.border":    "#6366f180",
      "scrollbar.shadow":             "#00000000",
      "scrollbarSlider.background":   "#ffffff0a",
      "scrollbarSlider.hoverBackground": "#ffffff16",
      "scrollbarSlider.activeBackground": "#ffffff22",
      "editorWidget.background":      "#111118",
      "editorWidget.border":          "#1e1e2e",
      "editorSuggestWidget.background": "#111118",
      "editorSuggestWidget.selectedBackground": "#6366f122",
      "editorHoverWidget.background": "#111118",
      "editorHoverWidget.border":     "#1e1e2e",
      "input.background":             "#0d0d12",
      "input.border":                 "#1e1e2e",
      "focusBorder":                  "#6366f1",
    },
  });
  monaco.editor.setTheme(THEME_NAME);
}

/* ─────────────────────────────────────────────────────────────
   Fallback textarea (SSR or Monaco load failure)
───────────────────────────────────────────────────────────── */
const FallbackEditor: FC<{
  value: string;
  onChange: (v: string) => void;
  height: number;
  readOnly?: boolean;
}> = ({ value, onChange, height, readOnly }) => (
  <textarea
    value={value}
    onChange={(e) => onChange(e.target.value)}
    readOnly={readOnly}
    spellCheck={false}
    style={{ height }}
    className="fallback-textarea"
    placeholder="// Paste your code here..."
  />
);

/* ─────────────────────────────────────────────────────────────
   Loading skeleton
───────────────────────────────────────────────────────────── */
const EditorSkeleton: FC<{ height: number }> = ({ height }) => (
  <div className="editor-skeleton" style={{ height }}>
    <div className="skeleton-lines">
      {[80, 55, 70, 40, 65, 50, 75, 45].map((w, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }}
        />
      ))}
    </div>
  </div>
);

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────── */
export const CodeEditor: FC<CodeEditorProps> = ({
  value,
  onChange,
  language = "typescript",
  onLanguageChange,
  height = 480,
  filename,
  readOnly = false,
  className = "",
}) => {
  const [activeLang, setActiveLang]     = useState<EditorLanguage>(language);
  const [isLoading, setIsLoading]       = useState(true);
  const [hasError, setHasError]         = useState(false);
  const [isFocused, setIsFocused]       = useState(false);
  const [lineCount, setLineCount]       = useState(1);
  const [cursorPos, setCursorPos]       = useState({ line: 1, col: 1 });
  const [isMounted, setIsMounted]       = useState(false);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Sync external language prop
  useEffect(() => { setActiveLang(language); }, [language]);

  // Client-only mount guard (avoids SSR hydration mismatch)
  useEffect(() => { setIsMounted(true); }, []);

  const langConfig = LANGUAGES.find((l) => l.id === activeLang)!;
  const displayFilename = filename ?? `untitled${langConfig.ext}`;

  const handleLangChange = useCallback((lang: EditorLanguage) => {
    setActiveLang(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    defineTheme(monaco);
    setIsLoading(false);

    // Track cursor position
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });

    // Track line count
    editor.onDidChangeModelContent(() => {
      setLineCount(editor.getModel()?.getLineCount() ?? 1);
    });

    editor.onDidFocusEditorWidget(() => setIsFocused(true));
    editor.onDidBlurEditorWidget(() => setIsFocused(false));

    // Initial line count
    setLineCount(editor.getModel()?.getLineCount() ?? 1);
  }, []);

  const handleChange: OnChange = useCallback((val) => {
    onChange(val ?? "");
  }, [onChange]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore
    }
  }, [value]);

  const handleClear = useCallback(() => {
    onChange("");
    editorRef.current?.focus();
  }, [onChange]);

  /* ── Render ── */
  return (
    <>
      <style>{EDITOR_STYLES}</style>

      <div
        className={`ce-root ${isFocused ? "ce-root--focused" : ""} ${className}`}
        data-lang={activeLang}
      >
        {/* ── Top toolbar ── */}
        <div className="ce-toolbar">
          {/* Left: window dots + filename */}
          <div className="ce-toolbar__left">
            <div className="ce-dots" aria-hidden>
              <span className="ce-dot ce-dot--red" />
              <span className="ce-dot ce-dot--yellow" />
              <span className="ce-dot ce-dot--green" />
            </div>
            <span className="ce-filename">
              <FileIcon />
              {displayFilename}
            </span>
            {readOnly && <span className="ce-badge ce-badge--readonly">read-only</span>}
          </div>

          {/* Center: language tabs */}
          <div className="ce-lang-tabs" role="tablist" aria-label="Language">
            {LANGUAGES.map((l) => (
              <button
                key={l.id}
                role="tab"
                aria-selected={activeLang === l.id}
                className={`ce-lang-tab ${activeLang === l.id ? "ce-lang-tab--active" : ""}`}
                onClick={() => handleLangChange(l.id)}
                disabled={readOnly}
              >
                <LangDot lang={l.id} />
                {l.label}
              </button>
            ))}
          </div>

          {/* Right: actions */}
          <div className="ce-toolbar__right">
            <button className="ce-action-btn" onClick={handleCopy} title="Copy code" aria-label="Copy code">
              <CopyIcon />
            </button>
            {!readOnly && (
              <button className="ce-action-btn ce-action-btn--danger" onClick={handleClear} title="Clear" aria-label="Clear editor">
                <ClearIcon />
              </button>
            )}
          </div>
        </div>

        {/* ── Editor body ── */}
        <div className="ce-body" style={{ height }}>
          {/* Loading skeleton */}
          {isLoading && !hasError && isMounted && <EditorSkeleton height={height} />}

          {/* Error fallback */}
          {hasError && (
            <FallbackEditor
              value={value}
              onChange={onChange}
              height={height}
              readOnly={readOnly}
            />
          )}

          {/* SSR / not-mounted fallback */}
          {!isMounted && (
            <FallbackEditor
              value={value}
              onChange={onChange}
              height={height}
              readOnly={readOnly}
            />
          )}

          {/* Monaco */}
          {isMounted && !hasError && (
            <div
              className="ce-monaco-wrap"
              style={{ opacity: isLoading ? 0 : 1, transition: "opacity .25s ease" }}
            >
              <MonacoEditor
                height={height}
                language={activeLang}
                value={value}
                theme={THEME_NAME}
                onChange={handleChange}
                onMount={handleMount}
                loading={null}
                options={{
                  readOnly,
                  fontSize: 13.5,
                  fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
                  fontLigatures: true,
                  lineHeight: 22,
                  letterSpacing: 0.3,
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  smoothScrolling: true,
                  cursorBlinking: "smooth",
                  cursorSmoothCaretAnimation: "on",
                  renderLineHighlight: "gutter",
                  padding: { top: 16, bottom: 16 },
                  tabSize: activeLang === "python" ? 4 : 2,
                  wordWrap: "on",
                  bracketPairColorization: { enabled: true },
                  guides: { bracketPairs: true, indentation: true },
                  suggest: { showWords: false },
                  quickSuggestions: { strings: false, comments: false },
                  overviewRulerLanes: 0,
                  hideCursorInOverviewRuler: true,
                  scrollbar: {
                    verticalScrollbarSize: 5,
                    horizontalScrollbarSize: 5,
                    useShadows: false,
                  },
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  folding: true,
                  foldingHighlight: false,
                  automaticLayout: true,
                  contextmenu: true
                }}
              />
            </div>
          )}
        </div>

        {/* ── Status bar ── */}
        <div className="ce-statusbar">
          <div className="ce-statusbar__left">
            <span className="ce-status-item">
              <LangDot lang={activeLang} />
              {langConfig.label}
            </span>
            <span className="ce-status-sep" />
            <span className="ce-status-item">{lineCount} lines</span>
          </div>
          <div className="ce-statusbar__right">
            <span className="ce-status-item">
              Ln {cursorPos.line}, Col {cursorPos.col}
            </span>
            <span className="ce-status-sep" />
            <span className="ce-status-item">UTF-8</span>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Micro Icons
───────────────────────────────────────────────────────────── */
function FileIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
      <path d="M2 1h6l2 2v8H2V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ClearIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function LangDot({ lang }: { lang: EditorLanguage }) {
  const colors: Record<EditorLanguage, string> = {
    typescript: "#3b82f6",
    javascript: "#f59e0b",
    python:     "#22c55e",
  };
  return (
    <span
      style={{
        display: "inline-block",
        width: 6, height: 6,
        borderRadius: "50%",
        background: colors[lang],
        flexShrink: 0,
      }}
    />
  );
}

/* ─────────────────────────────────────────────────────────────
   Styles
───────────────────────────────────────────────────────────── */
const EDITOR_STYLES = `
  .ce-root {
    display: flex; flex-direction: column;
    background: #0d0d12;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 12px; overflow: hidden;
    transition: border-color .2s ease, box-shadow .2s ease;
    font-family: system-ui, sans-serif;
  }
  .ce-root--focused {
    border-color: rgba(99,102,241,0.45);
    box-shadow: 0 0 0 3px rgba(99,102,241,0.1), 0 8px 32px rgba(0,0,0,0.4);
  }

  /* Toolbar */
  .ce-toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 0 14px; height: 42px;
    background: #111118;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  .ce-toolbar__left { display: flex; align-items: center; gap: 10px; min-width: 0; flex-shrink: 0; }
  .ce-toolbar__right { display: flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; }

  .ce-dots { display: flex; gap: 5px; }
  .ce-dot { width: 10px; height: 10px; border-radius: 50%; }
  .ce-dot--red    { background: #ff5f57; }
  .ce-dot--yellow { background: #febc2e; }
  .ce-dot--green  { background: #28c840; }

  .ce-filename {
    display: flex; align-items: center; gap: 5px;
    font-size: 11.5px; color: rgba(255,255,255,0.35);
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    max-width: 200px;
  }

  .ce-badge {
    font-size: 10px; font-weight: 600; letter-spacing: .04em;
    text-transform: uppercase; padding: 2px 7px;
    border-radius: 99px; flex-shrink: 0;
  }
  .ce-badge--readonly {
    background: rgba(245,158,11,0.12); color: #f59e0b;
    border: 1px solid rgba(245,158,11,0.2);
  }

  /* Language tabs */
  .ce-lang-tabs {
    display: flex; gap: 2px;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; padding: 3px;
  }
  .ce-lang-tab {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 5px;
    font-size: 11.5px; font-weight: 500;
    color: rgba(255,255,255,0.35);
    background: transparent; border: none; cursor: pointer;
    transition: color .15s, background .15s;
    white-space: nowrap;
  }
  .ce-lang-tab:hover:not(:disabled) { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }
  .ce-lang-tab--active {
    background: rgba(255,255,255,0.08) !important;
    color: rgba(255,255,255,0.9) !important;
  }
  .ce-lang-tab:disabled { opacity: .4; cursor: default; }

  /* Action buttons */
  .ce-action-btn {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: none; cursor: pointer;
    color: rgba(255,255,255,0.3);
    transition: color .15s, background .15s;
  }
  .ce-action-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }
  .ce-action-btn--danger:hover { background: rgba(239,68,68,0.12); color: #ef4444; }

  /* Body */
  .ce-body { position: relative; overflow: hidden; flex-shrink: 0; }
  .ce-monaco-wrap { position: absolute; inset: 0; }

  /* Skeleton */
  .editor-skeleton {
    position: absolute; inset: 0; background: #0d0d12;
    padding: 20px 20px 20px 52px;
    display: flex; flex-direction: column; justify-content: flex-start;
  }
  .skeleton-lines { display: flex; flex-direction: column; gap: 12px; }
  .skeleton-line {
    height: 11px; border-radius: 4px;
    background: linear-gradient(90deg,
      rgba(255,255,255,0.04) 0%,
      rgba(255,255,255,0.07) 50%,
      rgba(255,255,255,0.04) 100%);
    background-size: 200% 100%;
    animation: shimmer 1.6s ease-in-out infinite;
  }

  /* Fallback textarea */
  .fallback-textarea {
    width: 100%; display: block; resize: none;
    background: #0d0d12; color: #e0e0f0;
    border: none; outline: none;
    font-family: 'JetBrains Mono','Fira Code',monospace;
    font-size: 13.5px; line-height: 1.65;
    padding: 16px 20px;
    caret-color: #6366f1;
  }
  .fallback-textarea::placeholder { color: rgba(255,255,255,0.15); }
  .fallback-textarea::selection { background: rgba(99,102,241,0.25); }

  /* Status bar */
  .ce-statusbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 14px; height: 26px;
    background: #0a0a10;
    border-top: 1px solid rgba(255,255,255,0.05);
    flex-shrink: 0;
  }
  .ce-statusbar__left, .ce-statusbar__right {
    display: flex; align-items: center; gap: 8px;
  }
  .ce-status-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 10.5px; color: rgba(255,255,255,0.25);
    font-family: 'JetBrains Mono','Fira Code',monospace;
    white-space: nowrap;
  }
  .ce-status-sep {
    width: 1px; height: 10px;
    background: rgba(255,255,255,0.1);
  }

  @keyframes shimmer {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`;

export default CodeEditor;
