import { auth } from "./firebase-oppsett.js"; // Sjekk at filnavnet matcher ditt Firebase-oppsett
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

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
});

// 2. Henter profilbilde fra localStorage uten blinking
function settInnProfilbilde() {
    const lagretBilde = localStorage.getItem("profilbilde");
    const menyBildeEl = document.getElementById("menyProfilbilde");

    if (menyBildeEl && lagretBilde && lagretBilde !== "null" && lagretBilde.trim() !== "") {
        menyBildeEl.src = lagretBilde;
    }
}

// 3. Styrer navigasjonen mellom de ulike seksjonene sømløst
function byttSide(sideNavn) {
    // Skjul alle seksjoner
    document.querySelectorAll('.side-visning').forEach(seksjon => {
        seksjon.style.display = 'none';
    });

    // Vis den valgte seksjonen
    const aktivSeksjon = document.getElementById(`view-${sideNavn}`);
    if (aktivSeksjon) {
        aktivSeksjon.style.display = 'block';
    }

    // Oppdater aktiv klasse i menyen
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.classList.remove('active');
    });
    const aktivLink = document.getElementById(`link-${sideNavn}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    // Eksempel på lasting av spesifikk data for sidene
    if (sideNavn === 'filmer') {
        // lastInnFilmerFraFirebase();
    } else if (sideNavn === 'serier') {
        // lastInnSerierFraFirebase();
    }
}

// Gjør funksjonen tilgjengelig for HTML-en (onclick)
window.byttSide = byttSide;
