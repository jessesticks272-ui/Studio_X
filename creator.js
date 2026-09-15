/* ===== creators.js =====
   Powers the Creators directory page: genre filter, search, and
   rendering producer cards.

   Data honesty note: there is currently no GET /api/producers route
   in the backend (server/routes/ only has beats, orders, messages,
   auth) — so there's no way to list real producer profiles yet, even
   when online. This fetches from that endpoint speculatively and
   falls back gracefully to the honest empty state on a 404 (or any
   other failure, or when offline). The moment a real producers route
   exists, this starts working with zero changes needed here.

   Access model (by design, not a limitation): the whole directory is
   public — no login and no payment required to browse any producer's
   profile or catalog. Only Follow and Message require being signed
   in, since those actions actually do something on your behalf.

   Depends on auth.js (window.LytuneAuth) having loaded first.
*/
(function () {
  const GENRE_LABELS = {
    afrobeat: 'Afrobeat', amapiano: 'Amapiano', trap: 'Trap',
    drill: 'Drill', street: 'Street Vibes',
  };

  let allCreators = [];
  let activeGenre = 'all';

  const grid = document.getElementById('creatorsGrid');
  const resultsCount = document.getElementById('resultsCount');
  const modeIndicator = document.getElementById('modeIndicator');
  const searchInput = document.getElementById('creatorSearchInput');
  const genreChips = document.querySelectorAll('.filter-chip');

  const emptyStateHtml = grid ? grid.innerHTML : ''; // preserve the original honest empty state

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function initials(name) {
    return name ? name.trim().charAt(0).toUpperCase() : '?';
  }

  /* ---------- Follow / Message — gated behind login ---------- */

  function requireLogin(button, actionLabel) {
    const user = window.LytuneAuth && window.LytuneAuth.getUser();
    if (user) return true;

    // No real login page exists yet (login.html isn't built), so the
    // most useful place to send someone is signup — but give a brief
    // inline acknowledgment first rather than redirecting instantly,
    // so the tap doesn't feel like it silently failed.
    const existing = button.parentElement.querySelector('.creator-auth-prompt');
    if (existing) existing.remove();
    const prompt = document.createElement('div');
    prompt.className = 'creator-auth-prompt';
    prompt.textContent = 'Sign in to ' + actionLabel;
    button.insertAdjacentElement('afterend', prompt);
    setTimeout(() => { window.location.href = 'signup.html'; }, 900);
    return false;
  }

  function handleFollow(e) {
    const btn = e.currentTarget;
    if (!requireLogin(btn, actionForFollow(btn))) return;
    const following = btn.getAttribute('data-following') === 'true';
    btn.setAttribute('data-following', String(!following));
    btn.textContent = following ? 'Follow' : 'Following';
  }
  function actionForFollow() { return 'follow producers'; }

  function handleMessage(e) {
    const btn = e.currentTarget;
    if (!requireLogin(btn, 'message producers')) return;
    window.location.href = 'message.html?to=' + encodeURIComponent(btn.getAttribute('data-producer-id') || '');
  }

  /* ---------- rendering ---------- */

  function renderCreatorCard(creator) {
    const genreLabel = GENRE_LABELS[(creator.genre || '').toLowerCase()] || creator.genre || '';
    const card = document.createElement('div');
    card.className = 'creator-card';
    card.innerHTML =
      '<div class="creator-avatar" style="background:' + (creator.gradient || 'var(--brand-gradient-diag)') + ';">' + initials(creator.name) + '</div>' +
      '<div class="creator-info">' +
        '<h3>' + escapeHtml(creator.name) +
          (creator.verified ? '<span class="verified-badge" title="Verified">✓</span>' : '') +
          (creator.founding ? '<span class="creator-founding-badge" style="margin-left:8px;">Founding Producer</span>' : '') +
        '</h3>' +
        '<div class="creator-role">' + escapeHtml(genreLabel) + (creator.location ? ' · ' + escapeHtml(creator.location) : '') + '</div>' +
        '<div class="creator-stats">' +
          '<div class="creator-stat"><span class="creator-stat-value">' + (creator.beatCount || 0) + '</span><span class="creator-stat-label">Beats</span></div>' +
          '<div class="creator-stat"><span class="creator-stat-value">' + (creator.followerCount || 0) + '</span><span class="creator-stat-label">Followers</span></div>' +
        '</div>' +
      '</div>' +
      '<div class="creator-actions">' +
        '<button class="creator-follow-btn" type="button" data-following="false">Follow</button>' +
        '<button class="creator-view-btn" type="button" data-producer-id="' + escapeHtml(creator.id || '') + '">Message</button>' +
        '<a href="creator-profile.html?id=' + encodeURIComponent(creator.id || '') + '" class="creator-view-btn">View Profile</a>' +
      '</div>';

    card.querySelector('.creator-follow-btn').addEventListener('click', handleFollow);
    card.querySelector('.creator-view-btn[data-producer-id]').addEventListener('click', handleMessage);
    return card;
  }

  /* ---------- filtering ---------- */

  function applyFilters() {
    if (!grid) return;

    if (allCreators.length === 0) {
      grid.innerHTML = emptyStateHtml;
      if (resultsCount) resultsCount.textContent = 'No creators yet';
      return;
    }

    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
    const filtered = allCreators.filter((c) => {
      const matchesGenre = activeGenre === 'all' || (c.genre || '').toLowerCase() === activeGenre;
      const matchesQuery = !query || (c.name || '').toLowerCase().includes(query);
      return matchesGenre && matchesQuery;
    });

    grid.innerHTML = '';
    if (filtered.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'creators-empty';
      empty.innerHTML =
        '<div class="founder-icon">🔍</div>' +
        '<h2>No creators match that search</h2>' +
        '<p>Try a different genre or clearing your search.</p>';
      grid.appendChild(empty);
    } else {
      filtered.forEach((c) => grid.appendChild(renderCreatorCard(c)));
    }

    if (resultsCount) {
      resultsCount.textContent = filtered.length === 1 ? '1 creator found' : filtered.length + ' creators found';
    }
  }

  /* ---------- data loading ---------- */

  function loadCreators() {
    const online = window.LytuneAuth && window.LytuneAuth.isOnline();
    if (modeIndicator) modeIndicator.textContent = online ? '● Live from LyTune' : '● Offline preview';

    if (!online || !window.LytuneAuth) {
      allCreators = [];
      applyFilters();
      return;
    }

    // Speculative — see the file header note. Fails gracefully (404 or
    // any network error) straight to the honest empty state.
    fetch(window.LytuneAuth.apiBase + '/producers')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        allCreators = data && Array.isArray(data.producers) ? data.producers : [];
        applyFilters();
      })
      .catch(() => {
        allCreators = [];
        applyFilters();
      });
  }

  function wireControls() {
    genreChips.forEach((chip) => {
      chip.addEventListener('click', () => {
        genreChips.forEach((c) => c.classList.remove('active'));
        chip.classList.add('active');
        activeGenre = chip.getAttribute('data-genre') || 'all';
        applyFilters();
      });
    });

    if (searchInput) {
      let debounce;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounce);
        debounce = setTimeout(applyFilters, 150);
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireControls();
    if (resultsCount) resultsCount.textContent = 'Loading creators…';

    if (window.LytuneAuth) {
      window.LytuneAuth.whenReady().then(loadCreators);
    } else {
      loadCreators();
    }
  });
})();
