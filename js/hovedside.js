
import { auth, db } from "../firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";


const hentDataFraFirestore = async () => {
    try {
        const [filmerSnap, serierSnap] = await Promise.all([
            getDocs(collection(db, "filmer")),
            getDocs(collection(db, "serier"))
        ]);
        
        const filmer = Object.fromEntries(filmerSnap.docs.map(doc => [doc.id, doc.data()]));
        const serier = Object.fromEntries(serierSnap.docs.map(doc => [doc.id, doc.data()]));

        renderGallerier(filmer, serier);
        oppdaterBanner(filmer);
        document.getElementById('page-loader').style.display = 'none';

    } catch (feil) {
        console.error("En feil oppstod under henting av data:", feil);
        document.getElementById('page-loader').innerText = 'Kunne ikke laste innhold. Prøv igjen senere.';
    }
};

const escapeHTML = (str) => String(str || '').replace(/[&<>'"/]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));

const createGalleryItem = (id, item, type) => {
    const href = `#filminfo?id=${id}&type=${type}`;
    const bildeKilde = item.poster || item.bilde || '';
    const tittel = escapeHTML(item.tittel || 'Ukjent tittel');

    return `
        <a href="${href}" class="gallery-item" onclick="visFilminfo('${id}', '${type}')">
            <img src="${bildeKilde}" alt="${tittel}" loading="lazy">
        </a>
    `;
};

const renderGallerier = (filmer, serier) => {
    const filmerGalleri = document.getElementById('filmer-galleri');
    const serierGalleri = document.getElementById('serier-galleri');
    const nyeFilmerGalleri = document.getElementById('nye-filmer-galleri');

    if (filmerGalleri) {
        filmerGalleri.innerHTML = Object.keys(filmer).map(key => createGalleryItem(key, filmer[key], 'film')).join('');
    }
    if (serierGalleri) {
        serierGalleri.innerHTML = Object.keys(serier).map(key => createGalleryItem(key, serier[key], 'serie')).join('');
    }
    if (nyeFilmerGalleri) {
         const nyeFilmerArray = Object.keys(filmer).reverse().slice(0, 10);
         nyeFilmerGalleri.innerHTML = nyeFilmerArray.map(key => createGalleryItem(key, filmer[key], 'film')).join('');
    }
};

const oppdaterBanner = (filmer) => {
    const bannerFilmer = Object.values(filmer).filter(f => f.banner);
    if (bannerFilmer.length === 0) return;

    const bannerFilm = bannerFilmer[Math.floor(Math.random() * bannerFilmer.length)];
    const bannerFilmId = Object.keys(filmer).find(key => filmer[key] === bannerFilm);


    document.getElementById('banner-bilde').src = bannerFilm.banner;
    document.getElementById('banner-logo').src = bannerFilm.logo;
    document.getElementById('banner-beskrivelse').textContent = bannerFilm.beskrivelse;
    document.getElementById('banner-metadata').textContent = (bannerFilm.metadata || []).join(' • ');
    
    const seNaKnapp = document.getElementById('banner-se-na');
    if (seNaKnapp) {
        seNaKnapp.onclick = () => {
             window.location.hash = `#avspiller?id=${bannerFilmId}&type=film`;
        };
    }
};

function initHjem(){
     onAuthStateChanged(auth, user => {
        if (user) {
            hentDataFraFirestore();
        } else {
             console.log("Bruker ikke logget inn, omdirigerer...");
             // Omdirigering er fjernet for testing, men kan gjeninnføres
             // window.location.href = 'Innlogging.html';
             hentDataFraFirestore();
        }
    });
}

// Eksporter funksjonen slik at den kan kalles fra app.js
export { initHjem };
