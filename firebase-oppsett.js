// firebase-oppsett.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAuth, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { 
  getFirestore,
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

// Eksporter Auth
export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.warn("Kunne ikke sette auth-persistens:", error);
});

// Trygg initialisering av Firestore uden re-initialiseringsfeil
let firestoreDb;

try {
  firestoreDb = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (error) {
  console.warn("Lokal cache feilet eller var allerede aktivert. Bruker standard Firestore-instans:", error);
  // Henter den eksisterende instansen i stedet for å kalle initializeFirestore på nytt
  firestoreDb = getFirestore(app);
}

export const db = firestoreDb;
