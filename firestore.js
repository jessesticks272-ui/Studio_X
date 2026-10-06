import {
  doc,
  getDoc,
  setDoc,
  addDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
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

export async function getUserBeats(uid) {
  if (!uid) return [];
  const q = query(
    collection(db, "beats"),
    where("ownerId", "==", uid),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

export async function getPublishedBeats() {
  const snapshot = await getDocs(collection(db, "beats"));
  return snapshot.docs
    .map(item => ({ id: item.id, ...item.data() }))
    .filter(beat => beat.status === "published")
    .sort((a, b) => {
      const aTime = a.createdAt?.toMillis?.() || 0;
      const bTime = b.createdAt?.toMillis?.() || 0;
      return bTime - aTime;
    });
}

export async function getBeat(beatId) {
  if (!beatId) return null;
  const snapshot = await getDoc(doc(db, "beats", beatId));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}
