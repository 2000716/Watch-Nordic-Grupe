import { auth } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// Tilstandsvariabler
let avspillerAktiv = false;
let forrigeSide = 'hjem';

// Mapping dersom en menyknapp peker på en seksjon som gjenbruker en eksisterende visning
const sideMapping = {
    'film': 'hjem',        // Hvis 'view-film' mangler, vis 'view-hjem'
    'nyheter': 'hjem',     // Hvis 'view-nyheter' mangler, vis 'view-hjem'
    'min-liste': 'hjem'    // Hvis 'view-min-liste' mangler, vis 'view-hjem'
};

// 1. Sjekk innlogging ved lasting
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
    fjernPageLoader();
});

// 2. Hent profilbilde fra localStorage
function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");

    if (menyBildeEl && lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        menyBildeEl.src = lagretBilde;
    }
}

// 3. Sidebytte og visningsstyring
export function byttSide(sideNavn) {
    if (sideNavn !== 'avspiller') {
        forrigeSide = sideNavn;
        stoppOgNullstillVideo();
    }

    // Sjekk om det finnes en reell ID for siden, ellers bruk fallback
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

    // Skjul navbar og footer automatisk i fullskjermspiller
    const navbar = document.querySelector('.top-nav') || document.querySelector('nav');
    const footer = document.querySelector('footer');

    if (sideNavn === 'avspiller') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
        document.body.style.overflow = 'hidden';
    } else {
        if (navbar) navbar.style.display = 'flex';
        if (footer) footer.style.display = 'block';
        document.body.style.overflow = 'auto';
    }

    // Skjul alle visninger
    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    // Vis den valgte seksjonen
    targetSeksjon.style.display = 'block';

    // Oppdater aktiv fane i menyen
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

    // Scroll til toppen ved sidebytte
    window.scrollTo(0, 0);
}

// Fjern/skjul loader etter at siden har lastet
function fjernPageLoader() {
    setTimeout(() => {
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';
        
        document.querySelectorAll('.page-loader-seksjon').forEach(el => {
            el.style.display = 'none';
        });
    }, 500);
}

// 4. Åpne og starte videospiller
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

// 5. Stopp video og nullstill
export function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

// 6. Naviger tilbake til forrige side
export function gaTilbake() {
    stoppOgNullstillVideo();
    byttSide(forrigeSide);
}

// 7. Utfør søk (kalles fra HTML via oninput)
window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const query = sokefelt ? sokefelt.value.trim() : '';
    console.log("Søker etter:", query);
};

// 8. Koble opp lyttere for avspiller
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
