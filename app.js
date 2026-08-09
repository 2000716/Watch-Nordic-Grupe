```js
/**
 * APP.JS - Watch Nordic
 * Hovedfil for Firebase-data, søk, global tilstand
 * og kobling mot SPA-router.js
 */

// ==========================================
// 1. IMPORTER
// ==========================================

import { auth, db } from './firebase-oppsett.js';

import { onAuthStateChanged } from
    "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

import {
    collection,
    query,
    orderBy,
    limit,
    startAt,
    endAt,
    getDocs
} from
    "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";


// Last inn filminfo.js
import './filminfo.js';


// ==========================================
// 2. HJELPEFUNKSJONER
// ==========================================

/**
 * Forhindrer XSS når data fra Firebase
 * settes inn i HTML.
 */
export function sanitizeInput(str) {

    if (!str) return "";

    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


// ==========================================
// 3. GLOBAL TILSTAND
// ==========================================

window.AppState = {

    bruker: null,

    valgtMediaId: null

};


// ==========================================
// 4. FIREBASE - HENT MEDIER
// ==========================================

async function hentMedier(
    type = null,
    begrensningsAntall = 12
) {

    try {

        const resultater = [];


        // --------------------------------------
        // SERIER
        // --------------------------------------

        if (type === 'serie') {

            const serierRef =
                collection(db, "serier");

            const qSerie =
                query(
                    serierRef,
                    limit(begrensningsAntall)
                );

            const serieSnap =
                await getDocs(qSerie);

            serieSnap.forEach((docSnap) => {

                resultater.push({
                    id: docSnap.id,
                    type: 'serie',
                    ...docSnap.data()
                });

            });

        }


        // --------------------------------------
        // FILMER
        // --------------------------------------

        else {

            const filmerRef =
                collection(db, "filmer");

            const qFilm =
                query(
                    filmerRef,
                    limit(begrensningsAntall)
                );

            const filmSnap =
                await getDocs(qFilm);

            filmSnap.forEach((docSnap) => {

                const data =
                    docSnap.data();

                resultater.push({
                    id: docSnap.id,
                    type: data.type || 'film',
                    ...data
                });

            });

        }


        return resultater;

    } catch (error) {

        console.error(
            `Feil ved henting av medier (${type}):`,
            error
        );

        return [];

    }

}


// ==========================================
// 5. BYGG FILMKORT
// ==========================================

function byggMedieKort(item) {

    const safeId =
        sanitizeInput(item.id);

    const tittel =
        sanitizeInput(
            item.tittel || "Uten tittel"
        );

    const bildeUrl =
        sanitizeInput(
            item.bildeUrl ||
            item.poster ||
            item.bakgrunn ||
            'placeholder.jpg'
        );

    const type =
        item.type || 'film';


    return `
        <div
            class="film-kort"
            data-id="${safeId}"
            style="
                cursor: pointer;
                min-width: 150px;
                flex-shrink: 0;
            "
            onclick="velgOgVisInfo('${safeId}', '${type}')"
        >

            <img
                src="${bildeUrl}"
                alt="${tittel}"
                style="
                    width: 100%;
                    border-radius: 8px;
                    object-fit: cover;
                    aspect-ratio: 2/3;
                "
                loading="lazy"
            >

            <h4
                style="
                    color: white;
                    margin-top: 6px;
                    font-size: 14px;
                    text-align: center;
                "
            >
                ${tittel}
            </h4>

        </div>
    `;
}


// ==========================================
// 6. LAST HOVEDSIDE
// ==========================================

async function lastHovedsideData() {

    const heroTittel =
        document.getElementById(
            'hero-tittel'
        );

    const heroBeskrivelse =
        document.getElementById(
            'hero-beskrivelse'
        );

    const heroBanner =
        document.getElementById(
            'hero-banner'
        );

    const filmerContainer =
        document.getElementById(
            'filmer-container'
        );

    const serierContainer =
        document.getElementById(
            'serier-container'
        );


    const alleFilmer =
        await hentMedier(
            'film',
            15
        );

    const alleSerier =
        await hentMedier(
            'serie',
            15
        );


    // --------------------------------------
    // HERO
    // --------------------------------------

    if (alleFilmer.length > 0) {

        const heroItem =
            alleFilmer[0];


        if (heroTittel) {

            heroTittel.textContent =
                heroItem.tittel || '';

        }


        if (heroBeskrivelse) {

            heroBeskrivelse.textContent =
                heroItem.beskrivelse || '';

        }


        if (
            heroBanner &&
            (
                heroItem.bakgrunn ||
                heroItem.bildeUrl
            )
        ) {

            heroBanner.style.backgroundImage =
                `linear-gradient(
                    to top,
                    rgba(0,0,0,0.9),
                    transparent
                ),
                url('${heroItem.bakgrunn ||
                    heroItem.bildeUrl}')`;

        }

    }


    // --------------------------------------
    // FILMER
    // --------------------------------------

    if (filmerContainer) {

        filmerContainer.innerHTML =
            alleFilmer
                .map(m => byggMedieKort(m))
                .join('');

    }


    // --------------------------------------
    // SERIER
    // --------------------------------------

    if (serierContainer) {

        serierContainer.innerHTML =
            alleSerier
                .map(s => byggMedieKort(s))
                .join('');

    }

}


