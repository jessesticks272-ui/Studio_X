/* ===== data.js =====
   Implements window.DATA_API, currently just initProducerSlider(),
   which the inline script at the bottom of index.html calls.

   Depends on auth.js having run first (uses window.LytuneAuth).

   Online-mode note: the current server (server/routes/beats.js) has
   no public "list producers" endpoint — GET /api/beats returns raw
   beat rows with a producerId, but no producer name/avatar, and the
   in-memory store starts empty on every restart. So even in online
   mode, until a real producers endpoint exists, this renders curated
   demo producers (the same ones featured in the Success Stories
   section) rather than partial/anonymous data. Swap DEMO_PRODUCERS
   for a real fetch once server/routes/ exposes producer profiles.
*/
window.DATA_API = (function () {
  const DEMO_PRODUCERS = [
    // Illustrative stock portraits for the pre-launch demo. Replace these with
    // creator-approved avatar URLs once real producer profiles are available.
    { name: 'Kay_Drumz', role: 'Afrobeat Producer · Lagos', initial: 'K', slug: 'kay-drumz', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#007BFF)' },
    { name: 'Talemo_Beats', role: 'Amapiano Producer · SA', initial: 'T', slug: 'talemo-beats', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#19D7FF)' },
    { name: 'Spanky_Drill', role: 'Trap Producer · Accra', initial: 'S', slug: 'spanky-drill', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#9B2EFF)' },
    { name: 'DJ Kaywise', role: 'Afrobeat Producer · Lagos', initial: 'D', slug: 'dj-kaywise', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#9B2EFF)' },
    { name: 'PianoKeysSA', role: 'Amapiano Producer · Pretoria', initial: 'P', slug: 'piano-keys-sa', avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#19D7FF)' },
    { name: 'Naya Sounds', role: 'Afro-fusion Producer · Abuja', initial: 'N', slug: 'naya-sounds', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#9B2EFF)' },
    { name: 'Lex On The Beat', role: 'Hip-hop Producer · Ibadan', initial: 'L', slug: 'lex-on-the-beat', avatarUrl: 'https://images.unsplash.com/photo-1504593811423-6dd665756598?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#19D7FF)' },
    { name: 'Mira Melody', role: 'R&B Producer · Port Harcourt', initial: 'M', slug: 'mira-melody', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#19D7FF)' },
    { name: 'Drum Lab', role: 'Percussion Producer · Kumasi', initial: 'D', slug: 'drum-lab', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#007BFF)' },
    { name: 'Violet Frequency', role: 'Electronic Afrobeat Producer · Nairobi', initial: 'V', slug: 'violet-frequency', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#007BFF)' },
    { name: 'Northside Keys', role: 'Melodic Trap Producer · Enugu', initial: 'N', slug: 'northside-keys', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#9B2EFF)' },
    { name: 'BeatMason', role: 'Street Vibes Producer · Accra', initial: 'B', slug: 'beatmason', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#007BFF)' },
  ];

  function renderProducerCard(p) {
    const card = document.createElement('a');
    card.className = 'producer-link';
    card.href = 'producer-story.html?producer=' + encodeURIComponent(p.slug || p.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    card.setAttribute('aria-label', 'Read the sample producer story for ' + p.name);

    // Show the illustrative/demo portrait even when the API is offline.
    // If a photo fails, replace it with the matching initials badge.
    const avatarUrl = p.avatarUrl && window.LytuneCloudinary
      ? window.LytuneCloudinary.deliveryUrl(p.avatarUrl, { width: 600, crop: "fill" })
      : p.avatarUrl;
    const avatarHtml = avatarUrl
      ? '<img src="' + avatarUrl + '" alt="Illustrative portrait for demo profile ' + p.name + '" loading="lazy" decoding="async" referrerpolicy="no-referrer" style="width:100%;height:200px;object-fit:cover;" ' +
        'onerror="this.outerHTML=\'<div style=&quot;height:200px;display:flex;align-items:center;justify-content:center;' +
        'font-size:2.4rem;font-weight:800;color:#fff;background:' + p.gradient + ';&quot;>' + p.initial + '</div>\';">'
      : '<div style="height:200px;display:flex;align-items:center;justify-content:center;' +
        'font-size:2.4rem;font-weight:800;color:#fff;background:' + p.gradient + ';">' + p.initial + '</div>';

    card.innerHTML =
      '<div class="producer-card">' +
      avatarHtml +
      '<div class="producer-badge"><span class="producer-badge-dot"></span><span>' + p.name + '</span></div>' +
      '<div class="producer-info"><span>' + p.role + '</span><span class="producer-sample-label" style="display:inline-block;margin-top:7px;padding:4px 9px;border-radius:999px;font-size:.68rem;font-weight:700;letter-spacing:.04em;text-transform:uppercase;background:rgba(25,215,255,.14);color:var(--text-primary);">Sample profile</span></div>' +
      '</div>';
    return card;
  }

  function renderProducers(track, producers) {
    if (!track) return;
    track.innerHTML = '';
    // Render twice back-to-back so the CSS auto-scroll animation
    // (.producer-track.auto-scroll, translateX(-50%)) loops seamlessly.
    producers.concat(producers).forEach((p) => {
      track.appendChild(renderProducerCard(p));
    });
    track.classList.add('auto-scroll');
  }

  function tryFetchLiveProducers() {
    if (!window.LytuneAuth || !window.LytuneAuth.isOnline()) {
      return Promise.resolve(null);
    }
    return fetch(window.LytuneAuth.apiBase + '/beats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !Array.isArray(data.beats) || data.beats.length === 0) return null;
        // Not enough info in a raw beat row to build a real producer
        // card (no name/avatar in this endpoint) — signal "no usable
        // live data yet" so we fall back to the curated demo list.
        return null;
      })
      .catch(() => null);
  }

  function initProducerSlider(selector) {
    const track = document.querySelector(selector);
    if (!track) return;

    tryFetchLiveProducers().then((live) => {
      renderProducers(track, live || DEMO_PRODUCERS);
    });
  }

  return { initProducerSlider };
})();
