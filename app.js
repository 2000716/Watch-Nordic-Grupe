import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Import fra egne moduler
import { initialiserHovedside } from "js/hovedside.js";
import { initialiserFilminfo } from "js/filminfo.js";
import { initialiserVideo } from "js/video.js";
import { initialiserKonto, settInnProfilbilde } from "./konto.js";

// Tilstandsvariabler
let avspillerAktiv = false;
let forrigeSide = 'hjem';
let altInnhold = []; // Lagrer alt innhold fra Firestore for søk og visning

// Mapping dersom en menyknapp peker på en seksjon som mangler i HTML
const sideMapping = {
    'film': 'hjem',
    'nyheter': 'hjem',
    'min-liste': 'hjem'
};

// 1. Sjekk innlogging og initialiser applikasjonen
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded: Initialiserer auth-sjekk...");

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            console.warn("Ingen bruker innlogget. Omdirigerer til Innlogging.html");
            window.location.href = "Innlogging.html";
        } else {
            console.log("Bruker er innlogget:", user.uid);
            
            if (typeof settInnProfilbilde === 'function') {
                settInnProfilbilde();
            }

            const startSide = window.location.hash.replace('#', '') || 'hjem';
            byttSide(startSide, false);

            // Hent både filmer og serier fra Firestore
            hentInnholdFraFirestore();
        }
    });

    // Initialiser eksterne moduler
    if (typeof initialiserHovedside === 'function') initialiserHovedside();
    if (typeof initialiserKonto === 'function') initialiserKonto();
    if (typeof initialiserVideo === 'function') initialiserVideo();

    initialiserAvspillerKontroller();
    initialiserScrollLyttere();
    initialiserGalleriRulling();
    initialiserLenkeLyttere();
    initialiserSokefelt();
    fjernPageLoader();
});

// Lytt til frem/tilbake-knapper i nettleseren (SPA history support)
window.addEventListener('popstate', (e) => {
    const side = e.state?.side || window.location.hash.replace('#', '') || 'hjem';
    byttSide(side, false);
});

// Lytt til endringer i localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'profilbilde' && typeof settInnProfilbilde === 'function') {
        settInnProfilbilde();
    }
});

