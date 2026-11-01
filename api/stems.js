import { del } from "@vercel/blob";
import { authenticateRequest, authErrorResponse, hasAllowedContentLength, consumeRateLimit } from "../lib/firebase-admin-auth.js";

const DEMUCS_VERSION =
  "cjwbw/demucs:25a173108cff36ef9f80f854c162d01df9e6528be175794b81158fa03836d953";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function authHeaders() {
  return {
    "content-type": "application/json",
    authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`
  };
}

function isApprovedAudioUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    return url.hostname === "firebasestorage.googleapis.com"
      || url.hostname === "storage.googleapis.com"
      || url.hostname.endsWith(".public.blob.vercel-storage.com");
  } catch {
    return false;
  }
}

export async function POST(request) {
  try {
    if (!hasAllowedContentLength(request, 8 * 1024)) {
      return json({ error: "Stem separation request is too large." }, 413);
    }

    const { user, db } = await authenticateRequest(request, ["artist", "producer", "both", "listener"]);
    if (!await consumeRateLimit(db, user.uid, "stem-separation", 3, 60 * 60 * 1000)) {
      return json({ error: "Stem separation limit reached. Try again later." }, 429);
    }
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return json({ error: "Stem separation is not configured yet.", code: "MISSING_REPLICATE_API_TOKEN" }, 503);
    }

    const body = await request.json();
    const audioUrl = typeof body?.audioUrl === "string" ? body.audioUrl.trim() : "";
    if (!audioUrl || !isApprovedAudioUrl(audioUrl)) {
      return json({ error: "Use an HTTPS audio file hosted by an approved LyTune storage provider." }, 400);
    }

    const response = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: { ...authHeaders(), Prefer: "wait=1", Accept: "application/json" },
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
      console.error("Replicate create error:", { status: response.status, detail: data?.detail });
      return json({ error: "The stem AI service could not start the separation.", code: "REPLICATE_CREATE_FAILED" }, 502);
    }

    await db.collection("stemJobs").doc(data.id).set({
      ownerId: user.uid,
      status: data.status || "starting",
      createdAt: new Date().toISOString(),
      inputBlobUrl: audioUrl,
      inputDeleted: false
    });

    return json({
      predictionId: data.id,
      status: data.status,
      output: data.status === "succeeded" ? data.output : null
    }, 201);
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.code === "FIREBASE_ADMIN_NOT_CONFIGURED") {
      return authErrorResponse(error);
    }
    console.error("Stem separation error:", error);
    return json({ error: "Could not start stem separation.", code: "STEM_SEPARATION_FAILED" }, 500);
  }
}

export async function GET(request) {
  try {
    const { user, db } = await authenticateRequest(request, ["producer"]);
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) {
      return json({ error: "Stem separation is not configured yet.", code: "MISSING_REPLICATE_API_TOKEN" }, 503);
    }

    const id = new URL(request.url).searchParams.get("id");
    if (!id || !/^[a-z0-9-]{1,80}$/i.test(id)) {
      return json({ error: "A valid prediction ID is required." }, 400);
    }

    const jobSnapshot = await db.collection("stemJobs").doc(id).get();
    if (!jobSnapshot.exists || jobSnapshot.data()?.ownerId !== user.uid) {
      return json({ error: "Stem job not found." }, 404);
    }

    const response = await fetch(
      "https://api.replicate.com/v1/predictions/" + encodeURIComponent(id),
      { headers: { authorization: `Bearer ${token}` } }
    );
    const data = await response.json();
    if (!response.ok) {
      return json({ error: "Could not read the stem separation status.", code: "REPLICATE_STATUS_FAILED" }, 502);
    }

    const job = jobSnapshot.data() || {};
    let inputDeleted = Boolean(job.inputDeleted);
    if (["succeeded", "failed", "canceled"].includes(data.status) && job.inputBlobUrl && !inputDeleted) {
      try {
        await del(job.inputBlobUrl);
        inputDeleted = true;
      } catch (deleteError) {
        console.warn("Could not remove completed stem input blob:", deleteError?.message);
      }
    }

    await jobSnapshot.ref.set({
      status: data.status || "unknown",
      inputDeleted,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    return json({
      predictionId: data.id,
      status: data.status,
      error: data.error || null,
      output: data.status === "succeeded" ? data.output : null
    });
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.code === "FIREBASE_ADMIN_NOT_CONFIGURED") {
      return authErrorResponse(error);
    }
    console.error("Stem status error:", error);
    return json({ error: "Could not check the stem separation status.", code: "STEM_STATUS_FAILED" }, 500);
  }
}
