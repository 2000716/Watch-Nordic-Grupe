import { auth, db } from "./firebase-oppsett.js";
import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

/* ==========================================
   1. GLOBALE TILSTANDER & HJELPEFUNKSJONER
   ========================================== */

let currentUser = null;

let aktivProfil =
  localStorage.getItem("aktivProfil") || "Hovedprofil";

let aktivProfilIndex =
  parseInt(localStorage.getItem("aktivProfilIndex") || "0", 10);

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

let watchBtn;
let addToListBtn;
let bgImg;

let resizeTimeout;


/* ==========================================
   2. SPA-ROUTING
   ========================================== */

function spaNaviger(sideId, params = {}) {
  if (typeof window.byttSide === "function") {
    window.byttSide(sideId, params);
    return;
  }

  const queryString =
    new URLSearchParams(params).toString();

  window.location.hash =
    `#${sideId}${queryString ? "?" + queryString : ""}`;
}


/* ==========================================
   3. HENT FILM-ID FRA URL
   ========================================== */

/*
   Støtter:

   #film-singularity
   #film-avatar
   #serie-breaking-bad

   og også:

   #filminfo?navn=singularity
   #filminfo?id=singularity
*/

function hentMediaIdFraUrl() {
  const hash = window.location.hash || "";

  // Eksempel:
  // #filminfo?navn=singularity
  if (hash.includes("?")) {
    const [hashPath, queryString] = hash.split("?");

    const params = new URLSearchParams(queryString);

    const id =
      params.get("navn") ||
      params.get("id");

    if (id) {
      return decodeURIComponent(id).trim();
    }

    // Hvis hash er:
    // #film-singularity?...
    const pathId = hentIdFraHashPath(hashPath);

    if (pathId) {
      return pathId;
    }
  }

  return hentIdFraHashPath(hash);
}


/*
   Gjør:

   #film-singularity
          ↓
   singularity

   #serie-avatar
          ↓
   avatar
*/

function hentIdFraHashPath(hash) {
  if (!hash) return "";

  let renHash = hash.replace(/^#/, "").trim();

  if (!renHash) return "";

  // Hvis SPA-en bruker:
  // #film/singularity
  if (renHash.includes("/")) {
    const deler = renHash.split("/");

    if (deler.length >= 2 && deler[1]) {
      return decodeURIComponent(deler[1]).trim();
    }
  }

  // #film-singularity
  if (renHash.startsWith("film-")) {
    return decodeURIComponent(
      renHash.substring("film-".length)
    ).trim();
  }

  // #serie-breaking-bad
  if (renHash.startsWith("serie-")) {
    return decodeURIComponent(
      renHash.substring("serie-".length)
    ).trim();
  }

  // Vanlig ID
  return decodeURIComponent(renHash).trim();
}


/* ==========================================
   4. URL-SIKKERHET
   ========================================== */

function erTryggUrl(url) {
  if (!url || typeof url !== "string") {
    return false;
  }

  try {
    const parsed = new URL(
      url,
      window.location.origin
    );

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );
  } catch (e) {
    return false;
  }
}


/* ==========================================
   5. LOCALSTORAGE
   ========================================== */

function tryggLagring(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.warn(
      "Kunne ikke lagre til localStorage:",
      e
    );
  }
}


/* ==========================================
   6. RESPONSIV BAKGRUNN
   ========================================== */

function erMobilEllerNettbrett() {
  const touchEnhet =
    ("ontouchstart" in window) ||
    navigator.maxTouchPoints > 0;

  const breddeSjekk =
    window.innerWidth <= 1024;

  const isIPad =
    /Macintosh/i.test(navigator.userAgent) &&
    navigator.maxTouchPoints > 1;

  return (
    (touchEnhet && breddeSjekk) ||
    isIPad
  );
}


/* ==========================================
   7. HENT FILM / SERIE FRA FIRESTORE
   ========================================== */

