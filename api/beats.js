import { neon } from "@neondatabase/serverless";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" }
  });
}

function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured.");
  return neon(url);
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
    const q = (url.searchParams.get("q") || "").trim();
    const genre = (url.searchParams.get("genre") || "").trim().toLowerCase();

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
    return json({ error: "Could not load beats." }, 500);
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
