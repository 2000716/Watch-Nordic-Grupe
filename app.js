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

// 3. Hovedfunksjon for å bytte side uten blinking
function byttSide(sideNavn) {
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

    // 4. Start funksjonene for den spesifikke siden
    if (sideNavn === 'hjem') {
        // Eksempel: lastInnStartsiden();
    } else if (sideNavn === 'serier') {
        // Her kaller du på funksjonen fra din gamle serier.js som henter data fra Firebase!
        // Eksempel: lastInnSerierFraFirebase();
    } else if (sideNavn === 'film') {
        // Eksempel: lastInnFilmFraFirebase();
    } else if (sideNavn === 'nyheter') {
        // Eksempel: lastInnWatchOriginals();
    } else if (sideNavn === 'min-liste') {
        // Eksempel: lastInnMinListe();
    } else if (sideNavn === 'sok') {
        // Eksempel: klargjorSokefelt();
    }
}

// Gjør funksjonen tilgjengelig for HTML-en (onclick)
window.byttSide = byttSide;