async function lastDataFraFirebase(eksplisittId = null) {
  try {
    const forespurtNavn =
      eksplisittId
        ? String(eksplisittId).trim()
        : hentMediaIdFraUrl();

    if (!forespurtNavn) {
      console.warn("Ingen medie-ID funnet.");
      spaNaviger("hjem");
      return false;
    }

    navn = forespurtNavn;

    // Nullstill data ved ny film
    data = null;
    type = "film";

    /*
      Viktig:

      URL:
      #film-singularity

      gir:

      navn = "singularity"

      og vi søker:

      filmer/singularity
    */

    const cacheKey =
      `media_cache_${type}_${navn}`;

    let cachedData = null;

    try {
      cachedData =
        localStorage.getItem(cacheKey);
    } catch (e) {
      cachedData = null;
    }

    if (cachedData) {
      try {
        const parsed =
          JSON.parse(cachedData);

        if (
          parsed &&
          parsed.data &&
          parsed.type
        ) {
          data = parsed.data;
          type = parsed.type;
        }
      } catch (e) {
        try {
          localStorage.removeItem(cacheKey);
        } catch (_) {}
      }
    }


    /* -------------------------------
       Finn først i filmer
       ------------------------------- */

    if (!data) {
      const filmRef =
        doc(db, "filmer", navn);

      const filmSnap =
        await getDoc(filmRef);

      if (filmSnap.exists()) {
        type = "film";
        data = filmSnap.data();
      }
    }


    /* -------------------------------
       Hvis ikke film → sjekk serier
       ------------------------------- */

    if (!data) {
      const serieRef =
        doc(db, "serier", navn);

      const serieSnap =
        await getDoc(serieRef);

      if (serieSnap.exists()) {
        type = "serie";
        data = serieSnap.data();
      }
    }


    /* -------------------------------
       Cache resultatet
       ------------------------------- */

    if (data) {
      tryggLagring(
        `media_cache_${type}_${navn}`,
        JSON.stringify({
          data,
          type
        })
      );
    }


    /*
      Sjekk at brukeren ikke har navigert
      til en annen film mens Firebase lastet.
    */

    if (navn !== forespurtNavn) {
      return false;
    }


    if (!data) {
      console.warn(
        "Fant ikke film/serie i Firestore:",
        navn
      );

      spaNaviger("hjem");

      return false;
    }


    nå = new Date();

    erUpublisert =
      !!data.publishDate &&
      new Date(data.publishDate) > nå;

    erUtgått =
      !!data.expireDate &&
      nå > new Date(data.expireDate);

    erUtilgjengelig =
      erUpublisert ||
      erUtgått;

    return true;

  } catch (err) {
    console.error(
      "Feil ved henting av mediedata:",
      err
    );

    return false;
  }
}


/* ==========================================
   8. HOVEDFUNKSJON
   ========================================== */

