// ==================== FIREBASE IMPORT & INITIALISERING ==================== //
import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, updateDoc, onSnapshot, collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// ==================== SPA TILSTAND (STATE) ==================== //
const appState = {
  filmer: {},
  serier: {},
  registrertBruker: null,
  heleProfilArrayet: [],
  aktivProfilIndex: 0,
  bannerTimer: null,
  unsubscribeProfileListener: null,
  gjeldendeRute: window.location.hash || "#/"
};

// ==================== HJELPEFUNKSJONER FOR SIKKERHET & PARSING ==================== //
function sikkerJSONParse(str, fallback = null) {
  if (!str || typeof str !== "string") return fallback;
  try {
    return JSON.parse(str);
  } catch (e) {
    console.warn("Sikker JSON-parsing mislyktes:", e);
    return fallback;
  }
}

function escapeHTML(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ==================== CSS INJEKSJON FOR VIAPLAY-LÅSING ==================== //
try {
  const style = document.createElement('style');
  const isCoarse = window.matchMedia("(pointer: coarse)").matches;
  style.textContent = `
    .image-gallery, .coming-movies-gallery, .top10-gallery, .continue-image-gallery {
      overflow-x: ${isCoarse ? 'auto' : 'hidden'} !important; 
      scroll-behavior: smooth !important;
      display: flex !important;
      ${isCoarse ? '-webkit-overflow-scrolling: touch !important;' : ''}
    }
  `;
  document.head.appendChild(style);
} catch (err) {
  console.error("Kunne ikke injisere style-tag:", err);
}

// ==================== SPA RUTER & OPPRYDDING ==================== //
export function navigateTo(hashRute) {
  window.location.hash = hashRute;
}

function cleanupView() {
  if (appState.bannerTimer) {
    clearTimeout(appState.bannerTimer);
    appState.bannerTimer = null;
  }
}

function handleRouting() {
  cleanupView();
  appState.gjeldendeRute = window.location.hash || "#/";

  // Eksempel på SPA-rutehåndtering
  if (appState.gjeldendeRute.startsWith("#/spill/")) {
    const params = new URLSearchParams(appState.gjeldendeRute.split("?")[1]);
    renderSpillerVisning(params);
  } else if (appState.gjeldendeRute === "#/konto") {
    renderKontoVisning();
  } else {
    byggSiden(); // Hovedvisning
  }
}

window.addEventListener("hashchange", handleRouting);

// ==================== PROFIL & ALDERSGRENSE LOGIKK ==================== //
function hentAktivProfil() {
  return appState.heleProfilArrayet[appState.aktivProfilIndex] || appState.heleProfilArrayet[0] || null;
}

function erBarn() {
  const profil = hentAktivProfil();
  if (profil) return profil.isKids === true;
  return localStorage.getItem("isKids") === "true";
}

function hentMaksAldersgrense() {
  const profil = hentAktivProfil();
  if (profil) return String(profil.maksAldersgrense || "12");
  return localStorage.getItem("maksAldersgrense") || "12";
}

function sjekkAldersgrense(item) {
  if (!item || !Array.isArray(item.metadata)) return false;
  const maksAldersgrense = hentMaksAldersgrense();
  const maksTall = (maksAldersgrense === "A" || maksAldersgrense === "Alle") ? 0 : (parseInt(maksAldersgrense, 10) || 0);
  let varensAlder = 0;
  
  item.metadata.forEach(meta => {
    if (typeof meta !== "string") return;
    const renTekst = meta.toLowerCase();
    if (renTekst.includes("18")) varensAlder = 18;
    else if (renTekst.includes("16")) varensAlder = 16;
    else if (renTekst.includes("15")) varensAlder = 15;
    else if (renTekst.includes("12")) varensAlder = 12;
    else if (renTekst.includes("9")) varensAlder = 9;
    else if (renTekst.includes("6")) varensAlder = 6;
  });
  return varensAlder <= maksTall;
}

function erEgnetForBarn(item) {
  if (!item || !Array.isArray(item.metadata)) return false;
  return item.metadata.some(meta => {
    if (typeof meta !== "string") return false;
    const m = meta.toLowerCase();
    return m.includes("barn") || m.includes("familie") || m.includes("animasjon") || m === "alle";
  });
}

function oppdaterMenyProfilVisning(bildeUrl, profilNavn, farge) {
  try {
    const menyProfil = document.getElementById("menyProfilbilde");
    const profilmenyLink = document.getElementById("profilmenyLink");
    const navneEl = document.getElementById("profilNavn");
    const headerProfil = document.getElementById("headerProfilbilde");

    if (menyProfil && bildeUrl) {
      menyProfil.src = escapeHTML(bildeUrl);
      menyProfil.classList.toggle('png-karakter', String(bildeUrl).toLowerCase().endsWith('.png'));
    }

    if (navneEl && profilNavn) navneEl.textContent = profilNavn;
    if (profilmenyLink && farge) profilmenyLink.style.setProperty('--active-color', farge);
    if (headerProfil && bildeUrl) headerProfil.src = escapeHTML(bildeUrl);
  } catch (err) {
    console.error("Feil i oppdaterMenyProfilVisning:", err);
  }
}

window.gåTilKonto = function() {
  navigateTo("#/konto");
};

// ==================== AUTH & FIRESTORE REALTIME SYNC ==================== //
if (auth) {
  onAuthStateChanged(auth, (user) => {
    try {
      if (!user) {
        if (appState.unsubscribeProfileListener) appState.unsubscribeProfileListener();
        appState.registrertBruker = null;
        navigateTo("#/login");
      } else {
        appState.registrertBruker = user;

        const cachedeProfilerRaw = localStorage.getItem("watch_nordic_profiles_cache");
        if (cachedeProfilerRaw) {
          appState.heleProfilArrayet = sikkerJSONParse(cachedeProfilerRaw, []);
          renderContinueWatching();
        }

        const userDocRef = doc(db, "users", user.uid);
        if (appState.unsubscribeProfileListener) appState.unsubscribeProfileListener();

        appState.unsubscribeProfileListener = onSnapshot(userDocRef, (docSnap) => {
          try {
            if (docSnap.exists()) {
              const profiler = docSnap.data()?.profiler || [];
              appState.heleProfilArrayet = Array.isArray(profiler) ? profiler : [];
              
              localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(appState.heleProfilArrayet));

              appState.aktivProfilIndex = parseInt(localStorage.getItem("aktivProfilIndex"), 10) || 0;
              const gjeldendeProfil = hentAktivProfil();

              if (gjeldendeProfil) {
                oppdaterMenyProfilVisning(gjeldendeProfil.bilde || "", gjeldendeProfil.navn || "", gjeldendeProfil.farge || "");

                if (gjeldendeProfil.bilde) localStorage.setItem("profilbilde", gjeldendeProfil.bilde);
                if (gjeldendeProfil.navn) {
                  localStorage.setItem("profilnavn", gjeldendeProfil.navn);
                  localStorage.setItem("aktivProfil", gjeldendeProfil.navn);
                }

                localStorage.setItem("isKids", gjeldendeProfil.isKids ? "true" : "false");
                localStorage.setItem("maksAldersgrense", String(gjeldendeProfil.maksAldersgrense || "12"));
              }

              // SPA Re-render i stedet for window.location.reload()
              byggSiden();
            }
          } catch (snapErr) {
            console.error("Feil ved prosessering av docSnap:", snapErr);
          }
        }, (error) => {
          console.error("Feil ved realtidslytting på brukerprofiler:", error);
        });
      }
    } catch (authErr) {
      console.error("Kritisk feil i auth-state endring:", authErr);
    }
  });
}

