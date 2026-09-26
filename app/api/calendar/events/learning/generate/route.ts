import { NextResponse } from "next/server";

const MODEL = process.env.OPENAI_LEARNING_MODEL || "gpt-5.6-luna";

function extractOutputText(payload: any): string {
  if (typeof payload?.output_text === "string") return payload.output_text;
  const parts: string[] = [];
  for (const item of payload?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function parseJson(text: string): any {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("The AI returned an invalid learning pack.");
  }
}

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI learning is not configured yet. Add OPENAI_API_KEY to your Vercel environment variables." },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const className = typeof body?.className === "string" ? body.className.trim() : "Class";
    const materials = Array.isArray(body?.materials)
      ? body.materials
          .filter((item: any) => item && typeof item.content === "string")
          .map((item: any) => ({
            title: typeof item.title === "string" ? item.title : "Untitled material",
            content: item.content.slice(0, 30000),
          }))
          .slice(0, 20)
      : [];

    const materialText = materials
      .map((item: { title: string; content: string }) => `MATERIAL: ${item.title}\n${item.content}`)
      .join("\n\n---\n\n");

    if (!materialText.trim()) {
      return NextResponse.json({ error: "No class material was provided." }, { status: 400 });
    }

    const system = `You are the learning engine for a student study app. Create a useful study pack for the named class using ONLY the supplied class materials. Do not add outside facts, invented examples, or unsupported claims. Preserve terminology from the materials. When the materials are ambiguous or incomplete, reflect that uncertainty rather than filling gaps. Return JSON only.`;
    const user = `Class: ${className}\n\nCreate:\n1) concise notes organized into sections with bullet points,\n2) 12-20 flashcards that test important concepts/definitions,\n3) an 8-question multiple-choice practice quiz with 4 options each and explanations.\n\nReturn exactly this JSON shape:\n{\n  "title": string,\n  "summary": string,\n  "notes": [{"heading": string, "bullets": [string]}],\n  "flashcards": [{"front": string, "back": string}],\n  "quiz": [{"question": string, "options": [string,string,string,string], "correctIndex": number, "explanation": string}]\n}\n\nMaterials:\n${materialText}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [
          { role: "system", content: [{ type: "input_text", text: system }] },
          { role: "user", content: [{ type: "input_text", text: user }] },
        ],
        max_output_tokens: 7000,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      const message = payload?.error?.message || "OpenAI learning generation failed.";
      return NextResponse.json({ error: message }, { status: response.status });
    }

    const outputText = extractOutputText(payload);
    const result = parseJson(outputText);

    const normalized = {
      title: typeof result?.title === "string" ? result.title : `${className} Study Pack`,
      summary: typeof result?.summary === "string" ? result.summary : "",
      notes: Array.isArray(result?.notes)
        ? result.notes
            .filter((section: any) => section && typeof section.heading === "string")
            .map((section: any) => ({
              heading: section.heading,
              bullets: Array.isArray(section.bullets)
                ? section.bullets.filter((item: any) => typeof item === "string").slice(0, 10)
                : [],
            }))
            .slice(0, 12)
        : [],
      flashcards: Array.isArray(result?.flashcards)
        ? result.flashcards
            .filter((card: any) => card && typeof card.front === "string" && typeof card.back === "string")
            .map((card: any) => ({ front: card.front, back: card.back }))
            .slice(0, 30)
        : [],
      quiz: Array.isArray(result?.quiz)
        ? result.quiz
            .filter((q: any) => q && typeof q.question === "string" && Array.isArray(q.options) && q.options.length >= 4)
            .map((q: any) => ({
              question: q.question,
              options: q.options.filter((item: any) => typeof item === "string").slice(0, 4),
              correctIndex: Math.max(0, Math.min(3, Number.isInteger(q.correctIndex) ? q.correctIndex : 0)),
              explanation: typeof q.explanation === "string" ? q.explanation : "",
            }))
            .filter((q: any) => q.options.length === 4)
            .slice(0, 12)
        : [],
    };

    return NextResponse.json(normalized);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Could not generate the learning pack." },
      { status: 500 }
    );
  }
}
