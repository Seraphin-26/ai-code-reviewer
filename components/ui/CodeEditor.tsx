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
  value: string;
  onChange: (value: string) => void;
  language?: EditorLanguage;
  onLanguageChange?: (lang: EditorLanguage) => void;
  height?: number;
  filename?: string;
  readOnly?: boolean;
  className?: string;
}

/* ─────────────────────────────────────────────────────────────
   Language config
───────────────────────────────────────────────────────────── */
const LANGUAGES: { id: EditorLanguage; label: string; ext: string }[] = [
  { id: "typescript", label: "TypeScript", ext: ".ts" },
  { id: "javascript", label: "JavaScript", ext: ".js" },
  { id: "python",     label: "Python",     ext: ".py" },
];

/* ─────────────────────────────────────────────────────────────
   Detect mobile/touch device
───────────────────────────────────────────────────────────── */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => {
      setIsMobile(
        window.innerWidth < 768 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
      );
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/* ─────────────────────────────────────────────────────────────
   Monaco — loaded only on client, never SSR
───────────────────────────────────────────────────────────── */
const MonacoEditor = dynamic(
  () => import("@monaco-editor/react").then((m) => m.default),
  { ssr: false, loading: () => null }
);

/* ─────────────────────────────────────────────────────────────
   Custom Monaco theme
───────────────────────────────────────────────────────────── */
const THEME_NAME = "code-reviewer-dark";

function defineTheme(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme(THEME_NAME, {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment",        foreground: "4a5568", fontStyle: "italic" },
      { token: "keyword",        foreground: "c792ea" },
      { token: "string",         foreground: "c3e88d" },
      { token: "number",         foreground: "f78c6c" },
      { token: "type",           foreground: "82aaff" },
      { token: "function",       foreground: "82aaff" },
      { token: "variable",       foreground: "eeffff" },
      { token: "operator",       foreground: "89ddff" },
      { token: "delimiter",      foreground: "89ddff" },
      { token: "tag",            foreground: "f07178" },
      { token: "attribute.name", foreground: "ffcb6b" },
    ],
    colors: {
      "editor.background":                  "#0d0d12",
      "editor.foreground":                  "#e0e0f0",
      "editor.lineHighlightBackground":     "#161622",
      "editor.selectionBackground":         "#6366f133",
      "editor.inactiveSelectionBackground": "#6366f118",
      "editorCursor.foreground":            "#6366f1",
      "editorLineNumber.foreground":        "#30304a",
      "editorLineNumber.activeForeground":  "#6366f1",
      "scrollbarSlider.background":         "#ffffff0a",
      "scrollbarSlider.hoverBackground":    "#ffffff16",
      "editorWidget.background":            "#111118",
      "editorSuggestWidget.background":     "#111118",
      "editorHoverWidget.background":       "#111118",
      "input.background":                   "#0d0d12",
      "focusBorder":                        "#6366f1",
    },
  });
  monaco.editor.setTheme(THEME_NAME);
}

