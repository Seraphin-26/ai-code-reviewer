import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

/* ─── Types ─── */
interface ReviewRequestBody {
  code: string;
  language?: string;
  filename?: string;
}

interface ReviewResponse {
  success: true;
  result: {
    id: string;
    filename: string;
    language: string;
    linesAnalysed: number;
    durationMs: number;
    raw: string;
    createdAt: string;
  };
}

interface ErrorResponse {
  success: false;
  error: string;
  code: string;
}

/* ─── Constants ─── */
const MODEL_NAME = "llama-3.3-70b-versatile";
const MAX_CODE_LENGTH = 20_000;
const MAX_OUTPUT_TOKENS = 2048;

const buildPrompt = (code: string, language?: string) => `\
You are a senior software engineer and code reviewer.
Analyze the following${language ? ` ${language}` : ""} code and provide:

1. Code quality score (out of 10)
2. Bugs or potential issues
3. Performance improvements
4. Best practices suggestions
5. Refactored version of the code

Be concise but clear.

Code:
\`\`\`${language ?? ""}
${code}
\`\`\``;

/* ─── Helpers ─── */
function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
  return new Groq({ apiKey });
}

function err(
  message: string,
  code: string,
  status: number
): NextResponse<ErrorResponse> {
  return NextResponse.json({ success: false, error: message, code }, { status });
}

/* ─── POST /api/review ─── */
export async function POST(
  req: NextRequest
): Promise<NextResponse<ReviewResponse | ErrorResponse>> {
  // 1. Parse body
  let body: ReviewRequestBody;
  try {
    body = await req.json();
  } catch {
    return err("Invalid JSON body.", "INVALID_JSON", 400);
  }

  const { code, language, filename } = body;

  if (!code || typeof code !== "string" || !code.trim()) {
    return err("Field `code` must be a non-empty string.", "MISSING_CODE", 400);
  }
  if (code.length > MAX_CODE_LENGTH) {
    return err(
      `Code exceeds ${MAX_CODE_LENGTH} characters.`,
      "CODE_TOO_LONG",
      413
    );
  }

  // 2. Init client
  let client: Groq;
  try {
    client = getClient();
  } catch {
    return err(
      "AI service is not configured. Set GROQ_API_KEY in .env.local.",
      "SERVICE_UNAVAILABLE",
      503
    );
  }

  // 3. Call Groq
  const start = Date.now();
  let rawText: string;

  try {
    const result = await client.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        {
          role: "user",
          content: buildPrompt(code.trim(), language),
        },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.3,
    });

    rawText = result.choices[0]?.message?.content ?? "";

    if (!rawText.trim()) {
      return err("The AI returned an empty response.", "EMPTY_RESPONSE", 502);
    }
  } catch (e: unknown) {
    console.error("[review] Groq error:", e);
    const message =
      process.env.NODE_ENV === "development" && e instanceof Error
        ? e.message
        : "Error communicating with the AI service.";
    return err(message, "AI_ERROR", 502);
  }

  // 4. Return
  return NextResponse.json({
    success: true,
    result: {
      id: crypto.randomUUID(),
      filename: filename ?? "untitled",
      language: language ?? "unknown",
      linesAnalysed: code.trim().split("\n").length,
      durationMs: Date.now() - start,
      raw: rawText,
      createdAt: new Date().toISOString(),
    },
  });
}

export function GET(): NextResponse<ErrorResponse> {
  return err("Method not allowed. Use POST.", "METHOD_NOT_ALLOWED", 405);
}