const DEMUCS_VERSION =
  "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function authHeaders() {
  const token = process.env.REPLICATE_API_TOKEN;
  return {
    "content-type": "application/json",
    authorization: `Bearer ${token}`
  };
}

export async function POST(request) {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return json({
      error: "Stem separation is not configured yet.",
      code: "MISSING_REPLICATE_API_TOKEN"
    }, 503);
  }

  try {
    const body = await request.json();
    const audioUrl = typeof body.audioUrl === "string" ? body.audioUrl.trim() : "";

    if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
      return json({ error: "A valid uploaded audio URL is required." }, 400);
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        ...authHeaders(),
        Prefer: "wait=1",
      Accept: "application/json"
      },
      body: JSON.stringify({
        version: DEMUCS_VERSION,
        input: {
          audio: audioUrl,
          model_name: "htdemucs",
          shifts: 1,
          overlap: 0.25,
          clip_mode: "rescale",
          mp3_bitrate: 320,
          output_format: "mp3"
        }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Replicate create error:", {
        status: response.status,
        data
      });

      const replicateMessage =
        typeof data?.detail === "string"
          ? data.detail
          : typeof data?.error === "string"
            ? data.error
            : Array.isArray(data?.errors)
              ? data.errors.join("; ")
              : "Replicate rejected the stem separation request.";

      return json({
        error: "The stem AI service could not start the separation.",
        detail: replicateMessage.slice(0, 500),
        code: "REPLICATE_CREATE_FAILED"
      }, 502);
    }

    return json({
      predictionId: data.id,
      status: data.status,
      output: data.status === "succeeded" ? data.output : null
    });
  } catch (error) {
    console.error("Stem separation error:", error);
    return json({
      error: "Could not start stem separation.",
      code: "STEM_SEPARATION_FAILED"
    }, 500);
  }
}

export async function GET(request) {
  const token = process.env.REPLICATE_API_TOKEN;

  if (!token) {
    return json({
      error: "Stem separation is not configured yet.",
      code: "MISSING_REPLICATE_API_TOKEN"
    }, 503);
  }

  const id = new URL(request.url).searchParams.get("id");

  if (!id || !/^[a-z0-9]+$/i.test(id)) {
    return json({ error: "A valid prediction ID is required." }, 400);
  }

  try {
    const response = await fetch(
      "https://api.replicate.com/v1/predictions/" + encodeURIComponent(id),
      { headers: { authorization: `Bearer ${token}` } }
    );

    const data = await response.json();

    if (!response.ok) {
      return json({
        error: "Could not read the stem separation status.",
        code: "REPLICATE_STATUS_FAILED"
      }, 502);
    }

    return json({
      predictionId: data.id,
      status: data.status,
      error: data.error || null,
      output: data.status === "succeeded" ? data.output : null
    });
  } catch (error) {
    console.error("Stem status error:", error);
    return json({
      error: "Could not check stem separation.",
      code: "STEM_STATUS_FAILED"
    }, 500);
  }
}