async function init(eksplisittId = null) {
  const gammelNavn = navn;

  data = null;

  const suksess =
    await lastDataFraFirebase(
      eksplisittId
    );

  if (!suksess || !data) {
    return;
  }

  // Sørg for at gammel async-request
  // ikke overskriver ny film
  if (
    gammelNavn &&
    navn !== gammelNavn &&
    eksplisittId === null
  ) {
    return;
  }


  watchBtn =
    document.getElementById("watchBtn");

  addToListBtn =
    document.getElementById("addToListBtn");

  bgImg =
    document.getElementById(
      "backgroundImage"
    );


  /* --------------------------------------
     Dokumenttittel
     -------------------------------------- */

  document.title =
    data.tittel
      ? `${data.tittel} - Watch Nordic`
      : "Watch Nordic";


  /* --------------------------------------
     Bakgrunn
     -------------------------------------- */

  oppdaterBakgrunnsBilde();


  /* --------------------------------------
     Logo
     -------------------------------------- */

  const fLogo =
    document.querySelector(".film-logo");

  const logoContainer =
    document.querySelector(".logo-container");

  if (fLogo) {
    if (
      data.logo &&
      typeof data.logo === "string" &&
      data.logo.trim() !== "" &&
      erTryggUrl(data.logo)
    ) {
      fLogo.src = data.logo;
      fLogo.style.display = "block";

      const gammelTextLogo =
        logoContainer?.querySelector(
          ".text-logo"
        );

      gammelTextLogo?.remove();

    } else {
      fLogo.removeAttribute("src");
      fLogo.style.display = "none";

      if (
        logoContainer &&
        !logoContainer.querySelector(
          ".text-logo"
        )
      ) {
        const titleEl =
          document.createElement("div");

        titleEl.className =
          "text-logo";

        titleEl.textContent =
          data.tittel || "";

        logoContainer.appendChild(
          titleEl
        );
      }
    }
  }


  /* --------------------------------------
     Beskrivelse
     -------------------------------------- */

  const descEl =
    document.querySelector(".description");

  if (descEl) {
    const fullText =
      data.beskrivelse || "";

    const ordGrense = 20;

    const ordArray =
      fullText.trim()
        ? fullText.trim().split(/\s+/)
        : [];

    descEl.replaceChildren();

    if (ordArray.length > ordGrense) {
      descEl.appendChild(
        document.createTextNode(
          ordArray
            .slice(0, ordGrense)
            .join(" ") + "... "
        )
      );

      const moreBtn =
        document.createElement("button");

      moreBtn.className = "more-btn";
      moreBtn.type = "button";
      moreBtn.textContent = "Mer";

      descEl.appendChild(moreBtn);


      moreBtn.addEventListener(
        "click",
        () => {
          const overlay =
            document.createElement("div");

          overlay.className =
            "popup-overlay";


          const popupBox =
            document.createElement("div");

          popupBox.className =
            "popup-box";


          const closeBtn =
            document.createElement("button");

          closeBtn.className =
            "close-btn";

          closeBtn.type = "button";

          closeBtn.setAttribute(
            "aria-label",
            "Lukk beskrivelse"
          );

          closeBtn.textContent = "×";


          const textPara =
            document.createElement("p");

          textPara.textContent =
            fullText;


          popupBox.appendChild(closeBtn);
          popupBox.appendChild(textPara);

          overlay.appendChild(popupBox);

          document.body.appendChild(
            overlay
          );


          const lukkModal = () => {
            document.removeEventListener(
              "keydown",
              escLukk
            );

            overlay.remove();
          };


          const overlayKlikk = (e) => {
            if (e.target === overlay) {
              lukkModal();
            }
          };


          const escLukk = (e) => {
            if (e.key === "Escape") {
              lukkModal();
            }
          };


          closeBtn.addEventListener(
            "click",
            lukkModal
          );

          overlay.addEventListener(
            "click",
            overlayKlikk
          );

          document.addEventListener(
            "keydown",
            escLukk
          );
        }
      );

    } else {
      descEl.textContent =
        fullText;
    }
  }


  /* --------------------------------------
     Metadata
     -------------------------------------- */

  const metadataEl =
    document.querySelector(".metadata");

  if (metadataEl) {
    metadataEl.replaceChildren();

    const ratingSpan =
      document.createElement("span");

    ratingSpan.textContent =
      `⭐ ${data.rating || "-"}`;

    metadataEl.appendChild(
      ratingSpan
    );


    if (Array.isArray(data.metadata)) {
      data.metadata.forEach((m) => {
        const dot =
          document.createElement("span");

        dot.textContent = " • ";

        const metaSpan =
          document.createElement("span");

        metaSpan.textContent =
          String(m);

        metadataEl.appendChild(dot);
        metadataEl.appendChild(metaSpan);
      });
    }
  }


  /* --------------------------------------
     Skuespillere / skaper
     -------------------------------------- */

  const castInfoEl =
    document.querySelector(".cast-info");

  if (castInfoEl) {
    castInfoEl.replaceChildren();

    const castLabel =
      type === "film"
        ? "Regissør"
        : "Skaper";


    const pCast =
      document.createElement("p");

    pCast.textContent =
      `Medvirkende: ${
        data.skuespillere || "Ukjent"
      }`;

    castInfoEl.appendChild(
      pCast
    );


    const pCreator =
      document.createElement("p");

    pCreator.textContent =
      `${castLabel}: ${
        data.skapere ||
        data.regissor ||
        "Ukjent"
      }`;

    castInfoEl.appendChild(
      pCreator
    );


    if (
      data.lisens &&
      data.kilde &&
      erTryggUrl(data.kilde)
    ) {
      const pLicence =
        document.createElement("p");

      pLicence.textContent =
        "Lisens: ";


      const aLicence =
        document.createElement("a");

      aLicence.href =
        data.kilde;

      aLicence.target =
        "_blank";

      aLicence.rel =
        "noopener noreferrer";

      aLicence.textContent =
        data.lisens;


      pLicence.appendChild(
        aLicence
      );

      castInfoEl.appendChild(
        pLicence
      );
    }
  }


  /* --------------------------------------
     Knapper
     -------------------------------------- */

  if (watchBtn) {
    watchBtn.disabled =
      erUtilgjengelig;

    watchBtn.classList.toggle(
      "locked",
      erUtilgjengelig
    );

    watchBtn.removeEventListener(
      "click",
      handterWatchClick
    );

    watchBtn.addEventListener(
      "click",
      handterWatchClick
    );
  }


  if (addToListBtn) {
    addToListBtn.removeEventListener(
      "click",
      handterListClick
    );

    addToListBtn.addEventListener(
      "click",
      handterListClick
    );
  }


  initTrailer();


  /* --------------------------------------
     Tilgjengelighet
     -------------------------------------- */

  const availabilityEl =
    document.getElementById(
      "availabilityInfo"
    );

  if (availabilityEl) {
    availabilityEl.textContent = "";

    if (erUpublisert) {
      const pubDato =
        new Date(
          data.publishDate
        ).toLocaleDateString(
          "no-NO",
          {
            year: "numeric",
            month: "short",
            day: "numeric"
          }
        );

      availabilityEl.textContent =
        `Kommer den ${pubDato}`;

    } else if (data.expireDate) {
      const expire =
        new Date(data.expireDate);

      const diff =
        expire - nå;

      if (
        diff >
        365 *
        24 *
        60 *
        60 *
        1000
      ) {
        availabilityEl.textContent =
          "Tilgjengelig lenger enn ett år";

      } else if (diff > 0) {
        const datoFormatert =
          expire.toLocaleDateString(
            "no-NO",
            {
              year: "numeric",
              month: "short",
              day: "numeric"
            }
          );

        availabilityEl.textContent =
          `Tilgjengelig til: ${datoFormatert}`;
      }
    }
  }


  /* --------------------------------------
     Profilbilde
     -------------------------------------- */

  let lagretBilde = null;

  try {
    lagretBilde =
      localStorage.getItem(
        "profilbilde"
      );
  } catch (e) {}


  const menyProfilbilde =
    document.getElementById(
      "menyProfilbilde"
    );

  if (
    lagretBilde &&
    menyProfilbilde &&
    erTryggUrl(lagretBilde)
  ) {
    menyProfilbilde.src =
      lagretBilde;
  }


  /* --------------------------------------
     Profilcache
     -------------------------------------- */

  let cachedProfiles = null;

  try {
    cachedProfiles =
      localStorage.getItem(
        "watch_nordic_profiles_cache"
      );
  } catch (e) {}


  if (cachedProfiles) {
    try {
      heleProfilArrayet =
        JSON.parse(
          cachedProfiles
        );

      synkroniserLokalData();

    } catch (e) {
      console.error(
        "Feil ved lesing av profil-cache:",
        e
      );

      oppdaterWatchKnapp();
      oppdaterListeKnapp();
      byggAnbefalingerEllerEpisoder();
    }

  } else {
    oppdaterWatchKnapp();
    oppdaterListeKnapp();
    byggAnbefalingerEllerEpisoder();
  }


  document.body.classList.add(
    "loaded"
  );
}


