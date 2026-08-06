// 1. Importer Firebase-moduler
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
  getFirestore, 
  collection, 
  getDocs 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// 2. Firebase konfigurasjon
const firebaseConfig = {
  apiKey: "AIzaSyBlfCbB1AuiKVHMBEhYd0cvkJ0jxHVZfUg",
  authDomain: "watch-nordic-78b99.firebaseapp.com",
  projectId: "watch-nordic-78b99",
  storageBucket: "watch-nordic-78b99.firebasestorage.app",
  messagingSenderId: "541804766412",
  appId: "1:541804766412:web:83fc77721e384131a1ce69"
};

// 3. Initialiser Firebase & Firestore
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// 4. Testdata (vises automatisk hvis Firestore-databasen din er tom enn så lenge)
const reserveData = [
  {
    id: "1",
    tittel: "Stranger Things",
    kategori: "serier",
    bilde: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    bannerBilde: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80",
    beskrivelse: "Når en ung gutt forsvinner, avdekker en liten by et mysterium som involverer hemmelige eksperimenter.",
    meta: "2024 • 16+ • 4 Sesonger",
    topp10: true,
    nylig: true
  },
  {
    id: "2",
    tittel: "Inception",
    kategori: "filmer",
    bilde: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80",
    beskrivelse: "En tyv som stjeler bedriftshemmeligheter gjennom bruk av drømme-delingsteknologi.",
    meta: "2010 • 13+ • 2t 28m",
    topp10: true,
    nylig: false
  },
  {
    id: "3",
    tittel: "Planet Earth",
    kategori: "dokumentar",
    bilde: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&q=80",
    beskrivelse: "En storslått utforskning av verdens mest fantastiske habitater og dyreliv.",
    meta: "2023 • Tillatt for alle • 1 Sesong",
    topp10: false,
    nylig: true
  }
];

// ==========================================
// KJERNEFUNKSJONER
// ==========================================

// Opprett et filmkort (HTML-element)
function lagFilmkort(item) {
  const card = document.createElement("div");
  card.className = "gallery-item";
  card.dataset.id = item.id;

  card.innerHTML = `
    <img src="${item.bilde}" alt="${item.tittel}" loading="lazy" />
  `;

  // Klikk på et kort oppdaterer hero-banneret
  card.addEventListener("click", () => settHeroBanner(item));
  return card;
}

// Oppdater Hero Banner med valgt film
function settHeroBanner(item) {
  const bannerBilde = document.getElementById("banner-bilde");
  const bannerBeskrivelse = document.getElementById("banner-beskrivelse");
  const bannerMeta = document.getElementById("banner-metadata");
  const bannerLogo = document.getElementById("banner-logo");

  if (bannerBilde) bannerBilde.src = item.bannerBilde || item.bilde;
  if (bannerBeskrivelse) bannerBeskrivelse.textContent = item.beskrivelse || item.tittel;
  if (bannerMeta) bannerMeta.textContent = item.meta || "";
  if (bannerLogo && item.logo) {
    bannerLogo.src = item.logo;
    bannerLogo.style.display = "block";
  } else if (bannerLogo) {
    bannerLogo.style.display = "none";
  }
}

// Hent data fra Firestore (eller bruk reservedata)
async function lastInnhold() {
  let mediaListe = [];

  try {
    const querySnapshot = await getDocs(collection(db, "media"));
    querySnapshot.forEach((doc) => {
      mediaListe.push({ id: doc.id, ...doc.data() });
    });
  } catch (feil) {
    console.warn("Kunne ikke koble til Firestore, bruker reservedata:", feil);
  }

  // Hvis databasen var tom, bruk reservedataene
  if (mediaListe.length === 0) {
    mediaListe = reserveData;
  }

  // Sett første film i hero-banneret
  if (mediaListe.length > 0) {
    settHeroBanner(mediaListe[0]);
  }

  // Fordel filmer til riktige gallerier i HTML
  mediaListe.forEach((item) => {
    // Filmer
    if (item.kategori === "filmer") {
      document.getElementById("filmer-galleri")?.appendChild(lagFilmkort(item));
    }
    // Serier
    if (item.kategori === "serier") {
      document.getElementById("serier-galleri")?.appendChild(lagFilmkort(item));
    }
    // Dokumentarer
    if (item.kategori === "dokumentar") {
      document.getElementById("dokumentarserier-galleri")?.appendChild(lagFilmkort(item));
    }
    // Nylig lagt til
    if (item.nylig) {
      document.getElementById("nye-filmer-galleri")?.appendChild(lagFilmkort(item));
    }
    // Topp 10
    if (item.topp10) {
      document.getElementById("topp10-filmer-galleri")?.appendChild(lagFilmkort(item));
    }
  });

  // Skjul lasteskjermen
  skjulLoader();
}

// Skjul laste-spinneren når alt er klart
function skjulLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) {
    loader.classList.add("hidden");
  }
}

// Aktiver rulleknappene (venstre / høyre pil)
function aktiverSkrollKnapper() {
  document.querySelectorAll(".gallery-wrapper, .continue-gallery-wrapper").forEach((wrapper) => {
    const gallery = wrapper.querySelector(".image-gallery, .continue-image-gallery, .top10-gallery");
    const leftBtn = wrapper.querySelector(".scroll-button.left");
    const rightBtn = wrapper.querySelector(".scroll-button.right");

    if (!gallery) return;

    leftBtn?.addEventListener("click", () => {
      gallery.scrollBy({ left: -400, behavior: "smooth" });
    });

    rightBtn?.addEventListener("click", () => {
      gallery.scrollBy({ left: 400, behavior: "smooth" });
    });
  });
}

// Initialiser når siden lastes
document.addEventListener("DOMContentLoaded", () => {
  lastInnhold();
  aktiverSkrollKnapper();
});
