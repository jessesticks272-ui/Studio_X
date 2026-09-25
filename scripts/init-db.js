import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.log("DATABASE_URL is not configured. Skipping database initialization.");
  process.exit(0);
}

const sql = neon(url);

await sql`
  CREATE EXTENSION IF NOT EXISTS pgcrypto;

  CREATE TABLE IF NOT EXISTS beats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producer_id UUID,
    title VARCHAR(120) NOT NULL,
    slug VARCHAR(160) UNIQUE,
    genre VARCHAR(40) NOT NULL,
    mood VARCHAR(40),
    bpm INTEGER CHECK (bpm IS NULL OR bpm BETWEEN 40 AND 240),
    musical_key VARCHAR(20),
    price NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    license_type VARCHAR(30) NOT NULL DEFAULT 'lease',
    preview_url TEXT,
    audio_url TEXT,
    cover_url TEXT,
    description TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS beats_created_at_idx ON beats(created_at DESC);
  CREATE INDEX IF NOT EXISTS beats_genre_idx ON beats(genre);
  CREATE INDEX IF NOT EXISTS beats_published_idx ON beats(is_published);

  CREATE OR REPLACE FUNCTION set_beats_updated_at()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS beats_updated_at ON beats;
  CREATE TRIGGER beats_updated_at
  BEFORE UPDATE ON beats
  FOR EACH ROW EXECUTE FUNCTION set_beats_updated_at();
`;

console.log("LyTune database initialized: beats table and indexes are ready.");
