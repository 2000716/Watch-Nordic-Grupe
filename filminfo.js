/**
 * FILMINFO.JS - Watch Nordic
 * Inneholder all logikk for detaljvisning av film/serie, video-spiller, 
 * sesongvisning, brukerhistorikk, aldersgrensekontroll og anbefalinger.
 */

import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc, collection, query, limit, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ==========================================
   1. GLOBALE TILSTANDER & HJELPEFUNKSJONER
   ========================================== */
let currentUser = null;
let aktivProfil = localStorage.getItem("aktivProfil") || "Hovedprofil";
let aktivProfilIndex = parseInt(localStorage.getItem("aktivProfilIndex") || "0", 10);
let heleProfilArrayet = [];
let status = "ikke-påbegynt";
let minListe = [];

let data = null;
let type = "film";
let navn = "";
let nå = new Date();
let erUpublisert = false;
let erUtgått = false;
let erUtilgjengelig = false;
let erProfilLastetFraSkyen = false;

let watchBtn, addToListBtn, bgImg;

// Trygg håndtering av localStorage
function tryggLagring(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn("Kunne ikke lagre til localStorage:", e);
  }
}

function erMobilEllerNettbrett() {
  const touchEnhet = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
  const breddeSjekk = window.innerWidth <= 1024;
  const isIPad = /Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1;
  return (touchEnhet && breddeSjekk) || isIPad;
}

export function sanitizeInput(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function erTryggUrl(url) {
  if (!url || typeof url !== "string") return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch (e) {
    return false;
  }
}

async function lastDataFraFirebase(mediaId) {
  try {
    navn = sanitizeInput(mediaId);

    if (!navn) {
      if (typeof window.gaaTilbake === "function") window.gaaTilbake();
      return;
    }

    const cacheKey = `media_cache_${navn}`;
    let cachedData = null;
    try { cachedData = localStorage.getItem(cacheKey); } catch (e) {}

    data = null;
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        data = parsed.data;
        type = parsed.type;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    if (!data) {
      let docRef = doc(db, "filmer", navn);
      let docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        type = "film";
        data = docSnap.data();
      } else {
        docRef = doc(db, "serier", navn);
        docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          type = "serie";
          data = docSnap.data();
        }
      }

      if (data) {
        tryggLagring(cacheKey, JSON.stringify({ data, type }));
      }
    }

    if (!data) {
      if (typeof window.gaaTilbake === "function") window.gaaTilbake();
      return;
    }

    nå = new Date();
    erUpublisert = data.publishDate && new Date(data.publishDate) > nå;
    erUtgått = data.expireDate && nå > new Date(data.expireDate);
    erUtilgjengelig = erUpublisert || erUtgått;

  } catch (err) {
    console.error("Feil ved henting av mediedata:", err);
  }
}

/* ==========================================
   2. HOVEDFUNKSJON FOR RENDERING
   ========================================== */
