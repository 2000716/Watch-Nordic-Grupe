// Firebase import fra felles oppsett.
import { auth, db } from "../firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, doc, getDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

function oppdaterMenyProfilVisning(bildeUrl, profilNavn, farge) {
  const menyProfil = document.getElementById("menyProfilbilde");
  const profilmenyLink = document.getElementById("profilmenyLink");

  if (menyProfil && bildeUrl) {
    menyProfil.src = bildeUrl;
    if (bildeUrl.toLowerCase().endsWith('.png')) {
      menyProfil.classList.add('png-karakter');
    } else {
      menyProfil.classList.remove('png-karakter');
    }
  }

  if (profilmenyLink && farge) {
    profilmenyLink.style.setProperty('--active-color', farge);
  }
}

let authReady = false;
let searchLoadPromise = null;

function currentSpaRoute() {
  return window.location.hash.replace(/^#\/?/, "").split(/[?&]/, 1)[0];
}

async function initializeSearchForUser(user) {
  if (currentSpaRoute() !== "search") return;
  if (!user) {
    window.spaNavigate("index.html", { replace: true });
    return;
  }

  const cachedProfilesRaw = localStorage.getItem("watch_nordic_profiles_cache");
  let profiles = [];
  if (cachedProfilesRaw) {
    try {
      profiles = JSON.parse(cachedProfilesRaw);
    } catch (error) {
      console.error("Feil ved parsing av profil-cache:", error);
    }
  }

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    if (userSnapshot.exists()) {
      profiles = userSnapshot.data().profiler || [];
      localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(profiles));
    }
  } catch (error) {
    console.error("Feil ved henting av profiler:", error);
  }

  const activeProfileIndex = Number.parseInt(localStorage.getItem("aktivProfilIndex") || "0", 10) || 0;
  const activeProfile = profiles[activeProfileIndex];
  if (activeProfile) {
    const imageUrl = activeProfile.bilde || "";
    const profileName = activeProfile.navn || "";
    oppdaterMenyProfilVisning(imageUrl, profileName, activeProfile.farge || "");
    if (imageUrl) localStorage.setItem("profilbilde", imageUrl);
    if (profileName) {
      localStorage.setItem("profilnavn", profileName);
      localStorage.setItem("aktivProfil", profileName);
    }
  }

  if (!searchLoadPromise) searchLoadPromise = loadSearchContent();
  await searchLoadPromise;
  renderResults(input.value);
}

onAuthStateChanged(auth, user => {
  authReady = true;
  initializeSearchForUser(user);
});

window.addEventListener("spa:routechange", event => {
  if (event.detail?.route === "search" && authReady) {
    initializeSearchForUser(auth.currentUser);
  }
});

const lagretBilde = localStorage.getItem("profilbilde");
const lagretNavn = localStorage.getItem("profilnavn");
if (lagretBilde) {
  oppdaterMenyProfilVisning(lagretBilde, lagretNavn);
}

window.addEventListener("scroll", () => {
  const nav = document.querySelector(".top-nav");
  if(!nav) return;
  if(window.scrollY > 50){
    nav.classList.add("scrolled");
  }else{
    nav.classList.remove("scrolled");
  }
});

const input = document.getElementById("searchInput");
const resultsGrid = document.getElementById("resultsGrid");

let allContent = [];

async function loadSearchContent() {
  allContent = [];
  try {
    const [filmSnapshot, serieSnapshot] = await Promise.all([
      getDocs(collection(db, "filmer")),
      getDocs(collection(db, "serier"))
    ]);

    filmSnapshot.forEach(docSnapshot => {
      allContent.push({ ...docSnapshot.data(), type: "Film", key: docSnapshot.id });
    });
    serieSnapshot.forEach(docSnapshot => {
      allContent.push({ ...docSnapshot.data(), type: "Serie", key: docSnapshot.id });
    });
  } catch (error) {
    console.error("Feil ved henting av søkeresultater fra Firebase:", error);
  }

  if (allContent.length === 0) {
    if (typeof filmer !== "undefined") {
      Object.keys(filmer).forEach(key => allContent.push({ ...filmer[key], type: "Film", key }));
    }
    if (typeof serier !== "undefined") {
      Object.keys(serier).forEach(key => allContent.push({ ...serier[key], type: "Serie", key }));
    }
  }
}

function renderResults(searchTerm = ""){
  resultsGrid.innerHTML = "";

  const filtered = allContent.filter(item => {
    const title = item.tittel?.toLowerCase() || "";
    const metadata = (item.metadata || []).join(" ").toLowerCase();
    const term = searchTerm.toLowerCase();

    return title.includes(term) || metadata.includes(term);
  });

  if(filtered.length === 0){
    resultsGrid.innerHTML = `
      <div class="no-results">
        Ingen resultater funnet.
      </div>
    `;
    return;
  }

  filtered.forEach(item => {
    const card = document.createElement("a");
    card.classList.add("result-card");

    const targetPage = item.type === "Serie" ? "serie.html" : "film.html";
    card.href = `${targetPage}?navn=${item.key}`;

    card.innerHTML = `
      <img
        src="${item.poster || item.bilde || ''}"
        alt="${item.tittel}"
      >

      <div class="result-overlay">
        <div class="overlay-content">
          <div class="overlay-title">
            ${item.tittel}
          </div>
          <div class="overlay-meta">
            ${(item.metadata || []).join(" • ")}
          </div>
        </div>
      </div>

      <div class="result-type">
        ${item.type}
      </div>
    `;

    resultsGrid.appendChild(card);
  });
}

input.addEventListener("input", event => {
  renderResults(event.target.value);
});
