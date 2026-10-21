import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { addDoc, collection, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { auth, db } from "./firebase.js";

const form = document.getElementById("feedbackForm");
const submit = document.getElementById("submitFeedback");
const message = document.getElementById("formMessage");
const notice = document.getElementById("authNotice");
let signedInUser = null;

function setMessage(text, kind = "") {
  message.textContent = text;
  message.className = "message" + (kind ? " " + kind : "");
}

onAuthStateChanged(auth, user => {
  signedInUser = user || null;
  notice.hidden = Boolean(user);
  submit.disabled = !user;
  if (!user) setMessage("Please sign in before sending feedback.");
  else if (message.textContent === "Please sign in before sending feedback.") setMessage("");
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (!signedInUser) {
    setMessage("Please sign in first, then return here to send your feedback.", "error");
    window.location.href = "auth.html?mode=login&next=feedback.html";
    return;
  }

  const details = document.getElementById("details").value.trim();
  if (details.length < 10 || details.length > 3000) {
    setMessage("Please write between 10 and 3,000 characters.", "error");
    return;
  }

  submit.disabled = true;
  setMessage("Sending your feedback…");
  try {
    await addDoc(collection(db, "feedback"), {
      ownerId: signedInUser.uid,
      email: signedInUser.email || "",
      displayName: signedInUser.displayName || "",
      role: document.getElementById("role").value,
      area: document.getElementById("area").value,
      rating: Number(document.getElementById("rating").value),
      details,
      priority: document.getElementById("priority").value,
      status: "new",
      createdAt: serverTimestamp()
    });
    form.reset();
    setMessage("Thanks! Your feedback has been sent to the LyTune team.", "ok");
  } catch (error) {
    console.error("Feedback submission failed:", error);
    setMessage("We couldn't send that yet. Please check the Firestore rules are published, then try again.", "error");
  } finally {
    submit.disabled = !signedInUser;
  }
});