window.renderFilmPage = async function(docId) {
  const targetId = docId || window.AppState?.valgtMediaId;
  if (!targetId) return;

  await lastDataFraFirebase(targetId);
  if (!data) return;

  watchBtn = document.getElementById("watchBtn");
  addToListBtn = document.getElementById("addToListBtn");
  bgImg = document.getElementById("backgroundImage");

  document.title = data.tittel ? `${data.tittel} - Watch Nordic` : "Watch Nordic";

  oppdaterBakgrunnsBilde();

  let resizeTimeout;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(oppdaterBakgrunnsBilde, 150);
  });

  // Logo
  const fLogo = document.querySelector(".film-logo");
  const logoContainer = document.querySelector(".logo-container");
  if (fLogo) {
    if (data.logo && data.logo.trim() !== "" && erTryggUrl(data.logo)) {
      fLogo.src = data.logo;
      fLogo.style.display = "block";
    } else {
      fLogo.style.display = "none";
      if (logoContainer && !logoContainer.querySelector(".text-logo")) {
        const titleEl = document.createElement("div");
        titleEl.className = "text-logo";
        titleEl.textContent = data.tittel || "";
        logoContainer.appendChild(titleEl);
      }
    }
  }

  // Beskrivelse og "Mer"-knapp
  const descEl = document.querySelector(".description");
  if (descEl) {
    const fullText = data.beskrivelse || "";
    const ordGrense = 20;
    const ordArray = fullText.split(/\s+/);

    if (ordArray.length > ordGrense) {
      descEl.textContent = ordArray.slice(0, ordGrense).join(" ") + "... ";
      const moreBtn = document.createElement("button");
      moreBtn.className = "more-btn";
      moreBtn.textContent = "Mer";
      descEl.appendChild(moreBtn);

      moreBtn.addEventListener("click", () => {
        const overlay = document.createElement("div");
        overlay.className = "popup-overlay";

        const popupBox = document.createElement("div");
        popupBox.className = "popup-box";

        const closeBtn = document.createElement("button");
        closeBtn.className = "close-btn";
        closeBtn.type = "button";
        closeBtn.setAttribute("aria-label", "Lukk beskrivelse");
        closeBtn.textContent = "×";

        const textPara = document.createElement("p");
        textPara.textContent = fullText;

        popupBox.appendChild(closeBtn);
        popupBox.appendChild(textPara);
        overlay.appendChild(popupBox);
        document.body.appendChild(overlay);

        const lukkModal = () => {
          closeBtn.removeEventListener("click", lukkModal);
          overlay.removeEventListener("click", overlayKlikk);
          overlay.remove();
        };
        
        const overlayKlikk = (e) => {
          if (e.target === overlay) lukkModal();
        };

        closeBtn.addEventListener("click", lukkModal);
        overlay.addEventListener("click", overlayKlikk);
      });
    } else {
      descEl.textContent = fullText;
    }
  }

  // Metadata
  const metadataEl = document.querySelector(".metadata");
  if (metadataEl) {
    metadataEl.innerHTML = "";
    const ratingSpan = document.createElement("span");
    ratingSpan.textContent = `⭐ ${data.rating || "-"}`;
    metadataEl.appendChild(ratingSpan);

    if (Array.isArray(data.metadata)) {
      data.metadata.forEach(m => {
        const dot = document.createElement("span");
        dot.textContent = " • ";
        const metaSpan = document.createElement("span");
        metaSpan.textContent = m;
        metadataEl.appendChild(dot);
        metadataEl.appendChild(metaSpan);
      });
    }
  }

  // Skuespillere & Lisens
  const castInfoEl = document.querySelector(".cast-info");
  if (castInfoEl) {
    castInfoEl.innerHTML = "";
    const castLabel = type === "film" ? "Regissør" : "Skaper";

    const pCast = document.createElement("p");
    pCast.textContent = `Medvirkende: ${data.skuespillere || "Ukjent"}`;
    castInfoEl.appendChild(pCast);

    const pCreator = document.createElement("p");
    pCreator.textContent = `${castLabel}: ${data.skapere || data.regissor || "Ukjent"}`;
    castInfoEl.appendChild(pCreator);

    if (data.lisens && data.kilde && erTryggUrl(data.kilde)) {
      const pLicence = document.createElement("p");
      pLicence.textContent = "Lisens: ";
      const aLicence = document.createElement("a");
      aLicence.href = data.kilde;
      aLicence.target = "_blank";
      aLicence.rel = "noopener noreferrer";
      aLicence.style.color = "#aaa";
      aLicence.style.textDecoration = "none";
      aLicence.textContent = data.lisens;
      pLicence.appendChild(aLicence);
      castInfoEl.appendChild(pLicence);
    }
  }

  // Knapper
  if (watchBtn) {
    if (erUtilgjengelig) watchBtn.classList.add("locked");
    watchBtn.removeEventListener("click", handterWatchClick);
    watchBtn.addEventListener("click", handterWatchClick);
  }
  
  if (addToListBtn) {
    addToListBtn.removeEventListener("click", handterListClick);
    addToListBtn.addEventListener("click", handterListClick);
  }

  initTrailer();

  // Tilgjengelighet
  const availabilityEl = document.getElementById("availabilityInfo");
  if (availabilityEl) {
    if (erUpublisert) {
      const pubDato = new Date(data.publishDate).toLocaleDateString("no-NO", { year: "numeric", month: "short", day: "numeric" });
      availabilityEl.textContent = `Kommer den ${pubDato}`;
    } else if (data.expireDate) {
      const expire = new Date(data.expireDate);
      const diff = expire - nå;
      if (diff > 365 * 24 * 60 * 60 * 1000) {
        availabilityEl.textContent = "Tilgjengelig lenger enn ett år";
      } else if (diff > 0) {
        const datoFormatert = expire.toLocaleDateString("no-NO", { year: "numeric", month: "short", day: "numeric" });
        availabilityEl.textContent = `Tilgjengelig til: ${datoFormatert}`;
      }
    } else {
      availabilityEl.textContent = "";
    }
  }

  // Profil-synkronisering
  let cachedProfiles = null;
  try { cachedProfiles = localStorage.getItem("watch_nordic_profiles_cache"); } catch(e) {}
  
  if (cachedProfiles) {
    try {
      heleProfilArrayet = JSON.parse(cachedProfiles);
      synkroniserLokalData();
    } catch (e) {
      oppdaterWatchKnapp();
      oppdaterListeKnapp();
      byggAnbefalingerEllerEpisoder();
    }
  } else {
    oppdaterWatchKnapp();
    oppdaterListeKnapp();
    byggAnbefalingerEllerEpisoder();
  }

  document.body.classList.add("loaded");
};

