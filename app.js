/**
 * APP.JS - Hovedfil for routing og global state management
 */

// 1. Importer Firebase-modulene fra oppsettsfilen din
import { auth, db } from './firebase-oppsett.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { collection, query, orderBy, startAt, endAt, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

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
// 3. Firebase Auth - Sjekk hvem som er logget inn
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        console.log("Bruker er logget inn:", user.email);
        // Her kan du f.eks. endre "Logg inn"-knappen til "Min Konto" i HTML-en
        // document.getElementById('konto-lenke').innerText = 'Min Konto';
    } else {
        console.log("Ingen bruker er logget inn.");
        // Gjenopprett standardvisning hvis logget ut
        // document.getElementById('konto-lenke').innerText = 'Logg inn';
    }
});

// ==========================================
// 4. Firebase Firestore - Søkefunksjon
// ==========================================
window.utforSok = async function() {
    const sokefelt = document.getElementById('sokefelt');
    const resultaterContainer = document.getElementById('sokeResultater');
    const queryTekst = sokefelt.value.trim().toLowerCase();

    if (queryTekst.length > 2) {
        resultaterContainer.innerHTML = `<div style="padding: 20px; color: white;">Laster resultater for "<strong>${queryTekst}</strong>"...</div>`;

        try {
            // Referanse til en samling i databasen (bytt ut "filmer" med navnet på din collection)
            const filmerRef = collection(db, "filmer");
            
            // Vi gjør et "prefix-søk" (søk som starter på bokstavene)
            // For at dette skal fungere best, bør du ha et felt i databasen som heter 'sokeTittel' der alt er med små bokstaver
            const q = query(
                filmerRef,
                orderBy("sokeTittel"),
                startAt(queryTekst),
                endAt(queryTekst + '\uf8ff')
            );

            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                resultaterContainer.innerHTML = `<div style="padding: 20px; color: white;">Ingen treff på "<strong>${queryTekst}</strong>"</div>`;
                return;
            }

            // Bygg HTML for søkeresultatene
            let html = '<div class="soke-grid" style="display: flex; gap: 15px; flex-wrap: wrap;">';
            querySnapshot.forEach((doc) => {
                const film = doc.data();
                html += `
                    <div class="film-kort" onclick="byttSide('filminfo'); window.lastInnFilm('${doc.id}')" style="cursor: pointer; max-width: 150px;">
                        <img src="${film.bildeUrl || 'placeholder.jpg'}" alt="${film.tittel}" style="width: 100%; border-radius: 8px;">
                        <h4 style="color: white; margin-top: 5px; font-size: 14px;">${film.tittel}</h4>
                    </div>
                `;
            });
            html += '</div>';
            resultaterContainer.innerHTML = html;

        } catch (error) {
            console.error("Feil ved henting av søkeresultater:", error);
            resultaterContainer.innerHTML = `<div style="padding: 20px; color: red;">Det oppstod en feil under søket.</div>`;
        }
    } else {
        resultaterContainer.innerHTML = ''; // Tøm resultater hvis søket er slettet eller for kort
    }
};

// ==========================================
// 5. Initialisering ved sidelasting
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    let initialSide = window.location.hash.replace('#', '');
    
    if (!initialSide || !document.getElementById(`view-${initialSide}`)) {
        initialSide = 'hjem';
    }

    window.byttSide(initialSide);

    window.addEventListener('popstate', () => {
        let nySide = window.location.hash.replace('#', '') || 'hjem';
        window.byttSide(nySide);
    });
});
