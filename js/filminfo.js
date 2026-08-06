import { db, auth } from "./firebase-config.js"; // Tilpass stien til din konfigurasjon
import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

/* ==========================================
   HJELPEFUNKSJONER & SIKKERHET
   ========================================== */

// Sanitisering mot XSS
function sanitizeInput(str) {
  if (typeof str !== "string") return str;
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;"
  };
  return str.replace(/[&<>"'/]/g, (match) => map[match]);
}

// Sjekker om en URL er trygg (HTTP/HTTPS)
function erTryggUrl(url) {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

// Caching i localStorage med utløpstid (TTL)
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutter

function getCache(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch (err) {
    console.warn("Kunne ikke skrive til localStorage:", err);
  }
}

/* ==========================================
   HOVEDMODUL: FILMSIDE / SERIESIDE
   ========================================== */

export function initFilmMal(routerParams = {}) {
  const mediaId = routerParams.id;
  if (!mediaId) {
    console.error("Ingen media-ID oppgitt.");
    return () => {};
  }

  // Lokale variabler for tilstand og opprydding
  let currentMedia = null;
  let userProfile = null;
  let resizeTimeout = null;
  let handleResizeListener = null;

  /* --- DOM Elementer --- */
  const elTittel = document.getElementById("mediaTittel");
  const elBeskrivelse = document.getElementById("mediaBeskrivelse");
  const elSjanger = document.getElementById("mediaSjanger");
  const elAldersgrense = document.getElementById("mediaAldersgrense");
  const elHeroBakgrunn = document.getElementById("heroBakgrunn");
  const elTrailerVideo = document.getElementById("trailerVideo");
  const elSesongVelger = document.getElementById("sesongVelger");
  const elEpisodeListe = document.getElementById("episodeListe");
  const elAnbefalingerContainer = document.getElementById("anbefalingerContainer");
  const elWatchBtn = document.getElementById("watchButton");

  /* --- Hovedoppstart --- */
  async function init() {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        userProfile = await hentBrukerProfil(user.uid);
      }
      await lastOgVisMedia();
    });

    // Responsiv bakgrunnshåndtering med debounce
    handleResizeListener = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(oppdaterBakgrunnsBilde, 150);
    };
    window.addEventListener("resize", handleResizeListener);

    if (elWatchBtn) {
      elWatchBtn.addEventListener("click", handterWatchClick);
    }
  }

  /* --- Henting av data --- */
  async function hentBrukerProfil(uid) {
    const cacheKey = `user_profile_${uid}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    try {
      const docRef = doc(db, "users", uid);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const profile = snap.data();
        setCache(cacheKey, profile);
        return profile;
      }
    } catch (err) {
      console.error("Feil ved henting av brukerprofil:", err);
    }
    return null;
  }

  async function lastOgVisMedia() {
    const cacheKey = `media_${mediaId}`;
    let mediaData = getCache(cacheKey);

    if (!mediaData) {
      try {
        const docRef = doc(db, "media", mediaId);
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          mediaData = { id: snap.id, ...snap.data() };
          setCache(cacheKey, mediaData);
        } else {
          console.error("Media ikke funnet");
          return;
        }
      } catch (err) {
        console.error("Feil ved henting av media:", err);
        return;
      }
    }

    currentMedia = mediaData;
    visMediaInfo(currentMedia);
    hentAnbefalinger(currentMedia.sjanger);
  }

  /* --- Vising i Grensesnitt (UI) --- */
  function visMediaInfo(media) {
    if (elTittel) elTittel.textContent = sanitizeInput(media.tittel || "Uten tittel");
    if (elBeskrivelse) elBeskrivelse.textContent = sanitizeInput(media.beskrivelse || "");
    if (elSjanger) elSjanger.textContent = sanitizeInput(media.sjanger || "Ukjent");
    if (elAldersgrense) elAldersgrense.textContent = `${media.aldersgrense || 0}+`;

    oppdaterBakgrunnsBilde();
    handterTrailer(media.trailerUrl);

    // Hvis det er en serie, håndter sesonger
    if (media.type === "serie" && media.sesonger && elSesongVelger) {
      byggSesongVelger(media.sesonger);
    }
  }

  function oppdaterBakgrunnsBilde() {
    if (!currentMedia || !elHeroBakgrunn) return;

    const erMobil = window.innerWidth <= 768;
    const bildeUrl = erMobil && currentMedia.bakgrunnMobil 
      ? currentMedia.bakgrunnMobil 
      : currentMedia.bakgrunn;

    if (erTryggUrl(bildeUrl)) {
      elHeroBakgrunn.style.backgroundImage = `url('${bildeUrl}')`;
    }
  }

  function handterTrailer(trailerUrl) {
    if (!elTrailerVideo) return;

    if (erTryggUrl(trailerUrl)) {
      elTrailerVideo.src = trailerUrl;
      const erMobil = window.innerWidth <= 768;
      
      // Deaktiver autoplay på mobil for å spare data og overholde retningslinjer
      if (!erMobil) {
        elTrailerVideo.play().catch(() => console.log("Autoplay blokkert av nettleser."));
      }
    } else {
      elTrailerVideo.style.display = "none";
    }
  }

  function byggSesongVelger(sesonger) {
    elSesongVelger.innerHTML = "";
    elSesongVelger.style.display = "block";

    Object.keys(sesonger).forEach((sesongNummer, index) => {
      const option = document.createElement("option");
      option.value = sesongNummer;
      option.textContent = `Sesong ${sesongNummer}`;
      elSesongVelger.appendChild(option);

      if (index === 0) {
        visEpisoder(sesonger[sesongNummer]);
      }
    });

    elSesongVelger.onchange = (e) => {
      const valgtSesong = e.target.value;
      visEpisoder(sesonger[valgtSesong]);
    };
  }

  function visEpisoder(episoder) {
    if (!elEpisodeListe) return;
    elEpisodeListe.innerHTML = "";

    if (!episoder || episoder.length === 0) {
      elEpisodeListe.innerHTML = "<li>Ingen episoder tilgjengelig.</li>";
      return;
    }

    episoder.forEach((ep) => {
      const li = document.createElement("li");
      li.className = "episode-kort";
      li.innerHTML = `
        <strong>Ep ${sanitizeInput(ep.nummer)}: ${sanitizeInput(ep.tittel)}</strong>
        <p>${sanitizeInput(ep.beskrivelse || "")}</p>
      `;
      li.addEventListener("click", () => spillAvMedia(ep.videoUrl));
      elEpisodeListe.appendChild(li);
    });
  }

  async function hentAnbefalinger(sjanger) {
    if (!elAnbefalingerContainer || !sjanger) return;

    const cacheKey = `rec_${sjanger}`;
    let relaterte = getCache(cacheKey);

    if (!relaterte) {
      try {
        const q = query(
          collection(db, "media"),
          where("sjanger", "==", sjanger),
          limit(6)
        );
        const querySnap = await getDocs(q);
        relaterte = [];
        querySnap.forEach((doc) => {
          if (doc.id !== mediaId) {
            relaterte.push({ id: doc.id, ...doc.data() });
          }
        });
        setCache(cacheKey, relaterte);
      } catch (err) {
        console.error("Feil ved henting av anbefalinger:", err);
        return;
      }
    }

    visAnbefalinger(relaterte);
  }

  function visAnbefalinger(liste) {
    elAnbefalingerContainer.innerHTML = "";

    liste.forEach((item) => {
      const div = document.createElement("div");
      div.className = "anbefaling-kort";
      div.innerHTML = `
        <img src="${erTryggUrl(item.poster) ? item.poster : 'placeholder.jpg'}" alt="${sanitizeInput(item.tittel)}">
        <h4>${sanitizeInput(item.tittel)}</h4>
      `;
      div.addEventListener("click", () => {
        // Ruter til ny side (bruk din SPA sin navigeringsfunksjon)
        if (window.router) {
          window.router.navigate(`/film/${item.id}`);
        }
      });
      elAnbefalingerContainer.appendChild(div);
    });
  }

  /* --- Handlinger & Alderssjekk --- */
  function handterWatchClick() {
    if (!currentMedia) return;

    // Aldersgrensekontroll dersom brukerprofil finnes
    if (userProfile && userProfile.alder !== undefined) {
      if (userProfile.alder < currentMedia.aldersgrense) {
        alert(`Du må være minst ${currentMedia.aldersgrense} år for å se dette innholdet.`);
        return;
      }
    }

    spillAvMedia(currentMedia.videoUrl);
  }

  function spillAvMedia(url) {
    if (erTryggUrl(url)) {
      window.location.href = url; // Eventuelt åpne i en egen avspiller-komponent
    } else {
      alert("Avspillingsadresse er ikke tilgjengelig.");
    }
  }

  // Start initiering
  init();

  /* ==========================================
     OPPRYDDING (SPA Lifecycle Destroy)
     ========================================== */
  return function destroy() {
    // Fjerne resize listener for å unngå minnelekkasjer
    if (handleResizeListener) {
      window.removeEventListener("resize", handleResizeListener);
    }

    // Stoppe og nullstille video dersom den kjører
    if (elTrailerVideo) {
      elTrailerVideo.pause();
      elTrailerVideo.removeAttribute("src");
      elTrailerVideo.load();
    }

    // Fjerne event-lyttere
    if (elWatchBtn) {
      elWatchBtn.removeEventListener("click", handterWatchClick);
    }
  };
}