/**
 * Opprydding når du navigerer bort fra filminfo-siden
 */
window.destroyFilmPage = function() {
  const trailerVideo = document.getElementById("trailerVideo");
  if (trailerVideo) {
    trailerVideo.pause();
    trailerVideo.removeAttribute('src');
    trailerVideo.load();
  }
};

/* ==========================================
   3. DYNAMISKE UI-OPPDATERINGSFUNKSJONER
   ========================================== */
function oppdaterBakgrunnsBilde() {
  if (!bgImg || !data) return;
  const heroEl = document.querySelector(".hero");
  const erMobilEpad = erMobilEllerNettbrett();
  const bildeUrl = (erMobilEpad && data.bakgrunnMobil) ? data.bakgrunnMobil : (data.bakgrunn || "");

  if (heroEl) heroEl.style.backgroundColor = "#050F11";

  if (erTryggUrl(bildeUrl)) {
    bgImg.src = bildeUrl;
    bgImg.onload = () => {
      bgImg.style.opacity = "1";
      if (heroEl) heroEl.style.backgroundColor = "transparent";
    };
    bgImg.onerror = () => {
      bgImg.style.opacity = "0";
      if (heroEl) heroEl.style.backgroundColor = "#050F11";
    };
  } else {
    bgImg.removeAttribute("src");
    bgImg.style.opacity = "0";
    if (heroEl) heroEl.style.backgroundColor = "#050F11";
  }
}

function oppdaterWatchKnapp() {
  if (!watchBtn) return;
  let icon = watchBtn.querySelector("i") || document.createElement("i");
  let text = watchBtn.querySelector("span") || document.createElement("span");

  if (!watchBtn.querySelector("i")) watchBtn.prepend(icon);
  if (!watchBtn.querySelector("span")) watchBtn.appendChild(text);

  watchBtn.classList.remove("paabegynt");

  if (erUtgått) {
    icon.className = "fas fa-ban";
    text.textContent = " Utgått";
    return;
  }

  if (erUpublisert) {
    icon.className = "fas fa-lock";
    text.textContent = " Kommer snart";
    return;
  }

  if (status === "påbegynt") {
    watchBtn.classList.add("paabegynt");
    icon.className = "fas fa-play";
    text.textContent = " Gjenoppta";
  } else if (status === "ferdig") {
    icon.className = "fas fa-check";
    text.textContent = type === "film" ? " Sett ferdig" : " Ferdig";
  } else {
    icon.className = "fas fa-play";
    text.textContent = type === "film" ? " Se nå" : " Se episode";
  }
}