// ==================== HERO-BANNER ==================== //
function hentBannerInnhold() {
  let bannerInnhold = [];
  const innloggetSomBarn = erBarn();
  try {
    Object.keys(appState.filmer || {}).forEach(key => {
      const item = appState.filmer[key];
      if (item && (item.banner || item.bannerMobil)) {
        if (innloggetSomBarn && (!erEgnetForBarn(item) || !sjekkAldersgrense(item))) return;
        bannerInnhold.push({ ...item, key, type: "film" });
      }
    });
    Object.keys(appState.serier || {}).forEach(key => {
      const item = appState.serier[key];
      if (item && (item.banner || item.bannerMobil)) {
        if (innloggetSomBarn && (!erEgnetForBarn(item) || !sjekkAldersgrense(item))) return;
        bannerInnhold.push({ ...item, key, type: "serie" });
      }
    });
  } catch (e) {
    console.error("Feil i hentBannerInnhold:", e);
  }
  return bannerInnhold;
}

function oppdaterBanner() {
  try {
    if (appState.bannerTimer) clearTimeout(appState.bannerTimer);

    const innhold = hentBannerInnhold();
    const heroSection = document.querySelector(".hero-banner");
    if (innhold.length === 0) {
      if (heroSection) heroSection.style.display = "none";
      return;
    }

    const film = innhold[new Date().getHours() % innhold.length];
    if (!film) return;

    const erMobil = window.innerWidth <= 768;

    const bilde = document.getElementById("banner-bilde");
    const video = document.getElementById("banner-video");
    const logo = document.getElementById("banner-logo");
    const beskrivelse = document.getElementById("banner-beskrivelse");
    const metadata = document.getElementById("banner-metadata");
    const seNa = document.getElementById("banner-se-na");
    const addBtn = document.getElementById("banner-add");

    if (bilde) {
      bilde.src = escapeHTML(erMobil ? (film.bannerMobil || film.banner) : film.banner);
      bilde.style.display = "block";
    }

    if (video) {
      if (film.trailer) {
        video.src = escapeHTML(film.trailer);
        video.load();
        video.muted = true;
      } else {
        video.removeAttribute("src");
      }
      video.style.display = "none";
    }

    let titleElement = document.getElementById("banner-title");
    if (!titleElement && logo && logo.parentNode) {
      titleElement = document.createElement("h1");
      titleElement.id = "banner-title";
      titleElement.className = "banner-title";
      logo.parentNode.insertBefore(titleElement, logo.nextSibling);
    }

    if (logo) {
      if (film.logo) {
        logo.src = escapeHTML(film.logo);
        logo.style.display = "block";
        if (titleElement) titleElement.style.display = "none";
      } else {
        logo.style.display = "none";
        if (titleElement) {
          titleElement.textContent = film.tittel || "";
          titleElement.style.display = "block";
        }
      }
    }

    if (beskrivelse) beskrivelse.textContent = film.beskrivelse || "";
    if (metadata) metadata.textContent = Array.isArray(film.metadata) ? film.metadata.join(" • ") : "";

    if (seNa) {
      seNa.onclick = (e) => { 
        e.preventDefault();
        navigateTo(`#/spill/film?navn=${encodeURIComponent(film.key)}`);
      };
    }

    if (addBtn && film.tittel) {
      const key = film.tittel.toLowerCase().replace(/\s+/g, '-');
      let liste = sikkerJSONParse(localStorage.getItem("minListe"), []);
      addBtn.innerHTML = liste.includes(key) ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';

      addBtn.onclick = () => {
        let currentListe = sikkerJSONParse(localStorage.getItem("minListe"), []);
        if (currentListe.includes(key)) {
          currentListe = currentListe.filter(item => item !== key);
        } else {
          currentListe.push(key);
        }
        localStorage.setItem("minListe", JSON.stringify(currentListe));
        addBtn.innerHTML = currentListe.includes(key) ? '<i class="fas fa-check"></i>' : '<i class="fas fa-plus"></i>';
      };
    }

    appState.bannerTimer = setTimeout(() => {
      if (!film.trailer || !video || !bilde) return;
      bilde.style.display = "none";
      video.style.display = "block";
      video.currentTime = 0;
      video.play().catch((err) => console.log("Auto-play hindret av nettleser:", err));
      video.onended = () => {
        video.style.display = "none";
        bilde.style.display = "block";
      };
    }, 5000);
  } catch (err) {
    console.error("Feil i oppdaterBanner:", err);
  }
}

