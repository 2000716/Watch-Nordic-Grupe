// ==========================================
// WATCH NORDIC™ - HOVEDSTYRING (APP.JS)
// ==========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Hent database-referansen (forutsetter at firebase-oppsett.js initialiserer dette, eller vi gjør det her)
// Vi sjekker vindusobjektet eller importerer fra din felles Firebase-konfigurasjon hvis tilgjengelig.
const db = getFirestore();

document.addEventListener("DOMContentLoaded", () => {
    console.log("Watch Nordic™ app er lastet og klar.");
    
    // Håndter initial URL-hash ved lasting
    const hash = window.location.hash.replace("#", "");
    if (hash) {
        byttSide(hash);
    } else {
        byttSide('hjem');
    }
});

/**
 * Hovedfunksjon for å bytte mellom de ulike sidene/visningene i applikasjonen.
 * Sørger for at riktig seksjon vises (`view-hjem`, `view-serier`, `view-film`, `view-filminfo`, `view-avspiller`, etc.)
 * @param {string} sideId - ID-en til siden som skal vises
 */
window.byttSide = function(sideId) {
    // 1. Skjul alle hovedvisninger (.side-visning)
    const visninger = document.querySelectorAll('.side-visning');
    visninger.forEach(visning => {
        visning.style.display = 'none';
    });

    // 2. Map lenken/valget til riktig DOM-element
    let aktivVisningId = 'view-hjem';

    switch (sideId) {
        case 'hjem':
            aktivVisningId = 'view-hjem';
            break;
        case 'serier':
            aktivVisningId = 'view-serier';
            lastInnSerierOversikt(); // Laster inn serier fra Firebase automatisk
            break;
        case 'film':
            aktivVisningId = 'view-hjem'; // Eventuelt en egen filmoversikt hvis du har opprettet det
            break;
        case 'nyheter':
        case 'min-liste':
            aktivVisningId = 'view-hjem';
            break;
        case 'sok':
            aktivVisningId = 'view-sok';
            break;
        case 'konto':
            aktivVisningId = 'view-konto';
            break;
        case 'filminfo':
            aktivVisningId = 'view-filminfo';
            break;
        case 'avspiller':
            aktivVisningId = 'view-avspiller';
            break;
        default:
            aktivVisningId = 'view-hjem';
    }

    // 3. Vis den valgte visningen
    const aktivVisning = document.getElementById(aktivVisningId);
    if (aktivVisning) {
        aktivVisning.style.display = 'block';
    }

    // 4. Oppdater aktiv klasse på toppmenyen
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sideId}`) {
            link.classList.add('active');
        }
    });

    // 5. Scroll til toppen ved sidebytte
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Åpner detaljsiden (Filminfo) for en spesifikk film eller serie, og henter data fra Firebase.
 * @param {string} mediaId - ID-en til filmen/serien i Firestore
 */
window.visDetaljer = async function(mediaId) {
    try {
        // Bytter visning til filminfo med en gang
        window.byttSide('filminfo');

        // Hent film/serie-data fra Firestore (f.eks. kolleksjon 'medier' eller 'filmer')
        const docRef = doc(db, "medier", mediaId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Fyll inn elementer på filminfosiden
            const bgImg = document.getElementById('backgroundImage');
            if (bgImg) bgImg.src = data.bakgrunnsbilde || data.bilde || '';

            const descElem = document.querySelector('#view-filminfo .description');
            if (descElem) descElem.textContent = data.beskrivelse || 'Ingen beskrivelse tilgjengelig.';

            const metaElem = document.querySelector('#view-filminfo .metadata');
            if (metaElem) metaElem.textContent = `${data.aar || '2026'} • ${data.aldersgrense || '12+' } • ${data.varighet || ''}`;

            // Koble "Se nå"-knappen til avspilleren og send med video-URL
            const watchBtn = document.getElementById('watchBtn');
            if (watchBtn) {
                watchBtn.onclick = () => {
                    window.startAvspiller(data.videoUrl, data.tittel);
                };
            }
        } else {
            console.error("Fant ikke mediet i databasen.");
        }
    } catch (error) {
        console.error("Feil ved henting av filminfo:", error);
    }
};

/**
 * Starter videoavspilleren med angitt video-URL.
 * @param {string} videoUrl - URL til videofilen
 * @param {string} tittel - Titten på filmen/serien
 */
window.startAvspiller = function(videoUrl, tittel) {
    window.byttSide('avspiller');
    
    const videoElement = document.getElementById('video');
    const titleElement = document.querySelector('#view-avspiller .movie-title');

    if (videoElement && videoUrl) {
        videoElement.src = videoUrl;
        videoElement.play().catch(err => console.log("Autoplay forhindret av nettleser:", err));
    }

    if (titleElement) {
        titleElement.textContent = tittel || 'Avspiller';
    }
};

/**
 * Henter og viser alle serier i serier-oversikten (#view-serier) fra Firebase.
 */
async function lastInnSerierOversikt() {
    const galleri = document.getElementById('alle-serier-oversikt-galleri');
    if (!galleri) return;

    try {
        const querySnapshot = await getDocs(collection(db, "serier"));
        let html = '';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            html += `
                <div class="gallery-item" onclick="visDetaljer('${docSnap.id}')" style="cursor: pointer;">
                    <img src="${data.bilde || 'https://via.placeholder.com/330x175'}" alt="${data.tittel || 'Serie'}">
                    <p style="color: #fff; margin-top: 5px; font-size: 14px;">${data.tittel || ''}</p>
                </div>
            `;
        });

        if (html === '') {
            html = '<p style="color: #fff; padding: 20px;">Ingen serier funnet.</p>';
        }

        galleri.innerHTML = html;
    } catch (error) {
        console.error("Feil ved lasting av serier:", error);
        galleri.innerHTML = '<p style="color: red; padding: 20px;">Kunne ikke laste serier.</p>';
    }
}

/**
 * Sanntidssøk mot Firebase Firestore (tilpasset søkefeltet).
 */
window.utforSok = async function() {
    const sokefelt = document.getElementById('sokefelt');
    const sokeResultater = document.getElementById('sokeResultater');

    if (!sokefelt || !sokeResultater) return;

    const queryText = sokefelt.value.trim().toLowerCase();

    if (queryText === '') {
        sokeResultater.innerHTML = '';
        return;
    }

    try {
        const querySnapshot = await getDocs(collection(db, "medier"));
        let html = '<div style="padding: 20px; color: #fff; display: flex; flex-direction: column; gap: 10px;">';
        let treff = 0;

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.tittel && data.tittel.toLowerCase().includes(queryText)) {
                treff++;
                html += `
                    <div style="padding: 10px; background: rgba(255,255,255,0.05); border-radius: 4px; cursor: pointer;" onclick="visDetaljer('${docSnap.id}')">
                        <strong>${data.tittel}</strong> (${data.aar || '2026'})
                    </div>
                `;
            }
        });

        if (treff === 0) {
            html += `<p>Ingen treff på "${queryText}".</p>`;
        }

        html += '</div>';
        sokeResultater.innerHTML = html;

    } catch (error) {
        console.error("Feil ved søk:", error);
        sokeResultater.innerHTML = '<p style="color: red; padding: 20px;">Søk feilet.</p>';
    }
};
