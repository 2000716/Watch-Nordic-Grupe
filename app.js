/**
 * APP.JS - Watch Nordic
 * Hovedfil for routing, Firestore-datanetting, søk og global tilstandshåndtering
 */

// 1. Importer Firebase-moduler og filminfo.js
import { auth, db } from './firebase-oppsett.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { 
    collection, 
    query, 
    orderBy, 
    where,
    limit,
    startAt, 
    endAt, 
    getDocs,
    doc,
    getDoc 
} from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Laster inn filminfo-scriptet slik at det er klart til å ta imot film-klikk
import './filminfo.js'; 

// Hjelpefunksjon for å forhindre XSS-angrep i HTML-strenger
export function sanitizeInput(str) {
    if (!str) return "";
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Global tilstand (AppState)
window.AppState = {
    bruker: null,
    valgtMediaId: null
};

// ==========================================
// 2. Firebase Firestore - Hentefunksjoner
// ==========================================

async function hentMedier(type = null, begrensningsAntall = 12) {
    try {
        const filmerRef = collection(db, "filmer");
        let q;

        if (type) {
            q = query(filmerRef, where("type", "==", type), limit(begrensningsAntall));
        } else {
            q = query(filmerRef, limit(begrensningsAntall));
        }

        const querySnapshot = await getDocs(q);
        const resultater = [];
        querySnapshot.forEach((docSnap) => {
            resultater.push({ id: docSnap.id, ...docSnap.data() });
        });
        return resultater;
    } catch (error) {
        console.error(`Feil ved henting av medier (${type}):`, error);
        return [];
    }
}

// ==========================================
// 3. Sideinnlasting og UI-generering
// ==========================================

function byggMedieKort(item) {
    const tittel = sanitizeInput(item.tittel || "Uten tittel");
    const bildeUrl = sanitizeInput(item.bildeUrl || item.poster || item.bakgrunn || 'placeholder.jpg');
    
    return `
        <div class="film-kort" data-id="${item.id}" style="cursor: pointer; min-width: 150px; flex-shrink: 0;" onclick="velgOgVisInfo('${item.id}')">
            <img src="${bildeUrl}" alt="${tittel}" style="width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 2/3;" loading="lazy">
            <h4 style="color: white; margin-top: 6px; font-size: 14px; text-align: center;">${tittel}</h4>
        </div>
    `;
}

async function lastHovedsideData() {
    const heroTittel = document.getElementById('hero-tittel');
    const heroBeskrivelse = document.getElementById('hero-beskrivelse');
    const heroBanner = document.getElementById('hero-banner');
    const filmerContainer = document.getElementById('filmer-container');
    const serierContainer = document.getElementById('serier-container');

    const alleMedier = await hentMedier(null, 15);
    if (alleMedier.length > 0) {
        const heroItem = alleMedier[0];
        if (heroTittel) heroTittel.textContent = heroItem.tittel || '';
        if (heroBeskrivelse) heroBeskrivelse.textContent = heroItem.beskrivelse || '';
        if (heroBanner && (heroItem.bakgrunn || heroItem.bildeUrl)) {
            heroBanner.style.backgroundImage = `linear-gradient(to top, rgba(0,0,0,0.9), transparent), url('${heroItem.bakgrunn || heroItem.bildeUrl}')`;
        }
    }

    if (filmerContainer) {
        const filmer = alleMedier.filter(m => m.type === 'film' || !m.type);
        filmerContainer.innerHTML = filmer.map(m => byggMedieKort(m)).join('');
    }

    if (serierContainer) {
        const serier = alleMedier.filter(m => m.type === 'serie');
        serierContainer.innerHTML = serier.map(m => byggMedieKort(m)).join('');
    }
}

async function lastSerierData() {
    const serierGrid = document.getElementById('serier-grid');
    if (!serierGrid) return;

    serierGrid.innerHTML = '<div style="color: white; padding: 20px;">Laster serier...</div>';
    const serier = await hentMedier('serie', 24);

    if (serier.length === 0) {
        serierGrid.innerHTML = '<div style="color: white; padding: 20px;">Ingen serier funnet.</div>';
        return;
    }

    serierGrid.innerHTML = serier.map(s => byggMedieKort(s)).join('');
}

/**
 * Oppdaterer URL-en med #film- prefiks for å utløse sidevisning
 */
window.velgOgVisInfo = function(docId) {
    window.AppState.valgtMediaId = docId;
    window.location.hash = `#film-${docId}`; 
};

/**
 * Global funksjon for tilbake-knappen i filminfo-skjermen
 */
window.gaaTilbake = () => {
    window.location.hash = "#hjem";
    if (typeof window.destroyFilmPage === "function") {
        window.destroyFilmPage();
    }
};

// ==========================================
// 4. Ruting / Navigasjon (SPA-logikk)
// ==========================================

window.byttSide = function(sideId) {
    const alleSider = document.querySelectorAll('.side-visning, .view');
    alleSider.forEach(side => {
        side.style.display = 'none';
    });

    // Søker først etter ID-er med "view-" prefiks, deretter uten prefiks som fallback
    let valgtSide = document.getElementById(`view-${sideId}`) || document.getElementById(sideId);
    
    if (valgtSide) {
        valgtSide.style.display = 'block';
    } else if (sideId === 'filminfo' || sideId.startsWith('film-')) {
        valgtSide = document.getElementById('view-filminfo') || document.getElementById('filminfo');
        if (valgtSide) valgtSide.style.display = 'block';
    }

    const navLinks = document.querySelectorAll('.nav-links a, header nav a');
    navLinks.forEach(link => link.classList.remove('active'));

    const aktivLink = document.getElementById(`link-${sideId}`);
    if (aktivLink) {
        aktivLink.classList.add('active');
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (sideId === 'hjem') lastHovedsideData();
    if (sideId === 'serier') lastSerierData();

    const event = new CustomEvent('sideByttet', { detail: { side: sideId } });
    document.dispatchEvent(event);
};

// ==========================================
// 5. Firebase Auth - Sjekk innloggingstilstand
// ==========================================

onAuthStateChanged(auth, (user) => {
    window.AppState.bruker = user;
    const kontoLink = document.getElementById('konto-lenke');

    if (user) {
        console.log("Bruker er logget inn:", user.email);
        if (kontoLink) kontoLink.textContent = 'Min Konto';
    } else {
        console.log("Ingen bruker er logget inn.");
        if (kontoLink) kontoLink.textContent = 'Logg inn';
    }
});

// ==========================================
// 6. Firebase Firestore - Søkefunksjon
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

            resultaterContainer.innerHTML = "";
            const grid = document.createElement("div");
            grid.className = "soke-grid";
            grid.style.cssText = "display: flex; gap: 15px; flex-wrap: wrap;";

            querySnapshot.forEach((docSnap) => {
                const film = docSnap.data();
                const docId = docSnap.id;
                const tittel = sanitizeInput(film.tittel || "Uten tittel");
                const bildeUrl = sanitizeInput(film.bildeUrl || film.poster || film.bakgrunn || 'placeholder.jpg');

                const kort = document.createElement("div");
                kort.className = "film-kort";
                kort.style.cssText = "cursor: pointer; max-width: 150px;";
                
                kort.innerHTML = `
                    <img src="${bildeUrl}" alt="${tittel}" style="width: 100%; border-radius: 8px; object-fit: cover; aspect-ratio: 2/3;">
                    <h4 style="color: white; margin-top: 5px; font-size: 14px;">${tittel}</h4>
                `;

                kort.addEventListener("click", () => {
                    window.velgOgVisInfo(docId);
                    resultaterContainer.innerHTML = '';
                    sokefelt.value = '';
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
// 7. Initialisering ved sidelasting
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    // Funksjon for å sjekke URL og håndtere ruting inkludert #film- ID-er
    const handterSideLasting = () => {
        let cleanHash = window.location.hash.replace('#', '').trim();
        
        if (!cleanHash) {
            cleanHash = 'hjem';
        }

        if (cleanHash.startsWith('film-')) {
            const filmKey = cleanHash.replace('film-', '');
            window.byttSide('filminfo');
            window.AppState.valgtMediaId = filmKey;
            
            // Kaller rendrefunksjonen fra filminfo.js (støtter både renderFilmPage og lastInnFilminfo)
            if (typeof window.renderFilmPage === "function") {
                window.renderFilmPage(filmKey);
            } else if (typeof window.lastInnFilminfo === "function") {
                window.lastInnFilminfo(filmKey);
            } else {
                console.error("Klarte ikke kalle innlastingsfunksjon. Husk å koble renderFilmPage til window i filminfo.js!");
            }
        } else {
            window.byttSide(cleanHash);
        }
    };

    // Kjør ved første innlasting
    handterSideLasting();

    // Lytt til URL-endringer (for tilbake-knapp eller navigerings-hash)
    window.addEventListener('hashchange', handterSideLasting);

    // Søkefelt logikk
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