window.addEventListener("resize", oppdaterBanner);

// ==================== GALLERIPILER LOGIKK ==================== //
function oppdaterAlleGalleripiler() {
  try {
    if (window.matchMedia("(pointer: coarse)").matches) return;

    document.querySelectorAll(".gallery-wrapper, .continue-gallery-wrapper").forEach(wrapper => {
      const gallery = wrapper.querySelector(".image-gallery, .coming-movies-gallery, .top10-gallery, .continue-image-gallery");
      const left = wrapper.querySelector(".scroll-button.left");
      const right = wrapper.querySelector(".scroll-button.right");
      const fadeL = wrapper.querySelector(".fade-left");
      const fadeR = wrapper.querySelector(".fade-right");
      if (!gallery) return;

      const max = gallery.scrollWidth - gallery.clientWidth;
      const pos = gallery.scrollLeft;
      
      const kanScrolle = max > 5;
      const erHeltTilVenstre = pos <= 2;
      const erHeltTilHoyre = Math.ceil(pos) >= max - 2;

      const skjulVenstre = !kanScrolle || erHeltTilVenstre;
      if (left) {
        left.classList.toggle("hidden", skjulVenstre);
        left.disabled = skjulVenstre;
      }
      if (fadeL) fadeL.classList.toggle("fade-hidden", skjulVenstre);

      const skjulHoyre = !kanScrolle || erHeltTilHoyre;
      if (right) {
        right.classList.toggle("hidden", skjulHoyre);
        right.disabled = skjulHoyre;
      }
      if (fadeR) fadeR.classList.toggle("fade-hidden", skjulHoyre);
    });
  } catch (err) {
    console.error("Feil ved oppdatering av galleripiler:", err);
  }
}

