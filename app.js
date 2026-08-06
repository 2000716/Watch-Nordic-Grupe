import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js"; // Sørg for at disse er med for å hente filmdata

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
            initialiserFilmKort(); // Aktiverer klikk på filmer
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

// 3. Hovedfunksjon for å bytte side uten blinking
function byttSide(sideNavn) {
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

    if (sideNavn === 'avspiller') {
        avspillerAktiv = true;
    }
}

// 4. Funksjon for å hente filminfo og vise filminfo-siden din
async function visFilmInfo(filmNavn) {
    if (!filmNavn) return;

    try {
        // Hent filmdata fra Firebase (sjekker 'filmer' og evt. 'serier')
        let docRef = doc(db, "filmer", filmNavn);
        let docSnap = await getDoc(docRef);
        let data = null;

        if (docSnap.exists()) {
            data = docSnap.data();
        } else {
            docRef = doc(db, "serier", filmNavn);
            docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                data = docSnap.data();
            }
        }

        if (data) {
            // HER PLASSERER DU KODEN DIN FOR Å FYLLE INN FILMINFO
            // Eksempel på å fylle inn elementer hvis de finnes i 'view-filminfo':
            const tittelEl = document.querySelector('#view-filminfo .filminfo-tittel');
            if (tittelEl) tittelEl.textContent = data.tittel || filmNavn;

            const beskrivelseEl = document.querySelector('#view-filminfo .filminfo-beskrivelse');
            if (beskrivelseEl) beskrivelseEl.textContent = data.beskrivelse || '';

            const bildeEl = document.querySelector('#view-filminfo .filminfo-bilde');
            if (bildeEl && data.bakgrunn) bildeEl.src = data.bakgrunn;

            // Bytter visning til filminfo-siden uten oppdatering
            byttSide('filminfo');
        } else {
            console.warn("Fant ikke film med navn:", filmNavn);
        }
    } catch (error) {
        console.error("Feil ved henting av filminfo:", error);
    }
}

// 5. Automatisk gjenkjenning av klikk på filmkort
function initialiserFilmKort() {
    // Bruker 'event delegation' slik at det også fungerer på filmer som lastes dynamisk inn
    document.body.addEventListener('click', (e) => {
        const filmKort = e.target.closest('.movie-card, [data-film-navn]');
        if (filmKort) {
            const filmNavn = filmKort.getAttribute('data-film-navn') || filmKort.dataset.navn;
            if (filmNavn) {
                e.preventDefault();
                visFilmInfo(filmNavn); // Åpner filminfo-koden din med riktig film
            }
        }
    });
}

// 6. Funksjon for å starte avspilleren med en gitt videolenke og tittel
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

// 7. Stopp video og nullstill
function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    avspillerAktiv = false;
}

// 8. Koble opp lyttere for knapper
function initialiserAvspillerKontroller() {
    const tilbakeKnapp = document.getElementById('backButton');
    if (tilbakeKnapp) {
        tilbakeKnapp.addEventListener('click', (e) => {
            e.preventDefault();
            stoppOgNullstillVideo();
            byttSide('hjem');
        });
    }

    // Legg også til en tilbake-knapp fra filminfo til hjem hvis du har en
    const filminfoTilbake = document.getElementById('filminfoTilbake');
    if (filminfoTilbake) {
        filminfoTilbake.addEventListener('click', (e) => {
            e.preventDefault();
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

// 9. GJØR FUNKSJONER TILGJENGELIG GLOBALMENT
window.byttSide = byttSide;
window.visFilmInfo = visFilmInfo;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
