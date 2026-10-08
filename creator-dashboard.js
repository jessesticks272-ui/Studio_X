import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const OWNER_EMAIL = "jessesticks272@gmail.com";
const $ = id => document.getElementById(id);

function dateValue(value) {
  if (!value) return null;
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateText(value) {
  const date = dateValue(value);
  if (!date) return "Not recorded";
  const today = new Date();
  const isToday = date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
  if (isToday) return "Today";
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

async function loadMembers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const members = snapshot.docs
      .map(item => ({ uid: item.id, ...item.data() }))
      .sort((a, b) => {
        const aDate = dateValue(a.createdAt)?.getTime() || 0;
        const bDate = dateValue(b.createdAt)?.getTime() || 0;
        return bDate - aDate;
      });

    $("memberTable").innerHTML = members.map(member => {
      const lastLogin = member.lastLoginAt || member.lastSeenAt;
      return `<tr>
        <td><span class="member-name">${escapeHtml(member.name || "LyTune User")}</span></td>
        <td><span class="member-email">${escapeHtml(member.email || "No email recorded")}</span></td>
        <td class="role">${escapeHtml(String(member.role || "artist").replace(/^./, letter => letter.toUpperCase()))}</td>
        <td>${dateText(member.createdAt)}</td>
        <td>${dateText(lastLogin)}</td>
      </tr>`;
    }).join("");

    if (!members.length) {
      showState("No member records yet. Once the database is enabled, ask each existing user to sign in again so their profile can be saved.");
    } else {
      $("state").style.display = "none";
    }
  } catch (error) {
    console.error("Could not load LyTune members:", error);
    if (error?.code === "permission-denied") {
      showState("Access denied. Publish the Firestore rules, then reload this page.", true);
    } else if (error?.code === "unavailable" || error?.code === "failed-precondition") {
      showState("Firestore is not ready yet. Your Firebase Console showed that it could not enable the database, so this table cannot load members until that is fixed.", true);
    } else {
      showState("Could not load members. Firestore must be enabled and its rules published first.", true);
    }
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

  if ((user.email || "").toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
    showState("This member list is only available to the owner account.", true);
    setTimeout(() => location.href = "index.html", 1800);
    return;
  }

  $("creatorEmail").textContent = user.email || OWNER_EMAIL;
  await loadMembers();
});
