import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { auth } from "./firebase.js";
import { saveUserProfile, getUserProfile } from "./firestore.js";

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

const configReady = Boolean(auth);

const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

async function handleGoogleUser(user) {
  const token = await user.getIdToken();
  localStorage.setItem("lytune-token", token);
  const existingProfile = await getUserProfile(user.uid).catch(() => null);
  const finalRole = existingProfile?.role || localStorage.getItem("lytune-pending-role") || "artist";

  if ((user.email || "").toLowerCase() === "jessesticks272@gmail.com") {
    window.location.href = "creator-dashboard.html";
    return;
  }
  await saveAndContinue(user, finalRole);
}

if (auth) {
  getRedirectResult(auth).then(async result => {
    if (result?.user) await handleGoogleUser(result.user);
  }).catch(error => {
    console.error("Google redirect sign-in failed:", error);
    setMessage(friendlyError(error));
  });
}

if (auth) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    let existing = null;
    try {
      existing = await getUserProfile(user.uid);
    } catch (error) {
      console.warn("Could not load existing LyTune profile:", error);
    }

    const savedRole =
      existing?.role ||
      localStorage.getItem("lytune-pending-role") ||
      localStorage.getItem("lytune-role") ||
      "artist";

    const profile = {
      uid: user.uid,
      name: existing?.name || user.displayName || user.email?.split("@")[0] || "LyTune User",
      email: user.email || "",
      role: savedRole,
      photoURL: existing?.photoURL || user.photoURL || ""
    };

    localStorage.setItem("lytune-user", JSON.stringify(profile));
    localStorage.setItem("lytune-role", savedRole);

    try {
      await saveUserProfile(user, savedRole, {
        name: profile.name,
        photoURL: profile.photoURL,
        lastLoginAt: new Date()
      });
    } catch (error) {
      console.error("Could not sync user profile to Firestore:", error);
    }
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
  submit.querySelector(".btn-text").textContent = signup ? "CREATE MY ACCOUNT" : "ENTER THE STUDIO";
  forgot.style.display = signup ? "none" : "";
  signupFields.forEach((el) => el.classList.toggle("is-hidden", !signup));
  setMessage("");
}

async function saveAndContinue(user, role) {
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

  try {
    await saveUserProfile(user, role, { lastLoginAt: new Date() });
  } catch (error) {
    // Keep sign-in available while Firestore is being configured.
    // The auth-state listener retries profile sync on sign-in.
    console.error("Could not save LyTune profile before redirect:", error);
  }

  window.location.href = role === "producer" ? "producer-dashboard.html" : "artist-dashboard.html";
}

loginTab.addEventListener("click", () => setMode("login"));
signupTab.addEventListener("click", () => setMode("signup"));

// Allow links such as signup.html and auth.html?mode=signup to open registration directly.
if (new URLSearchParams(window.location.search).get("mode") === "signup") {
  setMode("signup");
}

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
  submit.classList.add("loading");

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

    let finalRole = role;
    if (mode === "login") {
      const profile = await getUserProfile(credential.user.uid).catch(() => null);
      finalRole = profile?.role || localStorage.getItem("lytune-role") || "artist";
    }

    if ((credential.user.email || "").toLowerCase() === "jessesticks272@gmail.com") {
      window.location.href = "creator-dashboard.html";
      return;
    }

    let profileSaved = true;
    try {
      await saveUserProfile(credential.user, finalRole, { lastLoginAt: new Date() });
    } catch (profileError) {
      profileSaved = false;
      console.error("Could not save LyTune profile:", profileError);
    }

    if (mode === "signup") {
      await sendEmailVerification(credential.user);
      setMode("login");
      setMessage(
        profileSaved
          ? `Account created. A verification link has been sent to ${credential.user.email}. Verify your email, then sign in.`
          : `Account created and verification email sent to ${credential.user.email}. Firestore is not ready, so your profile will retry syncing when you sign in again.`,
        false
      );
      return;
    }

    await saveAndContinue(credential.user, finalRole);
  } catch (error) {
    setMessage(friendlyError(error));
  } finally {
    submit.disabled = false;
    submit.classList.remove("loading");
    submit.querySelector(".btn-text").textContent = mode === "signup" ? "CREATE MY ACCOUNT" : "ENTER THE STUDIO";
  }
});

$("googleBtn").addEventListener("click", async () => {
  if (!requireFirebase()) return;
  const role = document.querySelector('input[name="role"]:checked')?.value || "artist";
  localStorage.setItem("lytune-pending-role", role);
  setMessage("Opening Google sign-in...", false);

  try {
    const result = await signInWithPopup(auth, googleProvider);
    await handleGoogleUser(result.user);
  } catch (error) {
    console.error("Google popup sign-in failed:", error);
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-timeout" || error?.code === "auth/cancelled-popup-request") {
      setMessage("Google popup was blocked or did not open. Redirecting to Google sign-in...", false);
      try {
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (redirectError) {
        console.error("Google redirect sign-in failed:", redirectError);
        setMessage(friendlyError(redirectError));
        return;
      }
    }
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
