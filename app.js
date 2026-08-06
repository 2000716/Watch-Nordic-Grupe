// app.js - Hovedstyring for Watch Nordic™ med Firebase Firestore
import { db } from "./firebase.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/11.4.0/firebase-firestore.js";

// Global tilstand
const appState = {
    aktivSide: 'hjem',
    valgtMedia: null,
    mediaData: [],
    minListe: JSON.parse(localStorage.getItem('minListe')) || []
};

// Initialisering ved oppstart
document.addEventListener('DOMContentLoaded', async () => {
    initRuting();
    initGalleriRulling();
    
    // Hent innhold fra Firestore
    await lastMediaFraFirestore();
    
    // Lytt til navigering i nettleser
    window.addEventListener('popstate', samkjorRuteFraHash);
});

// ==========================================
// 1. DATAHENTING FRA FIREBASE FIRESTORE
// ==========================================

async function lastMediaFraFirestore() {
    visLoader(true);
    try {
        // Henter dokumenter fra samlingen "media" i Firestore
        const querySnapshot = await getDocs(collection(db, "media"));
        appState.mediaData = [];

        querySnapshot.forEach((doc) => {
            appState.mediaData.push({ id: doc.id, ...doc.data() });
        });

        // Oppdaterer grensesnittet når data er hentet
        lastHeroBanner();
        fyllGallerier();
    } catch (error) {
        console.error("Feil ved henting av media fra Firestore:", error);
    } finally {
        visLoader(false);
    }
}

function visLoader(synlig) {
    const loader = document.getElementById('page-loader');
    if (loader) {
        loader.style.display = synlig ? 'flex' : 'none';
    }
}

// ==========================================
// 2. RUTING OG SPA-LOGIKK
// ==========================================

