
window.DATA_API = (function () {
  const DEMO_PRODUCERS = [
    { name: 'Kay_Drumz', role: 'Afrobeat Producer · Lagos', initial: 'K', gradient: 'linear-gradient(135deg,#19D7FF,#007BFF)' },
    { name: 'Talemo_Beats', role: 'Amapiano Producer · SA', initial: 'T', gradient: 'linear-gradient(135deg,#9B2EFF,#19D7FF)' },
    { name: 'Spanky_Drill', role: 'Trap Producer · Accra', initial: 'S', gradient: 'linear-gradient(135deg,#007BFF,#9B2EFF)' },
    { name: 'DJ Kaywise', role: 'Afrobeat Producer · Lagos', initial: 'D', gradient: 'linear-gradient(135deg,#19D7FF,#9B2EFF)' },
    { name: 'PianoKeysSA', role: 'Amapiano Producer · Pretoria', initial: 'P', gradient: 'linear-gradient(135deg,#007BFF,#19D7FF)' },
    { name: 'BeatMason', role: 'Street Vibes Producer · Accra', initial: 'B', gradient: 'linear-gradient(135deg,#9B2EFF,#007BFF)' },
  ];

  function renderProducerCard(p) {
    const card = document.createElement('div');
    card.className = 'producer-link';

    // Online + real avatarUrl: try the photo first, but fall back to the
    // initials badge if it 404s or the connection drops mid-load — same
    // pattern as the video/image fallback in auth.js. Offline (or no
    // avatarUrl at all): skip straight to the initials badge, no network
    // request attempted.
    const avatarHtml = p.avatarUrl && window.LytuneAuth && window.LytuneAuth.isOnline()
      ? '<img src="' + p.avatarUrl + '" alt="' + p.name + '" style="width:100%;height:200px;object-fit:cover;" ' +
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
