import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBpzj6K72QlK6xM05p_A3kEp2KUPxHC_PE",
  authDomain: "lytune-studio-x.firebaseapp.com",
  projectId: "lytune-studio-x",
  storageBucket: "lytune-studio-x.firebasestorage.app",
  messagingSenderId: "794310559157",
  appId: "1:794310559157:web:5dc906c31103f56ed2c5fc",
  measurementId: "G-TX7N5VY0SN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