function oppdaterListeKnapp() {
  if (!addToListBtn) return;
  let icon = addToListBtn.querySelector("i") || document.createElement("i");
  let text = addToListBtn.querySelector("span") || document.createElement("span");

  if (!addToListBtn.querySelector("i")) addToListBtn.prepend(icon);
  if (!addToListBtn.querySelector("span")) addToListBtn.appendChild(text);

  if (minListe.includes(`${type}:${navn}`)) {
    icon.className = "fas fa-check";
    text.textContent = " Lagt til i Min liste";
  } else {
    icon.className = "fas fa-plus";
    text.textContent = " Legg til i Min liste";
  }
}

/* ==========================================
   4. DATA-SYNKRONISERING OG BRUKERSESJON
   ========================================== */
function sjekkAldersgrense(profilData) {
  if (!profilData || !profilData.aldersgrense || !data) return true;

  const innholdAldersgrense = data.metadata ? data.metadata.find(m => String(m).toLowerCase().includes("år")) : null;
  if (!innholdAldersgrense) return true;

  const grensTallInnhold = parseInt(String(innholdAldersgrense), 10) || 0;
  const grensTallProfil = parseInt(String(profilData.aldersgrense), 10) || 99;

  return grensTallProfil >= grensTallInnhold;
}

function synkroniserLokalData() {
  let profilData = heleProfilArrayet[aktivProfilIndex] || heleProfilArrayet.find(p => p.navn === aktivProfil);

  if (profilData) {
    if (!sjekkAldersgrense(profilData) && watchBtn) {
      watchBtn.classList.add("locked");
      watchBtn.disabled = true;
      watchBtn.title = "Denne profilen har ikke tilgang på grunn av aldersgrense.";
    }

    status = (profilData.historikk && profilData.historikk[navn]) ? profilData.historikk[navn] : "ikke-påbegynt";
    minListe = profilData.minListe || [];

    oppdaterWatchKnapp();
    oppdaterListeKnapp();
    byggAnbefalingerEllerEpisoder();
  }
}

async function lagreProfilDataTilSkyen() {
  if (!currentUser || !erProfilLastetFraSkyen) return;

  let indeks = aktivProfilIndex;
  if (!heleProfilArrayet[indeks]) {
    indeks = heleProfilArrayet.findIndex(p => p.navn === aktivProfil);
  }
  if (indeks === -1) return;

  if (!heleProfilArrayet[indeks].historikk) heleProfilArrayet[indeks].historikk = {};
  heleProfilArrayet[indeks].historikk[navn] = status;
  heleProfilArrayet[indeks].minListe = minListe;

  tryggLagring("watch_nordic_profiles_cache", JSON.stringify(heleProfilArrayet));

  try {
    const userDocRef = doc(db, "users", currentUser.uid);
    await setDoc(userDocRef, { profiler: heleProfilArrayet }, { merge: true });
  } catch (err) {
    console.error("Feil ved bakgrunnslagring til skyen:", err);
  }
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      const userDocRef = doc(db, "users", user.uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        heleProfilArrayet = docSnap.data().profiler || [];
        tryggLagring("watch_nordic_profiles_cache", JSON.stringify(heleProfilArrayet));
        erProfilLastetFraSkyen = true;
        synkroniserLokalData();
      }
    } catch (err) {
      console.error("Feil ved henting av brukerdata:", err);
    }
  }
});

/* ==========================================
   5. KLIKKHÅNDTERERE OG SPILLER-RUTING
   ========================================== */
