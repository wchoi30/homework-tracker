import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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

// Fallback rule-based extractor if all upstream AI models are congested
function buildDeterministicPack(className: string, fullText: string) {
  const paragraphs = fullText
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20);

  const sentences = fullText
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 25);

  const notes = (paragraphs.length ? paragraphs : [fullText])
    .slice(0, 6)
    .map((para, i) => ({
      heading: `Key Concept ${i + 1}`,
      bullets: para
        .split(/(?<=[.?!])\s+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 4),
    }));

  const flashcards: Array<{ front: string; back: string }> = [];
  const termRegex = /([A-Z][a-zA-Z0-9\s]{2,25})\s*(?::|—|-|is defined as|refers to)\s*([^.]+)/g;
  let match;
  while ((match = termRegex.exec(fullText)) !== null && flashcards.length < 12) {
    flashcards.push({ front: `What is ${match[1].trim()}?`, back: match[2].trim() });
  }

  if (flashcards.length === 0) {
    sentences.slice(0, 8).forEach((s) => {
      const words = s.split(" ");
      const keyword = words.find((w) => w.length > 6) || words[0];
      flashcards.push({
        front: s.replace(keyword, "______"),
        back: keyword.replace(/[^a-zA-Z]/g, ""),
      });
    });
  }

  const allWords = Array.from(new Set(fullText.match(/\b[A-Za-z]{5,15}\b/g) || []));
  const quiz = sentences.slice(0, 6).map((s) => {
    const words = s.split(/\s+/).filter((w) => w.length > 5);
    const answer = words[Math.floor(words.length / 2)]?.replace(/[^a-zA-Z]/g, "") || "Answer";
    const distractors = allWords
      .filter((w) => w.toLowerCase() !== answer.toLowerCase())
      .sort(() => 0.5 - Math.random())
      .slice(0, 3);
    const options = [answer, ...distractors].sort(() => 0.5 - Math.random());

    return {
      question: s.replace(new RegExp(`\\b${answer}\\b`, "i"), "_______"),
      options,
      correctIndex: Math.max(0, options.indexOf(answer)),
      explanation: `Extracted directly from notes: "${s.slice(0, 120)}..."`,
    };
  });

  return {
    title: `${className} Study Pack (Offline Mode)`,
    summary: "Generated directly from your source material while AI servers are busy.",
    notes,
    flashcards,
    quiz,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;

  try {
    const body = await request.json();
    const className = typeof body?.className === "string" && body.className.trim() ? body.className.trim() : "Class";
    const materials = Array.isArray(body?.materials) ? body.materials.filter((m: any) => m && m.content) : [];

    if (materials.length === 0) {
      return NextResponse.json({ error: "No class material was provided." }, { status: 400 });
    }

    const materialText = materials.map((m: any) => `MATERIAL: ${m.title || "Notes"}\n${m.content}`).join("\n\n---\n\n");

    // Try alternate Gemini model identifiers that might have available server slots
    const MODEL_CANDIDATES = [
      "gemini-3.8-flash",
      "gemini-3.8-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.6-flash-lite",
    ];

    if (apiKey) {
      for (const model of MODEL_CANDIDATES) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{ text: "You are an academic learning assistant. Ground all study materials strictly in the provided content." }],
              },
              contents: [{ role: "user", parts: [{ text: `Class: ${className}\n\n${materialText}` }] }],
              generationConfig: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
              },
            }),
          });

          if (response.ok) {
            const data = await response.json();
            const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              return NextResponse.json(JSON.parse(text), { status: 200 });
            }
          }
        } catch {
          // Continue to next model candidate
        }
      }
    }

    // If Gemini is entirely experiencing high demand (503), fall back to offline parser
    const fallbackPack = buildDeterministicPack(className, materialText);
    return NextResponse.json(fallbackPack, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to generate learning pack." }, { status: 500 });
  }
}