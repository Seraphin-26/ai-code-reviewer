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

const buildPrompt = (sourceCode: string, programmingLanguage?: string) => `\
You are a senior software engineer doing a professional code review.
Analyze the following${programmingLanguage ? ` ${programmingLanguage}` : ""} code and provide a structured report.

---

### 1. Code Quality Score
Score out of 10 with a single-sentence justification.

### 2. Bugs or Potential Issues
For each bug: line number (if identifiable), what is wrong, and why it matters.

### 3. Performance Improvements
For each issue: root cause and concrete fix.

### 4. Best Practices Suggestions
For each suggestion: which principle is violated and how to fix it.

### 5. Refactored Version
Rewrite the full code with all fixes applied. Follow these rules strictly:

NAMING — Parameters and variables:
- Use meaningful, intention-revealing parameter names: \`userId\` not \`id\`, \`firstName\` not \`x\`, \`targetElement\` not \`el\`
- Never use single-letter names (\`x\`, \`y\`, \`i\` outside loops, \`e\` for errors) or vague names (\`data\`, \`temp\`, \`val\`, \`result\`, \`obj\`)
- Name booleans as questions: \`isActive\`, \`hasPermission\`, \`canDelete\`, \`isLoading\`
- Name functions as clear actions: \`calculateSum\`, \`fetchUserById\`, \`formatCurrency\`, \`sendWelcomeEmail\`
- Name arrays in plural: \`userList\`, \`productIds\`, \`activeFilters\`

JSDOC:
- Add a short JSDoc comment above EVERY function — even small private ones
- Format: /** Brief description of what the function does and returns */
- Include @param tags only when the parameter name alone is not self-explanatory
- Keep JSDoc to 1–3 lines maximum — no novels
- Example:
  /** Calculates the total price including tax for a given order. */
  function calculateTotalPrice(orderAmount: number, taxRate: number): number

RUNTIME CHECKS:
- Do NOT add null checks if TypeScript types already guarantee correctness
- Only add guards where a real runtime risk exists (external API responses, user input)

COMMENTS:
- Only comment when the WHY is not obvious from the code itself
- One comment per logical block maximum — never per line
- No noise comments like "renamed variable" or "using descriptive name"

STYLE:
- Write code a senior engineer would be proud of — clean, minimal, no over-engineering
- Remove dead code, unused imports, and redundant logic
- Prefer simple solutions over clever ones

Code:
\`\`\`${programmingLanguage ?? ""}
${sourceCode}
\`\`\``;

/* ─── Helpers ─── */
function getClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY is not set.");
  return new Groq({ apiKey });
}

function buildErrorResponse(
  message: string,
  errorCode: string,
  httpStatus: number
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    { success: false, error: message, code: errorCode },
    { status: httpStatus }
  );
}

/* ─── POST /api/review ─── */
export async function POST(
  request: NextRequest
): Promise<NextResponse<ReviewResponse | ErrorResponse>> {
  let requestBody: ReviewRequestBody;
  try {
    requestBody = await request.json();
  } catch {
    return buildErrorResponse("Invalid JSON body.", "INVALID_JSON", 400);
  }

  const { code, language, filename } = requestBody;

  if (!code || typeof code !== "string" || !code.trim()) {
    return buildErrorResponse(
      "Field `code` must be a non-empty string.",
      "MISSING_CODE",
      400
    );
  }
  if (code.length > MAX_CODE_LENGTH) {
    return buildErrorResponse(
      `Code exceeds ${MAX_CODE_LENGTH} characters.`,
      "CODE_TOO_LONG",
      413
    );
  }

  let groqClient: Groq;
  try {
    groqClient = getClient();
  } catch {
    return buildErrorResponse(
      "AI service is not configured. Set GROQ_API_KEY in .env.local.",
      "SERVICE_UNAVAILABLE",
      503
    );
  }

  const startTime = Date.now();
  let reviewText: string;

  try {
    const groqResponse = await groqClient.chat.completions.create({
      model: MODEL_NAME,
      messages: [
        { role: "user", content: buildPrompt(code.trim(), language) },
      ],
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.2,
    });

    reviewText = groqResponse.choices[0]?.message?.content ?? "";

    if (!reviewText.trim()) {
      return buildErrorResponse(
        "The AI returned an empty response.",
        "EMPTY_RESPONSE",
        502
      );
    }
  } catch (error: unknown) {
    console.error("[review] Groq error:", error);
    const errorMessage =
      process.env.NODE_ENV === "development" && error instanceof Error
        ? error.message
        : "Error communicating with the AI service.";
    return buildErrorResponse(errorMessage, "AI_ERROR", 502);
  }

  return NextResponse.json({
    success: true,
    result: {
      id: crypto.randomUUID(),
      filename: filename ?? "untitled",
      language: language ?? "unknown",
      linesAnalysed: code.trim().split("\n").length,
      durationMs: Date.now() - startTime,
      raw: reviewText,
      createdAt: new Date().toISOString(),
    },
  });
}

export function GET(): NextResponse<ErrorResponse> {
  return buildErrorResponse(
    "Method not allowed. Use POST.",
    "METHOD_NOT_ALLOWED",
    405
  );
}