/* ─────────────────────────────────────────────────────────────
   Mobile Textarea Editor
───────────────────────────────────────────────────────────── */
const MobileEditor: FC<{
  value: string;
  onChange: (v: string) => void;
  language: EditorLanguage;
  onLanguageChange?: (l: EditorLanguage) => void;
  readOnly?: boolean;
  filename: string;
}> = ({ value, onChange, language, onLanguageChange, readOnly, filename }) => {
  const [lineCount, setLineCount] = useState(1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setLineCount(value.split("\n").length || 1);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Handle Tab key
    if (e.key === "Tab") {
      e.preventDefault();
      const ta = e.currentTarget;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const spaces = language === "python" ? "    " : "  ";
      const newVal = value.substring(0, start) + spaces + value.substring(end);
      onChange(newVal);
      setTimeout(() => {
        ta.selectionStart = ta.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  return (
    <>
      <style>{MOBILE_STYLES}</style>
      <div className="me-root">
        {/* Toolbar */}
        <div className="me-toolbar">
          <div className="me-toolbar-left">
            <div className="me-dots" aria-hidden>
              <span className="me-dot me-dot--red" />
              <span className="me-dot me-dot--yellow" />
              <span className="me-dot me-dot--green" />
            </div>
            <span className="me-filename">{filename}</span>
          </div>

          {/* Language selector — dropdown on mobile */}
          <select
            value={language}
            onChange={(e) => onLanguageChange?.(e.target.value as EditorLanguage)}
            disabled={readOnly}
            className="me-lang-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
        </div>

        {/* Editor area */}
        <div className="me-body">
          {/* Line numbers */}
          <div className="me-lines" aria-hidden>
            {Array.from({ length: Math.max(lineCount, 20) }).map((_, i) => (
              <div key={i} className="me-line-num">{i + 1}</div>
            ))}
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            readOnly={readOnly}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="none"
            autoComplete="off"
            className="me-textarea"
            placeholder={"// Colle ton code ici...\n\nfunction example() {\n  // ...\n}"}
          />
        </div>

        {/* Status bar */}
        <div className="me-statusbar">
          <span className="me-status-item">
            <LangDot lang={language} />
            {LANGUAGES.find(l => l.id === language)?.label}
          </span>
          <span className="me-status-sep" />
          <span className="me-status-item">{lineCount} lignes</span>
          <span className="me-status-sep" />
          <span className="me-status-item">{value.length} chars</span>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Desktop Monaco Loading skeleton
───────────────────────────────────────────────────────────── */
const EditorSkeleton: FC<{ height: number }> = ({ height }) => (
  <div className="editor-skeleton" style={{ height }}>
    <div className="skeleton-lines">
      {[80, 55, 70, 40, 65, 50, 75, 45].map((w, i) => (
        <div key={i} className="skeleton-line" style={{ width: `${w}%`, animationDelay: `${i * 80}ms` }} />
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
  const [activeLang, setActiveLang] = useState<EditorLanguage>(language);
  const [isLoading, setIsLoading]   = useState(true);
  const [hasError, setHasError]     = useState(false);
  const [isFocused, setIsFocused]   = useState(false);
  const [lineCount, setLineCount]   = useState(1);
  const [cursorPos, setCursorPos]   = useState({ line: 1, col: 1 });
  const [isMounted, setIsMounted]   = useState(false);
  const isMobile                    = useIsMobile();
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  useEffect(() => { setActiveLang(language); }, [language]);
  useEffect(() => { setIsMounted(true); }, []);

  const langConfig     = LANGUAGES.find((l) => l.id === activeLang)!;
  const displayFilename = filename ?? `untitled${langConfig.ext}`;

  const handleLangChange = useCallback((lang: EditorLanguage) => {
    setActiveLang(lang);
    onLanguageChange?.(lang);
  }, [onLanguageChange]);

  const handleMount: OnMount = useCallback((editor, monaco) => {
    editorRef.current = editor;
    defineTheme(monaco);
    setIsLoading(false);
    editor.onDidChangeCursorPosition((e) => {
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    });
    editor.onDidChangeModelContent(() => {
      setLineCount(editor.getModel()?.getLineCount() ?? 1);
    });
    editor.onDidFocusEditorWidget(() => setIsFocused(true));
    editor.onDidBlurEditorWidget(() => setIsFocused(false));
    setLineCount(editor.getModel()?.getLineCount() ?? 1);
  }, []);

  const handleChange: OnChange = useCallback((val) => {
    onChange(val ?? "");
  }, [onChange]);

  const handleCopy = useCallback(async () => {
    try { await navigator.clipboard.writeText(value); } catch {}
  }, [value]);

  const handleClear = useCallback(() => {
    onChange("");
    editorRef.current?.focus();
  }, [onChange]);

  /* ── Mobile: use native textarea ── */
  if (isMounted && isMobile) {
    return (
      <MobileEditor
        value={value}
        onChange={onChange}
        language={activeLang}
        onLanguageChange={handleLangChange}
        readOnly={readOnly}
        filename={displayFilename}
      />
    );
  }

  /* ── Desktop: Monaco ── */
  return (
    <>
      <style>{EDITOR_STYLES}</style>
      <div className={`ce-root ${isFocused ? "ce-root--focused" : ""} ${className}`} data-lang={activeLang}>
        {/* Toolbar */}
        <div className="ce-toolbar">
          <div className="ce-toolbar__left">
            <div className="ce-dots" aria-hidden>
              <span className="ce-dot ce-dot--red" />
              <span className="ce-dot ce-dot--yellow" />
              <span className="ce-dot ce-dot--green" />
            </div>
            <span className="ce-filename"><FileIcon />{displayFilename}</span>
            {readOnly && <span className="ce-badge ce-badge--readonly">read-only</span>}
          </div>
          <div className="ce-lang-tabs" role="tablist" aria-label="Language">
            {LANGUAGES.map((l) => (
              <button key={l.id} role="tab" aria-selected={activeLang === l.id}
                className={`ce-lang-tab ${activeLang === l.id ? "ce-lang-tab--active" : ""}`}
                onClick={() => handleLangChange(l.id)} disabled={readOnly}>
                <LangDot lang={l.id} />{l.label}
              </button>
            ))}
          </div>
          <div className="ce-toolbar__right">
            <button className="ce-action-btn" onClick={handleCopy} title="Copy" aria-label="Copy"><CopyIcon /></button>
            {!readOnly && (
              <button className="ce-action-btn ce-action-btn--danger" onClick={handleClear} title="Clear" aria-label="Clear"><ClearIcon /></button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="ce-body" style={{ height }}>
          {isLoading && !hasError && isMounted && <EditorSkeleton height={height} />}
          {hasError && (
            <textarea value={value} onChange={(e) => onChange(e.target.value)}
              readOnly={readOnly} spellCheck={false} style={{ height }}
              className="fallback-textarea" placeholder="// Paste your code here..." />
          )}
          {!isMounted && (
            <textarea value={value} onChange={(e) => onChange(e.target.value)}
              readOnly={readOnly} spellCheck={false} style={{ height }}
              className="fallback-textarea" placeholder="// Paste your code here..." />
          )}
          {isMounted && !hasError && (
            <div className="ce-monaco-wrap" style={{ opacity: isLoading ? 0 : 1, transition: "opacity .25s ease" }}>
              <MonacoEditor height={height} language={activeLang} value={value}
                theme={THEME_NAME} onChange={handleChange} onMount={handleMount} loading={null}
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
                  scrollbar: { verticalScrollbarSize: 5, horizontalScrollbarSize: 5, useShadows: false },
                  lineNumbersMinChars: 3,
                  glyphMargin: false,
                  folding: true,
                  foldingHighlight: false,
                  automaticLayout: true,
                  contextmenu: true,
                }}
              />
            </div>
          )}
        </div>

        {/* Status bar */}
        <div className="ce-statusbar">
          <div className="ce-statusbar__left">
            <span className="ce-status-item"><LangDot lang={activeLang} />{langConfig.label}</span>
            <span className="ce-status-sep" />
            <span className="ce-status-item">{lineCount} lines</span>
          </div>
          <div className="ce-statusbar__right">
            <span className="ce-status-item">Ln {cursorPos.line}, Col {cursorPos.col}</span>
            <span className="ce-status-sep" />
            <span className="ce-status-item">UTF-8</span>
          </div>
        </div>
      </div>
    </>
  );
};

/* ─────────────────────────────────────────────────────────────
   Icons
───────────────────────────────────────────────────────────── */
function FileIcon() {
  return <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5 }}>
    <path d="M2 1h6l2 2v8H2V1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M7 1v3h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>;
}
function CopyIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <rect x="4" y="4" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
    <path d="M2 10V2h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}
function ClearIcon() {
  return <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
    <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>;
}
function LangDot({ lang }: { lang: EditorLanguage }) {
  const colors: Record<EditorLanguage, string> = {
    typescript: "#3b82f6",
    javascript: "#f59e0b",
    python:     "#22c55e",
  };
  return <span style={{ display:"inline-block", width:6, height:6, borderRadius:"50%", background:colors[lang], flexShrink:0 }} />;
}

/* ─────────────────────────────────────────────────────────────
   Mobile styles
───────────────────────────────────────────────────────────── */
const MOBILE_STYLES = `
  .me-root {
    display: flex; flex-direction: column;
    background: #0d0d12; height: 100%;
    font-family: system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  /* Toolbar */
  .me-toolbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 12px; height: 44px; flex-shrink: 0;
    background: #111118;
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .me-toolbar-left { display: flex; align-items: center; gap: 8px; min-width: 0; }
  .me-dots { display: flex; gap: 4px; flex-shrink: 0; }
  .me-dot { width: 9px; height: 9px; border-radius: 50%; }
  .me-dot--red    { background: #ff5f57; }
  .me-dot--yellow { background: #febc2e; }
  .me-dot--green  { background: #28c840; }
  .me-filename {
    font-size: 11px; color: rgba(255,255,255,0.3);
    font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    max-width: 140px;
  }

  /* Language select dropdown */
  .me-lang-select {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 8px;
    color: rgba(255,255,255,0.7);
    font-size: 12px; font-weight: 500;
    padding: 6px 10px;
    cursor: pointer;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    flex-shrink: 0;
  }
  .me-lang-select:focus {
    border-color: rgba(99,102,241,0.5);
  }

  /* Editor body */
  .me-body {
    flex: 1; display: flex; overflow: hidden;
    position: relative;
  }

  /* Line numbers */
  .me-lines {
    width: 40px; flex-shrink: 0;
    background: rgba(0,0,0,0.2);
    border-right: 1px solid rgba(255,255,255,0.04);
    overflow: hidden;
    padding: 14px 0;
  }
  .me-line-num {
    height: 24px; display: flex; align-items: center; justify-content: flex-end;
    padding-right: 8px;
    font-size: 11px; font-family: monospace;
    color: rgba(255,255,255,0.15);
    user-select: none;
  }

  /* Textarea */
  .me-textarea {
    flex: 1; min-width: 0;
    background: transparent;
    border: none; outline: none; resize: none;
    color: #e0e0f0;
    font-family: 'JetBrains Mono', 'Fira Code', Menlo, monospace;
    font-size: 13px; line-height: 24px;
    padding: 14px 14px 14px 10px;
    caret-color: #6366f1;
    /* Prevent iOS zoom on focus */
    -webkit-text-size-adjust: 100%;
    tab-size: 2;
    overflow-y: auto;
    white-space: pre;
    overflow-x: auto;
    word-break: normal;
    /* Better touch scrolling */
    -webkit-overflow-scrolling: touch;
  }
  .me-textarea::placeholder {
    color: rgba(255,255,255,0.12);
  }
  .me-textarea::selection {
    background: rgba(99,102,241,0.3);
  }

  /* Status bar */
  .me-statusbar {
    display: flex; align-items: center; gap: 8px;
    padding: 0 12px; height: 28px; flex-shrink: 0;
    background: #0a0a10;
    border-top: 1px solid rgba(255,255,255,0.05);
    overflow: hidden;
  }
  .me-status-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 10px; color: rgba(255,255,255,0.25);
    font-family: monospace; white-space: nowrap;
  }
  .me-status-sep {
    width: 1px; height: 10px; flex-shrink: 0;
    background: rgba(255,255,255,0.1);
  }
`;

/* ─────────────────────────────────────────────────────────────
   Desktop styles
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
  .ce-toolbar {
    display: flex; align-items: center; gap: 12px;
    padding: 0 14px; height: 42px;
    background: #111118;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
  }
  .ce-toolbar__left  { display: flex; align-items: center; gap: 10px; min-width: 0; flex-shrink: 0; }
  .ce-toolbar__right { display: flex; align-items: center; gap: 4px; margin-left: auto; flex-shrink: 0; }
  .ce-dots { display: flex; gap: 5px; }
  .ce-dot { width: 10px; height: 10px; border-radius: 50%; }
  .ce-dot--red    { background: #ff5f57; }
  .ce-dot--yellow { background: #febc2e; }
  .ce-dot--green  { background: #28c840; }
  .ce-filename {
    display: flex; align-items: center; gap: 5px;
    font-size: 11.5px; color: rgba(255,255,255,0.35);
    font-family: 'JetBrains Mono', monospace;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;
  }
  .ce-badge { font-size: 10px; font-weight: 600; letter-spacing: .04em; text-transform: uppercase; padding: 2px 7px; border-radius: 99px; flex-shrink: 0; }
  .ce-badge--readonly { background: rgba(245,158,11,0.12); color: #f59e0b; border: 1px solid rgba(245,158,11,0.2); }
  .ce-lang-tabs {
    display: flex; gap: 2px;
    background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06);
    border-radius: 7px; padding: 3px;
  }
  .ce-lang-tab {
    display: flex; align-items: center; gap: 5px;
    padding: 4px 10px; border-radius: 5px;
    font-size: 11.5px; font-weight: 500; color: rgba(255,255,255,0.35);
    background: transparent; border: none; cursor: pointer;
    transition: color .15s, background .15s; white-space: nowrap;
  }
  .ce-lang-tab:hover:not(:disabled) { color: rgba(255,255,255,0.65); background: rgba(255,255,255,0.05); }
  .ce-lang-tab--active { background: rgba(255,255,255,0.08) !important; color: rgba(255,255,255,0.9) !important; }
  .ce-lang-tab:disabled { opacity: .4; cursor: default; }
  .ce-action-btn {
    width: 28px; height: 28px; border-radius: 6px;
    display: flex; align-items: center; justify-content: center;
    background: transparent; border: none; cursor: pointer;
    color: rgba(255,255,255,0.3); transition: color .15s, background .15s;
  }
  .ce-action-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.7); }
  .ce-action-btn--danger:hover { background: rgba(239,68,68,0.12); color: #ef4444; }
  .ce-body { position: relative; overflow: hidden; flex-shrink: 0; }
  .ce-monaco-wrap { position: absolute; inset: 0; }
  .editor-skeleton {
    position: absolute; inset: 0; background: #0d0d12;
    padding: 20px 20px 20px 52px;
    display: flex; flex-direction: column; justify-content: flex-start;
  }
  .skeleton-lines { display: flex; flex-direction: column; gap: 12px; }
  .skeleton-line {
    height: 11px; border-radius: 4px;
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.04) 100%);
    background-size: 200% 100%; animation: shimmer 1.6s ease-in-out infinite;
  }
  .fallback-textarea {
    width: 100%; display: block; resize: none;
    background: #0d0d12; color: #e0e0f0; border: none; outline: none;
    font-family: 'JetBrains Mono','Fira Code',monospace;
    font-size: 13.5px; line-height: 1.65; padding: 16px 20px; caret-color: #6366f1;
  }
  .fallback-textarea::placeholder { color: rgba(255,255,255,0.15); }
  .ce-statusbar {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0 14px; height: 26px; background: #0a0a10;
    border-top: 1px solid rgba(255,255,255,0.05); flex-shrink: 0;
  }
  .ce-statusbar__left, .ce-statusbar__right { display: flex; align-items: center; gap: 8px; }
  .ce-status-item {
    display: flex; align-items: center; gap: 5px;
    font-size: 10.5px; color: rgba(255,255,255,0.25);
    font-family: 'JetBrains Mono',monospace; white-space: nowrap;
  }
  .ce-status-sep { width: 1px; height: 10px; background: rgba(255,255,255,0.1); }
  @keyframes shimmer { 0% { background-position: 200% center; } 100% { background-position: -200% center; } }
`;

export default CodeEditor;