function initGalleripiler() {
  document.querySelectorAll(".gallery-wrapper, .continue-gallery-wrapper").forEach(wrapper => {
    const gallery = wrapper.querySelector(".image-gallery, .coming-movies-gallery, .top10-gallery, .continue-image-gallery");
    const left = wrapper.querySelector(".scroll-button.left");
    const right = wrapper.querySelector(".scroll-button.right");
    if (!gallery) return;

    if (left && !left.dataset.bound) {
      left.dataset.bound = "true";
      left.addEventListener("click", () => {
        const steg = gallery.clientWidth > 0 ? gallery.clientWidth * 0.90 : 400;
        gallery.scrollBy({ left: -steg, behavior: "smooth" });
        setTimeout(oppdaterAlleGalleripiler, 400);
      });
    }

    if (right && !right.dataset.bound) {
      right.dataset.bound = "true";
      right.addEventListener("click", () => {
        const steg = gallery.clientWidth > 0 ? gallery.clientWidth * 0.90 : 400;
        gallery.scrollBy({ left: steg, behavior: "smooth" });
        setTimeout(oppdaterAlleGalleripiler, 400);
      });
    }

    if (!gallery.dataset.bound) {
      gallery.dataset.bound = "true";
      gallery.addEventListener("scroll", oppdaterAlleGalleripiler, { passive: true });
    }
  });
}

window.addEventListener("resize", oppdaterAlleGalleripiler);

// ==================== DYNAMISK GALLERI GENERATOR ==================== //
function createGalleryItem(itemKey, item) {
  const link = document.createElement("a");
  link.href = `#/spill/film?navn=${encodeURIComponent(itemKey)}`;
  link.classList.add("gallery-item");
  
  link.addEventListener("click", (e) => {
    e.preventDefault();
    navigateTo(`#/spill/film?navn=${encodeURIComponent(itemKey)}`);
  });

  if (!item) return link;

  const erMobil = window.innerWidth <= 768;
  const bildeKilde = erMobil 
    ? (item.posterVertikal || item.poster || item.bilde || "")
    : (item.poster || item.bilde || "");

  const tittelTekst = escapeHTML(item.tittel || 'Mangler tittel');
  const metaTekst = escapeHTML((Array.isArray(item.metadata) ? item.metadata : []).join(" • "));

  link.innerHTML = `
    ${bildeKilde ? `<img src="${escapeHTML(bildeKilde)}" alt="${tittelTekst}" loading="lazy">` : `<div style="width:100%; height:100%; background:#1a2629; display:flex; align-items:center; justify-content:center; padding:10px; text-align:center; font-size:12px; color:#fff;">${tittelTekst}</div>`}
    <div class="image-overlay">
      <div class="overlay-content">
        <div class="overlay-title">${tittelTekst}</div>
        <div class="overlay-meta" style="display: none;">${metaTekst}</div>
      </div>
    </div>
  `;
  
  link.setAttribute('data-metadata', metaTekst);
  return link;
}

