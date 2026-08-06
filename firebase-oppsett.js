// firebase-oppsett.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence, inMemoryPersistence } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBlfCbB1AuiKVHMBEhYd0cvkJ0jxHVZfUg",
  authDomain: "watch-nordic-78b99.firebaseapp.com",
  projectId: "watch-nordic-78b99",
  storageBucket: "watch-nordic-78b99.firebasestorage.app",
  messagingSenderId: "541804766412",
  appId: "1:541804766412:web:83fc77721e384131a1ce69"
};

// Initialiser Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Sikrere håndtering av persistens (faller tilbake til minne i stedet for å krasje i privat modus)
setPersistence(auth, browserLocalPersistence).catch(() => {
  setPersistence(auth, inMemoryPersistence).catch((err) => {
    console.warn("Kunne ikke sette innloggingspersistens:", err);
  });
});

// Trygg initialisering av Firestore
let firestoreDb;
try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalAutoDetectLongPolling: true
  });
} catch (error) {
  console.warn("Bruker standard Firestore-konfigurasjon pga. restriksjoner i nettleser:", error);
  firestoreDb = initializeFirestore(app, {
    experimentalAutoDetectLongPolling: true
  });
}

export const db = firestoreDb;
