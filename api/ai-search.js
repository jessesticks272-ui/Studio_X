import { authenticateRequest, authErrorResponse, hasAllowedContentLength } from "../lib/firebase-admin-auth.js";

const MODEL = "gpt-5.6-luna";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function clean(value, max = 300) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

export async function POST(request) {
  try {
    if (!hasAllowedContentLength(request, 64 * 1024)) {
      return json({ error: "Search request is too large." }, 413);
    }

    await authenticateRequest(request, ["artist", "producer", "both", "listener"]);
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return json({ error: "AI is not configured yet.", code: "MISSING_OPENAI_API_KEY" }, 503);
    }

    const body = await request.json();
    const query = clean(body?.query, 600);
    const genre = clean(body?.genre, 80) || "any";
    const tempo = clean(body?.tempo, 40) || "any";
    const vibe = clean(body?.vibe, 80) || "any";
    const duration = Number.isFinite(Number(body?.duration)) ? Number(body.duration) : null;

    const catalog = Array.isArray(body?.catalog)
      ? body.catalog.slice(0, 50).map((beat, index) => ({
          id: index,
          title: clean(beat?.title, 100),
          producer: clean(beat?.producer, 100),
          genre: clean(beat?.genre, 50),
          tempo: clean(beat?.tempo, 30),
          vibe: clean(beat?.vibe, 50),
          bpm: Number.isFinite(Number(beat?.bpm)) ? Number(beat.bpm) : null,
          price: clean(beat?.price, 30)
        }))
      : [];

    if (!query && genre === "any" && tempo === "any" && vibe === "any" && !duration) {
      return json({ error: "Give the AI at least one search signal." }, 400);
    }

    const prompt = [
      "You are LyTune Studio X's music discovery AI.",
      "Analyze the user's search intent and rank the supplied beat catalog.",
      "Do not invent catalog items. Only use the supplied catalog IDs.",
      "Treat BPM as approximate musical compatibility, not an exact requirement.",
      "Return concise, useful explanations for why the top matches fit.",
      "",
      "USER SEARCH:",
      JSON.stringify({
        extraDirection: query,
        genre,
        tempo,
        vibe,
        uploadedAudioDurationSeconds: duration
      }),
      "",
      "BEAT CATALOG:",
      JSON.stringify(catalog)
    ].join("\n");

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: MODEL,
        input: prompt,
        text: {
          format: {
            type: "json_schema",
            name: "ly_tune_ai_search",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                soundProfile: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    direction: { type: "string" },
                    genre: { type: "string" },
                    tempo: { type: "string" },
                    vibe: { type: "string" },
                    energy: { type: "string" }
                  },
                  required: ["direction", "genre", "tempo", "vibe", "energy"]
                },
                matches: {
                  type: "array",
                  items: {
                    type: "object",
                    additionalProperties: false,
                    properties: {
                      catalogId: { type: "integer" },
                      score: { type: "integer" },
                      reasons: { type: "array", items: { type: "string" } },
                      explanation: { type: "string" }
                    },
                    required: ["catalogId", "score", "reasons", "explanation"]
                  }
                }
              },
              required: ["soundProfile", "matches"]
            }
          }
        }
      })
    });

    const raw = await openaiResponse.json();
    if (!openaiResponse.ok) {
      console.error("OpenAI API error:", { status: openaiResponse.status, code: raw?.error?.code });
      return json({ error: "The AI service returned an error.", code: "OPENAI_REQUEST_FAILED" }, 502);
    }

    let parsed = null;
    if (typeof raw.output_text === "string") {
      try { parsed = JSON.parse(raw.output_text); } catch {}
    }
    if (!parsed && Array.isArray(raw.output)) {
      const textPart = raw.output
        .flatMap(item => Array.isArray(item.content) ? item.content : [])
        .find(part => part.type === "output_text" && typeof part.text === "string");
      if (textPart) {
        try { parsed = JSON.parse(textPart.text); } catch {}
      }
    }

    if (!parsed || !parsed.soundProfile || !Array.isArray(parsed.matches)) {
      return json({ error: "The AI returned an unreadable response.", code: "INVALID_AI_OUTPUT" }, 502);
    }

    const allowedIds = new Set(catalog.map(beat => beat.id));
    const matches = parsed.matches
      .filter(match => allowedIds.has(match.catalogId))
      .map(match => ({
        catalogId: match.catalogId,
        score: Math.max(0, Math.min(99, Number(match.score) || 0)),
        reasons: Array.isArray(match.reasons) ? match.reasons.slice(0, 4).map(item => clean(item, 80)) : [],
        explanation: clean(match.explanation, 300)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);

    return json({ model: MODEL, soundProfile: parsed.soundProfile, matches });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.code === "FIREBASE_ADMIN_NOT_CONFIGURED") {
      return authErrorResponse(error);
    }
    console.error("AI search error:", error);
    return json({ error: "Could not process the AI search request.", code: "AI_SEARCH_FAILED" }, 500);
  }
}

export async function GET() {
  return json({ service: "LyTune Studio X AI Search", status: "online" });
}
