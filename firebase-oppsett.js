// firebase-oppsett.js
// ALT ER OPPDATERT TIL VERSJON 12.15.0 FOR Å MATCHE PERFEKT

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Din unike Firebase-konfigurasjon
const firebaseConfig = {
  apiKey: "AIzaSyBlfCbB1AuiKVHMBEhYd0cvkJ0jxHVZfUg",
  authDomain: "watch-nordic-78b99.firebaseapp.com",
  projectId: "watch-nordic-78b99",
  storageBucket: "watch-nordic-78b99.firebasestorage.app",
  messagingSenderId: "541804766412",
  appId: "1:541804766412:web:83fc77721e384131a1ce69"
};

// Initialiser Firebase-applikasjonen
const app = initializeApp(firebaseConfig);

// Eksporterer auth til de andre sidene
export const auth = getAuth(app);

// Initialiserer Firestore med lokal offline-cache aktivert (sparer ekstremt mye LESING/READS)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager() // Sikrer at cachingen fungerer selv om brukeren har oppe flere faner samtidig
  })
});