// ==========================================
// 7. LAST SERIER
// ==========================================

async function lastSerierData() {

    const serierGrid =
        document.getElementById(
            'serier-grid'
        );


    if (!serierGrid) {
        return;
    }


    serierGrid.innerHTML =
        `
        <div
            style="
                color: white;
                padding: 20px;
            "
        >
            Laster serier...
        </div>
        `;


    const serier =
        await hentMedier(
            'serie',
            24
        );


    if (serier.length === 0) {

        serierGrid.innerHTML =
            `
            <div
                style="
                    color: white;
                    padding: 20px;
                "
            >
                Ingen serier funnet.
            </div>
            `;

        return;
    }


    serierGrid.innerHTML =
        serier
            .map(s => byggMedieKort(s))
            .join('');

}


// ==========================================
// 8. ÅPNE FILM / SERIE
// ==========================================

window.velgOgVisInfo =
    function(docId, type = 'film') {

        console.log(
            "Åpner medie:",
            docId,
            type
        );


        // Lagre valgt media
        window.AppState.valgtMediaId =
            docId;


        // --------------------------------------
        // BRUK DEN NYE ROUTEREN
        // --------------------------------------

        if (
            typeof window.byttSide ===
            "function"
        ) {

            window.byttSide(
                "filminfo",
                {
                    id: docId,
                    type: type
                }
            );

        } else {

            console.error(
                "Routeren er ikke lastet. " +
                "Sjekk at router.js lastes før app.js."
            );

        }

};


// ==========================================
// 9. FILMINFO - KOMPATIBILITET
// ==========================================
//
// Routeren din kaller:
// window.lastFilminfoMedId(id)
//
// Denne funksjonen kobler router.js
// sammen med filminfo.js.
//

window.lastFilminfoMedId =
    function(mediaId) {

        if (!mediaId) {

            console.error(
                "Mangler mediaId til filminfo."
            );

            return;
        }


        window.AppState.valgtMediaId =
            mediaId;


        console.log(
            "Laster filminfo:",
            mediaId
        );


        // Førstevalg:
        // renderFilmPage fra filminfo.js

        if (
            typeof window.renderFilmPage ===
            "function"
        ) {

            window.renderFilmPage(
                mediaId
            );

            return;
        }


        // Fallback hvis filminfo.js
        // bruker et annet navn

        if (
            typeof window.lastInnFilminfo ===
            "function"
        ) {

            window.lastInnFilminfo(
                mediaId
            );

            return;
        }


        console.error(
            "Kunne ikke laste filminfo. " +
            "Sjekk at filminfo.js er lastet."
        );

    };


// ==========================================
// 10. TILBAKE FRA FILMINFO
// ==========================================

window.gaaTilbake =
    function() {

        if (
            typeof window.destroyFilmPage ===
            "function"
        ) {

            window.destroyFilmPage();

        }


        // Bruk routeren
        if (
            typeof window.byttSide ===
            "function"
        ) {

            window.byttSide(
                "hjem"
            );

        } else {

            console.error(
                "Routeren er ikke tilgjengelig."
            );

        }

    };


// ==========================================
// 11. FIREBASE AUTH
// ==========================================

onAuthStateChanged(
    auth,
    (user) => {

        window.AppState.bruker =
            user;


        const kontoLink =
            document.getElementById(
                'konto-lenke'
            );


        if (user) {

            if (kontoLink) {

                kontoLink.textContent =
                    'Min Konto';

            }

        } else {

            if (kontoLink) {

                kontoLink.textContent =
                    'Logg inn';

            }

        }

    }
);


// ==========================================
// 12. SØK
// ==========================================

let sokDebounceTimer = null;


