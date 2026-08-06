import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Import fra egne moduler i js-mappen
import { initialiserHovedside } from "./js/hovedside.js";
import { initialiserFilminfo } from "./js/filminfo.js";
import { initialiserVideo } from "./js/video.js";
import { initialiserKonto, settInnProfilbilde } from "./js/konto.js";

let avspillerAktiv = false;
let forrigeSide = 'hjem';
let altInnhold = [];

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
            hentInnholdFraFirestore();
        }
    });

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

window.addEventListener('popstate', (e) => {
    const side = e.state?.side || window.location.hash.replace('#', '') || 'hjem';
    byttSide(side, false);
});

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
    } else {
        if (navbar) navbar.style.display = 'flex';
        if (footer) footer.style.display = 'block';
        document.body.style.overflow = '';
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

// 3. Firestore-integrasjon
export async function hentInnholdFraFirestore() {
    console.log("Starter henting av innhold fra Firestore...");
    try {
        const [filmerSnapshot, serierSnapshot] = await Promise.all([
            getDocs(collection(db, "filmer")),
            getDocs(collection(db, "serier"))
        ]);

        const filmerData = [];
        filmerSnapshot.forEach(doc => {
            filmerData.push({ id: doc.id, mediatype: 'film', ...doc.data() });
        });

        const serierData = [];
        serierSnapshot.forEach(doc => {
            serierData.push({ id: doc.id, mediatype: 'serie', ...doc.data() });
        });

        altInnhold = [...filmerData, ...serierData];

        byggGalleriUI(["filmer-container", "filmer-galleri"], filmerData);
        byggGalleriUI(["serier-container", "serier-galleri"], serierData);

    } catch (error) {
        console.error("Feil ved henting av innhold fra Firestore:", error);
    }
}

function byggGalleriUI(containerMuligheter, dataListe) {
    const IDer = Array.isArray(containerMuligheter) ? containerMuligheter : [containerMuligheter];
    const funneContainere = IDer.map(id => document.getElementById(id)).filter(el => el !== null);

    if (funneContainere.length === 0 || !dataListe) return;

    funneContainere.forEach(container => {
        container.innerHTML = "";
        dataListe.forEach((item) => {
            const bildeUrl = item.poster || item.posterVertikal || item.bilde || 'placeholder.jpg';
            const tittel = item.tittel || item.tittelNavn || "Uten tittel";
            const videoUrl = item.videoUrl || item.trailer || '';

            const kort = document.createElement("div");
            kort.className = "media-card";
            kort.innerHTML = `
                <img src="${bildeUrl}" alt="${tittel}" loading="lazy">
                <p class="media-title">${tittel}</p>
            `;

            kort.addEventListener("click", () => {
                if (typeof initialiserFilminfo === 'function') initialiserFilminfo(item);
                if (videoUrl) apneAvspiller(videoUrl, tittel);
            });

            container.appendChild(kort);
        });
    });
}

// 4. Navigasjon og rulling
function initialiserLenkeLyttere() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a[data-side]');
        if (target) {
            e.preventDefault();
            byttSide(target.getAttribute('data-side'));
        }
    });
}

function nullstillScrollPosisjon() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

export function rullRad(radElement, retning) {
    const rad = typeof radElement === 'string' ? document.getElementById(radElement) : radElement;
    if (!rad) return;
    rad.scrollBy({ left: retning === 'venstre' ? -500 : 500, behavior: 'smooth' });
}

function initialiserGalleriRulling() {
    document.querySelectorAll('.gallery-wrapper').forEach(wrapper => {
        const galleri = wrapper.querySelector('.image-gallery');
        const venstre = wrapper.querySelector('.scroll-button.left');
        const hoyre = wrapper.querySelector('.scroll-button.right');

        if (galleri && venstre) venstre.addEventListener('click', () => rullRad(galleri, 'venstre'));
        if (galleri && hoyre) hoyre.addEventListener('click', () => rullRad(galleri, 'høyre'));
    });
}

function initialiserScrollLyttere() {
    const navbar = document.querySelector('.top-nav');
    window.addEventListener('scroll', () => {
        if (navbar) {
            navbar.classList.toggle('scrolled', window.scrollY > 50);
        }
    });
}

function fjernPageLoader() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';
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
    if (tittelEl) tittelEl.textContent = tittel || "Video";
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
    if (sokefelt) sokefelt.addEventListener('input', window.utforSok);
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
        const sjanger = (item.sjanger || item.sjangere || '').toString().toLowerCase();
        return tittel.includes(query) || sjanger.includes(query);
    });

    resultaterContainer.innerHTML = treff.length === 0 ? '<p class="no-results">Ingen treff funnet.</p>' : '';

    treff.forEach(item => {
        const bildeUrl = item.poster || item.bilde || 'placeholder.jpg';
        const tittel = item.tittel || "Uten tittel";
        const videoUrl = item.videoUrl || item.trailer || '';

        const kort = document.createElement("div");
        kort.className = "media-card";
        kort.innerHTML = `<img src="${bildeUrl}" alt="${tittel}"><p>${tittel}</p>`;
        kort.addEventListener("click", () => {
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
}

// Globale eksporter
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.gaTilbake = gaTilbake;
