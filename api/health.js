export async function GET() {
  return Response.json(
    { ok: true, service: "LyTune Studio X API" },
    {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store"
      }
    }
  );
}
