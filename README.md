# LyTune Studio X — Landing Page

The homepage for LyTune Studio X, organized to work **offline** (no
server, no backend) and **online** (auto-detects the Lytune Express
backend and is ready to layer in real data).

## Running it

**Offline / no setup:** just open `index.html` directly in a browser.
Everything works — theme toggle, mobile menu, calculator, ticker,
producer slider, battle voting — using bundled demo data. No backend
required.

**Online, with the Lytune backend running:**
```
cd ../server
npm install
npm start
```
This starts the API at `http://localhost:4000`. Reload the landing
page (served from any static server, e.g. `npx serve .` from this
folder, or just `file://` still works) and `auth.js` will detect the
backend automatically — `document.body` gets a
`data-lytune-mode="online"` attribute you can key other scripts off
of, and `window.LytuneAuth.isOnline()` returns `true`.

If your backend runs somewhere other than `localhost:4000`, set this
in an inline `<script>` in `<head>` **before** `auth.js` loads:
```html
<script>window.LYTUNE_API_BASE = 'https://your-api.example.com/api';</script>
```

## File structure

**One CSS file per HTML page**, matching its name: `index.html` ↔
`index.css`. `index.css` is organized into three clearly-marked
sections in this order (order matters — later sections override
earlier ones):
1. **Base styles** — layout, components, desktop-first rules
2. **Mobile overrides** — small-screen media queries
3. **Theme tokens** — CSS variables the base styles reference but
   don't define, plus light/dark specifics

When the next page gets built (`explore.html`, `signup.html`, ...),
give it its own matching CSS file the same way, copying over whatever
shared component styles it needs (buttons, cards, nav) from
`index.css` as a starting point rather than growing one shared
stylesheet.

## What was fixed / added while organizing this

- **CSS variable bug** — the stylesheet uses `var(--bg-card)`,
  `var(--bg-primary)`, and `var(--bg-secondary)` all over (cards,
  footer, auth-gate modal) but never defined them, so those elements
  rendered with transparent backgrounds. Fixed in the theme tokens
  section, for both dark and light themes, plus visible keyboard
  focus states and a couple of light-theme-only tweaks (phone
  mockups, showcase overlay).
- **Mobile overrides section** — touch-target sizing, safe-area
  padding for notched phones, swaps autoplaying background video for
  a static look on small screens (data/battery), and turns the
  producer slider into native touch-scroll instead of relying on the
  CSS marquee animation.
- **`theme.js`** — dark/light toggle, persisted in `localStorage`,
  applied before first paint to avoid a flash of the wrong theme.
- **`auth.js`** — pings the backend (`GET /api/beats`, since there's
  no dedicated health route yet) with a 2.5s timeout to decide
  online/offline; renders the nav's logged-in/logged-out state from a
  `localStorage` session (ready for `login.html`/`signup.html` to
  write to once they exist); builds the mobile hamburger menu, since
  it was fully styled in CSS but never wired up in the HTML/JS; and
  adds graceful fallbacks for any `<video>`/`<img>` that fails to
  load (all the referenced videos and two of the three images aren't
  included yet — see below).
- **`data.js`** — implements `DATA_API.initProducerSlider()`, which
  the page called but which didn't exist anywhere. Falls back to
  curated demo producers; documented inline why it doesn't yet pull
  live producer names (the current `/api/beats` route doesn't return
  producer profile info — needs a dedicated endpoint later).
- **HTML fixes:** duplicate/typo'd attributes (`ariga-hidden`,
  `preoserveAspectRatio`), missing `alt`/`aria-label` on icon-only
  buttons and decorative SVGs, added `<label for>` on the calculator
  sliders, added a real `<footer>` (styled in CSS, never in the HTML),
  and hero CTA buttons that were missing.
- **Media cleanup:** the valid LyTune logo is retained at
  `assets/images/logo.svg`. Other local image and video files were
  removed from the active project; visual media now uses remote HTTPS
  URLs and the shared Cloudinary delivery helper.

## Round 2 — pre-launch honesty pass + mockup/pricing/social fixes

