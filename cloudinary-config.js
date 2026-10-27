/* Public Cloudinary configuration loader.
 * Reads only the public cloud name from /api/media-config. No secret is
 * requested or exposed in browser code. If the API is unavailable, external
 * HTTPS image URLs continue to work as a safe fallback.
 */
(function () {
  "use strict";
  const existing = String(window.LYTUNE_CLOUDINARY_CLOUD_NAME || "").trim();
  if (existing) return;

  function refreshMedia() {
    if (!window.LytuneCloudinary || typeof window.LytuneCloudinary.processMedia !== "function") return;
    document.querySelectorAll("[data-lytune-media-processed]").forEach((image) => {
      image.removeAttribute("data-lytune-media-processed");
    });
    window.LytuneCloudinary.processMedia();
  }

  fetch("/api/media-config", { headers: { accept: "application/json" }, cache: "no-cache" })
    .then((response) => response.ok ? response.json() : null)
    .then((config) => {
      const name = String(config?.cloudName || "").trim();
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(name)) return;
      window.LYTUNE_CLOUDINARY_CLOUD_NAME = name;
      refreshMedia();
    })
    .catch(() => {
      // Keep direct remote image URLs working if the optional media API is unavailable.
    });
})();
