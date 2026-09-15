
(function () {
  const STORAGE_KEY = 'lytune-theme';
  const root = document.documentElement;

  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch (err) {
    
      return null;
    }
  }

  function storeTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (err) {
      /* ignore — theme just won't persist this session */
    }
  }

  function systemPrefersLight() {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
  }

  function applyTheme(theme) {
    if (theme === 'light') {
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
    }
    updateToggleIcon(theme);
  }

  function updateToggleIcon(theme) {
    const moon = document.getElementById('themeIconMoon');
    const sun = document.getElementById('themeIconSun');
    if (!moon || !sun) return;
    if (theme === 'light') {
      moon.style.display = 'none';
      sun.style.display = '';
    } else {
      moon.style.display = '';
      sun.style.display = 'none';
    }
  }

  function currentTheme() {
    return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  // Initialize: stored preference wins, then system preference, then dark default.
  const stored = getStoredTheme();
  const initial = stored || (systemPrefersLight() ? 'light' : 'dark');
  applyTheme(initial);

  document.addEventListener('DOMContentLoaded', function () {
    const toggle = document.getElementById('themeToggle');
    if (!toggle) return;
    updateToggleIcon(currentTheme());
    toggle.addEventListener('click', function () {
      const next = currentTheme() === 'light' ? 'dark' : 'light';
      applyTheme(next);
      storeTheme(next);
    });
  });
})();
