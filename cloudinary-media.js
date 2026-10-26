/* LyTune Studio X media delivery.
 * Configure only the public Cloudinary cloud name in window.LYTUNE_CLOUDINARY_CLOUD_NAME
 * or <meta name="lytune-cloudinary-cloud-name" content="...">.
 * Never put Cloudinary API secrets in browser code. If no cloud name is configured,
 * approved HTTPS image URLs remain usable directly rather than breaking the page.
 */
(function () {
  "use strict";

  const processedAttribute = "data-lytune-media-processed";

  function getCloudName() {
    const meta = document.querySelector('meta[name="lytune-cloudinary-cloud-name"]');
    const raw = window.LYTUNE_CLOUDINARY_CLOUD_NAME || meta?.content || "";
    return String(raw).trim().replace(/[^a-zA-Z0-9_-]/g, "");
  }

  function isLogo(value) {
    return /(?:^|[\/])logo(?:[.-]|$)/i.test(String(value || "")) ||
      /(?:^|[\/])assets?\/(?:image|images)\/logo/i.test(String(value || ""));
  }

  function deliveryUrl(value, options = {}) {
    if (typeof value !== "string" || !value.trim() || isLogo(value)) return value || "";
    let url;
    try { url = new URL(value, window.location.href); } catch { return value; }
    if (url.protocol !== "https:") return value;

    const width = Number(options.width);
    const safeWidth = Number.isFinite(width) && width >= 64 && width <= 2400
      ? Math.round(width)
      : 1200;
    const kind = options.kind === "video" ? "video" : "image";
    const cloudName = getCloudName();

    if (/^res\.cloudinary\.com$/i.test(url.hostname)) {
      const parts = url.pathname.split("/");
      const uploadIndex = parts.indexOf("upload");
      if (uploadIndex < 0) return value;
      const transforms = [
        "f_auto",
        "q_auto",
        `w_${safeWidth}`,
        ...(kind === "image" && options.crop === "fill" ? ["c_fill"] : [])
      ];
      const next = parts[uploadIndex + 1] || "";
      const looksLikeTransform = /^(?:f_|q_|w_|h_|c_|ar_|g_|dpr_|e_|r_|b_|l_|a_|fl_|t_)/.test(next);
      if (looksLikeTransform) parts[uploadIndex + 1] = transforms.join(",");
      else parts.splice(uploadIndex + 1, 0, transforms.join(","));
      url.pathname = parts.join("/");
      return url.toString();
    }

    // Cloudinary fetch API proxies and optimizes remote photos once the public cloud
    // name is configured. Do not route arbitrary local assets or SVGs through fetch.
    if (cloudName && kind === "image" && /^https:\/\/(?:images\.unsplash\.com|images\.pexels\.com|res\.cloudinary\.com)\//i.test(url.toString()) &&
        !/\.svg(?:$|[?#])/i.test(url.pathname)) {
      const transforms = `f_auto,q_auto,w_${safeWidth}${options.crop === "fill" ? ",c_fill" : ""}`;
      return `https://res.cloudinary.com/${cloudName}/image/fetch/${transforms}/${encodeURIComponent(url.toString())}`;
    }

    return value;
  }

  function processImage(img) {
    if (!(img instanceof HTMLImageElement) || img.hasAttribute(processedAttribute)) return;
    const original = img.getAttribute("src");
    if (!original || isLogo(original) || original.startsWith("data:") || original.startsWith("blob:")) return;
    const transformed = deliveryUrl(original, {
      width: img.dataset.mediaWidth || img.getAttribute("width") || 1200,
      crop: img.dataset.mediaCrop || "fill"
    });
    img.setAttribute(processedAttribute, "true");
    if (transformed && transformed !== original) img.setAttribute("src", transformed);
  }

  function processMedia(root = document) {
    if (root instanceof HTMLImageElement) processImage(root);
    root.querySelectorAll?.("img").forEach(processImage);
    root.querySelectorAll?.("video[poster]").forEach((video) => {
      const poster = video.getAttribute("poster");
      if (!poster || isLogo(poster)) return;
      const transformed = deliveryUrl(poster, { width: 1200, crop: "fill" });
      if (transformed && transformed !== poster) video.setAttribute("poster", transformed);
    });
  }

  window.LytuneCloudinary = Object.freeze({ deliveryUrl, processMedia });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => processMedia(), { once: true });
  } else {
    processMedia();
  }

  // Dynamic producer cards and profile images are processed as they are rendered.
  if ("MutationObserver" in window) {
    const observer = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) processMedia(node);
      }));
    });
    const startObserver = () => {
      if (document.body) observer.observe(document.body, { childList: true, subtree: true });
    };
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
    } else {
      startObserver();
    }
  }
})();
