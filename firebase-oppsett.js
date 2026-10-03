// Import funksjonene du trenger fra SDK-ene
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { 
  getAuth, 
  setPersistence, 
  browserLocalPersistence, 
  inMemoryPersistence 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { 
  initializeFirestore, 
  getFirestore,
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Firebase-konfigurasjonen din
const firebaseConfig = {
  apiKey: "AIzaSyBlfCbB1AuiKVHMBEhYd0cvkJ0jxHVZfUg",
  authDomain: "watch-nordic-78b99.firebaseapp.com",
  projectId: "watch-nordic-78b99",
  storageBucket: "watch-nordic-78b99.firebasestorage.app",
  messagingSenderId: "541804766412",
  appId: "1:541804766412:web:83fc77721e384131a1ce69"
};

// Initialiser Firebase App
const app = initializeApp(firebaseConfig);

// Initialiser og eksporter Autentisering
export const auth = getAuth(app);

// Sett innloggingspersistens før Auth-operasjoner starter.
export const authPersistenceReady = setPersistence(
  auth,
  browserLocalPersistence
).catch(async (localPersistenceError) => {
  console.warn(
    "Kunne ikke bruke lokal innloggingspersistens; prøver minnebasert persistens:",
    localPersistenceError
  );

  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch (memoryPersistenceError) {
    console.error(
      "Kunne ikke sette innloggingspersistens:",
      memoryPersistenceError
    );
    throw memoryPersistenceError;
  }
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
  firestoreDb = getFirestore(app);
}

// Eksporter Firestore-databasen
export const db = firestoreDb;