/* ==========================================
   9. BAKGRUNNSBILDE
   ========================================== */

function oppdaterBakgrunnsBilde() {
  if (!bgImg || !data) return;

  const heroEl =
    document.querySelector(".hero");

  const mobil =
    erMobilEllerNettbrett();

  const bildeUrl =
    (
      mobil &&
      data.bakgrunnMobil
    )
      ? data.bakgrunnMobil
      : (
          data.bakgrunn || ""
        );


  if (heroEl) {
    heroEl.style.backgroundColor =
      "#050F11";
  }


  if (erTryggUrl(bildeUrl)) {
    bgImg.src =
      bildeUrl;

    bgImg.style.opacity =
      "0";


    bgImg.onload = () => {
      bgImg.style.opacity =
        "1";

      if (heroEl) {
        heroEl.style.backgroundColor =
          "transparent";
      }
    };


    bgImg.onerror = () => {
      bgImg.style.opacity =
        "0";
    };

  } else {
    bgImg.removeAttribute("src");

    bgImg.style.opacity =
      "0";
  }
}


/* ==========================================
   10. WATCH-KNAPP
   ========================================== */

function oppdaterWatchKnapp() {
  if (!watchBtn) return;

  let icon =
    watchBtn.querySelector("i");

  let text =
    watchBtn.querySelector("span");


  if (!icon) {
    icon =
      document.createElement("i");

    watchBtn.prepend(icon);
  }


  if (!text) {
    text =
      document.createElement("span");

    watchBtn.appendChild(text);
  }


  watchBtn.classList.remove(
    "paabegynt"
  );


  if (erUtgått) {
    icon.className =
      "fas fa-ban";

    text.textContent =
      " Utgått";

    return;
  }


  if (erUpublisert) {
    icon.className =
      "fas fa-lock";

    text.textContent =
      " Kommer snart";

    return;
  }


  if (status === "påbegynt") {
    watchBtn.classList.add(
      "paabegynt"
    );

    icon.className =
      "fas fa-play";

    text.textContent =
      " Gjenoppta";

  } else if (status === "ferdig") {
    icon.className =
      "fas fa-check";

    text.textContent =
      type === "film"
        ? " Sett ferdig"
        : " Ferdig";

  } else {
    icon.className =
      "fas fa-play";

    text.textContent =
      type === "film"
        ? " Se nå"
        : " Se episode";
  }
}


/* ==========================================
   11. MIN LISTE
   ========================================== */

function oppdaterListeKnapp() {
  if (!addToListBtn) return;

  let icon =
    addToListBtn.querySelector("i");

  let text =
    addToListBtn.querySelector("span");


  if (!icon) {
    icon =
      document.createElement("i");

    addToListBtn.prepend(icon);
  }


  if (!text) {
    text =
      document.createElement("span");

    addToListBtn.appendChild(text);
  }


  const key =
    `${type}:${navn}`;


  if (minListe.includes(key)) {
    icon.className =
      "fas fa-check";

    text.textContent =
      " Lagt til i Min liste";

  } else {
    icon.className =
      "fas fa-plus";

    text.textContent =
      " Legg til i Min liste";
  }
}


