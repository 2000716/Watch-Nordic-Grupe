// firebase-oppsett.js
// ALT ER OPPDATERT TIL VERSJON 12.15.0 FOR Å MATCHE PERFEKT
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlfCbB1AuiKVHMBEhYd0cvkJ0jxHVZfUg",
  authDomain: "watch-nordic-78b99.firebaseapp.com",
  projectId: "watch-nordic-78b99",
  storageBucket: "watch-nordic-78b99.firebasestorage.app",
  messagingSenderId: "541804766412",
  appId: "1:541804766412:web:83fc77721e384131a1ce69"
};

const app = initializeApp(firebaseConfig);

// Eksporterer auth og db til de andre sidene dine
export const auth = getAuth(app);
export const db = getFirestore(app);