export function byttSide(sideId, data = null) {
    const lovligeSider = ['hjem', 'serier', 'film', 'nyheter', 'min-liste', 'filminfo', 'sok', 'konto', 'avspiller'];
    const malSide = lovligeSider.includes(sideId) ? sideId : 'hjem';

    appState.aktivSide = malSide;
    if (data) appState.valgtMedia = data;

    // Skjul alle seksjoner
    document.querySelectorAll('.side-visning').forEach(side => {
        side.style.display = 'none';
    });

    // Vis valgt seksjon
    const aktivSeksjon = document.getElementById(`view-${malSide}`);
    if (aktivSeksjon) {
        aktivSeksjon.style.display = 'block';
    }

    oppdaterNavigasjonUI(malSide);
    håndterSpesialVisninger(malSide);

    if (window.location.hash !== `#${malSide}`) {
        history.pushState(null, '', `#${malSide}`);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
}

window.byttSide = byttSide;

function initRuting() {
    samkjorRuteFraHash();
}

function samkjorRuteFraHash() {
    const hash = window.location.hash.replace('#', '');
    byttSide(hash || 'hjem');
}

function oppdaterNavigasjonUI(aktivSide) {
    document.querySelectorAll('.nav-links a').forEach(lenke => {
        lenke.classList.remove('active');
    });

    const aktivLenke = document.getElementById(`link-${aktivSide}`);
    if (aktivLenke) {
        aktivLenke.classList.add('active');
    }
}

function håndterSpesialVisninger(sideId) {
    const topNav = document.querySelector('.top-nav');
    const footer = document.querySelector('.footer');

    if (sideId === 'avspiller') {
        if (topNav) topNav.style.display = 'none';
        if (footer) footer.style.display = 'none';
    } else {
        if (topNav) topNav.style.display = 'flex';
        if (footer) footer.style.display = 'block';
    }

    if (sideId === 'filminfo' && appState.valgtMedia) {
        oppdaterFilminfoSide(appState.valgtMedia);
    }
}

// ==========================================
// 3. RENDER ALL GALLERIDATA
// ==========================================

function lastHeroBanner() {
    const fremhevet = appState.mediaData.find(m => m.fremhevet) || appState.mediaData[0];
    if (!fremhevet) return;

    const bannerBilde = document.getElementById('banner-bilde');
    const bannerLogo = document.getElementById('banner-logo');
    const bannerBeskrivelse = document.getElementById('banner-beskrivelse');
    const bannerMeta = document.getElementById('banner-metadata');
    const seNaKnapp = document.getElementById('banner-se-na');

    if (bannerBilde) bannerBilde.src = fremhevet.bannerUrl || fremhevet.bildeUrl || '';
    if (bannerLogo && fremhevet.logoUrl) bannerLogo.src = fremhevet.logoUrl;
    if (bannerBeskrivelse) bannerBeskrivelse.innerText = fremhevet.beskrivelse || '';
    if (bannerMeta) bannerMeta.innerText = `${fremhevet.ar || 2026} • ${fremhevet.alder || '12+'} • ${fremhevet.varighet || ''}`;

    if (seNaKnapp) {
        seNaKnapp.onclick = () => byttSide('avspiller', fremhevet);
    }
}

function fyllGallerier() {
    const data = appState.mediaData;

    lagaGalleriKort('nye-filmer-galleri', data);
    lagaGalleriKort('topp10-filmer-galleri', data.filter(m => m.topp10));
    lagaGalleriKort('filmer-galleri', data.filter(m => m.kategori === 'film'));
    lagaGalleriKort('serier-galleri', data.filter(m => m.kategori === 'serie'));
    lagaGalleriKort('alle-serier-oversikt-galleri', data.filter(m => m.kategori === 'serie'));
    lagaGalleriKort('dokumentarserier-galleri', data.filter(m => m.kategori === 'dokumentar'));
}

function lagaGalleriKort(elementId, liste) {
    const container = document.getElementById(elementId);
    if (!container) return;

    container.innerHTML = '';

    if (!liste || liste.length === 0) {
        container.innerHTML = '<p style="color: #888; padding: 10px;">Ingen innhold tilgjengelig.</p>';
        return;
    }

    liste.forEach(item => {
        const kort = document.createElement('div');
        kort.className = 'gallery-card';
        kort.style.cssText = 'min-width: 180px; margin-right: 12px; cursor: pointer; display: inline-block;';

        const bildeSrc = item.bildeUrl || item.posterUrl || item.bilde || '';

        kort.innerHTML = `
            <img src="${bildeSrc}" alt="${item.tittel || ''}" style="width: 100%; border-radius: 6px; aspect-ratio: 16/9; object-fit: cover;" />
            <p style="margin-top: 6px; font-size: 14px; font-weight: 500;">${item.tittel || 'Uten tittel'}</p>
        `;

        kort.addEventListener('click', () => {
            byttSide('filminfo', item);
        });

        container.appendChild(kort);
    });
}

function oppdaterFilminfoSide(media) {
    const bgImg = document.getElementById('backgroundImage');
    const desc = document.querySelector('#view-filminfo .description');
    const meta = document.querySelector('#view-filminfo .metadata');
    const watchBtn = document.getElementById('watchBtn');

    if (bgImg) bgImg.src = media.bannerUrl || media.bildeUrl || '';
    if (desc) desc.innerText = media.beskrivelse || '';
    if (meta) meta.innerText = `${media.ar || ''} | ${media.alder || ''} | ${media.varighet || ''}`;

    if (watchBtn) {
        watchBtn.onclick = () => byttSide('avspiller', media);
    }
}

// ==========================================
// 4. RULLING & SØK
// ==========================================

function initGalleriRulling() {
    document.querySelectorAll('.gallery-wrapper, .continue-gallery-wrapper').forEach(wrapper => {
        const leftBtn = wrapper.querySelector('.scroll-button.left');
        const rightBtn = wrapper.querySelector('.scroll-button.right');
        const gallery = wrapper.querySelector('.image-gallery, .top10-gallery, .continue-image-gallery');

        if (gallery && leftBtn && rightBtn) {
            leftBtn.addEventListener('click', () => {
                gallery.scrollBy({ left: -400, behavior: 'smooth' });
            });
            rightBtn.addEventListener('click', () => {
                gallery.scrollBy({ left: 400, behavior: 'smooth' });
            });
        }
    });
}

window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const resultatContainer = document.getElementById('sokeResultater');
    if (!sokefelt || !resultatContainer) return;

    const query = sokefelt.value.toLowerCase().trim();
    resultatContainer.innerHTML = '';

    if (query === '') return;

    const treff = appState.mediaData.filter(item => 
        (item.tittel && item.tittel.toLowerCase().includes(query)) || 
        (item.beskrivelse && item.beskrivelse.toLowerCase().includes(query))
    );

    lagaGalleriKort('sokeResultater', treff);
};
