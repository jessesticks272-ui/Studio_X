import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const OWNER_EMAIL = "jessesticks272@gmail.com";
const $ = id => document.getElementById(id);

function dateValue(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateText(value) {
  const date = dateValue(value);
  if (!date) return "Not recorded";
  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  if (isToday) {
    return "Today, " + date.toLocaleTimeString("en-NG", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
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

async function loadMembers(user) {
  try {
    showState("Loading registered accounts…");
    const token = await user.getIdToken();
    const response = await fetch("/api/members", {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.error || "Could not load member accounts.");
    }

    const members = Array.isArray(result.members) ? result.members : [];
    $("memberTable").innerHTML = members.map(member => `<tr>
      <td><span class="member-name">${escapeHtml(member.name || "LyTune User")}</span></td>
      <td><span class="member-email">${escapeHtml(member.email || "No email recorded")}</span></td>
      <td class="role">${escapeHtml(member.role || "Member")}</td>
      <td>${escapeHtml(dateText(member.createdAt))}</td>
      <td>${escapeHtml(dateText(member.lastLoginAt))}</td>
    </tr>`).join("");

    if (!members.length) {
      showState("No accounts have registered yet.");
    } else {
      $("state").style.display = "none";
    }
  } catch (error) {
    console.error("Could not load LyTune members:", error);
    showState(error.message || "Could not load members. Check the server setup and try again.", true);
  }
}

$("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
  location.href = "index.html";
});

onAuthStateChanged(auth, async user => {
  if (!user) {
    location.href = "auth.html";
    return;
  }

  if ((user.email || "").toLowerCase() !== OWNER_EMAIL) {
    showState("This member list is only available to the owner account.", true);
    setTimeout(() => location.href = "index.html", 1800);
    return;
  }

  $("creatorEmail").textContent = user.email || OWNER_EMAIL;
  await loadMembers(user);
});
