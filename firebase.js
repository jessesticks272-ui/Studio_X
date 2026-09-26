import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBOvWbkt0_7GCiSFlP8pfevts5613tYY7c",
  authDomain: "lytune-studio-x.firebaseapp.com",
  projectId: "lytune-studio-x",
  storageBucket: "lytune-studio-x.firebasestorage.app",
  messagingSenderId: "794310559157",
  appId: "1:794310559157:web:5dc906c31103f56ed2c5fc",
  measurementId: "G-TX7N5VY0SN"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export { app, auth };
