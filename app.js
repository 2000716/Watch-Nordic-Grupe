import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

import { initialiserHovedside } from "./js/hovedside.js";
import { initialiserFilminfo } from "./js/filminfo.js";
import { initialiserVideo } from "./js/video.js";
import { initialiserKonto, settInnProfilbilde } from "./js/konto.js";

let forrigeSide = 'hjem';
let altInnhold = [];

const sideMapping = {
    'film': 'hjem',
    'nyheter': 'hjem',
    'min-liste': 'hjem'
};

window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "Innlogging.html";
        } else {
            if (typeof settInnProfilbilde === 'function') settInnProfilbilde();
            const startSide = window.location.hash.replace('#', '') || 'hjem';
            byttSide(startSide, false);
            hentInnholdFraFirestore();
        }
    });

    if (typeof initialiserHovedside === 'function') initialiserHovedside();
    if (typeof initialiserKonto === 'function') initialiserKonto();
    if (typeof initialiserVideo === 'function') initialiserVideo();

    initialiserAvspillerKontroller();
    initialiserLenkeLyttere();
    fjernPageLoader();
});

window.addEventListener('popstate', (e) => {
    const side = e.state?.side || window.location.hash.replace('#', '') || 'hjem';
    byttSide(side, false);
});

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
        byttSide('hjem', pushHistory);
        return;
    }

    if (pushHistory) {
        history.pushState({ side: sideNavn }, '', `#${sideNavn}`);
    }

    const navbar = document.querySelector('.top-nav');
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

    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

export async function hentInnholdFraFirestore() {
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

        byggGalleriUI(["filmer-container", "filmer-galleri", "nye-filmer-galleri"], filmerData);
        byggGalleriUI(["serier-container", "serier-galleri", "alle-serier-oversikt-galleri"], serierData);

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
            const bildeUrl = item.poster || item.bilde || 'placeholder.jpg';
            const tittel = item.tittel || "Uten tittel";
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

function initialiserLenkeLyttere() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('a[data-side]');
        if (target) {
            e.preventDefault();
            byttSide(target.getAttribute('data-side'));
        }
    });
}

function fjernPageLoader() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';
    }, 500);
}

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
}

export function gaTilbake() {
    stoppOgNullstillVideo();
    byttSide(forrigeSide);
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
        const sjanger = (item.sjanger || '').toString().toLowerCase();
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

window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.gaTilbake = gaTilbake;
