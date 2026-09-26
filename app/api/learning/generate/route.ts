import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MODEL = process.env.OPENAI_LEARNING_MODEL || "gpt-5.6-luna";

const learningPackSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    notes: {
      type: "array",
      minItems: 1,
      maxItems: 12,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          heading: { type: "string" },
          bullets: {
            type: "array",
            minItems: 1,
            maxItems: 10,
            items: { type: "string" },
          },
        },
        required: ["heading", "bullets"],
      },
    },
    flashcards: {
      type: "array",
      minItems: 1,
      maxItems: 24,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          front: { type: "string" },
          back: { type: "string" },
        },
        required: ["front", "back"],
      },
    },
    quiz: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: { type: "string" },
          },
          correctIndex: { type: "integer", minimum: 0, maximum: 3 },
          explanation: { type: "string" },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["title", "summary", "notes", "flashcards", "quiz"],
} as const;

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text.trim();

  const parts: string[] = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function normalizePack(result: any, className: string) {
  return {
    title:
      typeof result?.title === "string" && result.title.trim()
        ? result.title.trim()
        : `${className} Study Pack`,
    summary: typeof result?.summary === "string" ? result.summary.trim() : "",
    notes: Array.isArray(result?.notes)
      ? result.notes
          .filter((section: any) => section && typeof section.heading === "string")
          .map((section: any) => ({
            heading: section.heading.trim(),
            bullets: Array.isArray(section.bullets)
              ? section.bullets.filter((item: any) => typeof item === "string" && item.trim()).map((item: string) => item.trim()).slice(0, 10)
              : [],
          }))
          .filter((section: any) => section.heading && section.bullets.length > 0)
          .slice(0, 12)
      : [],
    flashcards: Array.isArray(result?.flashcards)
      ? result.flashcards
          .filter((card: any) => card && typeof card.front === "string" && typeof card.back === "string")
          .map((card: any) => ({ front: card.front.trim(), back: card.back.trim() }))
          .filter((card: any) => card.front && card.back)
          .slice(0, 24)
      : [],
    quiz: Array.isArray(result?.quiz)
      ? result.quiz
          .filter((q: any) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length === 4)
          .map((q: any) => ({
            question: q.question.trim(),
            options: q.options.map((item: any) => String(item).trim()).slice(0, 4),
            correctIndex: Number.isInteger(q.correctIndex)
              ? Math.max(0, Math.min(3, q.correctIndex))
              : 0,
            explanation: typeof q.explanation === "string" ? q.explanation.trim() : "",
          }))
          .filter((q: any) => q.question && q.options.every((option: string) => option))
          .slice(0, 10)
      : [],
  };
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "AI learning is not configured. Add OPENAI_API_KEY to your Vercel Environment Variables, then redeploy.",
        requestId,
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = await request.json();
    const className = typeof body?.className === "string" && body.className.trim() ? body.className.trim() : "Class";

    const materials = Array.isArray(body?.materials)
      ? body.materials
          .filter((item: any) => item && typeof item.content === "string" && item.content.trim())
          .map((item: any) => ({
            title: typeof item.title === "string" && item.title.trim() ? item.title.trim() : "Class material",
            content: item.content.trim(),
          }))
          .slice(0, 20)
      : [];

    if (materials.length === 0) {
      return NextResponse.json(
        { error: "No class material was provided.", requestId },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const maxCharacters = 120000;
    let materialText = "";
    for (const material of materials) {
      const block = `MATERIAL: ${material.title}\n${material.content}\n\n---\n\n`;
      if (materialText.length + block.length > maxCharacters) {
        const remaining = maxCharacters - materialText.length;
        if (remaining > 0) materialText += block.slice(0, remaining);
        break;
      }
      materialText += block;
    }

    const system = [
      "You are the learning engine for WJ Study.",
      "Use only the supplied class materials as your source.",
      "Do not invent outside facts, examples, dates, formulas, or definitions.",
      "Preserve the terminology and meaning used in the materials.",
      "Create study aids that help a student review the material: concise notes, useful flashcards, and a practice quiz.",
      "Return only the requested JSON object.",
    ].join(" ");

    const user = `Class: ${className}\n\nCreate a complete study pack from the material below.\n- Notes: 4-12 focused sections with concise bullet points.\n- Flashcards: 12-24 high-value question/answer cards.\n- Quiz: 8-10 multiple-choice questions with exactly 4 options each, one correctIndex from 0-3, and an explanation grounded in the material.\n\nMATERIAL:\n${materialText}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        store: false,
        input: [
          {
            role: "system",
            content: [{ type: "input_text", text: system }],
          },
          {
            role: "user",
            content: [{ type: "input_text", text: user }],
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "learning_pack",
            strict: true,
            schema: learningPackSchema,
          },
        },
        max_output_tokens: 9000,
      }),
    });

    const raw = await response.text();
    let payload: any = null;
    try {
      payload = raw ? JSON.parse(raw) : null;
    } catch {
      return NextResponse.json(
        { error: `OpenAI returned a non-JSON response (HTTP ${response.status}).`, requestId },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!response.ok) {
      const providerMessage = payload?.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
      return NextResponse.json(
        { error: providerMessage, requestId },
        { status: response.status >= 400 && response.status < 600 ? response.status : 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const outputText = extractOutputText(payload);
    if (!outputText) {
      return NextResponse.json(
        { error: "OpenAI returned no study-pack content. Please try again.", requestId },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    let result: any;
    try {
      result = JSON.parse(outputText);
    } catch {
      return NextResponse.json(
        { error: "The AI returned an invalid study-pack format. Please try again.", requestId },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    const normalized = normalizePack(result, className);
    if (!normalized.notes.length || !normalized.flashcards.length || !normalized.quiz.length) {
      return NextResponse.json(
        { error: "The AI returned an incomplete study pack. Try adding more class material or regenerating.", requestId },
        { status: 502, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(normalized, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not generate the learning pack. Please try again.", requestId },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