window.utforSok =
    async function() {

        const sokefelt =
            document.getElementById(
                'sokefelt'
            );

        const resultaterContainer =
            document.getElementById(
                'sokeResultater'
            );


        if (
            !sokefelt ||
            !resultaterContainer
        ) {

            return;

        }


        const queryTekst =
            sokefelt.value
                .trim()
                .toLowerCase();


        // --------------------------------------
        // FOR KORT SØK
        // --------------------------------------

        if (queryTekst.length <= 2) {

            resultaterContainer.innerHTML =
                '';

            return;

        }


        resultaterContainer.innerHTML =
            `
            <div
                style="
                    padding: 20px;
                    color: white;
                "
            >
                Laster resultater for
                "<strong>
                    ${sanitizeInput(queryTekst)}
                </strong>"...
            </div>
            `;


        try {

            const filmerRef =
                collection(
                    db,
                    "filmer"
                );


            const q =
                query(
                    filmerRef,
                    orderBy(
                        "sokeTittel"
                    ),
                    startAt(
                        queryTekst
                    ),
                    endAt(
                        queryTekst +
                        '\uf8ff'
                    )
                );


            const querySnapshot =
                await getDocs(q);


            // ----------------------------------
            // INGEN RESULTATER
            // ----------------------------------

            if (
                querySnapshot.empty
            ) {

                resultaterContainer.innerHTML =
                    `
                    <div
                        style="
                            padding: 20px;
                            color: white;
                        "
                    >
                        Ingen treff på
                        "<strong>
                            ${sanitizeInput(
                                queryTekst
                            )}
                        </strong>"
                    </div>
                    `;

                return;

            }


            // ----------------------------------
            // BYGG RESULTATER
            // ----------------------------------

            resultaterContainer.innerHTML =
                "";


            const grid =
                document.createElement(
                    "div"
                );


            grid.className =
                "soke-grid";


            grid.style.cssText =
                `
                display: flex;
                gap: 15px;
                flex-wrap: wrap;
                `;


            querySnapshot.forEach(
                (docSnap) => {

                    const film =
                        docSnap.data();


                    const docId =
                        docSnap.id;


                    const tittel =
                        sanitizeInput(
                            film.tittel ||
                            "Uten tittel"
                        );


                    const bildeUrl =
                        sanitizeInput(
                            film.bildeUrl ||
                            film.poster ||
                            film.bakgrunn ||
                            'placeholder.jpg'
                        );


                    const type =
                        film.type ||
                        'film';


                    const kort =
                        document.createElement(
                            "div"
                        );


                    kort.className =
                        "film-kort";


                    kort.style.cssText =
                        `
                        cursor: pointer;
                        max-width: 150px;
                        `;


                    kort.innerHTML =
                        `
                        <img
                            src="${bildeUrl}"
                            alt="${tittel}"
                            style="
                                width: 100%;
                                border-radius: 8px;
                                object-fit: cover;
                                aspect-ratio: 2/3;
                            "
                        >

                        <h4
                            style="
                                color: white;
                                margin-top: 5px;
                                font-size: 14px;
                            "
                        >
                            ${tittel}
                        </h4>
                        `;


                    // ------------------------------
                    // KLIKK PÅ SØKERESULTAT
                    // ------------------------------

                    kort.addEventListener(
                        "click",
                        () => {

                            window.velgOgVisInfo(
                                docId,
                                type
                            );


                            resultaterContainer
                                .innerHTML =
                                '';


                            sokefelt.value =
                                '';

                        }
                    );


                    grid.appendChild(
                        kort
                    );

                }
            );


            resultaterContainer.appendChild(
                grid
            );


        } catch (error) {

            console.error(
                "Feil ved henting av søkeresultater:",
                error
            );


            resultaterContainer.innerHTML =
                `
                <div
                    style="
                        padding: 20px;
                        color: red;
                    "
                >
                    Det oppstod en feil
                    under søket.
                </div>
                `;

        }

    };


// ==========================================
// 13. REAGER PÅ ROUTEREN
// ==========================================
//
// router.js sender:
// CustomEvent('sideByttet')
//
// Her kobler vi Firebase-data
// til de forskjellige sidene.
//

document.addEventListener(
    'sideByttet',
    (event) => {

        const side =
            event.detail?.side;


        const params =
            event.detail?.params || {};


        console.log(
            "App mottok sideByttet:",
            side,
            params
        );


        // --------------------------------------
        // HJEM
        // --------------------------------------

        if (side === 'hjem') {

            lastHovedsideData();

        }


        // --------------------------------------
        // SERIER
        // --------------------------------------

        if (side === 'serier') {

            lastSerierData();

        }


        // --------------------------------------
        // FILMINFO
        // --------------------------------------

        if (side === 'filminfo') {

            const mediaId =
                params.id ||
                params.navn;


            if (mediaId) {

                window.AppState
                    .valgtMediaId =
                    mediaId;

            }

        }


        // --------------------------------------
        // AVSPILLER
        // --------------------------------------

        if (side === 'avspiller') {

            const videoElement =
                document.querySelector(
                    '#view-avspiller video, #avspiller video'
                );


            if (
                videoElement &&
                params.kilde
            ) {

                videoElement.src =
                    params.kilde;


                videoElement
                    .play()
                    .catch(
                        (error) => {

                            console.log(
                                "Autoplay hindret " +
                                "eller ugyldig videokilde:",
                                error
                            );

                        }
                    );

            }

        }

    }
);


// ==========================================
// 14. SØKEFELT
// ==========================================

document.addEventListener(
    'DOMContentLoaded',
    () => {

        const sokefelt =
            document.getElementById(
                'sokefelt'
            );


        if (!sokefelt) {
            return;
        }


        sokefelt.addEventListener(
            'input',
            () => {

                clearTimeout(
                    sokDebounceTimer
                );


                sokDebounceTimer =
                    setTimeout(
                        () => {

                            window.utforSok();

                        },
                        300
                    );

            }
        );

    }
);


// ==========================================
// 15. START
// ==========================================
//
// Router.js har ansvaret for å starte
// riktig side.
//
// Derfor skal app.js IKKE ha:
// - egen hashchange
// - egen startRouter
// - egen byttSide
// - egen URL-parser
//
// Routeren håndterer dette.
// ==========================================

console.log(
    "Watch Nordic app.js lastet."
);
```
