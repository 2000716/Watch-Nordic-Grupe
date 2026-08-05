import { auth } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// Global variabel for å holde styr på om spilleren er i gang eller om videoen spilles
let avspillerAktiv = false;

// 1. Sjekk innlogging med en gang siden lastes
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            // Ikke logget inn -> Kast brukeren til innloggingssiden
            window.location.href = "Innlogging.html";
        } else {
            // Logget inn -> Hent profilbilde og åpne startsiden
            settInnProfilbilde();
            byttSide('hjem');
        }
    });

    // Koble opp standard lyttere for avspilleren
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

// 3. Hovedfunksjon for å bytte side uten blinking
function byttSide(sideNavn) {
    // Hvis vi forlater avspilleren, stopp videoen for å spare ressurser
    if (sideNavn !== 'avspiller') {
        stoppOgNullstillVideo();
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

    // 3. Oppdater hvilken meny-knapp som lyser opp (hvis knappen finnes)
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    const aktivLink = document.getElementById(`link-${sideNavn}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    // 4. Start funksjonene for den spesifikke siden
    if (sideNavn === 'hjem') {
        // Eksempel: lastInnStartsiden();
    } else if (sideNavn === 'serier') {
        // lastInnSerierFraFirebase();
    } else if (sideNavn === 'film') {
        // lastInnFilmFraFirebase();
    } else if (sideNavn === 'nyheter') {
        // lastInnWatchOriginals();
    } else if (sideNavn === 'min-liste') {
        // lastInnMinListe();
    } else if (sideNavn === 'sok') {
        // klargjorSokefelt();
    } else if (sideNavn === 'avspiller') {
        avspillerAktiv = true;
    }
}

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

// 5. Stopp video og gå tilbake
function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

// 6. Koble opp knapper inni videospilleren (Tilbake-knapp etc.)
function initialiserAvspillerKontroller() {
    const tilbakeKnapp = document.getElementById('backButton');
    if (tilbakeKnapp) {
        tilbakeKnapp.addEventListener('click', (e) => {
            e.preventDefault();
            stoppOgNullstillVideo();
            byttSide('hjem'); // Hopper tilbake til hjem, eller du kan lagre forrige side
        });
    }

    // Eksempel på knytting mot "Se nå"-knappen i Hjem-banneret
    const bannerSeNa = document.getElementById('banner-se-na');
    if (bannerSeNa) {
        bannerSeNa.addEventListener('click', () => {
            // Erstatt med din faktiske videostrekk og tittel
            apneAvspiller("https://www.w3schools.com/html/mov_bbb.mp4", "Big Buck Bunny");
        });
    }
}

// Gjør funksjonene tilgjengelige globalt for HTML-en
window.byttSide = byttSide;
window.apneAvspiller = apneAvspiller;