async function handterWatchClick() {
  if (erUpublisert || erUtgått || watchBtn.disabled) return;

  status = "påbegynt";
  oppdaterWatchKnapp();
  lagreProfilDataTilSkyen();

  const returUrl = encodeURIComponent(window.location.href);

  if (type === "film") {
    if (!data.watchUrl || !erTryggUrl(data.watchUrl)) {
      alert("Kunne ikke starte avspilling: Ugyldig kilde-URL.");
      return;
    }
    const separator = data.watchUrl.includes("?") ? "&" : "?";
    window.location.href = `${data.watchUrl}${separator}returUrl=${returUrl}`;
  } else if (type === "serie" && data.sesonger) {
    const sisteEpKey = `${navn}-siste-episode`;
    let sisteEp = null;
    try {
      sisteEp = JSON.parse(localStorage.getItem(sisteEpKey));
    } catch (e) {}

    let sesongNr, epNr;
    if (sisteEp && data.sesonger[sisteEp.sesong]?.episoder[sisteEp.episode]) {
      sesongNr = sisteEp.sesong;
      epNr = sisteEp.episode;
    } else {
      sesongNr = Object.keys(data.sesonger)[0];
      epNr = Object.keys(data.sesonger[sesongNr].episoder)[0];
    }
    window.location.href = `film-mal.html?navn=${encodeURIComponent(navn)}&sesong=${encodeURIComponent(sesongNr)}&episode=${encodeURIComponent(epNr)}&returUrl=${returUrl}`;
  }
}

async function handterListClick() {
  if (!currentUser) return;
  const key = `${type}:${navn}`;

  if (!minListe.includes(key)) {
    minListe.push(key);
  } else {
    minListe = minListe.filter(f => f !== key);
  }

  oppdaterListeKnapp();
  lagreProfilDataTilSkyen();
}

/* ==========================================
   6. EPISODELISTING & OPTIMALISERTE ANBEFALINGER
   ========================================== */
function visSesong(sesongNr) {
  const seasonButtons = document.getElementById("seasonButtons");
  const episodeGallery = document.getElementById("episodeGallery");

  document.querySelectorAll(".season-btn").forEach(b => b.classList.remove("active"));
  if (seasonButtons) {
    [...seasonButtons.children]
      .find(b => b.textContent === `Sesong ${sesongNr}`)
      ?.classList.add("active");
  }

  if (!episodeGallery) return;
  episodeGallery.innerHTML = "";
  const episoder = data.sesonger[sesongNr]?.episoder || {};

  const fragment = document.createDocumentFragment();

  Object.keys(episoder).forEach(epNr => {
    const ep = episoder[epNr];
    const erLåst = ep.publishDate && new Date(ep.publishDate) > nå;

    const epCard = document.createElement("div");
    epCard.className = `episode-card ${erLåst ? 'locked' : ''}`;

    const epBilde = erTryggUrl(ep.thumbnail) ? ep.thumbnail : "";

    const thumbDiv = document.createElement("div");
    thumbDiv.className = "episode-thumb";
    
    const img = document.createElement("img");
    img.src = epBilde;
    img.alt = ep.tittel || '';
    thumbDiv.appendChild(img);

    if (erLåst) {
      const dato = new Date(ep.publishDate).toLocaleDateString("no-NO", { day: "numeric", month: "short" });
      const lockOverlay = document.createElement("div");
      lockOverlay.className = "lock-overlay";

      const lockIcon = document.createElement("i");
      lockIcon.className = "fas fa-clock";
      const lockText = document.createElement("span");
      lockText.textContent = dato;

      lockOverlay.appendChild(lockIcon);
      lockOverlay.appendChild(lockText);
      thumbDiv.appendChild(lockOverlay);
    } else {
      const playOverlay = document.createElement("div");
      playOverlay.className = "play-overlay";

      const playIcon = document.createElement("i");
      playIcon.className = "fas fa-play";
      playOverlay.appendChild(playIcon);
      thumbDiv.appendChild(playOverlay);
    }

    const infoDiv = document.createElement("div");
    infoDiv.className = "episode-info";

    const titleDiv = document.createElement("div");
    titleDiv.className = "episode-title";
    titleDiv.textContent = `Episode ${epNr}: ${ep.tittel || ''}`;

    const metaDiv = document.createElement("div");
    metaDiv.className = "episode-meta";
    metaDiv.textContent = ep.varighet || '';

    const descDiv = document.createElement("div");
    descDiv.className = "episode-desc";
    descDiv.textContent = ep.beskrivelse || '';

    infoDiv.appendChild(titleDiv);
    infoDiv.appendChild(metaDiv);
    infoDiv.appendChild(descDiv);

    epCard.appendChild(thumbDiv);
    epCard.appendChild(infoDiv);

    if (!erLåst) {
      epCard.addEventListener("click", () => {
        tryggLagring(`${navn}-siste-episode`, JSON.stringify({ sesong: sesongNr, episode: epNr }));
        const returUrl = encodeURIComponent(window.location.href);
        window.location.href = `film-mal.html?navn=${encodeURIComponent(navn)}&sesong=${encodeURIComponent(sesongNr)}&episode=${encodeURIComponent(epNr)}&returUrl=${returUrl}`;
      });
    }
    fragment.appendChild(epCard);
  });

  episodeGallery.appendChild(fragment);
}

