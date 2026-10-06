import { auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

const $ = (id) => document.getElementById(id);
let members = [];
let filter = "all";

const initials = (name = "") => name.split(" ").map(x => x[0]).slice(0, 2).join("").toUpperCase() || "?";
const money = (n) => "₦" + Number(n || 0).toLocaleString("en-NG");

function formatDate(value) {
  if (!value) return "Not available";
  const date = value?.toDate ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "Not available" : date.toLocaleDateString("en-NG", {
    day: "numeric", month: "short", year: "numeric"
  });
}

function paymentState(member) {
  return member.paymentStatus || member.payment || "pending";
}

function render() {
  const q = ($("memberSearch").value || "").toLowerCase().trim();
  const rows = members.filter(m => {
    const payment = paymentState(m);
    const role = (m.role || "artist").toLowerCase();
    const matchesFilter =
      filter === "all" ||
      filter === payment ||
      filter === role;
    const text = (m.name + " " + m.email).toLowerCase();
    return matchesFilter && text.includes(q);
  });

  $("memberTable").innerHTML = rows.map(m => {
    const payment = paymentState(m);
    const type = (m.role || "artist").replace(/^./, x => x.toUpperCase());
    return `<tr>
      <td><div class="member">
        <span class="member-avatar">${initials(m.name)}</span>
        <div><b>${m.name || "LyTune User"}</b><small>${m.email || ""}</small></div>
      </div></td>
      <td class="type">${type}</td>
      <td>${m.plan || "Free"}</td>
      <td><span class="status ${payment}">${payment === "paid" ? "Paid" : "Pending"}</span></td>
      <td>${formatDate(m.createdAt)}</td>
      <td><button class="view-btn" data-uid="${m.uid}">View</button></td>
    </tr>`;
  }).join("");

  $("emptyState").classList.toggle("hidden", rows.length > 0);
  $("totalMembers").textContent = members.length;
  $("paidMembers").textContent = members.filter(m => paymentState(m) === "paid").length;
  $("pendingMembers").textContent = members.filter(m => paymentState(m) !== "paid").length;
  $("revenue").textContent = money(
    members.filter(m => paymentState(m) === "paid").reduce((sum, m) => sum + Number(m.amount || 0), 0)
  );
}

function renderPayments() {
  const paid = members.filter(m => paymentState(m) === "paid");
  $("paymentList").innerHTML = paid.length
    ? paid.map(m => `<div class="payment-row">
        <div class="payment-user">${m.name || "LyTune User"}<small>${m.plan || "Paid plan"}</small></div>
        <div class="payment-amount">${money(m.amount)}</div>
        <div class="payment-date">${formatDate(m.paidAt || m.updatedAt)}</div>
        <span class="status paid">Paid</span>
      </div>`).join("")
    : '<div class="empty"><div>₦</div><h3>No paid members yet</h3><p>Paid transactions will appear here after payments are connected.</p></div>';
}

async function loadMembers() {
  try {
    const snapshot = await getDocs(query(collection(db, "users"), orderBy("createdAt", "desc")));
    members = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
    render();
    renderPayments();
  } catch (error) {
    console.error("Could not load members:", error);
    $("memberTable").innerHTML = "";
    $("emptyState").classList.remove("hidden");
    $("emptyState").querySelector("h3").textContent = "Could not load members";
    $("emptyState").querySelector("p").textContent = "Check your Firestore security rules and make sure the admin account has permission to read users.";
  }
}

document.querySelectorAll(".filter").forEach(btn => btn.addEventListener("click", () => {
  document.querySelectorAll(".filter").forEach(x => x.classList.remove("active"));
  btn.classList.add("active");
  filter = btn.dataset.filter;
  render();
}));

$("memberSearch").addEventListener("input", render);

document.addEventListener("click", event => {
  const button = event.target.closest(".view-btn");
  if (!button) return;
  const member = members.find(x => x.uid === button.dataset.uid);
  if (!member) return;
  alert(
    `Name: ${member.name || "LyTune User"}\nEmail: ${member.email || ""}\nRole: ${member.role || "artist"}\nPlan: ${member.plan || "Free"}\nPayment: ${paymentState(member)}`
  );
});

$("accountButton").addEventListener("click", () => {
  const menu = $("accountMenu");
  menu.classList.toggle("hidden");
  $("accountButton").setAttribute("aria-expanded", String(!menu.classList.contains("hidden")));
});

document.addEventListener("click", event => {
  if (!event.target.closest(".account-wrap")) $("accountMenu").classList.add("hidden");
});

$("exportBtn").addEventListener("click", () => {
  const csv = [
    "Name,Email,Role,Plan,Payment,Joined",
    ...members.map(m => [
      m.name || "", m.email || "", m.role || "", m.plan || "Free",
      paymentState(m), formatDate(m.createdAt)
    ].map(v => '"' + String(v).replaceAll('"', '""') + '"').join(","))
  ].join("\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
  a.download = "lytune-members.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

$("logoutButton").addEventListener("click", async () => {
  await auth.signOut();
  localStorage.removeItem("lytune-token");
  localStorage.removeItem("lytune-user");
  location.href = "index.html";
});

$("themeToggle").addEventListener("click", () => {
  const light = document.documentElement.dataset.theme === "light";
  document.documentElement.dataset.theme = light ? "dark" : "light";
  localStorage.setItem("lytune-theme", light ? "dark" : "light");
});

auth.onAuthStateChanged(user => {
  if (!user) {
    location.href = "auth.html";
    return;
  }
  $("accountButton").textContent = initials(user.displayName || user.email || "J");
  loadMembers();
});
