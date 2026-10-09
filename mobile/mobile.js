(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const toast = (message) => {
    const node = $("#toast");
    if (!node) return;
    node.textContent = message;
    node.classList.add("show");
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(() => node.classList.remove("show"), 2600);
  };

  const searchForm = $("#globalSearch");
  searchForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = $("#globalSearchInput")?.value.trim();
    if (!query) { $("#globalSearchInput")?.focus(); return; }
    window.location.href = "../explore.html?q=" + encodeURIComponent(query);
  });

  const prompt = $("#aiPrompt");
  const count = $("#promptCount");
  prompt?.addEventListener("input", () => { if (count) count.textContent = prompt.value.length + " / 240"; });
  document.querySelectorAll("[data-prompt]").forEach((button) => {
    button.addEventListener("click", () => {
      if (prompt) {
        prompt.value = button.dataset.prompt || "";
        prompt.dispatchEvent(new Event("input"));
        prompt.focus();
      }
    });
  });
  $("#aiSearchForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const query = prompt?.value.trim();
    const results = $("#aiResults");
    if (!query) { prompt?.focus(); return; }
    const genre = /amapiano/i.test(query) ? "Amapiano" : /trap/i.test(query) ? "Trap" : /r&b|soul/i.test(query) ? "R&B" : /afro/i.test(query) ? "Afrobeats" : "";
    results.innerHTML = '<div class="result-note"><strong>Vibe captured.</strong><br>We understood your brief: “' + query.replace(/[&<>"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c])) + '”. ' + (genre ? "Start exploring " + genre + " beats that fit this direction." : "Try exploring beats by genre and mood to find a match.") + '</div><a class="button button-primary" style="margin-top:10px" href="../explore.html' + (genre ? "?genre=" + encodeURIComponent(genre) : "?q=" + encodeURIComponent(query)) + '">Explore matching beats ↗</a><p class="fine-print">This is a local demo experience, not a live AI model. Connect an AI service to enable generated recommendations.</p>';
  });

  const sections = ["home", "explore", "ai", "studio"];
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a,b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      document.querySelectorAll("[data-nav]").forEach((link) => link.classList.toggle("active", link.dataset.nav === visible.target.id));
    }, { rootMargin: "-20% 0px -55% 0px", threshold: [0, .15, .35, .6] });
    sections.forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
  }

  let installPrompt;
  const installButton = $("#installButton");
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.hidden = false;
  });
  installButton?.addEventListener("click", async () => {
    if (!installPrompt) { toast("On iPhone, use Share → Add to Home Screen in Safari."); return; }
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => toast("LyTune Studio X added to your home screen."));

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();