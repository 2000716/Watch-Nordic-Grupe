/**
 * APP.JS - Hovedfil for routing, søk og global tilstandshåndtering
 */

// 1. Importer Firebase-moduler
import { auth, db } from './firebase-oppsett.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, query, orderBy, startAt, endAt, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Hjelpefunksjon for å forhindre XSS-angrep i HTML-strender
function sanitizeInput(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================
// 2. Ruting / Navigasjon (SPA-logikk)
// ==========================================
window.byttSide = function(sideId) {
    const alleSider = document.querySelectorAll('.side-visning');
    alleSider.forEach(side => {
        side.style.display = 'none';
    });

    const valgtSide = document.getElementById(`view-${sideId}`);
    if (valgtSide) {
        valgtSide.style.display = 'block';
    } else {
        console.error(`Siden med id 'view-${sideId}' ble ikke funnet.`);
        return;
    }

    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
    });

    const aktivLink = document.getElementById(`link-${sideId}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    if (window.location.hash !== `#${sideId}`) {
        window.history.pushState(null, null, `#${sideId}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const event = new CustomEvent('sideByttet', { detail: { side: sideId } });
    document.dispatchEvent(event);
};

// ==========================================
// 3. Firebase Auth - Sjekk innloggingstilstand
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Bruker er logget inn:", user.email);
        const kontoLink = document.getElementById('konto-lenke');
        if (kontoLink) kontoLink.textContent = 'Min Konto';
    } else {
        console.log("Ingen bruker er logget inn.");
        const kontoLink = document.getElementById('konto-lenke');
        if (kontoLink) kontoLink.textContent = 'Logg inn';
    }
});

// ==========================================
// 4. Firebase Firestore - Søkefunksjon
// ==========================================
let sokDebounceTimer = null;

window.utforSok = async function() {
    const sokefelt = document.getElementById('sokefelt');
    const resultaterContainer = document.getElementById('sokeResultater');
    
    if (!sokefelt || !resultaterContainer) return;

    const queryTekst = sokefelt.value.trim().toLowerCase();

    if (queryTekst.length > 2) {
        resultaterContainer.innerHTML = `<div style="padding: 20px; color: white;">Laster resultater for "<strong>${sanitizeInput(queryTekst)}</strong>"...</div>`;

        try {
            const filmerRef = collection(db, "filmer");
            
            // Prefix-søk på sokeTittel
            const q = query(
                filmerRef,
                orderBy("sokeTittel"),
                startAt(queryTekst),
                endAt(queryTekst + '\uf8ff')
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                resultaterContainer.innerHTML = `<div style="padding: 20px; color: white;">Ingen treff på "<strong>${sanitizeInput(queryTekst)}</strong>"</div>`;
                return;
            }

            // Bygg HTML trygt
            resultaterContainer.innerHTML = "";
            const grid = document.createElement("div");
            grid.className = "soke-grid";
            grid.style.cssText = "display: flex; gap: 15px; flex-wrap: wrap;";

            querySnapshot.forEach((docSnap) => {
                const film = docSnap.data();
                const docId = docSnap.id;
                const tittel = sanitizeInput(film.tittel || "Uten tittel");
                const bildeUrl = film.bildeUrl || film.poster || film.bakgrunn || 'placeholder.jpg';

                const kort = document.createElement("div");
                kort.className = "film-kort";
                kort.style.cssText = "cursor: pointer; max-width: 150px;";
                
                kort.innerHTML = `
                    <img src="${sanitizeInput(bildeUrl)}" alt="${tittel}" style="width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 2/3;">
                    <h4 style="color: white; margin-top: 5px; font-size: 14px;">${tittel}</h4>
                `;

                // Åpne filminfo ved klikk
                kort.addEventListener("click", () => {
                    window.byttSide('filminfo');
                    if (typeof window.renderFilmPage === "function") {
                        window.renderFilmPage(docId);
                    }
                });

                grid.appendChild(kort);
            });

            resultaterContainer.appendChild(grid);

        } catch (error) {
            console.error("Feil ved henting av søkeresultater:", error);
            resultaterContainer.innerHTML = `<div style="padding: 20px; color: red;">Det oppstod en feil under søket.</div>`;
        }
    } else {
        resultaterContainer.innerHTML = ''; 
    }
};

// ==========================================
// 5. Initialisering ved sidelasting
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Sjekk URL hash for oppstartsside
    let initialSide = window.location.hash.replace('#', '');
    
    if (!initialSide || !document.getElementById(`view-${initialSide}`)) {
        initialSide = 'hjem';
    }

    window.byttSide(initialSide);

    // Lytt til nettleserens frem/tilbake-knapper
    window.addEventListener('popstate', () => {
        let nySide = window.location.hash.replace('#', '') || 'hjem';
        window.byttSide(nySide);
    });

    // Automatisk lytt på søkefeltet med 300ms debounce
    const sokefelt = document.getElementById('sokefelt');
    if (sokefelt) {
        sokefelt.addEventListener('input', () => {
            clearTimeout(sokDebounceTimer);
            sokDebounceTimer = setTimeout(() => {
                window.utforSok();
            }, 300);
        });
    }
});