/* ==========================================
   12. ALDERSGRENSE
   ========================================== */

function sjekkAldersgrense(profilData) {
  if (
    !profilData ||
    !profilData.aldersgrense ||
    !data
  ) {
    return true;
  }


  const innholdAldersgrense =
    Array.isArray(data.metadata)
      ? data.metadata.find((m) =>
          String(m)
            .toLowerCase()
            .includes("år")
        )
      : null;


  if (!innholdAldersgrense) {
    return true;
  }


  const grensTallInnhold =
    parseInt(
      String(
        innholdAldersgrense
      ),
      10
    ) || 0;


  const grensTallProfil =
    parseInt(
      String(
        profilData.aldersgrense
      ),
      10
    ) || 99;


  return (
    grensTallProfil >=
    grensTallInnhold
  );
}


/* ==========================================
   13. SYNKRONISERING
   ========================================== */

function synkroniserLokalData() {
  const profilData =
    heleProfilArrayet[
      aktivProfilIndex
    ] ||
    heleProfilArrayet.find(
      p => p.navn === aktivProfil
    );


  if (!profilData) {
    status = "ikke-påbegynt";
    minListe = [];

    oppdaterWatchKnapp();
    oppdaterListeKnapp();

    return;
  }


  status =
    (
      profilData.historikk &&
      profilData.historikk[navn]
    )
      ? profilData.historikk[navn]
      : "ikke-påbegynt";


  minListe =
    Array.isArray(
      profilData.minListe
    )
      ? profilData.minListe
      : [];


  if (
    !sjekkAldersgrense(
      profilData
    )
  ) {
    if (watchBtn) {
      watchBtn.classList.add(
        "locked"
      );

      watchBtn.disabled = true;

      watchBtn.title =
        "Denne profilen har ikke tilgang på grunn av aldersgrense.";
    }
  }


  oppdaterWatchKnapp();
  oppdaterListeKnapp();

  byggAnbefalingerEllerEpisoder();
}


/* ==========================================
   14. LAGRE PROFILDATA
   ========================================== */

async function lagreProfilDataTilSkyen() {
  if (
    !currentUser ||
    !erProfilLastetFraSkyen
  ) {
    return;
  }


  let indeks =
    aktivProfilIndex;


  if (!heleProfilArrayet[indeks]) {
    indeks =
      heleProfilArrayet.findIndex(
        p => p.navn === aktivProfil
      );
  }


  if (indeks === -1) {
    return;
  }


  if (
    !heleProfilArrayet[indeks].historikk
  ) {
    heleProfilArrayet[
      indeks
    ].historikk = {};
  }


  heleProfilArrayet[
    indeks
  ].historikk[navn] = status;


  heleProfilArrayet[
    indeks
  ].minListe = minListe;


  tryggLagring(
    "watch_nordic_profiles_cache",
    JSON.stringify(
      heleProfilArrayet
    )
  );


  try {
    const userDocRef =
      doc(
        db,
        "users",
        currentUser.uid
      );

    await setDoc(
      userDocRef,
      {
        profiler:
          heleProfilArrayet
      },
      {
        merge: true
      }
    );

  } catch (err) {
    console.error(
      "Feil ved bakgrunnslagring:",
      err
    );
  }
}


/* ==========================================
   15. LOGIN
   ========================================== */

onAuthStateChanged(
  auth,
  async (user) => {
    if (user) {
      currentUser = user;

      try {
        const userDocRef =
          doc(
            db,
            "users",
            user.uid
          );

        const docSnap =
          await getDoc(
            userDocRef
          );


        if (docSnap.exists()) {
          heleProfilArrayet =
            docSnap.data().profiler ||
            [];

          tryggLagring(
            "watch_nordic_profiles_cache",
            JSON.stringify(
              heleProfilArrayet
            )
          );

          erProfilLastetFraSkyen =
            true;

          synkroniserLokalData();
        }

      } catch (err) {
        console.error(
          "Feil ved henting av brukerdata:",
          err
        );
      }

    } else {
      currentUser = null;
      erProfilLastetFraSkyen = false;

      try {
        localStorage.removeItem(
          "watch_nordic_profiles_cache"
        );
      } catch (e) {}

      sessionStorage.clear();
    }
  }
);


/* ==========================================
   16. WATCH
   ========================================== */