async function byggAnbefalingerEllerEpisoder() {
  const recommendationsDiv = document.querySelector(".recommendations");
  if (!recommendationsDiv || !data) return;

  if (type === "serie" && data.sesonger) {
    if (document.getElementById("seasonButtons")) return;

    recommendationsDiv.replaceChildren();
    const seasonButtons = document.createElement("div");
    seasonButtons.className = "season-buttons";
    seasonButtons.id = "seasonButtons";

    const episodeGallery = document.createElement("div");
    episodeGallery.className = "episode-gallery";
    episodeGallery.id = "episodeGallery";

    recommendationsDiv.appendChild(seasonButtons);
    recommendationsDiv.appendChild(episodeGallery);
    const sesongNumre = Object.keys(data.sesonger);

    if (seasonButtons) {
      sesongNumre.forEach((s, idx) => {
        const btn = document.createElement("button");
        btn.textContent = `Sesong ${s}`;
        btn.className = "season-btn";
        if (idx === 0) btn.classList.add("active");
        btn.addEventListener("click", () => visSesong(s));
        seasonButtons.appendChild(btn);
      });
    }

    if (sesongNumre.length > 0) visSesong(sesongNumre[0]);

  } else {
    const gallery = document.getElementById("recommendationGallery");
    if (!gallery || gallery.children.length > 0 || gallery.dataset.laster === "true") return;
    gallery.dataset.laster = "true";

    const tittelEl = document.querySelector(".recommendations h2");
    if (tittelEl) tittelEl.textContent = "Filmer du kanskje vil like";

    try {
      let filmer = [];
      let cacheAnbefalinger = null;
      try { cacheAnbefalinger = localStorage.getItem("anbefalinger_cache"); } catch(e){}

      if (cacheAnbefalinger) {
        try {
          filmer = JSON.parse(cacheAnbefalinger);
        } catch (e) {
          try { localStorage.removeItem("anbefalinger_cache"); } catch(e){}
        }
      }

      if (filmer.length === 0) {
        const q = query(collection(db, "filmer"), limit(10));
        const filmerSnap = await getDocs(q);
        filmerSnap.forEach(d => filmer.push({ id: d.id, ...d.data() }));
        tryggLagring("anbefalinger_cache", JSON.stringify(filmer));
      }

      const fragment = document.createDocumentFragment();
      let antallVist = 0;

      filmer.forEach(item => {
        const nøkkel = item.id;
        const erGjeldende = nøkkel === navn;
        const erPublisert = !item.publishDate || new Date(item.publishDate) <= nå;

        if (!erGjeldende && erPublisert && antallVist < 6) {
          const card = document.createElement("div");
          card.className = "movie-card";

          const bildeUrl = (erTryggUrl(item.poster) ? item.poster : (erTryggUrl(item.bakgrunn) ? item.bakgrunn : ''));

          const img = document.createElement("img");
          img.src = bildeUrl;
          img.alt = item.tittel || '';

          const overlay = document.createElement("div");
          overlay.className = "movie-overlay";
          
          const title = document.createElement("div");
          title.className = "movie-title";
          title.textContent = item.tittel || '';

          overlay.appendChild(title);
          card.appendChild(img);
          card.appendChild(overlay);

          card.addEventListener("click", () => {
            if (typeof window.velgOgVisInfo === "function") {
              window.velgOgVisInfo(nøkkel);
            } else {
              window.location.hash = `#film-${nøkkel}`;
            }
          });
          fragment.appendChild(card);
          antallVist++;
        }
      });

      gallery.appendChild(fragment);

    } catch (e) {
      console.error("Feil ved henting av anbefalinger:", e);
    } finally {
      gallery.dataset.laster = "false";
    }
  }
}

