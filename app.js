// Importer databasen fra konfigurasjonsfilen din
import { db } from "./firebase-config.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Reservedata dersom Firestore-databasen ennå ikke inneholder data
const reserveData = [
  {
    id: "1",
    tittel: "Stranger Things",
    kategori: "serier",
    bilde: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80",
    bannerBilde: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&q=80",
    beskrivelse: "Når en ung gutt forsvinner, avdekker en liten by et mysterium som involverer hemmelige eksperimenter.",
    meta: "2026 • 16+ • 4 Sesonger",
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

// Bygger et enkelt filmkort
function lagFilmkort(item) {
  const card = document.createElement("div");
  card.className = "gallery-item";
  card.dataset.id = item.id;

  card.innerHTML = `<img src="${item.bilde}" alt="${item.tittel}" loading="lazy" />`;
  card.addEventListener("click", () => settHeroBanner(item));
  
  return card;
}

// Oppdaterer Hero Banner øverst på siden
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

// Henter data fra Firestore og renderer elementene på skjermen
async function lastInnhold() {
  let mediaListe = [];

  try {
    const querySnapshot = await getDocs(collection(db, "media"));
    querySnapshot.forEach((doc) => {
      mediaListe.push({ id: doc.id, ...doc.data() });
    });
  } catch (feil) {
    console.warn("Bruker reservedata (kunne ikke koble til Firestore):", feil);
  }

  if (mediaListe.length === 0) {
    mediaListe = reserveData;
  }

  if (mediaListe.length > 0) {
    settHeroBanner(mediaListe[0]);
  }

  // Sorterer innhold i sine respektive seksjoner
  mediaListe.forEach((item) => {
    if (item.kategori === "filmer") {
      document.getElementById("filmer-galleri")?.appendChild(lagFilmkort(item));
    }
    if (item.kategori === "serier") {
      document.getElementById("serier-galleri")?.appendChild(lagFilmkort(item));
    }
    if (item.kategori === "dokumentar") {
      document.getElementById("dokumentarserier-galleri")?.appendChild(lagFilmkort(item));
    }
    if (item.nylig) {
      document.getElementById("nye-filmer-galleri")?.appendChild(lagFilmkort(item));
    }
    if (item.topp10) {
      document.getElementById("topp10-filmer-galleri")?.appendChild(lagFilmkort(item));
    }
  });

  skjulLoader();
}

function skjulLoader() {
  const loader = document.getElementById("page-loader");
  if (loader) loader.classList.add("hidden");
}

function aktiverSkrollKnapper() {
  document.querySelectorAll(".gallery-wrapper, .continue-gallery-wrapper").forEach((wrapper) => {
    const gallery = wrapper.querySelector(".image-gallery, .continue-image-gallery, .top10-gallery");
    const leftBtn = wrapper.querySelector(".scroll-button.left");
    const rightBtn = wrapper.querySelector(".scroll-button.right");

    if (!gallery) return;

    leftBtn?.addEventListener("click", () => gallery.scrollBy({ left: -400, behavior: "smooth" }));
    rightBtn?.addEventListener("click", () => gallery.scrollBy({ left: 400, behavior: "smooth" }));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  lastInnhold();
  aktiverSkrollKnapper();
});
