import { presignUrl } from "@vercel/blob";

export async function POST(request) {
  try {
    const body = await request.json();
    const pathname = String(body?.pathname || "").trim();
    const contentType = String(body?.contentType || "").trim();

    const allowed = [
      "audio/mpeg","audio/wav","audio/x-wav","audio/mp4",
      "audio/x-m4a","audio/ogg","audio/webm","video/mp4","video/webm"
    ];

    if (!pathname || pathname.length > 300 || pathname.includes("..")) {
      return Response.json({ error: "Invalid upload pathname." }, { status: 400 });
    }
    if (!allowed.includes(contentType)) {
      return Response.json({ error: "Unsupported audio/video type." }, { status: 400 });
    }

    const { presignedUrl } = await presignUrl(
      pathname,
      {
        operation: "put",
        access: "public",
        validUntil: Date.now() + 15 * 60 * 1000,
        allowedContentTypes: allowed,
        maximumSizeInBytes: 250 * 1024 * 1024
      }
    );

    return Response.json({ presignedUrl });
  } catch (error) {
    console.error("Blob signed upload error:", error);
    return Response.json(
      { error: error?.message || "Could not create a Blob upload URL." },
      { status: 500 }
    );
  }
}
