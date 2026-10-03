import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-storage.js";

import { app } from "./firebase.js";

const storage = getStorage(app);

export { storage, ref, uploadBytes, getDownloadURL };
