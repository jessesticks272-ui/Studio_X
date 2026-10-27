// Public Cloudinary delivery configuration.
// Only the cloud name is returned. Never expose API keys or API secrets here.
function safeCloudName(value) {
  const name = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{1,100}$/.test(name) ? name : "";
}

export async function GET() {
  const cloudName = safeCloudName(process.env.CLOUDINARY_CLOUD_NAME);
  return Response.json(
    { configured: Boolean(cloudName), cloudName },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=300, stale-while-revalidate=600"
      }
    }
  );
}
