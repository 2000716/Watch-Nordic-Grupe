// firebase-oppsett.js
// OPPDATERT FOR FULL STABILITET PÅ IPAD, SAFARI OG PRIVAT MODUS (VERSJON 12.15.0)

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

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

// Sikrer at innloggingen blir beholdt på tvers av enheter og nettsesjoner
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Kunne ikke sette auth-persistens:", error);
});

// Trygg initialisering av Firestore tilpasset iPad, iOS Safari og Privat Modus
let firestoreDb;

try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    // Tvinger automatisk Long-Polling dersom WebSockets blokkeres på iPad/Safari
    experimentalAutoDetectLongPolling: true
  });
} catch (error) {
  console.warn("Lokal cache feilet (f.eks. Privat Modus på iPad). Initialiserer Firestore uten cache som fallback:", error);
  
  // Fallback uten lokal cache dersom Safari/iPad nekter IndexedDB-tilgang
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
}

// Eksporterer databasen til resten av prosjektet
export const db = firestoreDb;
