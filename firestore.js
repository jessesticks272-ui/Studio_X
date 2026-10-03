import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { db } from "./firebase.js";

export async function saveUserProfile(user, role = "artist", extra = {}) {
  if (!user?.uid) throw new Error("A signed-in user is required.");
  const ref = doc(db, "users", user.uid);
  const existing = await getDoc(ref);
  const profile = {
    uid: user.uid,
    name: user.displayName || user.email?.split("@")[0] || "LyTune User",
    email: user.email || "",
    role,
    photoURL: user.photoURL || "",
    updatedAt: serverTimestamp(),
    ...extra
  };
  if (!existing.exists()) profile.createdAt = serverTimestamp();
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export async function getUserProfile(uid) {
  if (!uid) return null;
  const snapshot = await getDoc(doc(db, "users", uid));
  return snapshot.exists() ? snapshot.data() : null;
}

export async function saveCreatorProfile(uid, data = {}) {
  if (!uid) throw new Error("A signed-in user is required.");
  await setDoc(doc(db, "creatorProfiles", uid), {
    uid,
    ...data,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function addBeat(uid, beat) {
  if (!uid) throw new Error("A signed-in user is required.");
  const ref = await addDoc(collection(db, "beats"), {
    ownerId: uid,
    ...beat,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return ref.id;
}