async function handterWatchClick() {
  if (
    erUpublisert ||
    erUtgått ||
    !watchBtn ||
    watchBtn.disabled
  ) {
    return;
  }


  status = "påbegynt";

  oppdaterWatchKnapp();

  await lagreProfilDataTilSkyen();


  if (type === "film") {
    if (
      !data.watchUrl ||
      !erTryggUrl(data.watchUrl)
    ) {
      alert(
        "Kunne ikke starte avspilling: Ugyldig kilde-URL."
      );

      return;
    }


    spaNaviger(
      "avspiller",
      {
        kilde:
          data.watchUrl,

        navn:
          navn
      }
    );


    return;
  }


  if (
    type === "serie" &&
    data.sesonger
  ) {
    const sisteEpKey =
      `${navn}-siste-episode`;

    let sisteEp = null;


    try {
      sisteEp =
        JSON.parse(
          localStorage.getItem(
            sisteEpKey
          )
        );
    } catch (e) {}


    let sesongNr;
    let epNr;


    if (
      sisteEp &&
      data.sesonger[
        sisteEp.sesong
      ]?.episoder?.[
        sisteEp.episode
      ]
    ) {
      sesongNr =
        sisteEp.sesong;

      epNr =
        sisteEp.episode;

    } else {
      sesongNr =
        Object.keys(
          data.sesonger
        )[0];

      epNr =
        Object.keys(
          data.sesonger[
            sesongNr
          ].episoder
        )[0];
    }


    spaNaviger(
      "avspiller",
      {
        navn,
        sesong: sesongNr,
        episode: epNr
      }
    );
  }
}


/* ==========================================
   17. MIN LISTE
   ========================================== */

async function handterListClick() {
  if (!currentUser) {
    return;
  }


  const key =
    `${type}:${navn}`;


  if (!minListe.includes(key)) {
    minListe.push(key);
  } else {
    minListe =
      minListe.filter(
        f => f !== key
      );
  }


  oppdaterListeKnapp();

  await lagreProfilDataTilSkyen();
}


/* ==========================================
   18. SESONGER / EPISODER
   ========================================== */

function visSesong(sesongNr) {
  const seasonButtons =
    document.getElementById(
      "seasonButtons"
    );

  const episodeGallery =
    document.getElementById(
      "episodeGallery"
    );


  document
    .querySelectorAll(
      ".season-btn"
    )
    .forEach(
      b =>
        b.classList.remove(
          "active"
        )
    );


  if (seasonButtons) {
    [
      ...seasonButtons.children
    ]
      .find(
        b =>
          b.textContent ===
          `Sesong ${sesongNr}`
      )
      ?.classList.add(
        "active"
      );
  }


  if (!episodeGallery) {
    return;
  }


  episodeGallery.innerHTML = "";


  const episoder =
    data.sesonger[
      sesongNr
    ]?.episoder || {};


  const fragment =
    document.createDocumentFragment();


  Object.keys(
    episoder
  ).forEach(
    epNr => {
      const ep =
        episoder[epNr];


      const erLåst =
        ep.publishDate &&
        new Date(
          ep.publishDate
        ) > nå;


      const epCard =
        document.createElement(
          "div"
        );

      epCard.className =
        `episode-card ${
          erLåst
            ? "locked"
            : ""
        }`;


      const thumbDiv =
        document.createElement(
          "div"
        );

      thumbDiv.className =
        "episode-thumb";


      const img =
        document.createElement(
          "img"
        );

      if (
        erTryggUrl(
          ep.thumbnail
        )
      ) {
        img.src =
          ep.thumbnail;
      }

      img.alt =
        ep.tittel || "";


      thumbDiv.appendChild(
        img
      );


      if (erLåst) {
        const lockOverlay =
          document.createElement(
            "div"
          );

        lockOverlay.className =
          "lock-overlay";


        const lockIcon =
          document.createElement(
            "i"
          );

        lockIcon.className =
          "fas fa-clock";


        const lockText =
          document.createElement(
            "span"
          );

        lockText.textContent =
          new Date(
            ep.publishDate
          ).toLocaleDateString(
            "no-NO",
            {
              day: "numeric",
              month: "short"
            }
          );


        lockOverlay.appendChild(
          lockIcon
        );

        lockOverlay.appendChild(
          lockText
        );

        thumbDiv.appendChild(
          lockOverlay
        );

      } else {
        const playOverlay =
          document.createElement(
            "div"
          );

        playOverlay.className =
          "play-overlay";


        const playIcon =
          document.createElement(
            "i"
          );

        playIcon.className =
          "fas fa-play";


        playOverlay.appendChild(
          playIcon
        );

        thumbDiv.appendChild(
          playOverlay
        );
      }


      const infoDiv =
        document.createElement(
          "div"
        );

      infoDiv.className =
        "episode-info";


      const titleDiv =
        document.createElement(
          "div"
        );

      titleDiv.className =
        "episode-title";

      titleDiv.textContent =
        `Episode ${epNr}: ${
          ep.tittel || ""
        }`;


      const metaDiv =
        document.createElement(
          "div"
        );

      metaDiv.className =
        "episode-meta";

      metaDiv.textContent =
        ep.varighet || "";


      const descDiv =
        document.createElement(
          "div"
        );

      descDiv.className =
        "episode-desc";

      descDiv.textContent =
        ep.beskrivelse || "";


      infoDiv.appendChild(
        titleDiv
      );

      infoDiv.appendChild(
        metaDiv
      );

      infoDiv.appendChild(
        descDiv
      );


      epCard.appendChild(
        thumbDiv
      );

      epCard.appendChild(
        infoDiv
      );


      if (!erLåst) {
        epCard.addEventListener(
          "click",
          () => {
            tryggLagring(
              `${navn}-siste-episode`,
              JSON.stringify({
                sesong:
                  sesongNr,
                episode:
                  epNr
              })
            );


            spaNaviger(
              "avspiller",
              {
                navn,
                sesong:
                  sesongNr,
                episode:
                  epNr
              }
            );
          }
        );
      }


      fragment.appendChild(
        epCard
      );
    }
  );


  episodeGallery.appendChild(
    fragment
  );
}


