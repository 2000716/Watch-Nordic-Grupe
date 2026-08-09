/**
 * FILMINFO.JS - Watch Nordic
 * Håndterer visning av enkeltelementer (film/serie), sesonger, episoder og trailer.
 */

import { db } from "./firebase-oppsett.js"; // Rettet fra firebase-config.js
import {
    doc,
    getDoc,
    collection,
    query,
    limit,
    getDocs
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js"; // Synkronisert versjon med app.js

/* ==========================================
   1. TILSTAND OG GLOBAL VARIABEL-DEKLARASJON
   ========================================== */
let oppryddingsFunksjoner = [];
let watchBtn = null;
let bgImg = null;

// Hovedtilstand for det aktive mediet
let data = null;
let type = null;
let navn = "";
let nå = new Date();

let erUtgått = false;
let erUpublisert = false;
let status = "usett";

const CACHE_TTL_MS = 3600000; // 1 time utløpstid på cache

/* ==========================================
   2. OPPRYDDING OG HJELPEFUNKSJONER
   ========================================== */
function kjørOpprydding() {
    oppryddingsFunksjoner.forEach((fn) => {
        try {
            fn();
        } catch (e) {
            console.error("Feil under opprydding:", e);
        }
    });
    oppryddingsFunksjoner = [];
}

function destroyFilmPage() {
    kjørOpprydding();
    watchBtn = null;
    bgImg = null;
    data = null;
    type = null;
    navn = "";
}

function sanitizeInput(str) {
    if (typeof str !== "string") return "";
    const temp = document.createElement("div");
    temp.textContent = str;
    return temp.innerHTML;
}

function erTryggUrl(url) {
    if (!url || typeof url !== "string") return false;
    try {
        const parsed = new URL(url, window.location.origin);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
        return false;
    }
}

function tryggLagring(nokkel, verdi) {
    try {
        localStorage.setItem(nokkel, verdi);
    } catch (e) {
        console.warn("Kunne ikke lagre til localStorage:", e);
    }
}

function hentFraLagring(nokkel) {
    try {
        return localStorage.getItem(nokkel);
    } catch (e) {
        console.warn("Kunne ikke lese fra localStorage:", e);
        return null;
    }
}

function erMobilEllerNettbrett() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) 
        || window.innerWidth <= 1024;
}

function navigerTil(url) {
    window.location.href = url;
}

/* ==========================================
   3. ALDERSGRENSE OG KNAPPE-LOGIKK
   ========================================== */
function sjekkAldersgrense(aldersgrense, brukerProfil) {
    if (!aldersgrense || aldersgrense === "A" || aldersgrense === 0) return true;
    if (!brukerProfil || !brukerProfil.alder) return true;

    const pakrevdAlder = parseInt(aldersgrense, 10);
    if (isNaN(pakrevdAlder)) return true;

    return brukerProfil.alder >= pakrevdAlder;
}

