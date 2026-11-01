import { issueSignedToken, presignUrl } from "@vercel/blob";
import { authenticateRequest, authErrorResponse, hasAllowedContentLength, consumeRateLimit } from "../lib/firebase-admin-auth.js";

export async function POST(request) {
  try {
    if (!hasAllowedContentLength(request, 1024 * 1024)) {
      return Response.json({ error: "Upload authorization request is too large." }, { status: 413 });
    }

    const { user, db } = await authenticateRequest(request, ["artist", "producer", "both", "listener"]);
    if (!await consumeRateLimit(db, user.uid, "stem-input-upload", 5, 60 * 60 * 1000)) {
      return Response.json({ error: "Upload limit reached. Try again later." }, { status: 429 });
    }
    const body = await request.json();
    const pathname = String(body?.pathname || "").trim();
    const contentType = String(body?.contentType || "").trim().toLowerCase();

    const allowed = [
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/mp4",
      "audio/x-m4a",
      "audio/ogg",
      "audio/webm"
    ];

    const segments = pathname.split("/");
    const safePath = pathname.length <= 300
      && segments.length >= 3
      && segments[0] === "stem-inputs"
      && segments[1] === user.uid
      && segments.every(segment => segment && segment !== "." && segment !== "..")
      && /^[a-zA-Z0-9._/-]+$/.test(pathname);

    if (!safePath) {
      return Response.json({ error: "Uploads must use your own stem-input folder." }, { status: 400 });
    }

    if (!allowed.includes(contentType)) {
      return Response.json({ error: "Unsupported audio type." }, { status: 400 });
    }

    const validUntil = Date.now() + 10 * 60 * 1000;
    const signedToken = await issueSignedToken({
      pathname,
      operations: ["put"],
      validUntil,
      allowedContentTypes: allowed,
      maximumSizeInBytes: 250 * 1024 * 1024
    });

    const { presignedUrl } = await presignUrl(signedToken, {
      pathname,
      operation: "put",
      access: "public",
      validUntil: signedToken.validUntil
    });

    return Response.json(
      { presignedUrl },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (error) {
    if (error?.status === 401 || error?.status === 403 || error?.code === "FIREBASE_ADMIN_NOT_CONFIGURED") {
      return authErrorResponse(error);
    }
    console.error("Blob signed upload error:", error);
    return Response.json({ error: "Could not create an audio upload URL." }, { status: 500 });
  }
}
