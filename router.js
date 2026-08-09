// ==========================================
// WATCH NORDIC - SPA ROUTER
// ==========================================

const routes = {
    hjem: "view-hjem",
    serier: "view-serier",
    film: "view-hjem",
    nyheter: "view-hjem",
    "min-liste": "view-hjem",
    sok: "view-sok",
    konto: "view-konto",
    filminfo: "view-filminfo",
    avspiller: "view-avspiller"
};


// ==========================================
// BYTT SIDE
// ==========================================

window.byttSide = function(sideId, params = {}) {

    console.log("SPA navigasjon:", sideId, params);

    // Skjul alle hovedsider
    document.querySelectorAll(".side-visning").forEach(side => {
        side.style.display = "none";
    });

    // Finn riktig side
    const viewId = routes[sideId];

    if (!viewId) {
        console.error("Ukjent side:", sideId);
        return;
    }

    const view = document.getElementById(viewId);

    if (!view) {
        console.error("Fant ikke view:", viewId);
        return;
    }

    // Vis siden
    view.style.display = "block";


    // ======================================
    // FILMINFO
    // ======================================

    if (sideId === "filminfo") {

        const mediaId =
            params.id ||
            params.navn;

        if (
            mediaId &&
            typeof window.lastFilminfoMedId === "function"
        ) {
            window.lastFilminfoMedId(mediaId);
        }
    }


    // ======================================
    // AVSPILLER
    // ======================================

    if (sideId === "avspiller") {

        console.log(
            "Åpner avspiller med:",
            params
        );

        // video.js kan senere hente
        // params.kilde, params.navn,
        // params.sesong og params.episode
    }


    // ======================================
    // OPPDATER URL
    // ======================================

    const query = new URLSearchParams(params).toString();

    const hash =
        "#" +
        sideId +
        (query ? "?" + query : "");

    if (window.location.hash !== hash) {
        history.pushState(
            null,
            "",
            hash
        );
    }


    // ======================================
    // AKTIV MENY
    // ======================================

    document
        .querySelectorAll(".nav-links a")
        .forEach(link => {
            link.classList.remove("active");
        });

    const aktivLink =
        document.getElementById(
            `link-${sideId}`
        );

    if (aktivLink) {
        aktivLink.classList.add("active");
    }
};


// ==========================================
// LESER HASH FRA URL
// ==========================================

function hentRouteFraUrl() {

    const hash =
        window.location.hash.substring(1);

    if (!hash) {
        return {
            side: "hjem",
            params: {}
        };
    }

    const [side, query] =
        hash.split("?");

    const params = query
        ? Object.fromEntries(
            new URLSearchParams(query)
          )
        : {};

    return {
        side,
        params
    };
}


// ==========================================
// START ROUTER
// ==========================================

function startRouter() {

    const route =
        hentRouteFraUrl();

    window.byttSide(
        route.side,
        route.params
    );
}


// ==========================================
// TILBAKE / FREM I NETTLESER
// ==========================================

window.addEventListener(
    "popstate",
    startRouter
);


// ==========================================
// HASH-ENDRING
// ==========================================

window.addEventListener(
    "hashchange",
    startRouter
);


// ==========================================
// START
// ==========================================

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        startRouter,
        { once: true }
    );

} else {

    startRouter();

}
