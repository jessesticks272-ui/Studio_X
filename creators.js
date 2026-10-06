/* Real Firebase creator directory */
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";
import { getPublishedBeats } from "./firestore.js";

(function(){
  "use strict";

  let creators = [];
  let genre = "all";
  let queryText = "";
  const following = new Set(JSON.parse(localStorage.getItem("lytune_following_creators") || "[]"));

  function escapeHtml(value = "") {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function normalizeGenres(profile) {
    const values = [];
    if (Array.isArray(profile.genres)) values.push(...profile.genres);
    if (profile.genre) values.push(profile.genre);
    if (Array.isArray(profile.tags)) values.push(...profile.tags);
    return [...new Set(values.filter(Boolean).map(value => String(value).trim()))];
  }

  function matches(creator) {
    const searchable = [
      creator.name,
      creator.role,
      creator.location,
      creator.bio,
      ...creator.genres,
      ...creator.tags
    ].join(" ").toLowerCase();

    const genreMatch = genre === "all" || searchable.includes(genre);
    return genreMatch && searchable.includes(queryText);
  }

  function card(creator) {
    const uid = creator.uid;
    const isFollowing = following.has(uid);
    const initials = (creator.name || "C").trim().charAt(0).toUpperCase();
    const avatar = creator.avatarUrl || creator.photoURL || "";
    const cover = creator.coverUrl || "";
    const beatCount = creator.beatCount || 0;

    const coverStyle = cover
      ? `background-image:url("${escapeHtml(cover)}");background-size:cover;background-position:center;`
      : "";

    const avatarMarkup = avatar
      ? `<img class="creator-avatar-image" src="${escapeHtml(avatar)}" alt="${escapeHtml(creator.name)} profile photo">`
      : escapeHtml(initials);

    const tags = creator.tags.map(tag =>
      `<span class="creator-tag">${escapeHtml(tag)}</span>`
    ).join("");

    return `
      <article class="creator-card">
        <div class="creator-cover" style="${coverStyle}">
          <div class="creator-avatar-wrap">
            <div class="creator-avatar">${avatarMarkup}</div>
          </div>
        </div>

        <div class="creator-body">
          <div class="creator-head">
            <div class="creator-info">
              <h3>${escapeHtml(creator.name || "LyTune Producer")}</h3>
              <div class="creator-role">${escapeHtml(creator.role || "Producer")}</div>
              ${creator.location ? `<div class="creator-location">📍 ${escapeHtml(creator.location)}</div>` : ""}
            </div>
            ${creator.isVerified ? '<span class="creator-founding-badge">Verified</span>' : ""}
          </div>

          <p class="creator-bio">${escapeHtml(creator.bio || "This producer has not added a bio yet.")}</p>

          <div class="creator-tags">
            ${tags || '<span class="creator-tag">Producer</span>'}
          </div>

          <div class="creator-stats">
            <span class="creator-stat">
              <strong class="creator-stat-value">${beatCount}</strong>
              <span class="creator-stat-label">Published beats</span>
            </span>
          </div>

          <div class="creator-actions">
            <button
              class="creator-follow-btn ${isFollowing ? "following" : ""}"
              data-follow="${escapeHtml(uid)}"
              type="button"
            >${isFollowing ? "Following ✓" : "Follow"}</button>

            <a class="creator-view-btn" href="creator-profile.html?uid=${encodeURIComponent(uid)}">
              View Profile
            </a>
          </div>
        </div>
      </article>
    `;
  }

  function render() {
    const grid = document.getElementById("creatorsGrid");
    const count = document.getElementById("resultsCount");
    const mode = document.getElementById("modeIndicator");
    if (!grid) return;

    const list = creators.filter(matches);

    if (count) {
      count.textContent = list.length + (list.length === 1 ? " creator" : " creators");
    }

    if (mode) {
      mode.textContent = creators.length
        ? "Live producer profiles from Firebase"
        : "No producer profiles have been published yet";
    }

    if (!list.length) {
      grid.innerHTML = `
        <div class="creator-empty-note">
          <div class="founder-icon">${creators.length ? "🔎" : "🎤"}</div>
          <h2>${creators.length ? "No creators match your search" : "No creators yet — be the first"}</h2>
          <p>${creators.length
            ? "Try another name or genre."
            : "Producer profiles will appear here as soon as creators publish their profile on LyTune Studio X."}</p>
          ${creators.length ? "" : `
            <div class="creators-empty-actions">
              <a href="signup.html" class="main-btn">Apply as a Producer</a>
            </div>`}
        </div>`;
      return;
    }

    grid.innerHTML = list.map(card).join("");

    grid.querySelectorAll("[data-follow]").forEach(button => {
      button.addEventListener("click", () => {
        const uid = button.getAttribute("data-follow");
        if (following.has(uid)) following.delete(uid);
        else following.add(uid);

        localStorage.setItem(
          "lytune_following_creators",
          JSON.stringify([...following])
        );
        render();
      });
    });
  }

  async function loadCreators() {
    const count = document.getElementById("resultsCount");
    const mode = document.getElementById("modeIndicator");

    if (count) count.textContent = "Loading creators…";
    if (mode) mode.textContent = "Connecting to Firebase";

    try {
      const [profileSnapshot, usersSnapshot, publishedBeats] = await Promise.all([
        getDocs(collection(db, "creatorProfiles")),
        getDocs(collection(db, "users")),
        getPublishedBeats()
      ]);

      const users = new Map();
      usersSnapshot.docs.forEach(item => {
        const data = item.data();
        if (data.role === "producer") users.set(item.id, { uid: item.id, ...data });
      });

      const profiles = new Map();
      profileSnapshot.docs.forEach(item => {
        const data = item.data();
        const uid = data.uid || item.id;
        profiles.set(uid, { ...data, uid });
      });

      const beatCounts = {};
      publishedBeats.forEach(beat => {
        if (beat.ownerId) beatCounts[beat.ownerId] = (beatCounts[beat.ownerId] || 0) + 1;
      });

      const ids = new Set([...users.keys(), ...profiles.keys()]);

      creators = [...ids]
        .map(uid => {
          const user = users.get(uid) || {};
          const profile = profiles.get(uid) || {};

          return {
            uid,
            name: profile.name || user.name || "LyTune Producer",
            role: profile.role || user.role || "Producer",
            location: profile.location || user.location || "",
            bio: profile.bio || user.bio || "",
            avatarUrl: profile.avatarUrl || profile.photoURL || user.photoURL || "",
            photoURL: profile.photoURL || user.photoURL || "",
            coverUrl: profile.coverUrl || "",
            genres: normalizeGenres(profile),
            tags: Array.isArray(profile.tags) ? profile.tags : [],
            isVerified: profile.isVerified === true,
            beatCount: beatCounts[uid] || 0
          };
        })
        .filter(creator => creator.role === "producer");

      creators.sort((a, b) => a.name.localeCompare(b.name));
      render();
    } catch (error) {
      console.error("Failed to load creators:", error);
      creators = [];

      const grid = document.getElementById("creatorsGrid");
      const count = document.getElementById("resultsCount");
      const mode = document.getElementById("modeIndicator");

      if (count) count.textContent = "Unable to load creators";
      if (mode) mode.textContent = "Firebase connection error";
      if (grid) {
        grid.innerHTML = `
          <div class="creator-empty-note">
            <div class="founder-icon">⚠️</div>
            <h2>Creators could not be loaded</h2>
            <p>Please refresh the page and try again. No fake or placeholder profiles are shown.</p>
          </div>`;
      }
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    const input = document.getElementById("creatorSearchInput");

    if (input) {
      input.addEventListener("input", event => {
        queryText = event.target.value.trim().toLowerCase();
        render();
      });
    }

    document.querySelectorAll("[data-genre]").forEach(button => {
      button.addEventListener("click", () => {
        document.querySelectorAll("[data-genre]").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        genre = button.getAttribute("data-genre").toLowerCase();
        render();
      });
    });

    loadCreators();
  });
})();