function sjekkOgSkjulSeksjon(seksjonId, galleryId) {
  const seksjon = document.getElementById(seksjonId);
  const gallery = document.getElementById(galleryId);
  if (!seksjon) return;

  if (!gallery || gallery.children.length === 0) {
    seksjon.style.display = "none";
  } else {
    seksjon.style.display = "block";
  }
}

// ==================== RENDERING FUNKSJONER ==================== //
function renderNyligLagtTil(seksjonId, galleryId, limit = 5) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;
  gallery.innerHTML = "";
  const currentDate = new Date();
  const innloggetSomBarn = erBarn();
  let altInnhold = [];

  Object.keys(appState.filmer || {}).forEach(key => {
    const film = appState.filmer[key];
    if (!film) return;
    if (innloggetSomBarn && (!erEgnetForBarn(film) || !sjekkAldersgrense(film))) return;
    if (!film.publishDate || new Date(film.publishDate) <= currentDate) {
      altInnhold.push({ key, data: film });
    }
  });

  Object.keys(appState.serier || {}).forEach(key => {
    const serie = appState.serier[key];
    if (!serie) return;
    if (innloggetSomBarn && (!erEgnetForBarn(serie) || !sjekkAldersgrense(serie))) return;
    if (!serie.publishDate || new Date(serie.publishDate) <= currentDate) {
      altInnhold.push({ key, data: serie });
    }
  });

  altInnhold.sort((a, b) => new Date(b.data.publishDate || 0) - new Date(a.data.publishDate || 0));
  altInnhold.slice(0, limit).forEach(item => {
    gallery.appendChild(createGalleryItem(item.key, item.data));
  });

  sjekkOgSkjulSeksjon(seksjonId, galleryId);
}

function renderFilmGallery(seksjonId, galleryId, filterFunction, limit = null) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;
  gallery.innerHTML = "";
  const currentDate = new Date();
  let filmKeys = Object.keys(appState.filmer || {}).filter(key => {
    const film = appState.filmer[key];
    if (!film) return false;
    if (!film.publishDate) return true;
    return new Date(film.publishDate) <= currentDate;
  });

  if (filterFunction) filmKeys = filmKeys.filter(filterFunction);
  filmKeys.sort((a, b) => new Date(appState.filmer[b]?.publishDate || 0) - new Date(appState.filmer[a]?.publishDate || 0));
  if (limit) filmKeys = filmKeys.slice(0, limit);

  filmKeys.forEach(key => {
    gallery.appendChild(createGalleryItem(key, appState.filmer[key]));
  });

  sjekkOgSkjulSeksjon(seksjonId, galleryId);
}

function renderSeries(seksjonId, galleryId) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;
  gallery.innerHTML = "";
  const innloggetSomBarn = erBarn();

  let serieKeys = Object.keys(appState.serier || {}).filter(key => {
    const serie = appState.serier[key];
    if (!serie) return false;
    if (innloggetSomBarn && (!erEgnetForBarn(serie) || !sjekkAldersgrense(serie))) return false;
    return true;
  });

  serieKeys.sort((a, b) => new Date(appState.serier[b]?.publishDate || 0) - new Date(appState.serier[a]?.publishDate || 0));

  serieKeys.forEach((key) => {
    gallery.appendChild(createGalleryItem(key, appState.serier[key]));
  });

  sjekkOgSkjulSeksjon(seksjonId, galleryId);
}

