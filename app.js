import { auth, db } from "./firebase-oppsett.js"; // Sørg for at db er importert herfra om du bruker den her
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { initFilmMal } from "./film-mal-spa.js"; // Modulen vi lagde for filmmalen

// Global variabel for å holde styr på om spilleren er i gang
let avspillerAktiv = false;

// 1. Sjekk innlogging med en gang siden lastes
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "Innlogging.html";
        } else {
            settInnProfilbilde();
            byttSide('hjem');
            // Last inn film-kort og lyttere når siden er klar
            initialiserFilmKort();
        }
    });

    initialiserAvspillerKontroller();
});

// 2. Henter profilbilde fra localStorage uten blinking
function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");

    if (menyBildeEl && lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        menyBildeEl.src = lagretBilde;
    }
}

// 3. Utvidet hovedfunksjon for å bytte side (støtter nå parametere til f.eks. filmmal)
function byttSide(sideNavn, params = {}) {
    if (sideNavn !== 'avspiller') {
        stoppOgNullstillVideo();
    }

    const navbar = document.querySelector('.navbar') || document.querySelector('nav');
    const footer = document.querySelector('footer');

    if (sideNavn === 'avspiller') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
    } else {
        if (navbar) navbar.style.display = 'flex';
        if (footer) footer.style.display = 'block';
    }

    // 1. Skjul alle seksjoner
    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    // 2. Vis den seksjonen brukeren trykket på
    const aktivSeksjon = document.getElementById(`view-${sideNavn}`);
    if (aktivSeksjon) {
        aktivSeksjon.style.display = 'block';
    }

    // 3. Oppdater hvilken meny-knapp som lyser opp
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    const aktivLink = document.getElementById(`link-${sideNavn}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    // 4. Spesifikk logikk per side
    if (sideNavn === 'avspiller') {
        avspillerAktiv = true;
    } else if (sideNavn === 'filmmal') {
        // Initialiser filmmalen dynamisk med filmens navn/parametere
        initFilmMal(params);
    }
}

// Global hjelpefunksjon for SPA-navigering som moduler kan kalle på
window.navigateTo = function(side, params) {
    byttSide(side, params);
};

// 4. Funksjon for å starte avspilleren med en gitt videolenke og tittel
function apneAvspiller(videoUrl, tittel) {
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
function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

// 6. Automatisk gjenkjenning og klikk-håndtering for film-kort på tvers av sidene
function initialiserFilmKort() {
    // Bruk "event delegation" på dokumentet slik at også dynamisk lastede filmer fungerer
    document.body.addEventListener('click', (e) => {
        const filmKort = e.target.closest('.movie-card, [data-film-navn]');
        if (filmKort) {
            const filmNavn = filmKort.getAttribute('data-film-navn') || filmKort.dataset.navn;
            if (filmNavn) {
                e.preventDefault();
                byttSide('filmmal', { navn: filmNavn });
            }
        }
    });
}

// 7. Koble opp lyttere for knapper
function initialiserAvspillerKontroller() {
    const tilbakeKnapp = document.getElementById('backButton');
    if (tilbakeKnapp) {
        tilbakeKnapp.addEventListener('click', (e) => {
            e.preventDefault();
            stoppOgNullstillVideo();
            byttSide('hjem');
        });
    }

    const bannerSeNa = document.getElementById('banner-se-na');
    if (bannerSeNa) {
        bannerSeNa.addEventListener('click', () => {
            apneAvspiller("https://www.w3schools.com/html/mov_bbb.mp4", "Big Buck Bunny");
        });
    }
}

// 8. GJØR FUNKSJONER TILGJENGELIG GLOBALMENT
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
