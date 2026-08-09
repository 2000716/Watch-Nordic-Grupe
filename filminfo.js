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

/* =========================================================
   1. GLOBALE TILSTANDER
   ========================================================= */

let currentUser = null;

let aktivProfil =
  localStorage.getItem("aktivProfil") || "Hovedprofil";

let aktivProfilIndex =
  parseInt(
    localStorage.getItem("aktivProfilIndex") || "0",
    10
  );

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

let watchBtn = null;
let addToListBtn = null;
let bgImg = null;

let resizeTimeout = null;


/* =========================================================
   2. HJELPEFUNKSJONER
   ========================================================= */

function spaNaviger(sideId, params = {}) {
  try {
    if (typeof window.byttSide === "function") {
      window.byttSide(sideId, params);
      return;
    }

    const queryString =
      new URLSearchParams(params).toString();

    window.location.hash =
      `#${sideId}${queryString ? "?" + queryString : ""}`;

  } catch (error) {
    console.error("Feil ved SPA-navigering:", error);
  }
}


/* =========================================================
   3. URL / ROUTING
   ========================================================= */

function hentMediaIdFraUrl() {
  const hash =
    window.location.hash || "";

  if (!hash) {
    return "";
  }

  let renHash =
    hash.replace(/^#/, "").trim();

  if (!renHash) {
    return "";
  }


  /*
    #filminfo?navn=singularity
    #filminfo?id=singularity
  */

  if (renHash.includes("?")) {
    const [hashPath, queryString] =
      renHash.split("?");

    const params =
      new URLSearchParams(queryString);

    const id =
      params.get("navn") ||
      params.get("id");

    if (id) {
      return decodeURIComponent(id).trim();
    }

    const pathId =
      hentIdFraHashPath(hashPath);

    if (pathId) {
      return pathId;
    }
  }


  /*
    #film/singularity
    #serie/breaking-bad
  */

  if (renHash.includes("/")) {
    const deler =
      renHash.split("/");

    if (
      deler.length >= 2 &&
      deler[1]
    ) {
      return decodeURIComponent(
        deler[1]
      ).trim();
    }
  }


  /*
    #film-singularity
    #serie-breaking-bad
  */

  if (
    renHash.startsWith("film-")
  ) {
    return decodeURIComponent(
      renHash.substring(5)
    ).trim();
  }

  if (
    renHash.startsWith("serie-")
  ) {
    return decodeURIComponent(
      renHash.substring(6)
    ).trim();
  }


  /*
    Hvis hash bare er ID-en.
  */

  return decodeURIComponent(
    renHash
  ).trim();
}


function hentIdFraHashPath(hashPath) {
  if (!hashPath) {
    return "";
  }

  let renHash =
    hashPath
      .replace(/^#/, "")
      .trim();

  if (!renHash) {
    return "";
  }


  if (
    renHash.startsWith("film-")
  ) {
    return decodeURIComponent(
      renHash.substring(5)
    ).trim();
  }


  if (
    renHash.startsWith("serie-")
  ) {
    return decodeURIComponent(
      renHash.substring(6)
    ).trim();
  }


  if (
    renHash.includes("/")
  ) {
    const deler =
      renHash.split("/");

    if (
      deler.length >= 2 &&
      deler[1]
    ) {
      return decodeURIComponent(
        deler[1]
      ).trim();
    }
  }


  return decodeURIComponent(
    renHash
  ).trim();
}


/* =========================================================
   4. URL-SIKKERHET
   ========================================================= */

function erTryggUrl(url) {
  if (
    !url ||
    typeof url !== "string"
  ) {
    return false;
  }

  try {
    const parsed =
      new URL(
        url,
        window.location.origin
      );

    return (
      parsed.protocol === "http:" ||
      parsed.protocol === "https:"
    );

  } catch (error) {
    return false;
  }
}


/* =========================================================
   5. LOCAL STORAGE
   ========================================================= */

function tryggLagring(
  key,
  value
) {
  try {
    localStorage.setItem(
      key,
      value
    );
  } catch (error) {
    console.warn(
      "Kunne ikke lagre til localStorage:",
      error
    );
  }
}


/* =========================================================
   6. MOBIL / NETTBRETT
   ========================================================= */

function erMobilEllerNettbrett() {
  const touchEnhet =
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0;

  const breddeSjekk =
    window.innerWidth <= 1024;

  const isIPad =
    /Macintosh/i.test(
      navigator.userAgent
    ) &&
    navigator.maxTouchPoints > 1;

  return (
    (touchEnhet && breddeSjekk) ||
    isIPad
  );
}


/* =========================================================
   7. HENT FILM / SERIE FRA FIREBASE
   ========================================================= */

async function lastDataFraFirebase(
  eksplisittId = null
) {
  try {

    const forespurtNavn =
      eksplisittId
        ? String(
            eksplisittId
          ).trim()
        : hentMediaIdFraUrl();


    console.log(
      "Filminfo-ID:",
      forespurtNavn
    );


    if (!forespurtNavn) {

      console.error(
        "Ingen medie-ID funnet i URL."
      );

      return false;
    }


    navn =
      forespurtNavn;

    data = null;
    type = "film";


    /* -----------------------------------------
       CACHE
       ----------------------------------------- */

    const filmCacheKey =
      `media_cache_film_${navn}`;

    const serieCacheKey =
      `media_cache_serie_${navn}`;


    let cachedData = null;

    try {
      const filmCache =
        localStorage.getItem(
          filmCacheKey
        );

      const serieCache =
        localStorage.getItem(
          serieCacheKey
        );


      if (filmCache) {
        cachedData =
          JSON.parse(
            filmCache
          );
      }

      if (
        !cachedData &&
        serieCache
      ) {
        cachedData =
          JSON.parse(
            serieCache
          );
      }

    } catch (error) {
      console.warn(
        "Kunne ikke lese media-cache:",
        error
      );
    }


    if (
      cachedData &&
      cachedData.data
    ) {
      data =
        cachedData.data;

      type =
        cachedData.type ||
        "film";

      console.log(
        "Media hentet fra cache:",
        navn
      );
    }


    /* -----------------------------------------
       FINN FILM
       ----------------------------------------- */

    if (!data) {

      console.log(
        "Søker etter film:",
        navn
      );

      const filmRef =
        doc(
          db,
          "filmer",
          navn
        );

      const filmSnap =
        await getDoc(
          filmRef
        );


      if (
        filmSnap.exists()
      ) {

        data =
          filmSnap.data();

        type =
          "film";

        console.log(
          "Film funnet:",
          navn
        );
      }
    }


    /* -----------------------------------------
       FINN SERIE
       ----------------------------------------- */

    if (!data) {

      console.log(
        "Søker etter serie:",
        navn
      );

      const serieRef =
        doc(
          db,
          "serier",
          navn
        );

      const serieSnap =
        await getDoc(
          serieRef
        );


      if (
        serieSnap.exists()
      ) {

        data =
          serieSnap.data();

        type =
          "serie";

        console.log(
          "Serie funnet:",
          navn
        );
      }
    }


    /* -----------------------------------------
       IKKE FUNNET
       ----------------------------------------- */

    if (!data) {

      console.error(
        "Fant ikke film/serie i Firestore:",
        navn
      );

      visFilinfoFeil(
        `Fant ikke "${navn}" i Firestore.`
      );

      return false;
    }


    /* -----------------------------------------
       CACHE DATA
       ----------------------------------------- */

    tryggLagring(
      `media_cache_${type}_${navn}`,
      JSON.stringify({
        data: data,
        type: type
      })
    );


    /* -----------------------------------------
       DATOER
       ----------------------------------------- */

    nå =
      new Date();


    erUpublisert =
      !!data.publishDate &&
      new Date(
        data.publishDate
      ) > nå;


    erUtgått =
      !!data.expireDate &&
      nå >
      new Date(
        data.expireDate
      );


    erUtilgjengelig =
      erUpublisert ||
      erUtgått;


    return true;

  } catch (error) {

    console.error(
      "Feil ved henting av mediedata:",
      error
    );

    visFilinfoFeil(
      "Kunne ikke laste filminformasjonen."
    );

    return false;
  }
}


/* =========================================================
   8. FEILVISNING
   ========================================================= */

function visFilinfoFeil(
  melding
) {
  const hero =
    document.querySelector(
      ".hero"
    );

  if (!hero) {
    return;
  }


  const eksisterende =
    document.getElementById(
      "filminfoError"
    );

  if (eksisterende) {
    eksisterende.remove();
  }


  const errorBox =
    document.createElement(
      "div"
    );

  errorBox.id =
    "filminfoError";


  errorBox.style.cssText = `
    position: relative;
    z-index: 20;
    width: 100%;
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    text-align: center;
    color: white;
    background: #091B1E;
  `;


  const title =
    document.createElement(
      "h2"
    );

  title.textContent =
    "Filmen ble ikke funnet";


  const text =
    document.createElement(
      "p"
    );

  text.textContent =
    melding;


  text.style.marginTop =
    "10px";


  const button =
    document.createElement(
      "button"
    );

  button.textContent =
    "Tilbake til forsiden";


  button.style.cssText = `
    margin-top: 20px;
    padding: 12px 22px;
    border: none;
    border-radius: 8px;
    background: white;
    color: black;
    cursor: pointer;
    font-weight: 600;
  `;


  button.addEventListener(
    "click",
    () => {
      spaNaviger(
        "hjem"
      );
    }
  );


  errorBox.appendChild(
    title
  );

  errorBox.appendChild(
    text
  );

  errorBox.appendChild(
    button
  );


  hero.replaceChildren(
    errorBox
  );
}


/* =========================================================
   9. HOVEDFUNKSJON
   ========================================================= */

async function init(
  eksplisittId = null
) {

  console.log(
    "=============================="
  );

  console.log(
    "FILMINFO INIT STARTER"
  );

  console.log(
    "Hash:",
    window.location.hash
  );

  console.log(
    "ID:",
    eksplisittId ||
    hentMediaIdFraUrl()
  );

  console.log(
    "=============================="
  );


  const gammelNavn =
    navn;


  data = null;


  const suksess =
    await lastDataFraFirebase(
      eksplisittId
    );


  console.log(
    "Firebase-resultat:",
    suksess
  );

  console.log(
    "Data:",
    data
  );


  if (
    !suksess ||
    !data
  ) {
    return;
  }


  if (
    gammelNavn &&
    navn !== gammelNavn &&
    eksplisittId === null
  ) {
    return;
  }


  /* -----------------------------------------
     HTML-ELEMENTER
     ----------------------------------------- */

  watchBtn =
    document.getElementById(
      "watchBtn"
    );

  addToListBtn =
    document.getElementById(
      "addToListBtn"
    );

  bgImg =
    document.getElementById(
      "backgroundImage"
    );


  /* -----------------------------------------
     TITLE
     ----------------------------------------- */

  document.title =
    data.tittel
      ? `${data.tittel} - Watch Nordic`
      : "Watch Nordic";


  /* -----------------------------------------
     BAKGRUNN
     ----------------------------------------- */

  oppdaterBakgrunnsBilde();


  /* -----------------------------------------
     LOGO
     ----------------------------------------- */

  const fLogo =
    document.querySelector(
      ".film-logo"
    );

  const logoContainer =
    document.querySelector(
      ".logo-container"
    );


  if (fLogo) {

    if (
      data.logo &&
      typeof data.logo === "string" &&
      data.logo.trim() !== "" &&
      erTryggUrl(
        data.logo
      )
    ) {

      fLogo.src =
        data.logo;

      fLogo.style.display =
        "block";


      const gammelTextLogo =
        logoContainer?.querySelector(
          ".text-logo"
        );

      gammelTextLogo?.remove();

    } else {

      fLogo.removeAttribute(
        "src"
      );

      fLogo.style.display =
        "none";


      if (
        logoContainer &&
        !logoContainer.querySelector(
          ".text-logo"
        )
      ) {

        const titleEl =
          document.createElement(
            "div"
          );

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


  /* -----------------------------------------
     BESKRIVELSE
     ----------------------------------------- */

  const descEl =
    document.querySelector(
      ".description"
    );


  if (descEl) {

    const fullText =
      data.beskrivelse || "";


    const ordGrense =
      20;


    const ordArray =
      fullText.trim()
        ? fullText
            .trim()
            .split(/\s+/)
        : [];


    descEl.replaceChildren();


    if (
      ordArray.length >
      ordGrense
    ) {

      descEl.appendChild(
        document.createTextNode(
          ordArray
            .slice(
              0,
              ordGrense
            )
            .join(" ") +
          "... "
        )
      );


      const moreBtn =
        document.createElement(
          "button"
        );

      moreBtn.className =
        "more-btn";

      moreBtn.type =
        "button";

      moreBtn.textContent =
        "Mer";


      moreBtn.addEventListener(
        "click",
        () => {

          const overlay =
            document.createElement(
              "div"
            );

          overlay.className =
            "popup-overlay";


          const popupBox =
            document.createElement(
              "div"
            );

          popupBox.className =
            "popup-box";


          const closeBtn =
            document.createElement(
              "button"
            );

          closeBtn.className =
            "close-btn";

          closeBtn.type =
            "button";

          closeBtn.setAttribute(
            "aria-label",
            "Lukk beskrivelse"
          );

          closeBtn.textContent =
            "×";


          const textPara =
            document.createElement(
              "p"
            );

          textPara.textContent =
            fullText;


          popupBox.appendChild(
            closeBtn
          );

          popupBox.appendChild(
            textPara
          );

          overlay.appendChild(
            popupBox
          );

          document.body.appendChild(
            overlay
          );


          const lukkModal =
            () => {

              document.removeEventListener(
                "keydown",
                escLukk
              );

              overlay.remove();
            };


          const overlayKlikk =
            (event) => {

              if (
                event.target ===
                overlay
              ) {
                lukkModal();
              }
            };


          const escLukk =
            (event) => {

              if (
                event.key ===
                "Escape"
              ) {
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


      descEl.appendChild(
        moreBtn
      );

    } else {

      descEl.textContent =
        fullText;
    }
  }


  /* -----------------------------------------
     METADATA
     ----------------------------------------- */

  const metadataEl =
    document.querySelector(
      ".metadata"
    );


  if (metadataEl) {

    metadataEl.replaceChildren();


    const ratingSpan =
      document.createElement(
        "span"
      );

    ratingSpan.textContent =
      `⭐ ${data.rating ?? "-"}`;


    metadataEl.appendChild(
      ratingSpan
    );


    if (
      Array.isArray(
        data.metadata
      )
    ) {

      data.metadata.forEach(
        (m) => {

          const dot =
            document.createElement(
              "span"
            );

          dot.textContent =
            " • ";


          const metaSpan =
            document.createElement(
              "span"
            );

          metaSpan.textContent =
            String(m);


          metadataEl.appendChild(
            dot
          );

          metadataEl.appendChild(
            metaSpan
          );
        }
      );
    }
  }


  /* -----------------------------------------
     SKUESPILLERE / SKAPER
     ----------------------------------------- */

  const castInfoEl =
    document.querySelector(
      ".cast-info"
    );


  if (castInfoEl) {

    castInfoEl.replaceChildren();


    const castLabel =
      type === "film"
        ? "Regissør"
        : "Skaper";


    const pCast =
      document.createElement(
        "p"
      );


    pCast.textContent =
      `Medvirkende: ${
        data.skuespillere ||
        "Ukjent"
      }`;


    castInfoEl.appendChild(
      pCast
    );


    const pCreator =
      document.createElement(
        "p"
      );


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
      erTryggUrl(
        data.kilde
      )
    ) {

      const pLicence =
        document.createElement(
          "p"
        );


      pLicence.textContent =
        "Lisens: ";


      const aLicence =
        document.createElement(
          "a"
        );


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


  /* -----------------------------------------
     KNAPPER
     ----------------------------------------- */

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


  /* -----------------------------------------
     TRAILER
     ----------------------------------------- */

  initTrailer();


  /* -----------------------------------------
     TILGJENGELIGHET
     ----------------------------------------- */

  const availabilityEl =
    document.getElementById(
      "availabilityInfo"
    );


  if (availabilityEl) {

    availabilityEl.textContent =
      "";


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

    } else if (
      data.expireDate
    ) {

      const expire =
        new Date(
          data.expireDate
        );


      const diff =
        expire - nå;


      if (
        diff > 365 *
        24 *
        60 *
        60 *
        1000
      ) {

        availabilityEl.textContent =
          "Tilgjengelig lenger enn ett år";

      } else if (
        diff > 0
      ) {

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


  /* -----------------------------------------
     PROFILBILDE
     ----------------------------------------- */

  let lagretBilde =
    null;


  try {
    lagretBilde =
      localStorage.getItem(
        "profilbilde"
      );
  } catch (error) {}


  const menyProfilbilde =
    document.getElementById(
      "menyProfilbilde"
    );


  if (
    lagretBilde &&
    menyProfilbilde &&
    erTryggUrl(
      lagretBilde
    )
  ) {

    menyProfilbilde.src =
      lagretBilde;
  }


  /* -----------------------------------------
     PROFIL CACHE
     ----------------------------------------- */

  let cachedProfiles =
    null;


  try {
    cachedProfiles =
      localStorage.getItem(
        "watch_nordic_profiles_cache"
      );
  } catch (error) {}


  if (cachedProfiles) {

    try {

      heleProfilArrayet =
        JSON.parse(
          cachedProfiles
        );


      synkroniserLokalData();

    } catch (error) {

      console.error(
        "Feil ved lesing av profil-cache:",
        error
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


  console.log(
    "FILMINFO FERDIG LASTET:",
    data.tittel
  );
}


/* =========================================================
   10. BAKGRUNNSBILDE
   ========================================================= */

function oppdaterBakgrunnsBilde() {

  if (
    !bgImg ||
    !data
  ) {
    return;
  }


  const heroEl =
    document.querySelector(
      ".hero"
    );


  const mobil =
    erMobilEllerNettbrett();


  const bildeUrl =
    mobil &&
    data.bakgrunnMobil
      ? data.bakgrunnMobil
      : data.bakgrunn || "";


  if (heroEl) {

    heroEl.style.backgroundColor =
      "#050F11";
  }


  if (
    erTryggUrl(
      bildeUrl
    )
  ) {

    bgImg.src =
      bildeUrl;


    bgImg.style.opacity =
      "0";


    bgImg.onload =
      () => {

        bgImg.style.opacity =
          "1";


        if (heroEl) {

          heroEl.style.backgroundColor =
            "transparent";
        }
      };


    bgImg.onerror =
      () => {

        console.warn(
          "Kunne ikke laste bakgrunn:",
          bildeUrl
        );

        bgImg.style.opacity =
          "0";
      };

  } else {

    bgImg.removeAttribute(
      "src"
    );

    bgImg.style.opacity =
      "0";
  }
}


/* =========================================================
   11. WATCH-KNAPP
   ========================================================= */

function oppdaterWatchKnapp() {

  if (!watchBtn) {
    return;
  }


  let icon =
    watchBtn.querySelector(
      "i"
    );


  let text =
    watchBtn.querySelector(
      "span"
    );


  if (!icon) {

    icon =
      document.createElement(
        "i"
      );

    watchBtn.prepend(
      icon
    );
  }


  if (!text) {

    text =
      document.createElement(
        "span"
      );

    watchBtn.appendChild(
      text
    );
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


  if (
    status ===
    "påbegynt"
  ) {

    watchBtn.classList.add(
      "paabegynt"
    );


    icon.className =
      "fas fa-play";


    text.textContent =
      " Gjenoppta";


  } else if (
    status ===
    "ferdig"
  ) {

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


/* =========================================================
   12. MIN LISTE
   ========================================================= */

function oppdaterListeKnapp() {

  if (!addToListBtn) {
    return;
  }


  let icon =
    addToListBtn.querySelector(
      "i"
    );


  let text =
    addToListBtn.querySelector(
      "span"
    );


  if (!icon) {

    icon =
      document.createElement(
        "i"
      );

    addToListBtn.prepend(
      icon
    );
  }


  if (!text) {

    text =
      document.createElement(
        "span"
      );

    addToListBtn.appendChild(
      text
    );
  }


  const key =
    `${type}:${navn}`;


  if (
    minListe.includes(
      key
    )
  ) {

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


/* =========================================================
   13. ALDERSGRENSE
   ========================================================= */

function sjekkAldersgrense(
  profilData
) {

  if (
    !profilData ||
    !profilData.aldersgrense ||
    !data
  ) {
    return true;
  }


  const innholdAldersgrense =
    Array.isArray(
      data.metadata
    )
      ? data.metadata.find(
          (m) =>
            String(m)
              .toLowerCase()
              .includes("år")
        )
      : null;


  if (
    !innholdAldersgrense
  ) {
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


/* =========================================================
   14. SYNKRONISERING
   ========================================================= */

function synkroniserLokalData() {

  const profilData =
    heleProfilArrayet[
      aktivProfilIndex
    ] ||
    heleProfilArrayet.find(
      (p) =>
        p.navn ===
        aktivProfil
    );


  if (!profilData) {

    status =
      "ikke-påbegynt";

    minListe =
      [];


    oppdaterWatchKnapp();

    oppdaterListeKnapp();

    byggAnbefalingerEllerEpisoder();

    return;
  }


  status =
    profilData.historikk &&
    profilData.historikk[
      navn
    ]
      ? profilData.historikk[
          navn
        ]
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

      watchBtn.disabled =
        true;

      watchBtn.title =
        "Denne profilen har ikke tilgang på grunn av aldersgrense.";
    }
  }


  oppdaterWatchKnapp();

  oppdaterListeKnapp();

  byggAnbefalingerEllerEpisoder();
}


/* =========================================================
   15. LAGRE PROFILDATA
   ========================================================= */

async function lagreProfilDataTilSkyen() {

  if (
    !currentUser ||
    !erProfilLastetFraSkyen
  ) {
    return;
  }


  let indeks =
    aktivProfilIndex;


  if (
    !heleProfilArrayet[
      indeks
    ]
  ) {

    indeks =
      heleProfilArrayet.findIndex(
        (p) =>
          p.navn ===
          aktivProfil
      );
  }


  if (
    indeks === -1
  ) {
    return;
  }


  if (
    !heleProfilArrayet[
      indeks
    ].historikk
  ) {

    heleProfilArrayet[
      indeks
    ].historikk = {};
  }


  heleProfilArrayet[
    indeks
  ].historikk[
    navn
  ] =
    status;


  heleProfilArrayet[
    indeks
  ].minListe =
    minListe;


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

  } catch (error) {

    console.error(
      "Feil ved lagring av brukerdata:",
      error
    );
  }
}


/* =========================================================
   16. LOGIN
   ========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {

    if (user) {

      currentUser =
        user;


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


        if (
          docSnap.exists()
        ) {

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

      } catch (error) {

        console.error(
          "Feil ved henting av brukerdata:",
          error
        );
      }

    } else {

      currentUser =
        null;


      erProfilLastetFraSkyen =
        false;


      try {

        localStorage.removeItem(
          "watch_nordic_profiles_cache"
        );

      } catch (error) {}


      sessionStorage.clear();
    }
  }
);


/* =========================================================
   17. WATCH
   ========================================================= */

async function handterWatchClick() {

  if (
    erUpublisert ||
    erUtgått ||
    !watchBtn ||
    watchBtn.disabled
  ) {
    return;
  }


  status =
    "påbegynt";


  oppdaterWatchKnapp();


  await lagreProfilDataTilSkyen();


  if (
    type === "film"
  ) {

    if (
      !data.watchUrl ||
      !erTryggUrl(
        data.watchUrl
      )
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


    let sisteEp =
      null;


    try {

      const lagret =
        localStorage.getItem(
          sisteEpKey
        );


      if (lagret) {

        sisteEp =
          JSON.parse(
            lagret
          );
      }

    } catch (error) {}


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

      const sesonger =
        Object.keys(
          data.sesonger
        );


      if (
        !sesonger.length
      ) {
        return;
      }


      sesongNr =
        sesonger[0];


      const episoder =
        data.sesonger[
          sesongNr
        ]?.episoder || {};


      const episoderNr =
        Object.keys(
          episoder
        );


      if (
        !episoderNr.length
      ) {
        return;
      }


      epNr =
        episoderNr[0];
    }


    spaNaviger(
      "avspiller",
      {
        navn:
          navn,

        sesong:
          sesongNr,

        episode:
          epNr
      }
    );
  }
}


/* =========================================================
   18. MIN LISTE
   ========================================================= */

async function handterListClick() {

  if (!currentUser) {
    return;
  }


  const key =
    `${type}:${navn}`;


  if (
    !minListe.includes(
      key
    )
  ) {

    minListe.push(
      key
    );

  } else {

    minListe =
      minListe.filter(
        (f) =>
          f !== key
      );
  }


  oppdaterListeKnapp();

  await lagreProfilDataTilSkyen();
}


/* =========================================================
   19. VIS SESONG
   ========================================================= */

function visSesong(
  sesongNr
) {

  if (
    !data ||
    !data.sesonger
  ) {
    return;
  }


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
      (button) =>
        button.classList.remove(
          "active"
        )
    );


  if (seasonButtons) {

    [
      ...seasonButtons.children
    ]
      .find(
        (button) =>
          button.textContent ===
          `Sesong ${sesongNr}`
      )
      ?.classList.add(
        "active"
      );
  }


  if (
    !episodeGallery
  ) {
    return;
  }


  episodeGallery.replaceChildren();


  const episoder =
    data.sesonger[
      sesongNr
    ]?.episoder || {};


  const fragment =
    document.createDocumentFragment();


  Object.keys(
    episoder
  ).forEach(
    (epNr) => {

      const ep =
        episoder[
          epNr
        ];


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
                navn:
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


/* =========================================================
   20. ANBEFALINGER / EPISODER
   ========================================================= */

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


  /* -----------------------------------------
     SERIE
     ----------------------------------------- */

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
      (s, index) => {

        const btn =
          document.createElement(
            "button"
          );


        btn.textContent =
          `Sesong ${s}`;


        btn.className =
          "season-btn";


        if (
          index === 0
        ) {

          btn.classList.add(
            "active"
          );
        }


        btn.addEventListener(
          "click",
          () =>
            visSesong(s)
        );


        seasonButtons.appendChild(
          btn
        );
      }
    );


    if (
      sesongNumre.length
    ) {

      visSesong(
        sesongNumre[0]
      );
    }


    return;
  }


  /* -----------------------------------------
     FILM
     ----------------------------------------- */

  const gallery =
    document.getElementById(
      "recommendationGallery"
    );


  if (!gallery) {
    return;
  }


  gallery.replaceChildren();


  try {

    let filmer =
      [];


    const cache =
      localStorage.getItem(
        "anbefalinger_cache"
      );


    if (cache) {

      try {

        filmer =
          JSON.parse(
            cache
          );

      } catch (error) {

        localStorage.removeItem(
          "anbefalinger_cache"
        );
      }
    }


    if (
      !filmer.length
    ) {

      const q =
        query(
          collection(
            db,
            "filmer"
          ),
          limit(10)
        );


      const filmerSnap =
        await getDocs(
          q
        );


      filmerSnap.forEach(
        (d) => {

          filmer.push({
            id:
              d.id,

            ...d.data()
          });
        }
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


    let antallVist =
      0;


    filmer.forEach(
      (item) => {

        const nøkkel =
          item.id;


        const erGjeldende =
          nøkkel ===
          navn;


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

  } catch (error) {

    console.error(
      "Feil ved henting av anbefalinger:",
      error
    );
  }
}


/* =========================================================
   21. TRAILER
   ========================================================= */

function initTrailer() {

  if (!data) {
    return;
  }


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
    typeof data.trailer ===
      "string" &&
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


        if (
          videoControls
        ) {

          videoControls.style.display =
            "none";
        }


        if (bgImg) {

          bgImg.style.opacity =
            "1";
        }
      }
    );


    setTimeout(
      () => {

        if (bgImg) {

          bgImg.style.opacity =
            "0";
        }


        trailerVideo.style.opacity =
          "1";


        trailerVideo
          .play()
          .catch(
            () => {

              if (bgImg) {

                bgImg.style.opacity =
                  "1";
              }


              trailerVideo.style.opacity =
                "0";
            }
          );


        if (
          videoControls
        ) {

          videoControls.style.opacity =
            "1";
        }

      },
      1000
    );


    trailerVideo.addEventListener(
      "ended",
      () => {

        trailerVideo.style.opacity =
          "0";


        if (bgImg) {

          bgImg.style.opacity =
            "1";
        }


        if (
          videoControls
        ) {

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


    if (
      videoControls
    ) {

      videoControls.style.display =
        "none";
    }


    if (bgImg) {

      bgImg.style.opacity =
        "1";
    }
  }
}


/* =========================================================
   22. RESIZE
   ========================================================= */

window.addEventListener(
  "resize",
  () => {

    clearTimeout(
      resizeTimeout
    );


    resizeTimeout =
      setTimeout(
        () => {

          oppdaterBakgrunnsBilde();

        },
        150
      );
  }
);


/* =========================================================
   23. GLOBAL FUNKSJON FOR FILMINFO
   ========================================================= */

window.lastFilminfoMedId =
  function (medieId) {

    if (!medieId) {
      return;
    }


    const renId =
      String(
        medieId
      ).trim();


    if (!renId) {
      return;
    }


    window.location.hash =
      `#film-${encodeURIComponent(
        renId
      )}`;
  };


/* =========================================================
   24. HASHCHANGE
   ========================================================= */

window.addEventListener(
  "hashchange",
  () => {

    const nyId =
      hentMediaIdFraUrl();


    console.log(
      "HASH ENDRET:",
      window.location.hash
    );


    console.log(
      "NY MEDIA-ID:",
      nyId
    );


    if (
      nyId &&
      nyId !== navn
    ) {

      init(
        nyId
      );
    }
  }
);


/* =========================================================
   25. START
   ========================================================= */

function startFilminfo() {

  console.log(
    "================================"
  );

  console.log(
    "WATCH NORDIC FILMINFO JS LASTET"
  );

  console.log(
    "URL:",
    window.location.href
  );

  console.log(
    "HASH:",
    window.location.hash
  );

  console.log(
    "MEDIA-ID:",
    hentMediaIdFraUrl()
  );

  console.log(
    "================================"
  );


  init();
}


if (
  document.readyState ===
  "loading"
) {

  document.addEventListener(
    "DOMContentLoaded",
    startFilminfo,
    {
      once: true
    }
  );

} else {

  startFilminfo();
}

