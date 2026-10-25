/* Cloudinary media delivery helpers for LyTune Studio X.
 * Contains no credentials. API secrets belong only in server-side environment variables.
 * Local assets and URLs from other hosts are returned unchanged.
 */
(function () {
  "use strict";

  function deliveryUrl(value, options = {}) {
    if (typeof value !== "string" || !value.trim()) return value || "";
    let url;
    try { url = new URL(value, window.location.href); } catch { return value; }

    if (url.protocol !== "https:" || !/^res\.cloudinary\.com$/i.test(url.hostname)) return value;

    const parts = url.pathname.split("/");
    const uploadIndex = parts.indexOf("upload");
    if (uploadIndex < 0) return value;

    const width = Number(options.width);
    const kind = options.kind === "video" ? "video" : "image";
    const transforms = [
      "f_auto",
      "q_auto",
      ...(Number.isFinite(width) && width >= 64 && width <= 2400 ? [`w_${Math.round(width)}`] : []),
      ...(kind === "image" && options.crop === "fill" ? ["c_fill"] : [])
    ];

    const next = parts[uploadIndex + 1] || "";
    const looksLikeTransform = /^(?:f_|q_|w_|h_|c_|ar_|g_|dpr_|e_|r_|b_|l_|a_|fl_|t_)/.test(next);
    if (looksLikeTransform) parts[uploadIndex + 1] = transforms.join(",");
    else parts.splice(uploadIndex + 1, 0, transforms.join(","));
    url.pathname = parts.join("/");
    return url.toString();
  }

  window.LytuneCloudinary = Object.freeze({ deliveryUrl });
})();
