/* ===== explore.js =====
   Powers the Explore Beats page: BeatStars/Airbit-style sidebar
   filters (genre, mood, BPM, key, price, license), trending
   "type beat" search chips, grid/list view, a demo cart counter, and
   a persistent bottom mini-player.

   Data honesty note: the current GET /api/beats route (see
   server/routes/beats.js) only returns { id, producerId, title,
   genre, price, licenseType, previewUrl, createdAt } — no bpm, key,
   or mood. Those filters are fully wired up and ready, they just
   won't match anything against real data until the backend adds
   those fields to a beat. Same limitation as the producer-name gap
   documented in data.js.

   Offline (or online with an empty catalog — the store starts empty
   on every server restart): keeps the honest "no beats yet" empty
   state already in the HTML. No preview audio exists yet either, so
   the mini-player shows an honest message instead of faking playback.

   Depends on auth.js (window.LytuneAuth) having loaded first.
*/
(function () {
  const GENRE_LABELS = {
    afrobeat: 'Afrobeat', amapiano: 'Amapiano', trap: 'Trap',
    drill: 'Drill', street: 'Street Vibes', hiphop: 'Hip Hop', rnb: 'R&B',
  };
  const LICENSE_LABELS = { lease: 'Lease', premium: 'Premium Lease', exclusive: 'Exclusive Rights' };

  let allBeats = [];   // raw beats fetched from the API (empty if offline/no data)
  let cartCount = 0;

  const grid = document.getElementById('beatGrid');
  const resultsCount = document.getElementById('resultsCount');
  const modeIndicator = document.getElementById('modeIndicator');
  const searchInput = document.getElementById('beatSearchInput');
  const sortSelect = document.getElementById('sortSelect');
  const keyFilter = document.getElementById('keyFilter');
  const bpmMin = document.getElementById('bpmMin');
  const bpmMax = document.getElementById('bpmMax');
  const priceMin = document.getElementById('priceMin');
  const priceMax = document.getElementById('priceMax');
  const clearFiltersBtn = document.getElementById('clearFiltersBtn');
  const sidebar = document.getElementById('exploreSidebar');
  const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
  const gridViewBtn = document.getElementById('gridViewBtn');
  const listViewBtn = document.getElementById('listViewBtn');
  const cartBtn = document.getElementById('cartBtn');
  const cartCountEl = document.getElementById('cartCount');
  const typeBeatChips = document.querySelectorAll('.type-beat-chip');

  const miniPlayer = document.getElementById('miniPlayer');
  const playerTitle = document.getElementById('playerTitle');
  const playerSub = document.getElementById('playerSub');
  const playerMsg = document.getElementById('playerMsg');
  const playerCloseBtn = document.getElementById('playerCloseBtn');

  const emptyStateHtml = grid ? grid.innerHTML : ''; // preserve the original honest empty state

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function checkedValues(selector) {
    return Array.from(document.querySelectorAll(selector))
      .filter((el) => el.checked)
      .map((el) => el.value);
  }

  /* ---------- rendering ---------- */

  function renderBeatCard(beat) {
    const genreLabel = GENRE_LABELS[(beat.genre || '').toLowerCase()] || beat.genre || 'Beat';
    const licenseLabel = LICENSE_LABELS[(beat.licenseType || '').toLowerCase()] || beat.licenseType || '';
    const producerLabel = beat.producerId ? 'Producer #' + String(beat.producerId).slice(0, 6) : 'Producer';

    const metaPills = [];
    if (beat.bpm) metaPills.push('<span class="beat-meta-pill">' + escapeHtml(beat.bpm) + ' BPM</span>');
    if (beat.key) metaPills.push('<span class="beat-meta-pill">' + escapeHtml(beat.key) + '</span>');

    const card = document.createElement('div');
    card.className = 'beat-card';
    card.innerHTML =
      '<div class="beat-card-image" style="background:var(--brand-gradient-diag);">' +
        '<span class="beat-card-genre">' + escapeHtml(genreLabel) + '</span>' +
        '<div class="beat-card-overlay">' +
          '<button class="beat-play-btn" type="button" aria-label="Preview ' + escapeHtml(beat.title) + '">▶</button>' +
        '</div>' +
      '</div>' +
      '<div class="beat-card-body">' +
        '<div class="beat-card-title">' + escapeHtml(beat.title) + '</div>' +
        '<div class="beat-card-producer">' + escapeHtml(producerLabel) + '</div>' +
        (metaPills.length ? '<div class="beat-card-meta-row">' + metaPills.join('') + '</div>' : '') +
        (licenseLabel ? '<div class="beat-card-tags"><span class="beat-tag">' + escapeHtml(licenseLabel) + '</span></div>' : '') +
        '<div class="beat-card-footer">' +
          '<span class="beat-card-price">$' + Number(beat.price || 0).toFixed(2) + '</span>' +
          '<div class="beat-card-actions">' +
            '<button class="beat-like-btn" type="button" aria-label="Like this beat">♡</button>' +
            '<button class="beat-like-btn add-to-cart-btn" type="button" aria-label="Add to cart" title="Add to cart">🛒</button>' +
            '<a href="checkout.html?beat=' + encodeURIComponent(beat.id || '') + '" class="beat-buy-btn">Buy</a>' +
          '</div>' +
        '</div>' +
      '</div>';

    card.querySelector('.beat-play-btn').addEventListener('click', () => openPlayer(beat, producerLabel));
    card.querySelector('.add-to-cart-btn').addEventListener('click', () => addToCart(beat));

    return card;
  }

  /* ---------- filtering ---------- */

  function currentFilters() {
    return {
      genres: checkedValues('.genre-check'),
      moods: checkedValues('.mood-check'),
      licenses: checkedValues('.license-check'),
      key: keyFilter ? keyFilter.value : 'all',
      bpmMin: bpmMin && bpmMin.value ? Number(bpmMin.value) : null,
      bpmMax: bpmMax && bpmMax.value ? Number(bpmMax.value) : null,
      priceMin: priceMin && priceMin.value ? Number(priceMin.value) : null,
      priceMax: priceMax && priceMax.value ? Number(priceMax.value) : null,
      sort: sortSelect ? sortSelect.value : 'trending',
      query: searchInput ? searchInput.value.trim().toLowerCase() : '',
    };
  }

  function applyFilters() {
    if (!grid) return;

    if (allBeats.length === 0) {
      grid.innerHTML = emptyStateHtml;
      if (resultsCount) resultsCount.textContent = 'No beats yet';
      return;
    }

    const f = currentFilters();
    let filtered = allBeats.filter((b) => {
      const genre = (b.genre || '').toLowerCase();
      const license = (b.licenseType || '').toLowerCase();
      const mood = (b.mood || '').toLowerCase();
      const key = (b.key || 'all');
      const bpm = b.bpm ? Number(b.bpm) : null;
      const price = Number(b.price || 0);

      if (f.genres.length && !f.genres.includes(genre)) return false;
      if (f.moods.length && !f.moods.includes(mood)) return false;
      if (f.licenses.length && !f.licenses.includes(license)) return false;
      if (f.key !== 'all' && key !== f.key) return false;
      if (f.bpmMin != null && (bpm == null || bpm < f.bpmMin)) return false;
      if (f.bpmMax != null && (bpm == null || bpm > f.bpmMax)) return false;
      if (f.priceMin != null && price < f.priceMin) return false;
      if (f.priceMax != null && price > f.priceMax) return false;

      const haystack = ((b.title || '') + ' ' + genre + ' ' + license).toLowerCase();
      if (f.query && !haystack.includes(f.query)) return false;

      return true;
    });

    if (f.sort === 'price-asc') filtered.sort((a, b) => (a.price || 0) - (b.price || 0));
    if (f.sort === 'price-desc') filtered.sort((a, b) => (b.price || 0) - (a.price || 0));
    if (f.sort === 'bpm-asc') filtered.sort((a, b) => (a.bpm || 0) - (b.bpm || 0));
    if (f.sort === 'bpm-desc') filtered.sort((a, b) => (b.bpm || 0) - (a.bpm || 0));
    if (f.sort === 'newest') filtered.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    // 'trending' has no real signal yet (no plays/sales data) — falls back to catalog order.

    grid.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'explore-empty explore-empty--filtered';
      empty.innerHTML =
        '<div class="founder-icon">🔍</div>' +
        '<h2>No beats match those filters</h2>' +
        '<p>Try loosening a filter or clearing your search.</p>';
      grid.appendChild(empty);
    } else {
      filtered.forEach((beat) => grid.appendChild(renderBeatCard(beat)));
    }

    if (resultsCount) {
      resultsCount.textContent = filtered.length === 1 ? '1 beat found' : filtered.length + ' beats found';
    }
  }

  function clearFilters() {
    document.querySelectorAll('.genre-check, .mood-check, .license-check').forEach((el) => { el.checked = false; });
    if (keyFilter) keyFilter.value = 'all';
    if (bpmMin) bpmMin.value = '';
    if (bpmMax) bpmMax.value = '';
    if (priceMin) priceMin.value = '';
    if (priceMax) priceMax.value = '';
    if (sortSelect) sortSelect.value = 'trending';
    if (searchInput) searchInput.value = '';
    applyFilters();
  }

  /* ---------- data loading ---------- */

  function loadBeats() {
    const online = window.LytuneAuth && window.LytuneAuth.isOnline();
    if (modeIndicator) modeIndicator.textContent = online ? '● Live from LyTune' : '● Offline preview';

    if (!online || !window.LytuneAuth) {
      allBeats = [];
      applyFilters();
      return;
    }

    fetch(window.LytuneAuth.apiBase + '/beats')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        allBeats = data && Array.isArray(data.beats) ? data.beats : [];
        applyFilters();
      })
      .catch(() => {
        allBeats = [];
        applyFilters();
      });
  }

  /* ---------- mini-player (honest: no real audio exists yet) ---------- */

  function openPlayer(beat, producerLabel) {
    if (!miniPlayer) return;
    if (playerTitle) playerTitle.textContent = beat.title || 'Untitled beat';
    if (playerSub) playerSub.textContent = producerLabel;
    if (playerMsg) playerMsg.textContent = 'Preview unavailable — no audio uploaded yet';
    miniPlayer.classList.remove('is-hidden');
    document.body.classList.add('has-mini-player');
  }

  function closePlayer() {
    if (!miniPlayer) return;
    miniPlayer.classList.add('is-hidden');
    document.body.classList.remove('has-mini-player');
  }

  /* ---------- cart (demo counter — no real cart/checkout backend yet) ---------- */

  function addToCart(beat) {
    cartCount += 1;
    try {
      const items = JSON.parse(localStorage.getItem("lytune-cart") || "[]");
      items.push({ id: beat && beat.id, title: beat && beat.title, price: Number(beat && beat.price || 0), currency: beat && beat.currency || "USD", licenseType: beat && beat.licenseType || "lease" });
      localStorage.setItem("lytune-cart", JSON.stringify(items));
    } catch (err) {}
    if (cartCountEl) cartCountEl.textContent = String(cartCount);
    if (cartBtn) {
      cartBtn.style.transform = 'scale(1.15)';
      setTimeout(() => { cartBtn.style.transform = 'scale(1)'; }, 150);
    }
  }

  /* ---------- view toggle ---------- */

  function setView(view) {
    if (!grid || !gridViewBtn || !listViewBtn) return;
    grid.classList.toggle('list-view', view === 'list');
    gridViewBtn.classList.toggle('active', view === 'grid');
    listViewBtn.classList.toggle('active', view === 'list');
  }

  /* ---------- wiring ---------- */

  function wireControls() {
    document.querySelectorAll('.genre-check, .mood-check, .license-check').forEach((el) => {
      el.addEventListener('change', applyFilters);
    });
    if (keyFilter) keyFilter.addEventListener('change', applyFilters);
    [bpmMin, bpmMax, priceMin, priceMax].forEach((input) => {
      if (input) input.addEventListener('change', applyFilters);
    });
    if (sortSelect) sortSelect.addEventListener('change', applyFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener('click', clearFilters);

    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(applyFilters, 150);
      });
    }

    typeBeatChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = chip.getAttribute('data-query') || '';
          applyFilters();
          searchInput.focus();
        }
      });
    });

    if (gridViewBtn) gridViewBtn.addEventListener('click', () => setView('grid'));
    if (listViewBtn) listViewBtn.addEventListener('click', () => setView('list'));

    if (sidebarToggleBtn && sidebar) {
      sidebarToggleBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        sidebarToggleBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    if (cartBtn) cartBtn.addEventListener('click', () => {
      if (localStorage.getItem("lytune-cart")) location.href = "checkout.html";
      cartBtn.style.transform = 'scale(0.92)';
      setTimeout(() => { cartBtn.style.transform = 'scale(1)'; }, 120);
    });

    if (playerCloseBtn) playerCloseBtn.addEventListener('click', closePlayer);
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireControls();
    if (resultsCount) resultsCount.textContent = 'Loading beats…';

    if (window.LytuneAuth) {
      window.LytuneAuth.whenReady().then(loadBeats);
    } else {
      loadBeats();
    }
  });
})();
