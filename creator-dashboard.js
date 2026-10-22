import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const OWNER_EMAIL = "jessesticks272@gmail.com";
const $ = id => document.getElementById(id);
let allMembers = [];
let activeRole = "all";

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
function dateText(value) {
  const date = dateValue(value);
  if (!date) return "Not recorded";
  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();
  if (isToday) return "Today, " + date.toLocaleTimeString("en-NG", {hour:"2-digit",minute:"2-digit"});
  return date.toLocaleString("en-NG", {day:"numeric",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"});
}
function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value ?? "";
  return element.innerHTML;
}
function showState(message, isError = false) {
  $("state").textContent = message;
  $("state").className = isError ? "state error" : "state";
  $("state").style.display = "block";
}
function roleName(member) {
  const role = String(member.role || "").toLowerCase();
  if (role === "producer") return "Producer";
  if (role === "artist") return "Artist";
  if (role === "both") return "Artist + Producer";
  return member.role || "Not set";
}
function updateStats(members) {
  $("totalCount").textContent = members.length.toLocaleString();
  $("producerCount").textContent = members.filter(m => String(m.role || "").toLowerCase() === "producer").length.toLocaleString();
  $("artistCount").textContent = members.filter(m => String(m.role || "").toLowerCase() === "artist").length.toLocaleString();
  $("verifiedCount").textContent = members.filter(m => m.emailVerified).length.toLocaleString();
}
function renderMembers() {
  const term = $("memberSearch").value.trim().toLowerCase();
  const filtered = allMembers.filter(member => {
    const role = String(member.role || "").toLowerCase();
    const roleMatch = activeRole === "all"
      || (activeRole === "producer" && role === "producer")
      || (activeRole === "artist" && role === "artist")
      || (activeRole === "other" && !["producer","artist"].includes(role));
    const searchMatch = !term || String(member.name || "").toLowerCase().includes(term)
      || String(member.email || "").toLowerCase().includes(term);
    return roleMatch && searchMatch;
  });
  $("memberTable").innerHTML = filtered.map(member => {
    const verified = member.emailVerified
      ? '<span class="pill pill-good">Verified</span>'
      : '<span class="pill pill-warn">Unverified</span>';
    const status = member.disabled
      ? '<span class="pill pill-warn">Disabled</span>'
      : '<span class="pill pill-good">Active</span>';
    return `<tr>
      <td><span class="member-name">${escapeHtml(member.name || "LyTune User")}</span><span class="member-uid">UID: ${escapeHtml(member.uid || "Not available")}</span></td>
      <td><span class="member-email">${escapeHtml(member.email || "No email recorded")}</span></td>
      <td class="role">${escapeHtml(roleName(member))}</td>
      <td>${escapeHtml(member.provider || "Unknown")}</td>
      <td>${escapeHtml(dateText(member.createdAt))}</td>
      <td>${escapeHtml(dateText(member.lastLoginAt))}</td>
      <td>${verified}</td>
      <td>${status}</td>
    </tr>`;
  }).join("");
  $("resultCount").textContent = `Showing ${filtered.length} of ${allMembers.length} accounts`;
  if (!allMembers.length) showState("No Firebase Authentication accounts were found yet.");
  else if (!filtered.length) showState("No accounts match this search or filter.");
  else $("state").style.display = "none";
}
async function loadMembers(user) {
  $("refreshBtn").disabled = true;
  $("refreshBtn").textContent = "Loading…";
  showState("Loading registered accounts…");
  try {
    const token = await user.getIdToken(true);
    const response = await fetch("/api/members", {
      method: "GET",
      headers: {Authorization: `Bearer ${token}`},
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || "Could not load member accounts.");
    allMembers = Array.isArray(result.members) ? result.members : [];
    updateStats(allMembers);
    renderMembers();
  } catch (error) {
    console.error("Could not load LyTune members:", error);
    showState(error.message || "Could not load members. Check the Vercel server configuration.", true);
  } finally {
    $("refreshBtn").disabled = false;
    $("refreshBtn").textContent = "↻ Refresh list";
  }
}
$("memberSearch").addEventListener("input", renderMembers);
document.querySelectorAll("[data-role]").forEach(button => button.addEventListener("click", () => {
  activeRole = button.dataset.role;
  document.querySelectorAll("[data-role]").forEach(item => {
    const selected = item === button;
    item.classList.toggle("active", selected);
    item.setAttribute("aria-pressed", String(selected));
  });
  renderMembers();
}));
$("refreshBtn").addEventListener("click", async () => {
  if (auth.currentUser) await loadMembers(auth.currentUser);
});
$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "index.html";
});
onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "auth.html?next=creator-dashboard.html";
    return;
  }
  if ((user.email || "").toLowerCase() !== OWNER_EMAIL) {
    showState("Access denied. This private member directory is only available to the LyTune owner account.", true);
    setTimeout(() => location.href = "index.html", 2200);
    return;
  }
  $("creatorEmail").textContent = `Signed in as ${user.email}. Account data is fetched securely from Firebase Authentication.`;
  await loadMembers(user);
});