function renderTop10(seksjonId, galleryId) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;
  gallery.innerHTML = "";
  let filmKeys = Object.keys(appState.filmer || {}).filter(key => {
    const film = appState.filmer[key];
    if (!film) return false;
    if (!film.publishDate) return true;
    return new Date(film.publishDate) <= new Date();
  });

  if (erBarn()) {
    filmKeys = filmKeys.filter(key => erEgnetForBarn(appState.filmer[key]) && sjekkAldersgrense(appState.filmer[key]));
  }

  const today = new Date();
  const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
  function seededRandom(s) {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  }

  filmKeys.sort((a, b) => seededRandom(seed + a.length) - seededRandom(seed + b.length));
  filmKeys.slice(0, 10).forEach((key, index) => {
    const film = appState.filmer[key];
    if (!film) return;
    const wrapper = document.createElement("a");
    wrapper.href = `#/spill/film?navn=${encodeURIComponent(key)}`;
    wrapper.classList.add("top10-item");
    
    wrapper.addEventListener("click", (e) => {
      e.preventDefault();
      navigateTo(`#/spill/film?navn=${encodeURIComponent(key)}`);
    });

    const bildeKilde = film.posterVertikal || film.poster || "";

    const img = document.createElement("img");
    if (bildeKilde) {
      img.src = escapeHTML(bildeKilde);
      img.loading = "lazy";
    }
    img.alt = escapeHTML(film.tittel || "Topp 10");

    const number = document.createElement("div");
    number.classList.add("top10-number");
    number.textContent = index + 1;

    wrapper.appendChild(img);
    wrapper.appendChild(number);
    gallery.appendChild(wrapper);
  });

  sjekkOgSkjulSeksjon(seksjonId, galleryId);
}

function renderDokumentarSerier(seksjonId, galleryId) {
  const gallery = document.getElementById(galleryId);
  if (!gallery) return;
  gallery.innerHTML = "";
  const innloggetSomBarn = erBarn();

  let serieKeys = Object.keys(appState.serier || {}).filter(key => {
    const serie = appState.serier[key];
    if (!serie) return false;
    if (innloggetSomBarn && (!erEgnetForBarn(serie) || !sjekkAldersgrense(serie))) return false;
    return Array.isArray(serie.metadata) && serie.metadata.some(meta => typeof meta === "string" && meta.toLowerCase().includes("dokumentar"));
  });

  serieKeys.sort((a, b) => new Date(appState.serier[b]?.publishDate || 0) - new Date(appState.serier[a]?.publishDate || 0));

  serieKeys.forEach((key) => {
    gallery.appendChild(createGalleryItem(key, appState.serier[key]));
  });

  sjekkOgSkjulSeksjon(seksjonId, galleryId);
}