// 2. Sidebytte og SPA-visningsstyring
export function byttSide(sideNavn, pushHistory = true) {
    if (sideNavn !== 'avspiller') {
        forrigeSide = sideNavn;
        stoppOgNullstillVideo();
    }

    let malId = sideNavn;
    if (!document.getElementById(`view-${sideNavn}`) && sideMapping[sideNavn]) {
        malId = sideMapping[sideNavn];
    }

    const targetSeksjon = document.getElementById(`view-${malId}`);

    if (!targetSeksjon) {
        console.warn(`Seksjonen 'view-${sideNavn}' finnes ikke. Omdirigerer til 'view-hjem'.`);
        byttSide('hjem', pushHistory);
        return;
    }

    if (pushHistory) {
        history.pushState({ side: sideNavn }, '', `#${sideNavn}`);
    }

    const navbar = document.querySelector('.top-nav') || document.querySelector('nav');
    const footer = document.querySelector('footer');

    if (sideNavn === 'avspiller') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
        document.body.style.overflow = 'hidden';
        document.documentElement.style.overflow = 'hidden';
    } else {
        if (navbar) navbar.style.display = 'flex';
        if (footer) footer.style.display = 'block';
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }

    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    targetSeksjon.style.display = 'block';

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });

    const aktivLink = document.getElementById(`link-${sideNavn}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    if (sideNavn === 'avspiller') {
        avspillerAktiv = true;
    }

    nullstillScrollPosisjon();
}

// 3. Firestore-integrasjon for Henting av Filmer og Serier
export async function hentInnholdFraFirestore() {
    console.log("Starter henting av innhold fra Firestore...");
    try {
        const [filmerSnapshot, serierSnapshot] = await Promise.all([
            getDocs(collection(db, "filmer")),
            getDocs(collection(db, "serier"))
        ]);

        console.log(`Hentet ${filmerSnapshot.size} filmer og ${serierSnapshot.size} serier.`);

        const filmerData = [];
        filmerSnapshot.forEach(doc => filmerData.push({ id: doc.id, mediatype: 'film', ...doc.data() }));

        const serierData = [];
        serierSnapshot.forEach(doc => serierData.push({ id: doc.id, mediatype: 'serie', ...doc.data() }));

        // Lagrer alt innhold i en global liste for søk og gjenbruk
        altInnhold = [...filmerData, ...serierData];

        // Oppdaterer alle relevante gallerier og seksjoner
        byggGalleriUI(["filmer-container", "filmer-galleri", "filmer-seksjon", "alle-filmer-seksjon"], filmerData);
        byggGalleriUI(["serier-container", "serier-galleri", "serier-seksjon", "alle-serier-oversikt-galleri"], serierData);

    } catch (error) {
        console.error("Feil ved henting av innhold fra Firestore:", error);
    }
}

// Hjelpefunksjon for å generere HTML-kort for filmer og serier
function byggGalleriUI(containerMuligheter, dataListe) {
    const IDer = Array.isArray(containerMuligheter) ? containerMuligheter : [containerMuligheter];

    const funneContainere = IDer
        .map(id => document.getElementById(id))
        .filter(el => el !== null);

    if (funneContainere.length === 0) {
        console.warn(`Fant ingen HTML-container for ID-ene: ${IDer.join(", ")}.`);
        return;
    }

    if (!dataListe || dataListe.length === 0) {
        console.warn(`Ingen elementer å vise for ${IDer.join(", ")}.`);
        return;
    }

    funneContainere.forEach(container => {
        container.innerHTML = ""; // Tøm statisk innhold

        dataListe.forEach((item) => {
            const bildeUrl = item.poster || item.bilde || item.bildeUrl || item.posterVertikal || 'placeholder.jpg';
            const tittel = item.tittel || item.tittelNavn || "Uten tittel";
            const videoUrl = item.videoUrl || item.trailer || item.video || '';

            const kort = document.createElement("div");
            kort.className = "media-card";
            kort.innerHTML = `
                <img src="${bildeUrl}" alt="${tittel}" loading="lazy">
                <p class="media-title">${tittel}</p>
            `;

            kort.addEventListener("click", () => {
                // Sjekk om filminfo-modulen skal trigges
                if (typeof initialiserFilminfo === 'function') {
                    initialiserFilminfo(item);
                }

                if (videoUrl) {
                    apneAvspiller(videoUrl, tittel);
                } else {
                    console.warn(`Ingen video-URL registrert for "${tittel}"`);
                }
            });

            container.appendChild(kort);
        });
    });
}

// 4. Interaktivitet og navigering
function initialiserLenkeLyttere() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a[data-side]');
        if (target) {
            e.preventDefault();
            const side = target.getAttribute('data-side');
            byttSide(side);
        }
    });
}

function nullstillScrollPosisjon() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

export function rullRad(radElement, retning) {
    const rad = typeof radElement === 'string' ? document.getElementById(radElement) : radElement;
    if (!rad) return;

    const endring = retning === 'venstre' ? -500 : 500;
    rad.scrollBy({
        left: endring,
        behavior: 'smooth'
    });
}

function initialiserGalleriRulling() {
    const wrappers = document.querySelectorAll('.gallery-wrapper, .continue-gallery-wrapper');

    wrappers.forEach(wrapper => {
        const galleri = wrapper.querySelector('.image-gallery, .continue-image-gallery, .top10-gallery');
        const venstreKnapp = wrapper.querySelector('.scroll-button.left');
        const hoyreKnapp = wrapper.querySelector('.scroll-button.right');

        if (galleri && venstreKnapp) {
            venstreKnapp.addEventListener('click', () => rullRad(galleri, 'venstre'));
        }
        if (galleri && hoyreKnapp) {
            hoyreKnapp.addEventListener('click', () => rullRad(galleri, 'høyre'));
        }
    });
}

function initialiserScrollLyttere() {
    const navbar = document.querySelector('.top-nav') || document.querySelector('nav');

    window.addEventListener('scroll', () => {
        if (navbar) {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        }
    });
}

function fjernPageLoader() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';

        document.querySelectorAll('.page-loader-seksjon').forEach(el => {
            el.style.display = 'none';
        });
    }, 500);
}

// 5. Videospiller
export function apneAvspiller(videoUrl, tittel) {
    const videoEl = document.getElementById('video');
    const tittelEl = document.querySelector('.movie-title');

    if (videoEl && videoUrl) {
        videoEl.src = videoUrl;
        videoEl.load();
        videoEl.play().catch(err => console.log("Autoplay krevde brukerinteraksjon:", err));
    }

    if (tittelEl) {
        tittelEl.textContent = tittel || "Watch Nordic Video";
    }

    byttSide('avspiller');
}

export function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

export function gaTilbake() {
    stoppOgNullstillVideo();
    byttSide(forrigeSide);
}

// 6. Søkelogikk
function initialiserSokefelt() {
    const sokefelt = document.getElementById('sokefelt');
    if (sokefelt) {
        sokefelt.addEventListener('input', window.utforSok);
    }
}

window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const query = sokefelt ? sokefelt.value.trim().toLowerCase() : '';
    const resultaterContainer = document.getElementById('sokeResultater');

    if (!resultaterContainer) return;

    if (query === '') {
        resultaterContainer.innerHTML = '';
        return;
    }

    const treff = altInnhold.filter(item => {
        const tittel = (item.tittel || item.tittelNavn || '').toLowerCase();
        const sjanger = (item.sjanger || item.sjangere || item.sjKode || '').toString().toLowerCase();
        return tittel.includes(query) || sjanger.includes(query);
    });

    resultaterContainer.innerHTML = '';

    if (treff.length === 0) {
        resultaterContainer.innerHTML = '<p class="no-results">Ingen treff funnet.</p>';
        return;
    }

    treff.forEach(item => {
        const bildeUrl = item.poster || item.bilde || item.bildeUrl || 'placeholder.jpg';
        const tittel = item.tittel || "Uten tittel";
        const videoUrl = item.videoUrl || item.trailer || '';

        const kort = document.createElement("div");
        kort.className = "media-card";
        kort.innerHTML = `
            <img src="${bildeUrl}" alt="${tittel}" loading="lazy">
            <p class="media-title">${tittel}</p>
        `;

        kort.addEventListener("click", () => {
            if (typeof initialiserFilminfo === 'function') {
                initialiserFilminfo(item);
            }
            if (videoUrl) apneAvspiller(videoUrl, tittel);
        });

        resultaterContainer.appendChild(kort);
    });
};

function initialiserAvspillerKontroller() {
    const tilbakeKnapp = document.getElementById('backButton');
    if (tilbakeKnapp) {
        tilbakeKnapp.addEventListener('click', (e) => {
            e.preventDefault();
            gaTilbake();
        });
    }

    const bannerSeNa = document.getElementById('banner-se-na');
    if (bannerSeNa) {
        bannerSeNa.addEventListener('click', () => {
            apneAvspiller("https://www.w3schools.com/html/mov_bbb.mp4", "Big Buck Bunny");
        });
    }
}

// Globale eksporter for inline HTML-funksjoner
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
window.gaTilbake = gaTilbake;
window.rullRad = rullRad;
