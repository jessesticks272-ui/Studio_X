import postgres from "postgres";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

let databaseClient;

function getDb() {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

  if (!connectionString) {
    const error = new Error("DATABASE_URL or POSTGRES_URL is not configured in Vercel.");
    error.code = "MISSING_DATABASE_URL";
    throw error;
  }

  let parsed;
  try {
    parsed = new URL(connectionString);
  } catch {
    const error = new Error("The configured database connection string is invalid.");
    error.code = "INVALID_DATABASE_URL";
    throw error;
  }

  if (!["postgres:", "postgresql:"].includes(parsed.protocol)) {
    const error = new Error("The database connection must use the PostgreSQL protocol.");
    error.code = "INVALID_DATABASE_URL";
    throw error;
  }

  if (!databaseClient) {
    databaseClient = postgres(connectionString, {
      max: 1,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false
    });
  }

  return databaseClient;
}

function mapBeat(row) {
  return {
    id: row.id,
    producerId: row.producer_id,
    title: row.title,
    slug: row.slug,
    genre: row.genre,
    mood: row.mood,
    bpm: row.bpm,
    key: row.musical_key,
    price: Number(row.price),
    currency: row.currency,
    licenseType: row.license_type,
    previewUrl: row.preview_url,
    audioUrl: row.audio_url,
    coverUrl: row.cover_url,
    description: row.description,
    createdAt: row.created_at
  };
}

export async function GET(request) {
  try {
    const sql = getDb();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 48), 1), 100);
    const id = (url.searchParams.get("id") || "").trim();
    const q = (url.searchParams.get("q") || "").trim();
    const genre = (url.searchParams.get("genre") || "").trim().toLowerCase();

    if (id) {
      const rows = await sql`SELECT * FROM beats WHERE is_published = TRUE AND id = ${id} LIMIT 1`;
      if (!rows.length) return json({ error: "Beat not found." }, 404);
      return json({ beat: mapBeat(rows[0]) });
    }

    const rows = q
      ? await sql`
          SELECT * FROM beats
          WHERE is_published = TRUE
            AND (title ILIKE ${"%" + q + "%"} OR genre ILIKE ${"%" + q + "%"} OR mood ILIKE ${"%" + q + "%"})
          ORDER BY created_at DESC
          LIMIT ${limit}
        `
      : genre
        ? await sql`
            SELECT * FROM beats
            WHERE is_published = TRUE AND LOWER(genre) = ${genre}
            ORDER BY created_at DESC
            LIMIT ${limit}
          `
        : await sql`
            SELECT * FROM beats
            WHERE is_published = TRUE
            ORDER BY created_at DESC
            LIMIT ${limit}
          `;

    return json({ beats: rows.map(mapBeat), count: rows.length });
  } catch (error) {
    console.error("GET /api/beats:", error);

    if (["MISSING_DATABASE_URL", "INVALID_DATABASE_URL", "INVALID_DATABASE_HOST"].includes(error?.code)) {
      return json({
        error: "Beat database configuration is incorrect.",
        code: error.code,
        hint: "In Vercel, set DATABASE_URL to the PostgreSQL connection string copied from Neon Console → your project → Connect. Do not use a Neon API URL."
      }, 503);
    }

    if (error?.code === "NeonDbError" || /resource-not-found|HTTP status 404/i.test(String(error?.message || ""))) {
      return json({
        error: "The configured Neon database endpoint was not found.",
        code: "NEON_ENDPOINT_NOT_FOUND",
        hint: "Check DATABASE_URL in Vercel and replace it with the connection string for the active Neon project and branch."
      }, 503);
    }

    return json({ error: "Could not load beats.", code: "BEATS_DATABASE_REQUEST_FAILED" }, 500);
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const title = String(body?.title || "").trim();
    const genre = String(body?.genre || "").trim().toLowerCase();

    if (!title || title.length > 120) {
      return json({ error: "A beat title is required and must be 120 characters or fewer." }, 400);
    }
    if (!genre || genre.length > 40) {
      return json({ error: "A valid beat genre is required." }, 400);
    }

    const bpm = body?.bpm == null || body.bpm === "" ? null : Number(body.bpm);
    const price = body?.price == null || body.price === "" ? 0 : Number(body.price);

    if (bpm !== null && (!Number.isInteger(bpm) || bpm < 40 || bpm > 240)) {
      return json({ error: "BPM must be a whole number from 40 to 240." }, 400);
    }
    if (!Number.isFinite(price) || price < 0) {
      return json({ error: "Price must be a valid non-negative number." }, 400);
    }

    const sql = getDb();
    const [beat] = await sql`
      INSERT INTO beats
        (producer_id, title, slug, genre, mood, bpm, musical_key, price, currency,
         license_type, preview_url, audio_url, cover_url, description, is_published)
      VALUES
        (${body?.producerId || null},
         ${title},
         ${body?.slug || null},
         ${genre},
         ${body?.mood || null},
         ${bpm},
         ${body?.key || null},
         ${price},
         ${body?.currency || "USD"},
         ${body?.licenseType || "lease"},
         ${body?.previewUrl || null},
         ${body?.audioUrl || null},
         ${body?.coverUrl || null},
         ${body?.description || null},
         ${body?.isPublished !== false})
      RETURNING *
    `;

    return json({ beat: mapBeat(beat) }, 201);
  } catch (error) {
    console.error("POST /api/beats:", error);
    return json({ error: "Could not create beat." }, 500);
  }
}
