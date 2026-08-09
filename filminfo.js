```javascript
import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
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

let aktivProfil = localStorage.getItem("aktivProfil") || "Hovedprofil";
let aktivProfilIndex = parseInt(
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


/* ==========================================
   RESIZE
   ========================================== */

window.addEventListener("resize", () => {
    clearTimeout(resizeTimeout);

    resizeTimeout = setTimeout(() => {
        oppdaterBakgrunnsBilde();
    }, 150);
});


/* ==========================================
   SPA-NAVIGERING
   ========================================== */

function spaNaviger(sideId, params = {}) {
    if (typeof window.byttSide === "function") {
        window.byttSide(sideId, params);
        return;
    }

    const queryString = new URLSearchParams(params).toString();

    window.location.hash =
        `#${sideId}${queryString ? "?" + queryString : ""}`;
}


/* ==========================================
   HENT MEDIA-ID FRA URL
   ========================================== */

function hentMediaIdFraUrl() {
    const hash = window.location.hash;

    if (hash) {

        // Eksempel:
        // #filminfo?navn=film123
        // #filminfo?id=film123
        if (hash.includes("?")) {
            const hashParams = new URLSearchParams(
                hash.split("?")[1]
            );

            const idFromHash =
                hashParams.get("navn") ||
                hashParams.get("id");

            if (idFromHash) {
                return idFromHash.trim();
            }
        }

        // Eksempel:
        // #filminfo/film123
        if (hash.includes("/")) {
            const deler = hash.split("/");

            if (deler.length > 1 && deler[1]) {
                return decodeURIComponent(deler[1]).trim();
            }
        }

        const renHash = hash.replace(/^#/, "");

        if (renHash.startsWith("film-")) {
            return decodeURIComponent(
                renHash.substring("film-".length)
            ).trim();
        }

        if (renHash.startsWith("serie-")) {
            return decodeURIComponent(
                renHash.substring("serie-".length)
            ).trim();
        }

        if (renHash) {
            return decodeURIComponent(renHash).trim();
        }
    }

    const params = new URLSearchParams(
        window.location.search
    );

    const idFromQuery =
        params.get("navn") ||
        params.get("id");

    return idFromQuery
        ? idFromQuery.trim()
        : "";
}


/* ==========================================
   TRYGG LOCALSTORAGE
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
   MOBIL / NETTBRETT
   ========================================== */

function erMobilEllerNettbrett() {
    const touchEnhet =
        "ontouchstart" in window ||
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
   TRYGG URL
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
   HENT DATA FRA FIREBASE
   ========================================== */

async function lastDataFraFirebase(eksplisittId = null) {
    try {
        const forespurtNavn = eksplisittId
            ? String(eksplisittId).trim()
            : hentMediaIdFraUrl();

        if (!forespurtNavn) {
            console.warn(
                "Ingen medie-ID funnet."
            );

            spaNaviger("hjem");
            return false;
        }

        const requestId = forespurtNavn;

        navn = forespurtNavn;

        data = null;
        type = "film";

        const cacheKey =
            `media_cache_${navn}`;

        let cachedData = null;

        try {
            cachedData =
                localStorage.getItem(cacheKey);
        } catch (e) {
            console.warn(
                "Kunne ikke lese mediacache."
            );
        }

        if (cachedData) {
            try {
                const parsed =
                    JSON.parse(cachedData);

                if (
                    parsed &&
                    parsed.data
                ) {
                    data = parsed.data;
                    type =
                        parsed.type === "serie"
                            ? "serie"
                            : "film";
                }
            } catch (e) {
                console.warn(
                    "Ugyldig mediacache. Fjerner cache."
                );

                try {
                    localStorage.removeItem(
                        cacheKey
                    );
                } catch (removeError) {}
            }
        }


        /* ------------------------------------------
           FIRESTORE
           ------------------------------------------ */

        if (!data) {
            let docRef =
                doc(db, "filmer", navn);

            let docSnap =
                await getDoc(docRef);

            // Hvis brukeren navigerer mens vi venter
            if (navn !== requestId) {
                return false;
            }

            if (docSnap.exists()) {
                type = "film";
                data = docSnap.data();
            } else {
                docRef =
                    doc(db, "serier", navn);

                docSnap =
                    await getDoc(docRef);

                if (navn !== requestId) {
                    return false;
                }

                if (docSnap.exists()) {
                    type = "serie";
                    data = docSnap.data();
                }
            }

            if (data) {
                tryggLagring(
                    cacheKey,
                    JSON.stringify({
                        data,
                        type
                    })
                );
            }
        }


        /* ------------------------------------------
           SJEKK OM FORESPØRSELEN ER UTDATERT
           ------------------------------------------ */

        if (navn !== requestId) {
            return false;
        }


        if (!data) {
            console.warn(
                "Innhold ikke funnet i Firestore:",
                navn
            );

            spaNaviger("hjem");
            return false;
        }


        /* ------------------------------------------
           TILGJENGELIGHET
           ------------------------------------------ */

        nå = new Date();

        erUpublisert = false;
        erUtgått = false;

        if (data.publishDate) {
            const publishDate =
                new Date(data.publishDate);

            if (
                !Number.isNaN(
                    publishDate.getTime()
                )
            ) {
                erUpublisert =
                    publishDate > nå;
            }
        }

        if (data.expireDate) {
            const expireDate =
                new Date(data.expireDate);

            if (
                !Number.isNaN(
                    expireDate.getTime()
                )
            ) {
                erUtgått =
                    nå > expireDate;
            }
        }

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
   2. HOVEDFUNKSJON
   ========================================== */

async function init(eksplisittId = null) {

    data = null;

    const suksess =
        await lastDataFraFirebase(
            eksplisittId
        );

    if (!suksess || !data) {
        return;
    }


    /* ------------------------------------------
       HENT ELEMENTER
       ------------------------------------------ */

    watchBtn =
        document.getElementById("watchBtn");

    addToListBtn =
        document.getElementById("addToListBtn");

    bgImg =
        document.getElementById(
            "backgroundImage"
        );


    /* ------------------------------------------
       TITTEL
       ------------------------------------------ */

    document.title =
        data.tittel
            ? `${data.tittel} - Watch Nordic`
            : "Watch Nordic";


    /* ------------------------------------------
       BAKGRUNN
       ------------------------------------------ */

    oppdaterBakgrunnsBilde();


    /* ------------------------------------------
       LOGO
       ------------------------------------------ */

    const fLogo =
        document.querySelector(".film-logo");

    const logoContainer =
        document.querySelector(
            ".logo-container"
        );

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

            if (gammelTextLogo) {
                gammelTextLogo.remove();
            }

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


    /* ------------------------------------------
       BESKRIVELSE
       ------------------------------------------ */

    const descEl =
        document.querySelector(
            ".description"
        );

    if (descEl) {

        const fullText =
            String(data.beskrivelse || "")
                .trim();

        const ordGrense = 20;

        const ordArray =
            fullText
                ? fullText.split(/\s+/)
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

            moreBtn.className =
                "more-btn";

            moreBtn.type = "button";
            moreBtn.textContent = "Mer";

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

                    closeBtn.type = "button";

                    closeBtn.setAttribute(
                        "aria-label",
                        "Lukk beskrivelse"
                    );

                    closeBtn.textContent = "×";

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


                    const lukkModal = () => {
                        closeBtn.removeEventListener(
                            "click",
                            lukkModal
                        );

                        overlay.removeEventListener(
                            "click",
                            overlayKlikk
                        );

                        document.removeEventListener(
                            "keydown",
                            escLukk
                        );

                        overlay.remove();
                    };


                    const overlayKlikk = (e) => {
                        if (
                            e.target === overlay
                        ) {
                            lukkModal();
                        }
                    };


                    const escLukk = (e) => {
                        if (
                            e.key === "Escape"
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


    /* ------------------------------------------
       METADATA
       ------------------------------------------ */

    const metadataEl =
        document.querySelector(
            ".metadata"
        );

    if (metadataEl) {

        metadataEl.replaceChildren();

        const ratingSpan =
            document.createElement("span");

        ratingSpan.textContent =
            `⭐ ${data.rating ?? "-"}`;

        metadataEl.appendChild(
            ratingSpan
        );


        if (
            Array.isArray(data.metadata)
        ) {

            data.metadata.forEach(
                (m) => {

                    const dot =
                        document.createElement(
                            "span"
                        );

                    dot.textContent = " • ";

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


    /* ------------------------------------------
       SKUESPILLERE & LISENS
       ------------------------------------------ */

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
            document.createElement("p");

        pCast.textContent =
            `Medvirkende: ${
                data.skuespillere ||
                "Ukjent"
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
                document.createElement(
                    "p"
                );

            pLicence.appendChild(
                document.createTextNode(
                    "Lisens: "
                )
            );


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

            aLicence.style.color =
                "#aaa";

            aLicence.style.textDecoration =
                "none";

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


    /* ------------------------------------------
       KNAPPER
       ------------------------------------------ */

    if (watchBtn) {

        watchBtn.classList.toggle(
            "locked",
            erUtilgjengelig
        );

        watchBtn.disabled =
            erUtilgjengelig;

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


    /* ------------------------------------------
       TRAILER
       ------------------------------------------ */

    initTrailer();


    /* ------------------------------------------
       TILGJENGELIGHET
       ------------------------------------------ */

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
                );

            if (
                !Number.isNaN(
                    pubDato.getTime()
                )
            ) {
                const formatert =
                    pubDato.toLocaleDateString(
                        "no-NO",
                        {
                            year: "numeric",
                            month: "short",
                            day: "numeric"
                        }
                    );

                availabilityEl.textContent =
                    `Kommer den ${formatert}`;
            }

        } else if (data.expireDate) {

            const expire =
                new Date(
                    data.expireDate
                );

            if (
                !Number.isNaN(
                    expire.getTime()
                )
            ) {

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
    }


    /* ------------------------------------------
       PROFILBILDE
       ------------------------------------------ */

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


    /* ------------------------------------------
       PROFIL-CACHE
       ------------------------------------------ */

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

            if (
                !Array.isArray(
                    heleProfilArrayet
                )
            ) {
                heleProfilArrayet = [];
            }

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
   3. DYNAMISKE UI-OPPDATERINGER
   ========================================== */

function oppdaterBakgrunnsBilde() {

    if (!bgImg || !data) {
        return;
    }

    const heroEl =
        document.querySelector(
            ".hero"
        );

    const erMobilEpad =
        erMobilEllerNettbrett();

    const bildeUrl =
        (
            erMobilEpad &&
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

        bgImg.style.opacity = "0";
        bgImg.src = bildeUrl;

        bgImg.onload = () => {
            bgImg.style.opacity = "1";

            if (heroEl) {
                heroEl.style.backgroundColor =
                    "transparent";
            }
        };

        bgImg.onerror = () => {

            bgImg.style.opacity = "0";

            if (heroEl) {
                heroEl.style.backgroundColor =
                    "#050F11";
            }
        };

    } else {

        bgImg.removeAttribute("src");

        bgImg.style.opacity = "0";

        if (heroEl) {
            heroEl.style.backgroundColor =
                "#050F11";
        }
    }
}


/* ==========================================
   WATCH-KNAPP
   ========================================== */

function oppdaterWatchKnapp() {

    if (!watchBtn) {
        return;
    }

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

        icon.className =
            "fas fa-play";

        text.textContent =
            " Gjenoppta";

        watchBtn.classList.add(
            "paabegynt"
        );

    } else if (
        status === "ferdig"
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


/* ==========================================
   MIN LISTE-KNAPP
   ========================================== */

function oppdaterListeKnapp() {

    if (!addToListBtn) {
        return;
    }

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
   4. DATA-SYNKRONISERING
   ========================================== */

function sjekkAldersgrense(
    profilData
) {

    if (
        !profilData ||
        profilData.aldersgrense == null ||
        !data
    ) {
        return true;
    }


    const metadata =
        Array.isArray(data.metadata)
            ? data.metadata
            : [];


    const innholdAldersgrense =
        metadata.find(
            m =>
                String(m)
                    .toLowerCase()
                    .includes("år")
        );


    if (!innholdAldersgrense) {
        return true;
    }


    const grensTallInnhold =
        parseInt(
            String(
                innholdAldersgrense
            ),
            10
        );


    const grensTallProfil =
        parseInt(
            String(
                profilData.aldersgrense
            ),
            10
        );


    if (
        Number.isNaN(
            grensTallInnhold
        )
    ) {
        return true;
    }


    if (
        Number.isNaN(
            grensTallProfil
        )
    ) {
        return false;
    }


    return (
        grensTallProfil >=
        grensTallInnhold
    );
}


/* ==========================================
   SYNKRONISER LOKAL DATA
   ========================================== */

function synkroniserLokalData() {

    if (
        !Array.isArray(
            heleProfilArrayet
        )
    ) {
        heleProfilArrayet = [];
    }


    let profilData =
        heleProfilArrayet[
            aktivProfilIndex
        ];


    if (
        !profilData ||
        profilData.navn !== aktivProfil
    ) {
        profilData =
            heleProfilArrayet.find(
                p =>
                    p &&
                    p.navn === aktivProfil
            );
    }


    if (!profilData) {

        status =
            "ikke-påbegynt";

        minListe = [];

        oppdaterWatchKnapp();
        oppdaterListeKnapp();
        byggAnbefalingerEllerEpisoder();

        return;
    }


    const harTilgang =
        sjekkAldersgrense(
            profilData
        );


    if (watchBtn) {

        watchBtn.classList.toggle(
            "locked",
            !harTilgang ||
            erUtilgjengelig
        );

        watchBtn.disabled =
            !harTilgang ||
            erUtilgjengelig;

        if (!harTilgang) {
            watchBtn.title =
                "Denne profilen har ikke tilgang på grunn av aldersgrense.";
        } else {
            watchBtn.removeAttribute(
                "title"
            );
        }
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


    oppdaterWatchKnapp();
    oppdaterListeKnapp();
    byggAnbefalingerEllerEpisoder();
}


/* ==========================================
   LAGRE PROFILDATA
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


    if (
        !heleProfilArrayet[indeks]
    ) {
        indeks =
            heleProfilArrayet.findIndex(
                p =>
                    p &&
                    p.navn === aktivProfil
            );
    }


    if (indeks === -1) {
        return;
    }


    if (
        !heleProfilArrayet[indeks]
            .historikk
    ) {
        heleProfilArrayet[indeks]
            .historikk = {};
    }


    heleProfilArrayet[indeks]
        .historikk[navn] =
        status;


    heleProfilArrayet[indeks]
        .minListe =
        Array.isArray(minListe)
            ? minListe
            : [];


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
            "Feil ved bakgrunnslagring til skyen:",
            err
        );
    }
}


/* ==========================================
   AUTENTISERING
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


                if (
                    docSnap.exists()
                ) {

                    heleProfilArrayet =
                        docSnap.data()
                            .profiler || [];


                    if (
                        !Array.isArray(
                            heleProfilArrayet
                        )
                    ) {
                        heleProfilArrayet = [];
                    }


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

            erProfilLastetFraSkyen =
                false;

            heleProfilArrayet = [];

            status =
                "ikke-påbegynt";

            minListe = [];

            try {
                localStorage.removeItem(
                    "watch_nordic_profiles_cache"
                );
            } catch (e) {}

            sessionStorage.clear();

            oppdaterWatchKnapp();
            oppdaterListeKnapp();
        }
    }
);


/* ==========================================
   5. KLIKKHÅNDTERERE
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


    if (
        currentUser &&
        erProfilLastetFraSkyen
    ) {
        await lagreProfilDataTilSkyen();
    }


    /* ------------------------------------------
       FILM
       ------------------------------------------ */

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


    /* ------------------------------------------
       SERIE
       ------------------------------------------ */

    if (
        type === "serie" &&
        data.sesonger
    ) {

        const sisteEpKey =
            `${navn}-siste-episode`;

        let sisteEp = null;


        try {

            const lagret =
                localStorage.getItem(
                    sisteEpKey
                );

            if (lagret) {
                sisteEp =
                    JSON.parse(lagret);
            }

        } catch (e) {

            console.warn(
                "Kunne ikke lese avspillingsfremdrift."
            );
        }


        let sesongNr = null;
        let epNr = null;


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
                sesonger.length === 0
            ) {
                return;
            }


            sesongNr =
                sesonger[0];


            const episoder =
                Object.keys(
                    data.sesonger[
                        sesongNr
                    ]?.episoder || {}
                );


            if (
                episoder.length === 0
            ) {
                return;
            }


            epNr =
                episoder[0];
        }


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
}


/* ==========================================
   MIN LISTE
   ========================================== */

async function handterListClick() {

    if (!currentUser) {
        return;
    }


    const key =
        `${type}:${navn}`;


    if (
        !Array.isArray(minListe)
    ) {
        minListe = [];
    }


    if (
        !minListe.includes(key)
    ) {

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
   6. EPISODELISTING
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
        epNr => {

            const ep =
                episoder[epNr] || {};


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


            /* Thumbnail */

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


            const epBilde =
                erTryggUrl(
                    ep.thumbnail
                )
                    ? ep.thumbnail
                    : "";


            if (epBilde) {
                img.src =
                    epBilde;
            }


            img.alt =
                ep.tittel || "";


            thumbDiv.appendChild(
                img
            );


            /* Overlay */

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


                const dato =
                    new Date(
                        ep.publishDate
                    );


                lockText.textContent =
                    dato.toLocaleDateString(
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


            /* Episode-info */

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


            /* Klikk */

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


/* ==========================================
   ANBEFALINGER / EPISODER
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


    /* ------------------------------------------
       SERIE
       ------------------------------------------ */

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

                btn.type = "button";

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
                    () =>
                        visSesong(s)
                );


                seasonButtons.appendChild(
                    btn
                );
            }
        );


        if (
            sesongNumre.length > 0
        ) {
            visSesong(
                sesongNumre[0]
            );
        }


        return;
    }


    /* ------------------------------------------
       FILMER
       ------------------------------------------ */

    const gallery =
        document.getElementById(
            "recommendationGallery"
        );


    if (!gallery) {
        return;
    }


    gallery.replaceChildren();

    gallery.dataset.laster =
        "true";


    const tittelEl =
        document.querySelector(
            ".recommendations h2"
        );


    if (tittelEl) {
        tittelEl.textContent =
            "Filmer du kanskje vil like";
    }


    try {

        let filmer = [];

        let cacheAnbefalinger =
            null;


        try {

            cacheAnbefalinger =
                localStorage.getItem(
                    "anbefalinger_cache"
                );

        } catch (e) {}


        if (cacheAnbefalinger) {

            try {

                const parsed =
                    JSON.parse(
                        cacheAnbefalinger
                    );

                if (
                    Array.isArray(parsed)
                ) {
                    filmer = parsed;
                }

            } catch (e) {

                try {
                    localStorage.removeItem(
                        "anbefalinger_cache"
                    );
                } catch (removeError) {}
            }
        }


        if (
            filmer.length === 0
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
                await getDocs(q);


            filmerSnap.forEach(
                d => {

                    filmer.push({
                        id: d.id,
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


        let antallVist = 0;


        filmer.forEach(
            item => {

                if (
                    !item ||
                    !item.id
                ) {
                    return;
                }


                const nøkkel =
                    item.id;


                const erGjeldende =
                    nøkkel === navn;


                let erPublisert = true;


                if (
                    item.publishDate
                ) {

                    const publishDate =
                        new Date(
                            item.publishDate
                        );


                    erPublisert =
                        !Number.isNaN(
                            publishDate.getTime()
                        ) &&
                        publishDate <= nå;
                }


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
                            : (
                                erTryggUrl(
                                    item.bakgrunn
                                )
                                    ? item.bakgrunn
                                    : ""
                            );


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

                            if (
                                typeof window.lastFilminfoMedId ===
                                "function"
                            ) {

                                window.lastFilminfoMedId(
                                    nøkkel
                                );

                            } else {

                                spaNaviger(
                                    "filminfo",
                                    {
                                        id:
                                            nøkkel
                                    }
                                );
                            }
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

    } finally {

        gallery.dataset.laster =
            "false";
    }
}


/* ==========================================
   7. TRAILER
   ========================================== */

function initTrailer() {

    if (!data) {
        return;
    }


    const trailerVideo =
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


    const erMobilEllerTablet =
        erMobilEllerNettbrett();


    if (
        data.trailer &&
        typeof data.trailer === "string" &&
        data.trailer.trim() !== "" &&
        erTryggUrl(data.trailer) &&
        trailerVideo &&
        !erMobilEllerTablet
    ) {

        /* ------------------------------------------
           Klon videoelementet for å fjerne
           gamle event listeners
           ------------------------------------------ */

        const nyVideo =
            trailerVideo.cloneNode(true);


        trailerVideo.parentNode.replaceChild(
            nyVideo,
            trailerVideo
        );


        nyVideo.style.display =
            "block";

        nyVideo.style.opacity =
            "0";

        nyVideo.src =
            data.trailer;

        nyVideo.preload =
            "metadata";

        nyVideo.muted =
            true;

        nyVideo.playsInline =
            true;


        nyVideo.addEventListener(
            "error",
            () => {

                nyVideo.style.display =
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


        setTimeout(
            () => {

                if (!document.body.contains(
                    nyVideo
                )) {
                    return;
                }


                if (bgImg) {
                    bgImg.style.opacity =
                        "0";
                }


                nyVideo.style.opacity =
                    "1";


                nyVideo
                    .play()
                    .catch(
                        () => {

                            if (bgImg) {
                                bgImg.style.opacity =
                                    "1";
                            }

                            nyVideo.style.opacity =
                                "0";
                        }
                    );


                if (videoControls) {
                    videoControls.style.opacity =
                        "1";
                }

            },
            1000
        );


        nyVideo.addEventListener(
            "ended",
            () => {

                nyVideo.style.opacity =
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

            const togglePlay =
                () => {

                    if (
                        nyVideo.paused
                    ) {

                        nyVideo
                            .play()
                            .catch(
                                () => {}
                            );

                        pauseBtn.innerHTML =
                            '<i class="fas fa-pause"></i>';

                    } else {

                        nyVideo.pause();

                        pauseBtn.innerHTML =
                            '<i class="fas fa-play"></i>';
                    }
                };


            pauseBtn.onclick =
                togglePlay;
        }


        if (soundBtn) {

            const toggleSound =
                () => {

                    nyVideo.muted =
                        !nyVideo.muted;


                    soundBtn.innerHTML =
                        nyVideo.muted
                            ? '<i class="fas fa-volume-mute"></i>'
                            : '<i class="fas fa-volume-up"></i>';
                };


            soundBtn.onclick =
                toggleSound;
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

            trailerVideo.style.opacity =
                "0";
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
   8. SPA-EKSPORT
   ========================================== */

window.lastFilminfoMedId =
    function (medieId) {

        init(medieId);
    };


/* ==========================================
   HASHCHANGE
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
   START
   ========================================== */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        () => init(),
        {
            once: true
        }
    );

} else {

    init();
}
```
