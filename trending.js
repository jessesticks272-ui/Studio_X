/* ===== trending.js =====
   Powers the Trending page: a time-range toggle (UI-ready, though see
   note below), trending beats, and trending producers.

   Data honesty note: computing real trending requires play/like/sale
   counts. The current GET /api/beats route (server/routes/beats.js)
   returns { id, producerId, title, genre, price, licenseType,
   previewUrl, createdAt } — no plays, likes, or sales signal at all.
   There's also no GET /api/producers route yet (same gap noted in
   creators.js). So this always shows the honest "nothing trending
   yet" empty state for now, UNLESS a beat/producer object happens to
   include optional plays/likes/sales/followerCount fields — in which
   case it ranks and renders them for real. That keeps this page
   forward-compatible: the moment the backend starts returning those
   signals, trending starts working with zero changes needed here.

   The time-range toggle (Today/This Week/This Month) is fully wired
   client-side and ready, but has no effect yet since there's no
   timestamped activity data to filter by — selecting a range just
   re-runs the same honest-empty render until that data exists.

   Depends on auth.js (window.LytuneAuth) having loaded first.
*/
(function () {
  const GENRE_LABELS = {
    afrobeat: 'Afrobeat', amapiano: 'Amapiano', trap: 'Trap',
    drill: 'Drill', street: 'Street Vibes', hiphop: 'Hip Hop', rnb: 'R&B',
  };
  const LICENSE_LABELS = { lease: 'Lease', premium: 'Premium Lease', exclusive: 'Exclusive Rights' };

  let activeRange = 'week';

  const beatsGrid = document.getElementById('trendingBeatsGrid');
  const beatsNote = document.getElementById('beatsResultsNote');
  const producersGrid = document.getElementById('trendingProducersGrid');
  const producersNote = document.getElementById('producersResultsNote');
  const rangeButtons = document.querySelectorAll('.trending-range-btn');

  const beatsEmptyHtml = beatsGrid ? beatsGrid.innerHTML : '';
  const producersEmptyHtml = producersGrid ? producersGrid.innerHTML : '';

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function trendingScore(item) {
    const plays = Number(item.plays || 0);
    const likes = Number(item.likes || 0);
    const sales = Number(item.sales || 0);
    // Sales count for the most (real money moved), then likes, then plays.
    return sales * 5 + likes * 2 + plays;
  }

  /* ---------- beats ---------- */

  function renderBeatCard(beat, rank) {
    const genreLabel = GENRE_LABELS[(beat.genre || '').toLowerCase()] || beat.genre || 'Beat';
    const licenseLabel = LICENSE_LABELS[(beat.licenseType || '').toLowerCase()] || beat.licenseType || '';
    const producerLabel = beat.producerId ? 'Producer #' + String(beat.producerId).slice(0, 6) : 'Producer';

    const card = document.createElement('div');
    card.className = 'beat-card';
    card.innerHTML =
      '<div class="beat-card-image" style="background:var(--brand-gradient-diag);">' +
        '<span class="trending-rank-badge" style="position:absolute;top:10px;left:10px;">#' + rank + '</span>' +
        '<span class="beat-card-genre">' + escapeHtml(genreLabel) + '</span>' +
        '<div class="beat-card-overlay">' +
          '<button class="beat-play-btn" type="button" aria-label="Preview ' + escapeHtml(beat.title) + '">▶</button>' +
        '</div>' +
      '</div>' +
      '<div class="beat-card-body">' +
        '<div class="beat-card-title">' + escapeHtml(beat.title) + '</div>' +
        '<div class="beat-card-producer">' + escapeHtml(producerLabel) + '</div>' +
        (licenseLabel ? '<div class="beat-card-tags"><span class="beat-tag">' + escapeHtml(licenseLabel) + '</span></div>' : '') +
        '<div class="beat-card-footer">' +
          '<span class="beat-card-price">$' + Number(beat.price || 0).toFixed(2) + '</span>' +
          '<a href="checkout.html?beat=' + encodeURIComponent(beat.id || '') + '" class="beat-buy-btn">Buy</a>' +
        '</div>' +
      '</div>';
    return card;
  }

  function loadTrendingBeats() {
    const online = window.LytuneAuth && window.LytuneAuth.isOnline();

    if (!online || !window.LytuneAuth) {
      beatsGrid.innerHTML = beatsEmptyHtml;
      if (beatsNote) beatsNote.textContent = 'Offline preview — nothing to rank yet';
      return;
    }

    fetch(window.LytuneAuth.apiBase + '/beats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const beats = data && Array.isArray(data.beats) ? data.beats : [];
        const withSignal = beats.filter((b) => b.plays || b.likes || b.sales);

        if (withSignal.length === 0) {
          beatsGrid.innerHTML = beatsEmptyHtml;
          if (beatsNote) beatsNote.textContent = beats.length
            ? beats.length + ' beat(s) in the catalog, but no play/sale/like data to rank them by yet'
            : 'No beats in the catalog yet';
          return;
        }

        const ranked = withSignal.slice().sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 12);
        beatsGrid.innerHTML = '';
        ranked.forEach((beat, i) => beatsGrid.appendChild(renderBeatCard(beat, i + 1)));
        if (beatsNote) beatsNote.textContent = 'Top ' + ranked.length + ' by real plays, sales, and likes';
      })
      .catch(() => {
        beatsGrid.innerHTML = beatsEmptyHtml;
        if (beatsNote) beatsNote.textContent = 'Could not load trending beats';
      });
  }

  /* ---------- producers ---------- */

  function renderProducerCard(producer, rank) {
    const card = document.createElement('div');
    card.className = 'creator-card';
    card.innerHTML =
      '<span class="trending-rank-badge">#' + rank + '</span>' +
      '<div class="creator-avatar" style="background:' + (producer.gradient || 'var(--brand-gradient-diag)') + ';">' +
        (producer.name ? producer.name.trim().charAt(0).toUpperCase() : '?') +
      '</div>' +
      '<div class="creator-info">' +
        '<h3>' + escapeHtml(producer.name || 'Producer') + '</h3>' +
        '<div class="creator-role">' + escapeHtml(producer.genre || '') + '</div>' +
        '<div class="creator-stats">' +
          '<div class="creator-stat"><span class="creator-stat-value">' + (producer.beatCount || 0) + '</span><span class="creator-stat-label">Beats</span></div>' +
          '<div class="creator-stat"><span class="creator-stat-value">' + (producer.followerCount || 0) + '</span><span class="creator-stat-label">Followers</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="creator-actions">' +
        '<a href="creator-profile.html?id=' + encodeURIComponent(producer.id || '') + '" class="creator-view-btn">View Profile</a>' +
      '</div>';
    return card;
  }

  function loadTrendingProducers() {
    const online = window.LytuneAuth && window.LytuneAuth.isOnline();

    if (!online || !window.LytuneAuth) {
      producersGrid.innerHTML = producersEmptyHtml;
      if (producersNote) producersNote.textContent = 'Offline preview — nothing to rank yet';
      return;
    }

    // Speculative — see file header note. No GET /api/producers route
    // exists yet, so this fails gracefully to the honest empty state.
    fetch(window.LytuneAuth.apiBase + '/producers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        const producers = data && Array.isArray(data.producers) ? data.producers : [];
        const withSignal = producers.filter((p) => p.plays || p.followerCount || p.sales);

        if (withSignal.length === 0) {
          producersGrid.innerHTML = producersEmptyHtml;
          if (producersNote) producersNote.textContent = 'No producer activity to rank yet';
          return;
        }

        const ranked = withSignal.slice().sort((a, b) => trendingScore(b) - trendingScore(a)).slice(0, 10);
        producersGrid.innerHTML = '';
        ranked.forEach((p, i) => producersGrid.appendChild(renderProducerCard(p, i + 1)));
        if (producersNote) producersNote.textContent = 'Top ' + ranked.length + ' by real activity';
      })
      .catch(() => {
        producersGrid.innerHTML = producersEmptyHtml;
        if (producersNote) producersNote.textContent = 'Could not load trending producers';
      });
  }

  function loadAll() {
    if (beatsNote) beatsNote.textContent = 'Loading…';
    if (producersNote) producersNote.textContent = 'Loading…';
    loadTrendingBeats();
    loadTrendingProducers();
  }

  function wireControls() {
    rangeButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        rangeButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        activeRange = btn.getAttribute('data-range') || 'week';
        // No timestamped activity data exists yet to actually filter
        // by range (see file header note) — re-running the load keeps
        // the UI honest rather than pretending the range did anything.
        loadAll();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireControls();
    if (window.LytuneAuth) {
      window.LytuneAuth.whenReady().then(loadAll);
    } else {
      loadAll();
    }
  });
})();
