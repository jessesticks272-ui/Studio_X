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
    { name: 'Kay_Drumz', role: 'Afrobeat Producer · Lagos', initial: 'K', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#007BFF)' },
    { name: 'Talemo_Beats', role: 'Amapiano Producer · SA', initial: 'T', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#19D7FF)' },
    { name: 'Spanky_Drill', role: 'Trap Producer · Accra', initial: 'S', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#9B2EFF)' },
    { name: 'DJ Kaywise', role: 'Afrobeat Producer · Lagos', initial: 'D', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#19D7FF,#9B2EFF)' },
    { name: 'PianoKeysSA', role: 'Amapiano Producer · Pretoria', initial: 'P', avatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#007BFF,#19D7FF)' },
    { name: 'BeatMason', role: 'Street Vibes Producer · Accra', initial: 'B', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=600&q=80', gradient: 'linear-gradient(135deg,#9B2EFF,#007BFF)' },
  ];

  function renderProducerCard(p) {
    const card = document.createElement('div');
    card.className = 'producer-link';

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
      '<div class="producer-info"><span>' + p.role + '</span></div>' +
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
