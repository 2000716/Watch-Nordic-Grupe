import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Tilstandsvariabler
let avspillerAktiv = false;
let forrigeSide = 'hjem';

// Mapping dersom en menyknapp peker på en seksjon som mangler i HTML
const sideMapping = {
    'film': 'hjem',
    'nyheter': 'hjem',
    'min-liste': 'hjem'
};

// 1. Sjekk innlogging og initialiser applikasjonen
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "Innlogging.html";
        } else {
            settInnProfilbilde();

            // Les gjeldende side fra URL-hash eller standard 'hjem'
            const startSide = window.location.hash.replace('#', '') || 'hjem';
            byttSide(startSide, false);

            // Hent både filmer og serier fra Firestore
            hentInnholdFraFirestore();
        }
    });

    initialiserAvspillerKontroller();
    initialiserScrollLyttere();
    initialiserGalleriRulling();
    initialiserLenkeLyttere();
    fjernPageLoader();
});

// Lytt til frem/tilbake-knapper i nettleseren (SPA history support)
window.addEventListener('popstate', (e) => {
    const side = e.state?.side || window.location.hash.replace('#', '') || 'hjem';
    byttSide(side, false);
});

// Lytt til endringer i localStorage
window.addEventListener('storage', (e) => {
    if (e.key === 'profilbilde') {
        settInnProfilbilde();
    }
});

// 2. Profilbilde
export function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");
    const kontoBildeEl = document.getElementById("profilbilde");

    if (lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        if (menyBildeEl) menyBildeEl.src = lagretBilde;
        if (kontoBildeEl) kontoBildeEl.src = lagretBilde;
    }
}

// 3. Sidebytte og SPA-visningsstyring
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

// 4. Firestore-integrasjon for Henting av Filmer og Serier
export async function hentInnholdFraFirestore() {
    try {
        // Hent filmer og serier samtidig i parallell
        const [filmerSnapshot, serierSnapshot] = await Promise.all([
            getDocs(collection(db, "filmer")),
            getDocs(collection(db, "serier"))
        ]);

        byggGalleriUI("filmer-container", filmerSnapshot);
        byggGalleriUI("serier-container", serierSnapshot);

    } catch (error) {
        console.error("Feil ved henting av innhold fra Firestore:", error);
    }
}

// Hjelpefunksjon for å generere HTML-kort for filmer og serier
function byggGalleriUI(containerId, snapshot) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Tøm eksisterende statisk innhold

    snapshot.forEach((doc) => {
        const item = doc.data();

        const kort = document.createElement("div");
        kort.className = "media-card";
        kort.innerHTML = `
            <img src="${item.poster || item.bildeUrl || 'placeholder.jpg'}" alt="${item.tittel}">
            <p class="media-title">${item.tittel}</p>
        `;

        // Klikk på bildet åpner videospilleren direkte
        kort.addEventListener("click", () => {
            apneAvspiller(item.videoUrl, item.tittel);
        });

        container.appendChild(kort);
    });
}

// 5. Interaktivitet og navgering
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

// 6. Videospiller
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

// 7. Søkelogikk
window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const query = sokefelt ? sokefelt.value.trim().toLowerCase() : '';
    const resultaterContainer = document.getElementById('sokeResultater');

    if (!resultaterContainer) return;

    if (query === '') {
        resultaterContainer.innerHTML = '';
        return;
    }

    console.log("Søker etter:", query);
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

// Globale eksporter
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
window.gaTilbake = gaTilbake;
window.rullRad = rullRad;
window.settInnProfilbilde = settInnProfilbilde;