- **No more fake numbers.** The "50,000+ beats sold" stat cards, the
  fake live purchase ticker, and the "$24,580 earned" producer
  testimonials all implied traction that doesn't exist yet (there are
  no producers on the platform yet). Replaced with an honest
  **Founding Producer** section (real reasons to join early — first
  visibility, launch-rate lock-in, no numbers to fake) and a **"This
  Could Be You"** open-slots section instead of invented testimonials.
  The ticker now scrolls genuine messages (genres open, launch
  benefits) instead of fabricated "X just bought Y" notifications.
- **New "Why Join Right Now" section**, placed right before Top
  Producers — the founder-advantage pitch (more visibility, direct
  input, better locked-in terms) in the same style other startups use
  for their "why us" section.
- **Earnings calculator moved up** — now appears right after the
  founding-producer invite, before the AI-search/phone-mockup section.
- **Remote media delivery:** homepage and producer-story photos are
  hosted remotely. Cloudinary fetch optimization activates after the
  public Cloudinary cloud name is configured in `cloudinary-config.js`.
- **Realistic phone mockup** — the three overlapping abstract phone
  screens are now one true-to-proportion device frame (dynamic island,
  side buttons, home indicator) with a screen that **actually
  scrolls** (`overflow-y: auto` inside `.device-scroll-area`) — drag
  or scroll inside it on both desktop and mobile to see more results,
  with a small hint label so it's obvious it's interactive.
- **Pricing → subscription style** — each license tier now has a
  "Choose Plan" button that links to `checkout.html?plan=...` (the
  payment page — next phase, not built yet) instead of a fake "X sold
  today" counter.
- **Top Producers images** — `data.js` now supports a real
  `avatarUrl` per producer. Online, it tries the photo first and
  falls back to the initials badge if it fails to load; offline (or
  with no `avatarUrl` set), it skips straight to the initials badge —
  so it degrades the same way for both cases.
- **Removed Beat Battle** entirely — voting on producers before any
  producers exist didn't make sense yet. Can be reintroduced later
  once there's a real roster.
- **Footer social icons** — replaced the "IG / X / TT" text with
  actual icon glyphs (Instagram, X, TikTok).

- **Video placeholders:** the homepage now uses remote image cards
  instead of empty local video players. This avoids broken or blank
  media blocks until real video content is available.
- **Other pages** (`login.html`, `signup.html`, `explore.html`,
  `creators.html`, `trending.html`, `market.html`, `message.html`,
  `ai-search.html`, `ai-demo.html`) are linked from the nav/footer but
  not built yet — that's the natural next step once the landing page
  is signed off.
- **Live producer data** needs a small new backend route (something
  like `GET /api/producers`) that returns `{ id, name, avatarUrl,
  genre }` per producer — `data.js` is already structured to swap the
  demo list for a real fetch the moment that route exists.


## Remote image delivery and theme support

- All non-logo image references should use HTTPS remote media, not repository image files.
- `cloudinary-media.js` optimizes supported remote images through Cloudinary's image-fetch delivery API and processes images added dynamically by producer cards and profile pages.
- Set `CLOUDINARY_CLOUD_NAME` in the Vercel project environment variables. The new `/api/media-config` endpoint returns only this public cloud name, and `cloudinary-config.js` loads it automatically. Until it is set, the site keeps using its existing HTTPS image URLs so pages do not break.
- Never put a Cloudinary API secret, private key, or upload credential in browser JavaScript. Uploads require a server-side signed flow and server environment variables.
- `theme.js` stores the light/dark preference across pages, applies shared contrast fixes, and provides a theme toggle on pages that do not already have one.
- The LyTune logo is intentionally exempt from image proxying so the brand mark stays unchanged.


## Current media and theme status

The only local image asset retained for the website is the original SVG logo at
`assets/images/logo.svg`. The incorrect duplicate PNG and unused local photos/video
were removed. `theme.js` is loaded across the website to keep light/dark mode
consistent. Cloudinary delivery code and the `/api/media-config` endpoint are ready, but the image proxy cannot activate
until `CLOUDINARY_CLOUD_NAME` is configured in Vercel. The browser never receives the Cloudinary API secret. API secrets must stay
server-side and must never be committed to this repository.