/* ==========================================
   19. ANBEFALINGER
   ========================================== */

async function byggAnbefalingerEllerEpisoder() {
  const recommendationsDiv =
    document.querySelector(
      ".recommendations"
    );


  if (
    !recommendationsDiv ||
    !data
  ) {
    return;
  }


  if (
    type === "serie" &&
    data.sesonger
  ) {
    recommendationsDiv.replaceChildren();


    const seasonButtons =
      document.createElement(
        "div"
      );

    seasonButtons.className =
      "season-buttons";

    seasonButtons.id =
      "seasonButtons";


    const episodeGallery =
      document.createElement(
        "div"
      );

    episodeGallery.className =
      "episode-gallery";

    episodeGallery.id =
      "episodeGallery";


    recommendationsDiv.appendChild(
      seasonButtons
    );

    recommendationsDiv.appendChild(
      episodeGallery
    );


    const sesongNumre =
      Object.keys(
        data.sesonger
      );


    sesongNumre.forEach(
      (s, idx) => {
        const btn =
          document.createElement(
            "button"
          );

        btn.textContent =
          `Sesong ${s}`;

        btn.className =
          "season-btn";


        if (idx === 0) {
          btn.classList.add(
            "active"
          );
        }


        btn.addEventListener(
          "click",
          () => visSesong(s)
        );


        seasonButtons.appendChild(
          btn
        );
      }
    );


    if (sesongNumre.length) {
      visSesong(
        sesongNumre[0]
      );
    }


    return;
  }


  const gallery =
    document.getElementById(
      "recommendationGallery"
    );


  if (!gallery) {
    return;
  }


  gallery.innerHTML = "";


  try {
    let filmer = [];


    const cache =
      localStorage.getItem(
        "anbefalinger_cache"
      );


    if (cache) {
      try {
        filmer =
          JSON.parse(cache);
      } catch (e) {
        localStorage.removeItem(
          "anbefalinger_cache"
        );
      }
    }


    if (!filmer.length) {
      const q =
        query(
          collection(
            db,
            "filmer"
          ),
          limit(10)
        );


      const filmerSnap =
        await getDocs(q);


      filmerSnap.forEach(
        d =>
          filmer.push({
            id: d.id,
            ...d.data()
          })
      );


      tryggLagring(
        "anbefalinger_cache",
        JSON.stringify(
          filmer
        )
      );
    }


    const fragment =
      document.createDocumentFragment();


    let antallVist = 0;


    filmer.forEach(
      item => {
        const nøkkel =
          item.id;


        const erGjeldende =
          nøkkel === navn;


        const erPublisert =
          !item.publishDate ||
          new Date(
            item.publishDate
          ) <= nå;


        if (
          !erGjeldende &&
          erPublisert &&
          antallVist < 6
        ) {
          const card =
            document.createElement(
              "div"
            );

          card.className =
            "movie-card";


          const bildeUrl =
            erTryggUrl(
              item.poster
            )
              ? item.poster
              : erTryggUrl(
                  item.bakgrunn
                )
                  ? item.bakgrunn
                  : "";


          const img =
            document.createElement(
              "img"
            );

          if (bildeUrl) {
            img.src =
              bildeUrl;
          }

          img.alt =
            item.tittel || "";


          const overlay =
            document.createElement(
              "div"
            );

          overlay.className =
            "movie-overlay";


          const title =
            document.createElement(
              "div"
            );

          title.className =
            "movie-title";

          title.textContent =
            item.tittel || "";


          overlay.appendChild(
            title
          );

          card.appendChild(
            img
          );

          card.appendChild(
            overlay
          );


          /*
             VIKTIG:

             Når brukeren klikker på filmen,
             bruker vi:

             #film-ID

             Eksempel:

             #film-singularity
          */

          card.addEventListener(
            "click",
            () => {
              window.location.hash =
                `#film-${encodeURIComponent(
                  nøkkel
                )}`;
            }
          );


          fragment.appendChild(
            card
          );

          antallVist++;
        }
      }
    );


    gallery.appendChild(
      fragment
    );

  } catch (e) {
    console.error(
      "Feil ved henting av anbefalinger:",
      e
    );
  }
}


