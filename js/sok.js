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

// Rediriger brukere som ikke er innlogget, og synkroniser profilcache.
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const gjeldendeSide = window.location.pathname.split("/").pop();
    if (gjeldendeSide !== "index.html" && gjeldendeSide !== "") {
      window.spaNavigate("index.html");
    }
  } else {
    const cachedeProfilerRaw = localStorage.getItem("watch_nordic_profiles_cache");
    let profiler = [];

    if (cachedeProfilerRaw) {
      try {
        profiler = JSON.parse(cachedeProfilerRaw);
      } catch(e) {
        console.error("Feil ved parsing av profil-cache");
      }
    }

    try {
      const docRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        profiler = docSnap.data().profiler || [];
        localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(profiler));
      }
    } catch (error) {
      console.error("Feil ved henting av profiler:", error);
    }

    const aktivProfilIndex = parseInt(localStorage.getItem("aktivProfilIndex")) || 0;
    const gjeldendeProfil = profiler[aktivProfilIndex];
    if (gjeldendeProfil) {
      const bildeUrl = gjeldendeProfil.bilde || "";
      const profilNavn = gjeldendeProfil.navn || "";
      const farge = gjeldendeProfil.farge || "";

      oppdaterMenyProfilVisning(bildeUrl, profilNavn, farge);

      if (bildeUrl) localStorage.setItem("profilbilde", bildeUrl);
      if (profilNavn) {
        localStorage.setItem("profilnavn", profilNavn);
        localStorage.setItem("aktivProfil", profilNavn);
      }
    }
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

loadSearchContent().then(renderResults);
