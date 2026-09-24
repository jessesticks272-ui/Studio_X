import { handleUpload } from "@vercel/blob/client";

export async function POST(request) {
  try {
    const body = await request.json();

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => ({
        allowedContentTypes: [
          "audio/mpeg",
          "audio/wav",
          "audio/x-wav",
          "audio/mp4",
          "audio/x-m4a",
          "audio/ogg",
          "audio/webm",
          "video/mp4",
          "video/webm"
        ],
        maximumSizeInBytes: 250 * 1024 * 1024,
        addRandomSuffix: true
      }),
      onUploadCompleted: async ({ blob }) => {
        console.log("LyTune audio uploaded:", blob.url);
      }
    });

    return Response.json(jsonResponse);
  } catch (error) {
    console.error("Blob upload error:", error);
    return Response.json(
      { error: "Could not prepare the audio upload." },
      { status: 500 }
    );
  }
}
