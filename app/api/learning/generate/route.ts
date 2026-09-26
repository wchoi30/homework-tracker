import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL = "gemini-3.8-flash";

const responseSchema = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING" },
    summary: { type: "STRING" },
    notes: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          heading: { type: "STRING" },
          bullets: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
        },
        required: ["heading", "bullets"],
      },
    },
    flashcards: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          front: { type: "STRING" },
          back: { type: "STRING" },
        },
        required: ["front", "back"],
      },
    },
    quiz: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          question: { type: "STRING" },
          options: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          correctIndex: { type: "INTEGER" },
          explanation: { type: "STRING" },
        },
        required: ["question", "options", "correctIndex", "explanation"],
      },
    },
  },
  required: ["title", "summary", "notes", "flashcards", "quiz"],
};

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      configured: Boolean(GEMINI_API_KEY),
      model: MODEL,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "AI learning is not configured. Add GEMINI_API_KEY to your Vercel Environment Variables, then redeploy.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const body = await request.json();
    const className =
      typeof body?.className === "string" && body.className.trim()
        ? body.className.trim()
        : "Class";

    const materials = Array.isArray(body?.materials)
      ? body.materials
          .filter(
            (item: any) =>
              item && typeof item.content === "string" && item.content.trim()
          )
          .map((item: any) => ({
            title:
              typeof item.title === "string" && item.title.trim()
                ? item.title.trim()
                : "Class material",
            content: item.content.trim(),
          }))
          .slice(0, 20)
      : [];

    if (materials.length === 0) {
      return NextResponse.json(
        { error: "No class material was provided." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    let materialText = "";
    for (const material of materials) {
      materialText += `MATERIAL: ${material.title}\n${material.content}\n\n---\n\n`;
    }

    const systemInstruction =
      "You are the learning engine for WJ Study. Ground all generated items strictly in the provided materials. Create concise notes (4-10 sections), 10-20 high-yield flashcards, and 5-10 multiple-choice questions with exactly 4 options each.";

    const prompt = `Class: ${className}\n\nBuild a complete study pack from this material:\n\n${materialText}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: responseSchema,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || "Google Gemini API request failed." },
        { status: response.status }
      );
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawText) {
      return NextResponse.json(
        { error: "AI returned an empty response. Please try again." },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(rawText);
    return NextResponse.json(parsed, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}