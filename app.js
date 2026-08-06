import { auth } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// Tilstandsvariabler
let avspillerAktiv = false;
let forrigeSide = 'hjem';

// Mapping dersom en menyknapp peker på en seksjon som mangler i HTML (fallback)
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
            byttSide('hjem');
        }
    });

    initialiserAvspillerKontroller();
    initialiserScrollLyttere();
    initialiserGalleriRulling();
    fjernPageLoader();
});

// Lytt til endringer i localStorage (f.eks. når profilbilde endres i konto.js)
window.addEventListener('storage', (e) => {
    if (e.key === 'profilbilde') {
        settInnProfilbilde();
    }
});

// 2. Hent og oppdater profilbilde i menyen og på konto-siden
export function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");
    const kontoBildeEl = document.getElementById("profilbilde");

    if (lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        if (menyBildeEl) menyBildeEl.src = lagretBilde;
        if (kontoBildeEl) kontoBildeEl.src = lagretBilde;
    }
}

// 3. Sidebytte og visningsstyring
export function byttSide(sideNavn) {
    if (sideNavn !== 'avspiller') {
        forrigeSide = sideNavn;
        stoppOgNullstillVideo();
    }

    // Sjekk om det finnes en reell ID for siden, ellers bruk fallback fra sideMapping
    let malId = sideNavn;
    if (!document.getElementById(`view-${sideNavn}`) && sideMapping[sideNavn]) {
        malId = sideMapping[sideNavn];
    }

    const targetSeksjon = document.getElementById(`view-${malId}`);

    // Sikkerhet: Hvis målsiden mot formodning ikke finnes, gå til 'hjem'
    if (!targetSeksjon) {
        console.warn(`Seksjonen 'view-${sideNavn}' finnes ikke. Omdirigerer til 'view-hjem'.`);
        const hjemSeksjon = document.getElementById('view-hjem');
        if (hjemSeksjon) hjemSeksjon.style.display = 'block';
        return;
    }

    // Skjul/vis navbar og footer avhengig av om avspilleren er aktiv
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

    // Skjul alle visninger
    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    // Vis den valgte seksjonen
    targetSeksjon.style.display = 'block';

    // Oppdater aktiv fane i navigasjonsmenyen
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

    // Tilbakestill rulleposisjon til toppen av siden
    nullstillScrollPosisjon();
}

// Hjelpefunksjon for å tvinge scroll til toppen
function nullstillScrollPosisjon() {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// 4. Horisontal rulling for filmrader/kategorier
export function rullRad(radElement, retning) {
    const rad = typeof radElement === 'string' ? document.getElementById(radElement) : radElement;
    if (!rad) return;

    const endring = retning === 'venstre' ? -500 : 500;
    rad.scrollBy({
        left: endring,
        behavior: 'smooth'
    });
}

// Automatisk oppkobling av pilknapper i alle galleri-seksjoner
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

// 5. Generelle scroll-lyttere (mørkere toppmeny ved rulling)
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

// Skjul loader-animasjonen etter at siden har lastet
function fjernPageLoader() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';

        document.querySelectorAll('.page-loader-seksjon').forEach(el => {
            el.style.display = 'none';
        });
    }, 500);
}

// 6. Åpne og starte videospiller
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

// 7. Stopp video og nullstill
export function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

// 8. Naviger tilbake til forrige side
export function gaTilbake() {
    stoppOgNullstillVideo();
    byttSide(forrigeSide);
}

// 9. Utfør søk (kalles fra HTML via oninput)
window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const query = sokefelt ? sokefelt.value.trim().toLowerCase() : '';
    const resultaterContainer = document.getElementById('sokeResultater');

    if (!resultaterContainer) return;

    if (query === '') {
        resultaterContainer.innerHTML = '';
        return;
    }

    // Søkelogikk utvides i app.js eller egnede moduler
    console.log("Søker etter:", query);
};

// 10. Koble opp lyttere for avspiller
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

// Global eksponering for inline HTML-eventer
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
window.gaTilbake = gaTilbake;
window.rullRad = rullRad;
window.settInnProfilbilde = settInnProfilbilde;
