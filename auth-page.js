import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const $ = (id) => document.getElementById(id);
const loginTab = $("loginTab");
const signupTab = $("signupTab");
const title = $("authTitle");
const subtitle = $("authSubtitle");
const submit = $("submitBtn");
const forgot = $("forgotLink");
const toggle = $("passwordToggle");
const password = $("password");
const form = $("authForm");
const message = $("formMessage");
const signupFields = document.querySelectorAll(".signup-only");
let mode = "login";

const configReady = !Object.values(firebaseConfig).some((value) =>
  String(value).includes("PASTE_")
);

let auth = null;
let googleProvider = null;

if (configReady) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: "select_account" });

  onAuthStateChanged(auth, (user) => {
    if (!user) return;
    const savedRole = localStorage.getItem("lytune-pending-role") || "artist";
    const profile = {
      uid: user.uid,
      name: user.displayName || user.email?.split("@")[0] || "LyTune User",
      email: user.email || "",
      role: savedRole,
      photoURL: user.photoURL || ""
    };
    localStorage.setItem("lytune-user", JSON.stringify(profile));
    if (user.accessToken) localStorage.setItem("lytune-token", user.accessToken);
  });
}

function setMessage(text, error = true) {
  message.textContent = text;
  message.style.color = error ? "#ffb4b4" : "#8ff0c1";
}

function friendlyError(error) {
  const code = error?.code || "";
  const map = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/email-already-in-use": "An account already exists with this email.",
    "auth/weak-password": "Choose a stronger password.",
    "auth/popup-closed-by-user": "Google sign-in was closed before completion.",
    "auth/popup-blocked": "Your browser blocked the Google sign-in window.",
    "auth/unauthorized-domain": "This website domain is not authorized in Firebase yet."
  };
  return map[code] || error?.message || "Something went wrong. Please try again.";
}

function requireFirebase() {
  if (!configReady) {
    setMessage("Firebase is not configured yet. Add your Firebase web config first.");
    return false;
  }
  return true;
}

function setMode(next) {
  mode = next;
  const signup = mode === "signup";
  loginTab.classList.toggle("active", !signup);
  signupTab.classList.toggle("active", signup);
  loginTab.setAttribute("aria-selected", String(!signup));
  signupTab.setAttribute("aria-selected", String(signup));
  title.textContent = signup ? "Create your LyTune account" : "Sign in to LyTune";
  subtitle.textContent = signup
    ? "Join the creator marketplace and build your music world."
    : "Continue creating, discovering and connecting.";
  submit.textContent = signup ? "Create account" : "Log in";
  forgot.style.display = signup ? "none" : "";
  signupFields.forEach((el) => el.classList.toggle("is-hidden", !signup));
  setMessage("");
}

function saveAndContinue(user, role) {
  const profile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "LyTune User",
    email: user.email || "",
    role,
    photoURL: user.photoURL || ""
  };
  localStorage.setItem("lytune-user", JSON.stringify(profile));
  localStorage.setItem("lytune-pending-role", role);
  localStorage.setItem("lytune-role", role);
  window.location.href = "index.html";
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

toggle.addEventListener("click", () => {
  const shown = password.type === "text";
  password.type = shown ? "password" : "text";
  toggle.textContent = shown ? "Show" : "Hide";
  toggle.setAttribute("aria-label", shown ? "Show password" : "Hide password");
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireFirebase()) return;

  const email = $("email").value.trim();
  const pass = password.value;
  const name = $("name").value.trim();
  const role = document.querySelector('input[name="role"]:checked')?.value || "artist";

  if (!email || !pass) {
    setMessage("Please enter your email and password.");
    return;
  }

  submit.disabled = true;
  submit.textContent = mode === "signup" ? "Creating account..." : "Signing in...";

  try {
    let credential;
    if (mode === "signup") {
      if (!name) throw new Error("Please enter your full name.");
      if (pass.length < 6) throw new Error("Password should be at least 6 characters.");
      credential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credential.user, { displayName: name });
    } else {
      credential = await signInWithEmailAndPassword(auth, email, pass);
    }

    const token = await credential.user.getIdToken();
    localStorage.setItem("lytune-token", token);
    saveAndContinue(credential.user, mode === "signup" ? role : (localStorage.getItem("lytune-role") || "artist"));
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    submit.disabled = false;
    submit.textContent = mode === "signup" ? "Create account" : "Log in";
  }
});

$("googleBtn").addEventListener("click", async () => {
  if (!requireFirebase()) return;
  const role = document.querySelector('input[name="role"]:checked')?.value || "artist";
  localStorage.setItem("lytune-pending-role", role);
  setMessage("Opening Google sign-in...", false);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    const token = await result.user.getIdToken();
    localStorage.setItem("lytune-token", token);
    saveAndContinue(result.user, role);
  } catch (error) {
    setMessage(friendlyError(error));
  }
});

forgot.addEventListener("click", async (event) => {
  event.preventDefault();
  if (!requireFirebase()) return;
  const email = $("email").value.trim();
  if (!email) {
    setMessage("Enter your email address first.");
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage("Password reset instructions have been sent to your email.", false);
  } catch (error) {
    setMessage(friendlyError(error));
  }
});

if (!configReady) {
  setMessage("Connect Firebase to activate Google and email sign-in.");
}
