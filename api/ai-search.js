const MODEL = "gpt-5.6-luna";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function clean(value, max = 300) {
  return typeof value === "string" ? value.slice(0, max).trim() : "";
}

export async function POST(request) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return json({
      error: "AI is not configured yet.",
      code: "MISSING_OPENAI_API_KEY"
    }, 503);
  }

  try {
    const body = await request.json();

    const query = clean(body.query, 600);
    const genre = clean(body.genre, 80) || "any";
    const tempo = clean(body.tempo, 40) || "any";
    const vibe = clean(body.vibe, 80) || "any";
    const duration = Number.isFinite(Number(body.duration)) ? Number(body.duration) : null;

    const catalog = Array.isArray(body.catalog)
      ? body.catalog.slice(0, 50).map((b, index) => ({
          id: index,
          title: clean(b?.title, 100),
          producer: clean(b?.producer, 100),
          genre: clean(b?.genre, 50),
          tempo: clean(b?.tempo, 30),
          vibe: clean(b?.vibe, 50),
          bpm: Number.isFinite(Number(b?.bpm)) ? Number(b.bpm) : null,
          price: clean(b?.price, 30)
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
                      reasons: {
                        type: "array",
                        items: { type: "string" }
                      },
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
      console.error("OpenAI API error:", raw);
      return json({
        error: "The AI service returned an error.",
        code: "OPENAI_REQUEST_FAILED"
      }, 502);
    }

    let parsed = null;

    if (raw.output_text) {
      try {
        parsed = JSON.parse(raw.output_text);
      } catch {}
    }

    if (!parsed && Array.isArray(raw.output)) {
      const textPart = raw.output
        .flatMap(item => Array.isArray(item.content) ? item.content : [])
        .find(part => part.type === "output_text" && typeof part.text === "string");

      if (textPart) {
        try {
          parsed = JSON.parse(textPart.text);
        } catch {}
      }
    }

    if (!parsed) {
      return json({
        error: "The AI returned an unreadable response.",
        code: "INVALID_AI_OUTPUT"
      }, 502);
    }

    const allowedIds = new Set(catalog.map(b => b.id));

    parsed.matches = Array.isArray(parsed.matches)
      ? parsed.matches
          .filter(m => allowedIds.has(m.catalogId))
          .map(m => ({
            catalogId: m.catalogId,
            score: Math.max(0, Math.min(99, Number(m.score) || 0)),
            reasons: Array.isArray(m.reasons) ? m.reasons.slice(0, 4).map(x => clean(x, 80)) : [],
            explanation: clean(m.explanation, 300)
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
      : [];

    return json({
      model: MODEL,
      soundProfile: parsed.soundProfile,
      matches: parsed.matches
    });
  } catch (error) {
    console.error("AI search error:", error);
    return json({
      error: "Could not process the AI search request.",
      code: "AI_SEARCH_FAILED"
    }, 500);
  }
}

export async function GET() {
  return json({
    service: "LyTune Studio X AI Search",
    status: "online"
  });
}
