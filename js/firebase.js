import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
getAuth
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
getStorage
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyB5TTCXCD74IUeLmM7bynlgCUvcmcM6rTw",
  authDomain: "mind-skyra-institute.firebaseapp.com",
  projectId: "mind-skyra-institute",
  storageBucket: "mind-skyra-institute.firebasestorage.app",
  messagingSenderId: "333988573281",
  appId: "1:333988573281:web:7d775f902b55d2e15aba20"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
