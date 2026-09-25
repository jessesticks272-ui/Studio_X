/* ===== auth.js =====
   Two jobs:
   1. Detect whether the Lytune backend (server/server.js, from the
      README: `cd server && npm start`, http://localhost:4000) is
      reachable. If it is, the site runs in "online" mode and other
      scripts (data.js) can pull real data. If not, the site quietly
      falls back to offline/demo mode — nothing on the page breaks,
      it just shows bundled placeholder content instead of live data.
   2. Render the logged-in/logged-out state of the top nav and the
      mobile menu, based on a session token stored in localStorage.
      There's no login page wired up yet in this landing-page phase,
      so in practice this will almost always render "logged out" —
      but it's built so login.html/signup.html can drop a token in
      localStorage and the nav updates automatically.

   Exposes `window.LytuneAuth` for other scripts to use.
*/
(function () {
  // Override by setting `window.LYTUNE_API_BASE = '...'` in an inline
  // <script> before this file loads (e.g. when deploying the backend
  // somewhere other than localhost:4000).
  const API_BASE = window.LYTUNE_API_BASE || (window.location.origin + '/api');
  const TOKEN_KEY = 'lytune-token';
  const USER_KEY = 'lytune-user';
  const PING_TIMEOUT_MS = 2500;

  const state = {
    online: false,
    checked: false,
    user: null,
  };

  /* ---------- storage helpers (safe if localStorage is unavailable) ---------- */

  function safeGet(key) {
    try { return localStorage.getItem(key); } catch (err) { return null; }
  }
  function safeSet(key, value) {
    try { localStorage.setItem(key, value); } catch (err) { /* ignore */ }
  }
  function safeRemove(key) {
    try { localStorage.removeItem(key); } catch (err) { /* ignore */ }
  }

  function loadUser() {
    const raw = safeGet(USER_KEY);
    if (!raw) return null;
    try { return JSON.parse(raw); } catch (err) { return null; }
  }

  /* ---------- backend detection ---------- */

  function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    return fetch(url, Object.assign({}, options, { signal: controller.signal }))
      .finally(() => clearTimeout(timer));
  }

  // Pings a lightweight existing route (GET /api/beats, per the README's
  // route list) rather than requiring a dedicated /health endpoint.
  function checkOnline() {
    return fetchWithTimeout(API_BASE + '/beats', { method: 'GET' }, PING_TIMEOUT_MS)
      .then((res) => {
        state.online = !!res && res.ok;
        return state.online;
      })
      .catch(() => {
        state.online = false;
        return false;
      })
      .finally(() => {
        state.checked = true;
        document.body.setAttribute('data-lytune-mode', state.online ? 'online' : 'offline');
        document.dispatchEvent(new CustomEvent('lytune:mode', { detail: { online: state.online } }));
      });
  }

  /* ---------- nav rendering ---------- */

  function initials(name) {
    if (!name) return '?';
    return name.trim().charAt(0).toUpperCase();
  }

  function renderNav() {
    const actions = document.querySelector('.nav-actions');
    if (!actions) return;

    const themeToggle = document.getElementById('themeToggle');
    const existingCta = actions.querySelector('.main-btn, .nav-user-btn');
    if (existingCta) existingCta.remove();

    let cta;
    if (state.user) {
      cta = document.createElement('a');
      cta.href = state.user.role === 'producer' ? 'producer-dashboard.html' : 'artist-dashboard.html';
      cta.className = 'nav-user-btn';
      cta.setAttribute('aria-label', 'Go to dashboard');
      cta.innerHTML =
        '<span class="nav-avatar" style="background:var(--brand-gradient-diag);">' +
        initials(state.user.name) +
        '</span>';
    } else {
      cta = document.createElement('a');
      cta.href = 'signup.html';
      cta.className = 'main-btn';
      cta.textContent = 'Get Started';
    }

    if (themeToggle) {
      actions.insertBefore(cta, themeToggle);
    } else {
      actions.appendChild(cta);
    }
  }

  /* ---------- mobile hamburger menu ---------- */

  function buildMobileMenu() {
    if (document.querySelector('.mobile-menu')) return; // already built

    const topbar = document.querySelector('.topbar');
    const navLinks = document.querySelectorAll('.navbar-links > a');
    if (!topbar || !navLinks.length) return;

    const menu = document.createElement('div');
    menu.className = 'mobile-menu is-hidden';
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-label', 'Site navigation');

    const content = document.createElement('div');
    content.className = 'mobile-menu-content';

    const search = document.createElement('div');
    search.className = 'mobile-search';
    search.innerHTML =
      '<input type="text" placeholder="Search Afrobeats, Amapiano, Trap...">' +
      '<button type="button">Search</button>';
    content.appendChild(search);

    const divider = document.createElement('div');
    divider.className = 'mobile-menu-divider';
    content.appendChild(divider);

    navLinks.forEach((link) => {
      content.appendChild(link.cloneNode(true));
    });

    menu.appendChild(content);
    topbar.insertAdjacentElement('afterend', menu);

    // The topbar can wrap to two lines on very narrow phones (it has
    // flex-wrap: wrap below 768px), so its real height varies. Pin the
    // menu to the topbar's actual measured height rather than a fixed
    // CSS value, and re-measure on resize/orientation change.
    function positionMenu() {
      menu.style.top = topbar.getBoundingClientRect().bottom + 'px';
    }
    positionMenu();
    window.addEventListener('resize', positionMenu);
    window.addEventListener('orientationchange', positionMenu);

    // Hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'hamburger-btn';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.setAttribute('aria-expanded', 'false');
    hamburger.innerHTML =
      '<span class="hamburger-line"></span>' +
      '<span class="hamburger-line"></span>' +
      '<span class="hamburger-line"></span>';

    const actions = document.querySelector('.nav-actions');
    if (actions) actions.insertBefore(hamburger, actions.firstChild);

    hamburger.addEventListener('click', () => {
      const isOpen = !menu.classList.contains('is-hidden');
      menu.classList.toggle('is-hidden', isOpen);
      hamburger.setAttribute('aria-expanded', String(!isOpen));
      hamburger.querySelectorAll('.hamburger-line').forEach((line) => {
        line.classList.toggle('open', !isOpen);
      });
      document.body.style.overflow = isOpen ? '' : 'hidden';
    });
  }

  /* ---------- graceful media fallback (missing video/image files) ---------- */

  function wireMediaFallbacks() {
    document.querySelectorAll('video').forEach((video) => {
      video.addEventListener(
        'error',
        () => {
          if (video.dataset.fallbackApplied) return;
          video.dataset.fallbackApplied = 'true';
          const fallback = document.createElement('div');
          fallback.className = 'media-fallback';
          fallback.textContent = video.dataset.fallbackLabel || 'Preview unavailable offline';
          video.replaceWith(fallback);
        },
        true
      );
    });

    document.querySelectorAll('img').forEach((img) => {
      img.addEventListener(
        'error',
        () => {
          if (img.dataset.fallbackApplied) return;
          img.dataset.fallbackApplied = 'true';
          const fallback = document.createElement('div');
          fallback.className = 'media-fallback';
          fallback.style.aspectRatio = '4 / 3';
          fallback.textContent = img.alt || 'Image unavailable';
          img.replaceWith(fallback);
        },
        true
      );
    });
  }

  /* ---------- public API ---------- */

  window.LytuneAuth = {
    apiBase: API_BASE,
    isOnline: () => state.online,
    hasCheckedOnline: () => state.checked,
    whenReady: () => checkOnline(),
    getUser: () => state.user,
    logout: () => {
      safeRemove(TOKEN_KEY);
      safeRemove(USER_KEY);
      state.user = null;
      renderNav();
    },
    setSession: (token, user) => {
      safeSet(TOKEN_KEY, token);
      safeSet(USER_KEY, JSON.stringify(user));
      state.user = user;
      renderNav();
    },
  };

  document.addEventListener('DOMContentLoaded', function () {
    state.user = loadUser();
    renderNav();
    buildMobileMenu();
    wireMediaFallbacks();
    checkOnline(); // fire and forget — data.js listens for 'lytune:mode'
  });
})();