/* ==========================================
   7. VIDEO/TRAILER & MOBIL-/IPAD-STØTTE
   ========================================== */
function initTrailer() {
  if (!data) return;
  const trailerVideo = document.getElementById("trailerVideo");
  const videoControls = document.getElementById("videoControls");
  const pauseBtn = document.getElementById("pauseBtn");
  const soundBtn = document.getElementById("soundBtn");

  const erMobilEllerTablet = erMobilEllerNettbrett();

  if (data.trailer && data.trailer.trim() !== "" && erTryggUrl(data.trailer) && trailerVideo && !erMobilEllerTablet) {
    trailerVideo.src = data.trailer;
    trailerVideo.preload = "metadata";
    trailerVideo.muted = true;
    trailerVideo.playsInline = true;
    trailerVideo.setAttribute("playsinline", "");
    trailerVideo.setAttribute("webkit-playsinline", "");

    trailerVideo.addEventListener("error", () => {
      trailerVideo.style.display = "none";
      if (videoControls) videoControls.style.display = "none";
      if (bgImg) bgImg.style.opacity = "1";
    });

    setTimeout(() => {
      if (bgImg) bgImg.style.opacity = "0";
      trailerVideo.style.opacity = "1";
      trailerVideo.play().catch(() => {
        if (bgImg) bgImg.style.opacity = "1";
        trailerVideo.style.opacity = "0";
      });
      if (videoControls) videoControls.style.opacity = "1";
    }, 1000);

    trailerVideo.addEventListener("ended", () => {
      trailerVideo.style.opacity = "0";
      if (bgImg) bgImg.style.opacity = "1";
      if (videoControls) videoControls.style.opacity = "0";
    });

    if (pauseBtn) {
      const togglePlay = () => {
        if (trailerVideo.paused) {
          trailerVideo.play();
          pauseBtn.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
          trailerVideo.pause();
          pauseBtn.innerHTML = '<i class="fas fa-play"></i>';
        }
      };
      pauseBtn.removeEventListener("click", pauseBtn._togglePlay || togglePlay);
      pauseBtn._togglePlay = togglePlay;
      pauseBtn.addEventListener("click", togglePlay);
    }

    if (soundBtn) {
      const toggleSound = () => {
        trailerVideo.muted = !trailerVideo.muted;
        soundBtn.innerHTML = trailerVideo.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
      };
      soundBtn.removeEventListener("click", soundBtn._toggleSound || toggleSound);
      soundBtn._toggleSound = toggleSound;
      soundBtn.addEventListener("click", toggleSound);
    }
  } else {
    if (trailerVideo) {
      trailerVideo.pause();
      trailerVideo.removeAttribute('src'); 
      trailerVideo.load(); 
      trailerVideo.style.display = "none";
    }
    if (videoControls) videoControls.style.display = "none";
    if (bgImg) bgImg.style.opacity = "1";
  }
}
/* ==========================================
   AUTOMATISK OPPDATERING VED ENDRING I URL (#)
   ========================================== */
window.addEventListener("hashchange", () => {
    const nyHash = window.location.hash.trim();
    
    // Hvis URL-en starter med #film-, last inn den nye filmen dynamisk
    if (nyHash.startsWith("#film-")) {
        const filmNavn = nyHash.replace("#film-", "");
        renderFilmPage(filmNavn);
    }
});

/* ==========================================
   9. GLOBALE EKSPORTER FOR SPA & WINDOW-KALL
   ========================================== */
window.renderFilmPage = renderFilmPage;
window.lastInnFilminfo = renderFilmPage;
window.lastInnFilm = renderFilmPage;
window.destroyFilmPage = destroyFilmPage;