/* ==========================================
   20. TRAILER
   ========================================== */

function initTrailer() {
  if (!data) return;


  let trailerVideo =
    document.getElementById(
      "trailerVideo"
    );

  const videoControls =
    document.getElementById(
      "videoControls"
    );

  const pauseBtn =
    document.getElementById(
      "pauseBtn"
    );

  const soundBtn =
    document.getElementById(
      "soundBtn"
    );


  const mobil =
    erMobilEllerNettbrett();


  if (
    data.trailer &&
    data.trailer.trim() !== "" &&
    erTryggUrl(
      data.trailer
    ) &&
    trailerVideo &&
    !mobil
  ) {

    const nyVideo =
      trailerVideo.cloneNode(
        true
      );


    trailerVideo.parentNode.replaceChild(
      nyVideo,
      trailerVideo
    );


    trailerVideo =
      nyVideo;


    trailerVideo.src =
      data.trailer;

    trailerVideo.preload =
      "metadata";

    trailerVideo.muted =
      true;

    trailerVideo.playsInline =
      true;


    trailerVideo.style.display =
      "block";

    trailerVideo.style.opacity =
      "0";


    trailerVideo.addEventListener(
      "error",
      () => {
        trailerVideo.style.display =
          "none";

        if (videoControls) {
          videoControls.style.display =
            "none";
        }

        if (bgImg) {
          bgImg.style.opacity =
            "1";
        }
      }
    );


    setTimeout(() => {
      if (bgImg) {
        bgImg.style.opacity =
          "0";
      }

      trailerVideo.style.opacity =
        "1";


      trailerVideo
        .play()
        .catch(() => {
          if (bgImg) {
            bgImg.style.opacity =
              "1";
          }

          trailerVideo.style.opacity =
            "0";
        });


      if (videoControls) {
        videoControls.style.opacity =
          "1";
      }
    }, 1000);


    trailerVideo.addEventListener(
      "ended",
      () => {
        trailerVideo.style.opacity =
          "0";

        if (bgImg) {
          bgImg.style.opacity =
            "1";
        }

        if (videoControls) {
          videoControls.style.opacity =
            "0";
        }
      }
    );


    if (pauseBtn) {
      pauseBtn.onclick =
        () => {
          if (
            trailerVideo.paused
          ) {
            trailerVideo
              .play();

            pauseBtn.innerHTML =
              '<i class="fas fa-pause"></i>';
          } else {
            trailerVideo.pause();

            pauseBtn.innerHTML =
              '<i class="fas fa-play"></i>';
          }
        };
    }


    if (soundBtn) {
      soundBtn.onclick =
        () => {
          trailerVideo.muted =
            !trailerVideo.muted;

          soundBtn.innerHTML =
            trailerVideo.muted
              ? '<i class="fas fa-volume-mute"></i>'
              : '<i class="fas fa-volume-up"></i>';
        };
    }

  } else {
    if (trailerVideo) {
      trailerVideo.pause();

      trailerVideo.removeAttribute(
        "src"
      );

      trailerVideo.load();

      trailerVideo.style.display =
        "none";
    }


    if (videoControls) {
      videoControls.style.display =
        "none";
    }


    if (bgImg) {
      bgImg.style.opacity =
        "1";
    }
  }
}


/* ==========================================
   21. RESIZE
   ========================================== */

window.addEventListener(
  "resize",
  () => {
    clearTimeout(
      resizeTimeout
    );

    resizeTimeout =
      setTimeout(
        oppdaterBakgrunnsBilde,
        150
      );
  }
);


/* ==========================================
   22. SPA → FILMINFO
   ========================================== */

/*
   Denne funksjonen kan brukes av resten
   av nettsiden.

   Eksempel:

   lastFilminfoMedId("singularity");

   Resultat:

   #film-singularity
*/

window.lastFilminfoMedId =
  function (medieId) {
    if (!medieId) return;

    window.location.hash =
      `#film-${encodeURIComponent(
        medieId
      )}`;
  };


/* ==========================================
   23. HASHCHANGE
   ========================================== */

window.addEventListener(
  "hashchange",
  () => {
    const nyId =
      hentMediaIdFraUrl();


    if (
      nyId &&
      nyId !== navn
    ) {
      init(nyId);
    }
  }
);


/* ==========================================
   24. START
   ========================================== */

if (
  document.readyState ===
  "loading"
) {
  document.addEventListener(
    "DOMContentLoaded",
    () => init(),
    { once: true }
  );
} else {
  init();
}

