/* LyTune Studio X shared theme manager.
 * Persists the selected theme, applies it before first paint, and normalizes
 * light-mode colors on pages that still contain legacy hard-coded dark styles.
 */
(function () {
  "use strict";
  const STORAGE_KEY = "lytune-theme";
  const root = document.documentElement;

  function safeRead() {
    try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
  }
  function safeWrite(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch { /* storage may be blocked */ }
  }
  function systemPrefersLight() {
    return Boolean(window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches);
  }
  function updateToggleIcon(theme) {
    const moon = document.getElementById("themeIconMoon");
    const sun = document.getElementById("themeIconSun");
    if (!moon || !sun) return;
    moon.style.display = theme === "light" ? "none" : "";
    sun.style.display = theme === "light" ? "" : "none";
  }
  function currentTheme() {
    return root.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function applyTheme(theme) {
    const next = theme === "light" ? "light" : "dark";
    if (next === "light") root.setAttribute("data-theme", "light");
    else root.removeAttribute("data-theme");
    root.style.colorScheme = next;
    updateToggleIcon(next);
    window.dispatchEvent(new CustomEvent("lytune:themechange", { detail: { theme: next } }));
  }

  function installThemeCompatibilityStyles() {
    if (document.getElementById("lytune-theme-compat")) return;
    const style = document.createElement("style");
    style.id = "lytune-theme-compat";
    style.textContent = `
      :root[data-theme="light"] {
        color-scheme: light;
        --bg-1:#f4f7ff; --bg-2:#e7edff; --bg-3:#eef1ff; --bg-4:#fff;
        --text-primary:#0b1030; --text-secondary:#3c4258; --text-muted:#6b7086;
        --surface:rgba(10,20,60,.045); --surface-strong:rgba(10,20,60,.08);
        --border-soft:rgba(10,20,60,.12); --border-color:rgba(10,20,60,.14);
        --border-hover:rgba(0,123,255,.4); --shadow:0 8px 28px rgba(20,35,80,.1);
        --bg-primary:#f4f7ff; --bg-secondary:rgba(229,235,250,.9);
        --bg-card:rgba(255,255,255,.84);
        --bg:#f4f7ff; --panel:#fff; --panel2:#edf1fb; --text:#0b1030;
        --muted:#59627a; --line:rgba(10,20,60,.13);
        --ps-bg:#f4f7ff; --ps-panel:#fff; --ps-text:#0b1030;
        --ps-muted:#59627a; --ps-line:rgba(10,20,60,.13);
      }
      :root[data-theme="light"] body {
        background-color:#f4f7ff;
        color:var(--text-primary,#0b1030);
      }
      :root[data-theme="light"] body::before {
        background:
          radial-gradient(circle at top left,rgba(25,215,255,.08),transparent 35%),
          radial-gradient(circle at bottom right,rgba(155,46,255,.07),transparent 35%);
      }
      :root[data-theme="light"] body::after {
        background:linear-gradient(to bottom,rgba(255,255,255,.12),rgba(255,255,255,.24));
      }
      :root[data-theme="light"] .topbar,
      :root[data-theme="light"] .ps-nav {
        background:rgba(244,247,255,.9);
        border-color:rgba(10,20,60,.12);
      }
      :root[data-theme="light"] .main-btn,
      :root[data-theme="light"] .search-btn,
      :root[data-theme="light"] .submit-btn,
      :root[data-theme="light"] .ps-btn { color:#fff; }
      :root[data-theme="light"] input,
      :root[data-theme="light"] textarea,
      :root[data-theme="light"] select {
        color:var(--text-primary,#0b1030);
      }
      :root[data-theme="light"] .ps-card,
      :root[data-theme="light"] .ps-article,
      :root[data-theme="light"] .ps-sidebar,
      :root[data-theme="light"] .ps-search,
      :root[data-theme="light"] .ps-filter,
      :root[data-theme="light"] .profile-main,
      :root[data-theme="light"] .side-card,
      :root[data-theme="light"] .content {
        background:#fff;
        color:#0b1030;
        border-color:rgba(10,20,60,.13);
      }
      :root[data-theme="light"] .ps-article p,
      :root[data-theme="light"] .ps-tagline,
      :root[data-theme="light"] .ps-quote { color:#3c4258; }
      :root[data-theme="light"] .ps-story-cover::after {
        background:linear-gradient(0deg,rgba(244,247,255,.96),transparent 90%);
      }
      :root[data-theme="light"] .auth-panel { background:#f4f7ff; border-color:rgba(10,20,60,.12); }
      :root[data-theme="light"] .auth-heading h2,
      :root[data-theme="light"] .field label,
      :root[data-theme="light"] .field-label { color:#0b1030; }
      :root[data-theme="light"] .field input {
        background:#fff; color:#0b1030; border-color:#cbd3e5;
      }
      :root[data-theme="light"] .mode-switch { background:#e9eef9; border-color:#cbd3e5; }
      :root[data-theme="light"] .mode-btn { color:#59627a; }
      :root[data-theme="light"] .mode-btn.active { background:#fff; color:#0b1030; }
      :root[data-theme="light"] .role-option { border-color:#cbd3e5; }
      :root[data-theme="light"] .role-option:has(input:checked) { background:#eaf5ff; }
      :root[data-theme="light"] .noise { opacity:.008; }
      :root[data-theme="light"] ::selection { background:rgba(0,123,255,.22); }
      :root[data-theme="light"] :focus-visible { outline-color:#006fe8; }
      @media (prefers-reduced-motion: reduce) {
        :root[data-theme="light"] *, :root[data-theme="light"] *::before, :root[data-theme="light"] *::after {
          scroll-behavior:auto !important; animation-duration:.01ms !important;
          animation-iteration-count:1 !important; transition-duration:.01ms !important;
        }
      }
    `;
    (document.head || root).appendChild(style);
  }

  const stored = safeRead();
  applyTheme(stored === "light" || stored === "dark" ? stored : (systemPrefersLight() ? "light" : "dark"));
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initialize, { once: true });
  } else {
    initialize();
  }

  function initialize() {
    installThemeCompatibilityStyles();
    updateToggleIcon(currentTheme());
    document.querySelectorAll("#themeToggle").forEach((toggle) => {
      if (toggle.dataset.themeBound === "true") return;
      toggle.dataset.themeBound = "true";
      toggle.setAttribute("aria-label", "Switch to " + (currentTheme() === "light" ? "dark" : "light") + " theme");
      toggle.setAttribute("title", "Switch to " + (currentTheme() === "light" ? "dark" : "light") + " theme");
      toggle.addEventListener("click", () => {
        const next = currentTheme() === "light" ? "dark" : "light";
        applyTheme(next);
        safeWrite(next);
        document.querySelectorAll("#themeToggle").forEach((button) => {
          button.setAttribute("aria-label", "Switch to " + (next === "light" ? "dark" : "light") + " theme");
          button.setAttribute("title", "Switch to " + (next === "light" ? "dark" : "light") + " theme");
        });
      });
    });
  }
})();