// ==================== FORTSETT Å SE ==================== //
function renderContinueWatching() {
  try {
    const section = document.getElementById("fortsett-section");
    const gallery = document.getElementById("fortsett-galleri");
    if (!section || !gallery) return;
    
    gallery.innerHTML = "";

    const profil = hentAktivProfil();

    if (!profil || !profil.fremdrift || typeof profil.fremdrift !== "object" || Object.keys(profil.fremdrift).length === 0) {
      section.style.display = "none";
      return;
    }

    const skjulteTitler = Array.isArray(profil.skjultFortsett) ? profil.skjultFortsett : [];
    let fantInnhold = false;

    const sorterteFilmIder = Object.keys(profil.fremdrift).sort((a, b) => {
      const dataA = profil.fremdrift[a];
      const dataB = profil.fremdrift[b];
      
      const hentTid = (data) => {
        if (!data || typeof data !== "object") return 0;
        if (typeof data.lastUpdated === "number") return data.lastUpdated;
        if (typeof data.timestamp === "number") return data.timestamp;
        const ISOtid = data.sistOppdatert || data.sistSett || data.lastUpdated;
        if (ISOtid) {
          const parsed = new Date(ISOtid).getTime();
          return isNaN(parsed) ? 0 : parsed;
        }
        return 0;
      };

      return hentTid(dataB) - hentTid(dataA);
    });

    sorterteFilmIder.forEach((filmId) => {
      const dbData = profil.fremdrift[filmId];
      const progressVerdi = typeof dbData === "object" && dbData !== null ? (dbData.percent || 0) : Number(dbData || 0);
      const erFerdig = typeof dbData === "object" && dbData !== null && dbData.status === "ferdig";

      if (skjulteTitler.includes(filmId)) {
        if (typeof dbData === "object" && dbData !== null && dbData.status === "paabegynt") {
          profil.skjultFortsett = profil.skjultFortsett.filter(id => id !== filmId);
          localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(appState.heleProfilArrayet));
        } else {
          return;
        }
      }

      if (progressVerdi > 96 || erFerdig) return;
      
      let metadataMatch = null;
      let urlParamNavn = "";
      let spillType = "film";
      let sesongNr = "";
      let episodeNr = "";

      if (filmId.startsWith("film-")) {
        urlParamNavn = filmId.replace("film-", "");
        if (appState.filmer[urlParamNavn]) {
          metadataMatch = appState.filmer[urlParamNavn];
          spillType = "film";
        }
      } else if (filmId.startsWith("serie-")) {
        const deler = filmId.split("-"); 
        urlParamNavn = deler[1];
        sesongNr = deler[2] ? deler[2].replace("s", "") : "1";
        episodeNr = deler[3] ? deler[3].replace("e", "") : "1";

        if (appState.serier[urlParamNavn]) {
          metadataMatch = appState.serier[urlParamNavn];
          spillType = "serie";
        }
      }

      if (!metadataMatch) return;

      if (erBarn()) {
        if (!erEgnetForBarn(metadataMatch) || !sjekkAldersgrense(metadataMatch)) return;
      }

      fantInnhold = true;

      const hashUrl = spillType === "serie"
        ? `#/spill/serie?navn=${encodeURIComponent(urlParamNavn)}&sesong=${encodeURIComponent(sesongNr)}&episode=${encodeURIComponent(episodeNr)}`
        : `#/spill/film?navn=${encodeURIComponent(urlParamNavn)}`;

      let bildeKilde = metadataMatch.poster || metadataMatch.bilde || "";
      if (spillType === "serie" && metadataMatch.sesonger && metadataMatch.sesonger[sesongNr]) {
        const epInfo = metadataMatch.sesonger[sesongNr].find(e => String(e.episode) === String(episodeNr));
        if (epInfo && epInfo.bilde) {
          bildeKilde = epInfo.bilde;
        }
      }

      const link = document.createElement("a");
      link.href = hashUrl;
      link.classList.add("continue-item");

      link.addEventListener("click", (e) => {
        if (!e.target.closest('.delete-progress-btn')) {
          e.preventDefault();
          navigateTo(hashUrl);
        }
      });

      const episodeTekst = spillType === "serie" && sesongNr && episodeNr
        ? ` • S${sesongNr}E${episodeNr}` 
        : "";

      const tittelClean = escapeHTML(metadataMatch.tittel || "");

      link.innerHTML = `
        <div class="continue-media-wrap">
          ${bildeKilde 
            ? `<img src="${escapeHTML(bildeKilde)}" alt="${tittelClean}" loading="lazy">` 
            : `<div style="width:100%; height:100%; background:#1a2629; display:flex; align-items:center; justify-content:center; padding:10px; text-align:center; font-size:12px; color:#fff;">${tittelClean || 'Mangler bilde'}</div>`
          }
          <button class="delete-progress-btn" title="Skjul fra Fortsett å se" type="button" aria-label="Skjul fra visning">
            <i class="fas fa-trash-alt"></i>
          </button>
          <div class="progress-bar" style="--progress: ${Math.min(100, Math.max(0, progressVerdi))}%;"></div>
        </div>
        <span class="continue-title">${tittelClean}${escapeHTML(episodeTekst)}</span>
      `;

      const deleteBtn = link.querySelector(".delete-progress-btn");
      deleteBtn.addEventListener("click", async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!Array.isArray(profil.skjultFortsett)) {
          profil.skjultFortsett = [];
        }

        if (!profil.skjultFortsett.includes(filmId)) {
          profil.skjultFortsett.push(filmId);
        }

        localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(appState.heleProfilArrayet));

        if (appState.registrertBruker) {
          try {
            const userDocRef = doc(db, "users", appState.registrertBruker.uid);
            await updateDoc(userDocRef, {
              profiler: appState.heleProfilArrayet
            });
          } catch (err) {
            console.error("Feil ved skjuling av tittel i Firebase:", err);
          }
        }

        link.style.transition = "all 0.3s ease";
        link.style.transform = "scale(0.8)";
        link.style.opacity = "0";
        setTimeout(() => {
          link.remove();
          if (gallery.children.length === 0) {
            section.style.display = "none";
          } else {
            oppdaterAlleGalleripiler();
          }
        }, 300);
      });

      gallery.appendChild(link);
    });

    if (fantInnhold) {
      section.style.display = "block";
      initGalleripiler();
      oppdaterAlleGalleripiler();
    } else {
      section.style.display = "none";
    }
  } catch (err) {
    console.error("Feil i renderContinueWatching:", err);
  }
}

