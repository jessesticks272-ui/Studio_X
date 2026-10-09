(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const escapeHtml = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
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

  let mobileCatalog = [];
  const beatBox = $("#mobileBeatResults");
  const beatConnection = $("#beatConnection");

  function beatTitle(beat) { return beat.title || beat.name || "Untitled beat"; }
  function beatAudio(beat) { return beat.previewUrl || beat.audioUrl || beat.audioURL || ""; }
  function renderBeats(beats, sourceLabel) {
    mobileCatalog = beats;
    if (beatConnection) beatConnection.textContent = sourceLabel;
    if (!beatBox) return;
    if (!beats.length) {
      beatBox.innerHTML = '<p class="catalog-message">No published beats are available yet. When a producer publishes a beat in Studio X, it can appear here.</p>';
      return;
    }
    beatBox.innerHTML = beats.slice(0, 6).map((beat) => {
      const audio = beatAudio(beat);
      const art = beat.coverUrl
        ? '<img loading="lazy" src="' + escapeHtml(beat.coverUrl) + '" alt="">'
        : '♫';
      const meta = [beat.genre || "Music", beat.bpm ? beat.bpm + " BPM" : "", beat.producerName || beat.producer || "LyTune creator"].filter(Boolean).join(" · ");
      return '<article class="mobile-beat-card"><div class="mobile-beat-art">' + art + '</div><div class="mobile-beat-copy"><strong>' + escapeHtml(beatTitle(beat)) + '</strong><small>' + escapeHtml(meta) + '</small>' +
        (audio ? '<audio controls preload="none" src="' + escapeHtml(audio) + '" aria-label="Preview ' + escapeHtml(beatTitle(beat)) + '"></audio>' : '<small>Audio preview not available</small>') +
        '</div></article>';
    }).join("");
  }

  async function loadCatalog() {
    if (beatConnection) beatConnection.textContent = "Loading live catalog…";
    // Studio uploads are stored in Firestore, so read the same published catalog first.
    try {
      const store = await import("../firestore.js");
      const beats = await store.getPublishedBeats();
      if (Array.isArray(beats) && beats.length) {
        renderBeats(beats, "Live · Firebase");
        return beats;
      }
      // Keep checking the existing API for any catalog stored in the SQL backend.
      const response = await fetch("/api/beats?limit=48", { headers: { Accept: "application/json" } });
      if (response.ok) {
        const payload = await response.json();
        const apiBeats = Array.isArray(payload.beats) ? payload.beats : [];
        if (apiBeats.length) {
          renderBeats(apiBeats, "Live · catalog API");
          return apiBeats;
        }
      }
      renderBeats([], "Live · connected");
      return [];
    } catch (firebaseError) {
      console.warn("Firebase catalog read failed; trying the catalog API.", firebaseError);
      try {
        const response = await fetch("/api/beats?limit=48", { headers: { Accept: "application/json" } });
        if (!response.ok) throw new Error("Catalog API returned " + response.status);
        const payload = await response.json();
        const beats = Array.isArray(payload.beats) ? payload.beats : [];
        renderBeats(beats, "Live · catalog API");
        return beats;
      } catch (apiError) {
        console.error("Could not load the live beat catalog.", apiError);
        renderBeats([], "Catalog unavailable");
        if (beatBox) beatBox.innerHTML = '<p class="catalog-message">The live catalog could not connect. Check Firebase/Firestore access and the deployed /api/beats backend, then refresh this page.</p>';
        return [];
      }
    }
  }

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

  $("#aiSearchForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const query = prompt?.value.trim();
    const results = $("#aiResults");
    if (!query || !results) { prompt?.focus(); return; }
    results.innerHTML = '<p class="catalog-message">Searching your live beat catalog with LyTune AI…</p>';
    const submit = $("#aiSearchForm button[type="submit"]");
    if (submit) submit.disabled = true;
    try {
      const catalog = mobileCatalog.length ? mobileCatalog : await loadCatalog();
      if (!catalog.length) {
        results.innerHTML = '<div class="result-note"><strong>No published beats to match yet.</strong><br>Publish a beat in Studio X, then try AI Search again.</div><a class="button button-primary" style="margin-top:10px" href="../studio.html">Open Studio ↗</a>';
        return;
      }
      const response = await fetch("/api/ai-search", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          query,
          catalog: catalog.slice(0, 50).map((beat) => ({
            title: beatTitle(beat),
            producer: beat.producerName || beat.producer || "Independent Producer",
            genre: beat.genre || "",
            tempo: beat.tempo || "",
            vibe: beat.mood || beat.vibe || "",
            bpm: beat.bpm || null,
            price: beat.price == null ? "" : String(beat.price)
          }))
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || "AI Search could not connect.");
      const matches = Array.isArray(payload.matches) ? payload.matches : [];
      const profile = payload.soundProfile || {};
      results.innerHTML = '<div class="result-note"><strong>LyTune AI found your direction.</strong><br>' +
        escapeHtml(profile.direction || query) + (profile.genre ? '<br>Genre: ' + escapeHtml(profile.genre) : "") +
        (profile.tempo ? ' · Tempo: ' + escapeHtml(profile.tempo) : "") +
        (profile.vibe ? '<br>Mood: ' + escapeHtml(profile.vibe) : "") + '</div>';
      if (!matches.length) {
        results.insertAdjacentHTML("beforeend", '<p class="catalog-message">The AI did not find a strong match in the currently published catalog.</p>');
      } else {
        matches.forEach((match) => {
          const beat = catalog[match.catalogId];
          if (!beat) return;
          const item = document.createElement("div");
          item.className = "mobile-ai-match";
          const title = document.createElement("strong");
          title.textContent = beatTitle(beat);
          const explanation = document.createElement("p");
          explanation.textContent = match.explanation || (Array.isArray(match.reasons) ? match.reasons.join(" · ") : "");
          const score = document.createElement("small");
          score.textContent = "Match score: " + Math.round(Number(match.score) || 0) + "%";
          item.append(title, explanation, score);
          results.appendChild(item);
        });
      }
    } catch (error) {
      console.error("AI music search failed:", error);
      results.innerHTML = '<div class="result-note"><strong>AI Search is not ready.</strong><br>' + escapeHtml(error.message || "Check the AI backend configuration.") + '</div><p class="fine-print">The mobile page is calling the live /api/ai-search endpoint. The server needs a valid OPENAI_API_KEY before AI recommendations can work.</p>';
    } finally {
      if (submit) submit.disabled = false;
    }
  });

  // Share Firebase's real signed-in session with the mobile entry point.
  import("../firebase.js").then(async ({ auth }) => {
    const { onAuthStateChanged } = await import("https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js");
    const { getUserProfile } = await import("../firestore.js");
    onAuthStateChanged(auth, async (user) => {
      const avatar = $(".top-actions .avatar");
      const profileNav = $('.bottom-nav [data-nav="profile"]');
      if (!user) return;
      const profile = await getUserProfile(user.uid).catch(() => null);
      const role = profile?.role || localStorage.getItem("lytune-role") || "artist";
      const destination = role === "producer" ? "../producer-dashboard.html" : role === "creator" ? "../creator-dashboard.html" : "../artist-dashboard.html";
      if (avatar) { avatar.href = destination; avatar.textContent = (user.displayName || user.email || "X").trim().charAt(0).toUpperCase(); avatar.setAttribute("aria-label", "Open your dashboard"); }
      if (profileNav) { profileNav.href = destination; profileNav.querySelector("small").textContent = "Profile"; }
    });
  }).catch((error) => console.warn("Firebase auth state is unavailable on the mobile shell.", error));

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

  loadCatalog();
  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
  }
})();