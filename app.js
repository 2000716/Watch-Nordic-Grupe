import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Global variabel for avspillerstatus
let avspillerAktiv = false;

// 1. Initialisering ved oppstart
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "Innlogging.html";
        } else {
            settInnProfilbilde();
            
            const startSide = window.location.hash.replace('#', '') || 'hjem';
            byttSide(startSide);
        }
    });

    // Registrer globale klikklyttere og kontroller én gang
    initialiserFilmKortLytter();
    initialiserAvspillerKontroller();
});

// Lytter til endringer i URL-hash
window.addEventListener('hashchange', () => {
    const sideNavn = window.location.hash.replace('#', '') || 'hjem';
    byttSide(sideNavn);
});

// 2. Henter profilbilde fra localStorage
function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");

    if (menyBildeEl && lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        menyBildeEl.src = lagretBilde;
    }
}

// 3. Hovedfunksjon for sidebytte (SPA)
export function byttSide(sideNavn) {
    if (sideNavn !== 'avspiller') {
        stoppOgNullstillVideo();
    }

    const header = document.querySelector('.top-nav') || document.querySelector('header');
    const footer = document.querySelector('footer');

    if (sideNavn === 'avspiller') {
        if (header) header.style.display = 'none';
        if (footer) footer.style.display = 'none';
    } else {
        if (header) header.style.display = 'flex';
        if (footer) footer.style.display = 'block';
    }

    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    const aktivSeksjon = document.getElementById(`view-${sideNavn}`);
    if (aktivSeksjon) {
        aktivSeksjon.style.display = 'block';
        window.scrollTo(0, 0);
    } else {
        const hjemSeksjon = document.getElementById('view-hjem');
        if (hjemSeksjon) hjemSeksjon.style.display = 'block';
    }

    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    
    const aktivLink = document.getElementById(`link-${sideNavn}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    avspillerAktiv = (sideNavn === 'avspiller');
}

// 4. Viser informasjonsside for film/serie
export async function visFilmInfo(filmId) {
    if (!filmId) {
        console.error("visFilmInfo ble kalt uten filmId");
        return;
    }

    try {
        // Sjekk først 'filmer'-samlingen
        let docRef = doc(db, "filmer", filmId);
        let docSnap = await getDoc(docRef);
        let data = null;

        if (docSnap.exists()) {
            data = docSnap.data();
        } else {
            // Dersom den ikke finnes i 'filmer', sjekk 'serier'
            docRef = doc(db, "serier", filmId);
            docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                data = docSnap.data();
            }
        }

        if (data) {
            const container = document.getElementById('view-filminfo');
            if (container) {
                const tittelEl = container.querySelector('.movie-title, .description');
                const bakgrunnEl = document.getElementById('backgroundImage');
                const logoEl = container.querySelector('.logo-container img');

                if (bakgrunnEl && data.bakgrunn) bakgrunnEl.src = data.bakgrunn;
                if (logoEl && data.logo) logoEl.src = data.logo;
                if (tittelEl && data.beskrivelse) tittelEl.textContent = data.beskrivelse;
            }

            byttSide('filminfo');
        } else {
            console.warn(`Fant intet dokument i hverken 'filmer' eller 'serier' med ID: "${filmId}"`);
        }
    } catch (error) {
        console.error("Feil ved henting av filminfo fra Firestore:", error);
    }
}

// 5. Event Delegation: Fanger opp klikk på filmkort uansett når de opprettes i DOM-en
function initialiserFilmKortLytter() {
    document.addEventListener('click', (e) => {
        const kort = e.target.closest('.gallery-item, .top10-item');
        if (kort) {
            e.preventDefault();
            const filmId = kort.getAttribute('data-id');
            
            if (filmId) {
                visFilmInfo(filmId);
            } else {
                console.warn("Elementet mangler 'data-id'-attributt:", kort);
            }
        }
    });
}

// 6. Hjelpefunksjoner for videoavspiller
function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
}

function initialiserAvspillerKontroller() {
    const backBtn = document.getElementById('backButton');
    if (backBtn) {
        backBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.history.back();
        });
    }
}

// Eksporter til globalt skop for inline HTML-kall
window.byttSide = byttSide;
window.visFilmInfo = visFilmInfo;