// ==================== FIRESTORE DATAHENTING MED CACHE ==================== //
async function hentDataFraFirestore() {
  const cacheKeyFilmer = "watch_nordic_filmer_cache";
  const cacheKeySerier = "watch_nordic_serier_cache";

  const lagredeFilmer = localStorage.getItem(cacheKeyFilmer);
  const lagredeSerier = localStorage.getItem(cacheKeySerier);

  if (lagredeFilmer && lagredeSerier) {
    appState.filmer = sikkerJSONParse(lagredeFilmer, {});
    appState.serier = sikkerJSONParse(lagredeSerier, {});
    byggSiden();
  }

  try {
    const [filmerSnap, serierSnap] = await Promise.all([
      getDocs(collection(db, "filmer")),
      getDocs(collection(db, "serier"))
    ]);

    const nyeFilmer = {};
    filmerSnap.forEach(docSnap => { nyeFilmer[docSnap.id] = docSnap.data(); });

    const nyeSerier = {};
    serierSnap.forEach(docSnap => { nyeSerier[docSnap.id] = docSnap.data(); });

    localStorage.setItem(cacheKeyFilmer, JSON.stringify(nyeFilmer));
    localStorage.setItem(cacheKeySerier, JSON.stringify(nyeSerier));

    appState.filmer = nyeFilmer;
    appState.serier = nyeSerier;
    
    byggSiden();
  } catch (feil) {
    console.error("Feil ved henting av data fra Firestore:", feil);
  }
}

// ==================== BYGG HOVEDSIDE (VISNING) ==================== //
function byggSiden() {
  try {
    const innloggetSomBarn = erBarn();

    if (innloggetSomBarn) {
      renderNyligLagtTil("nye-filmer-seksjon", "nye-filmer-galleri", 5);
      renderTop10("topp10-seksjon", "topp10-filmer-galleri");
      renderFilmGallery("alle-filmer-seksjon", "filmer-galleri", (key) => erEgnetForBarn(appState.filmer[key]) && sjekkAldersgrense(appState.filmer[key]), 20);
      renderSeries("serier-seksjon", "serier-galleri");
      renderDokumentarSerier("dokumentar-seksjon", "dokumentarserier-galleri");
      
      const barnSeksjon = document.getElementById("barn-seksjon");
      if (barnSeksjon) barnSeksjon.style.display = "block";
      renderFilmGallery("barn-seksjon", "barn-galleri", (key) => erEgnetForBarn(appState.filmer[key]) && sjekkAldersgrense(appState.filmer[key]));
    } else {
      const barnSeksjon = document.getElementById("barn-seksjon");
      if (barnSeksjon) barnSeksjon.style.display = "block";

      renderNyligLagtTil("nye-filmer-seksjon", "nye-filmer-galleri", 5); 
      renderTop10("topp10-seksjon", "topp10-filmer-galleri");
      renderFilmGallery("alle-filmer-seksjon", "filmer-galleri", null, 20);
      renderSeries("serier-seksjon", "serier-galleri");
      renderDokumentarSerier("dokumentar-seksjon", "dokumentarserier-galleri");
    }

    renderContinueWatching();
    oppdaterBanner();
    initGalleripiler();
    oppdaterAlleGalleripiler();
  } catch (err) {
    console.error("Feil ved bygging av siden:", err);
  }
}

// Placeholders for andre SPA-ruter
function renderSpillerVisning(params) {
  const root = document.getElementById("app-content") || document.body;
  console.log("Laster spiller med parametere:", params.toString());
}

function renderKontoVisning() {
  console.log("Laster konto-visning");
}

// ==================== INITIALISERING ==================== //
document.addEventListener("DOMContentLoaded", () => {
  hentDataFraFirestore();
  handleRouting();
});