function oppdaterWatchKnapp() {
    if (!watchBtn) return;

    let icon = watchBtn.querySelector("i") || document.createElement("i");
    let text = watchBtn.querySelector("span") || document.createElement("span");

    if (!watchBtn.querySelector("i")) watchBtn.prepend(icon);
    if (!watchBtn.querySelector("span")) watchBtn.appendChild(text);

    if (watchBtn.disabled && watchBtn.title && watchBtn.title.includes("aldersgrense")) {
        icon.className = "fas fa-lock";
        text.textContent = " Låst (Aldersgrense)";
        return;
    }

    watchBtn.classList.remove("paabegynt");

    if (erUtgått) {
        watchBtn.disabled = true;
        icon.className = "fas fa-ban";
        text.textContent = " Utgått";
        return;
    }

    if (erUpublisert) {
        watchBtn.disabled = true;
        icon.className = "fas fa-lock";
        text.textContent = " Kommer snart";
        return;
    }

    watchBtn.disabled = false;

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

/* ==========================================
   4. DATAHENTING OG CACHING (Med Fallback-søk)
   ========================================== */
async function lastDataFraFirebase(mediaNavn) {
    const cacheKey = `media_cache_${mediaNavn}`;
    const cachedData = hentFraLagring(cacheKey);

    // Sjekk lokal cache først
    if (cachedData) {
        try {
            const parsed = JSON.parse(cachedData);
            if (parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
                return { data: parsed.data, type: parsed.type };
            } else {
                localStorage.removeItem(cacheKey);
            }
        } catch (e) {
            localStorage.removeItem(cacheKey);
        }
    }

    // 1. Sjekk direkte Dokument-ID i "filmer" (f.eks. doc ID "tears-of-steel")
    const filmRef = doc(db, "filmer", mediaNavn);
    const filmSnap = await getDoc(filmRef);

    if (filmSnap.exists()) {
        const hentetData = filmSnap.data();
        tryggLagring(cacheKey, JSON.stringify({ data: hentetData, type: "film", timestamp: Date.now() }));
        return { data: hentetData, type: "film" };
    }

    // 2. Fallback: Søk i "filmer" dersom "tears-of-steel" er lagret i et felt (f.eks. slug eller id)
    const filmerRef = collection(db, "filmer");
    const qFilm = query(filmerRef, where("slug", "==", mediaNavn), limit(1));
    const qFilmSnap = await getDocs(qFilm);

    if (!qFilmSnap.empty) {
        const hentetData = qFilmSnap.docs[0].data();
        tryggLagring(cacheKey, JSON.stringify({ data: hentetData, type: "film", timestamp: Date.now() }));
        return { data: hentetData, type: "film" };
    }

    // 3. Sjekk direkte Dokument-ID i "serier"
    const serieRef = doc(db, "serier", mediaNavn);
    const serieSnap = await getDoc(serieRef);

    if (serieSnap.exists()) {
        const hentetData = serieSnap.data();
        tryggLagring(cacheKey, JSON.stringify({ data: hentetData, type: "serie", timestamp: Date.now() }));
        return { data: hentetData, type: "serie" };
    }

    // 4. Fallback: Søk i "serier" på slug
    const serierRef = collection(db, "serier");
    const qSerie = query(serierRef, where("slug", "==", mediaNavn), limit(1));
    const qSerieSnap = await getDocs(qSerie);

    if (!qSerieSnap.empty) {
        const hentetData = qSerieSnap.docs[0].data();
        tryggLagring(cacheKey, JSON.stringify({ data: hentetData, type: "serie", timestamp: Date.now() }));
        return { data: hentetData, type: "serie" };
    }

    throw new Error(`Mediet "${mediaNavn}" ble ikke funnet i databasen.`);
}
/* ==========================================
   5. HOVED-RENDERING AV MEDIESIDE
   ========================================== */
async function renderFilmPage(mediaNavn) {
    kjørOpprydding();
    
    let rensetNavn = mediaNavn || window.location.hash.replace("#", "").trim();
    if (rensetNavn.startsWith("film-")) {
        rensetNavn = rensetNavn.replace("film-", "");
    }
    navn = rensetNavn;
    nå = new Date();

    const container = document.getElementById("view-filminfo") || document.getElementById("filminfo") || document.getElementById("main-content");
    if (!container) return;

    try {
        const res = await lastDataFraFirebase(navn);
        data = res.data;
        type = res.type;

        // Knytter bakgrunnsbilde-elementet til den globale variabelen bgImg
        bgImg = document.getElementById("backgroundImage");
        const bildeUrl = erTryggUrl(data.bakgrunn) ? data.bakgrunn : (erTryggUrl(data.bildeUrl) ? data.bildeUrl : "");
        if (bgImg && bildeUrl) {
            bgImg.src = bildeUrl;
            bgImg.alt = sanitizeInput(data.tittel || "Bakgrunnsbilde");
            bgImg.style.opacity = "1";
        }

        const tittelEl = container.querySelector("h1") || container.querySelector(".film-logo");
        if (tittelEl) {
            if (tittelEl.tagName === "IMG" && data.logoUrl) {
                tittelEl.src = data.logoUrl;
            } else {
                tittelEl.textContent = sanitizeInput(data.tittel || "");
            }
        }

        const descEl = container.querySelector(".description");
        if (descEl) {
            descEl.textContent = data.beskrivelse || "Ingen beskrivelse tilgjengelig.";
        }

        // Finn watchBtn
        watchBtn = document.getElementById("watchBtn");
        if (watchBtn) {
            const clickHandler = () => {
                if (watchBtn.disabled) return;
                if (data.videoUrl && erTryggUrl(data.videoUrl)) {
                    window.location.href = data.videoUrl;
                } else {
                    alert("Avspillingslenke er ikke tilgjengelig.");
                }
            };
            watchBtn.addEventListener("click", clickHandler);
            oppryddingsFunksjoner.push(() => watchBtn?.removeEventListener("click", clickHandler));
        }

        // Synkroniser brukerdata
        const profilRaw = hentFraLagring("brukerProfil");
        const brukerProfil = profilRaw ? JSON.parse(profilRaw) : null;

        const historikkRaw = hentFraLagring("avspillingsHistorikk");
        const avspillingsHistorikk = historikkRaw ? JSON.parse(historikkRaw) : {};

        synkroniserLokalData(brukerProfil, avspillingsHistorikk);

        // Bygg episoder eller anbefalinger
        await byggAnbefalingerEllerEpisoder();

        // Initialiser trailer
        initTrailer();

    } catch (err) {
        console.error("Feil ved rendring av medieside:", err);
        if (container) {
            const feilDiv = document.createElement("div");
            feilDiv.style.cssText = "color: white; padding: 40px; text-align: center;";
            feilDiv.innerHTML = `<p class="error-msg">Kunne ikke laste innhold: ${sanitizeInput(err.message)}</p>`;
            container.appendChild(feilDiv);
        }
    }
}

/* ==========================================
   6. SYNKRONISER LOKAL DATA (TILGANG & HISTORIKK)
   ========================================== */
function synkroniserLokalData(brukerProfil, avspillingsHistorikk) {
    if (!data) return;

    const naatid = Date.now();
    if (data.utgaarDato && data.utgaarDato.toMillis() < naatid) {
        erUtgått = true;
    } else {
        erUtgått = false;
    }

    if (data.publiseringsDato && data.publiseringsDato.toMillis() > naatid) {
        erUpublisert = true;
    } else {
        erUpublisert = false;
    }

    const harTilgang = sjekkAldersgrense(data.aldersgrense, brukerProfil);

    if (!harTilgang) {
        if (watchBtn) {
            watchBtn.disabled = true;
            watchBtn.title = "Låst pga aldersgrense";
        }
    }

    if (avspillingsHistorikk && navn) {
        const funnet = avspillingsHistorikk[navn];
        if (funnet) {
            status = funnet.status || "usett";
        }
    }

    oppdaterWatchKnapp();
}

/* ==========================================
   7. EPISODER & ANBEFALINGER
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
    const episoder = data?.sesonger?.[sesongNr]?.episoder || {};
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
                navigerTil(`/spiller?navn=${encodeURIComponent(navn)}&sesong=${encodeURIComponent(sesongNr)}&episode=${encodeURIComponent(epNr)}`);
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
        if (!gallery) return;
        gallery.innerHTML = "";

        const tittelEl = document.querySelector(".recommendations h2");
        if (tittelEl) tittelEl.textContent = "Anbefalt til deg";

        try {
            let filmer = [];
            let cacheAnbefalinger = hentFraLagring("anbefalinger_cache");

            if (cacheAnbefalinger) {
                try {
                    const parsed = JSON.parse(cacheAnbefalinger);
                    if (parsed.timestamp && (Date.now() - parsed.timestamp < CACHE_TTL_MS)) {
                        filmer = parsed.data || [];
                    } else {
                        localStorage.removeItem("anbefalinger_cache");
                    }
                } catch (e) {
                    localStorage.removeItem("anbefalinger_cache");
                }
            }

            if (filmer.length === 0) {
                const q = query(collection(db, "filmer"), limit(10));
                const filmerSnap = await getDocs(q);
                filmerSnap.forEach(d => filmer.push({ id: d.id, ...d.data() }));
                tryggLagring("anbefalinger_cache", JSON.stringify({ data: filmer, timestamp: Date.now() }));
            }

            const fragment = document.createDocumentFragment();
            let antallVist = 0;

            filmer.forEach(item => {
                const nøkkel = item.id;
                const erGjeldende = nøkkel === navn;
                const erPublisert = !item.publishDate || new Date(item.publishDate) <= nå;

                if (!erGjeldende && erPublisert && antallVist < 6) {
                    const card = document.createElement("div");
                    card.className = "film-kort";
                    card.style.cssText = "cursor: pointer; min-width: 150px; flex-shrink: 0;";

                    const bildeUrl = (erTryggUrl(item.bildeUrl) ? item.bildeUrl : (erTryggUrl(item.poster) ? item.poster : ''));

                    const img = document.createElement("img");
                    img.src = bildeUrl;
                    img.alt = item.tittel || '';
                    img.style.cssText = "width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 2/3;";
                    
                    const tittelH4 = document.createElement("h4");
                    tittelH4.textContent = item.tittel || '';
                    tittelH4.style.cssText = "color: white; margin-top: 6px; font-size: 14px; text-align: center;";

                    card.appendChild(img);
                    card.appendChild(tittelH4);

                    card.addEventListener("click", () => {
                        window.location.hash = `#film-${nøkkel}`;
                    });
                    fragment.appendChild(card);
                    antallVist++;
                }
            });

            gallery.appendChild(fragment);

        } catch (e) {
            console.error("Feil ved henting av anbefalinger:", e);
        }
    }
}

/* ==========================================
   8. VIDEO / TRAILER
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

        trailerVideo.addEventListener("error", () => {
            console.warn("Trailer-feil. Viser bakgrunnsbilde i stedet.");
            trailerVideo.style.display = "none";
            if (videoControls) videoControls.style.display = "none";
            if (bgImg) bgImg.style.opacity = "1";
        });

        const timer = setTimeout(() => {
            if (bgImg) bgImg.style.opacity = "0";
            trailerVideo.style.opacity = "1";
            trailerVideo.play().catch(() => {
                if (bgImg) bgImg.style.opacity = "1";
                trailerVideo.style.opacity = "0";
            });
            if (videoControls) videoControls.style.display = "flex";
        }, 1000);

        oppryddingsFunksjoner.push(() => clearTimeout(timer));

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
            pauseBtn.addEventListener("click", togglePlay);
            oppryddingsFunksjoner.push(() => pauseBtn.removeEventListener("click", togglePlay));
        }

        if (soundBtn) {
            const toggleSound = () => {
                trailerVideo.muted = !trailerVideo.muted;
                soundBtn.innerHTML = trailerVideo.muted ? '<i class="fas fa-volume-mute"></i>' : '<i class="fas fa-volume-up"></i>';
            };
            soundBtn.addEventListener("click", toggleSound);
            oppryddingsFunksjoner.push(() => soundBtn.removeEventListener("click", toggleSound));
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
