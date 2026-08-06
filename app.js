
import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ===============================================
// STATE & UTILITIES
// ===============================================
let filmer = {}, serier = {};
let forrigeSide = 'hjem';
const escapeHTML = (str) => String(str || '').replace(/[&<>'"/]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[s]));

// ===============================================
// CORE SPA NAVIGATION
// ===============================================
const byttSide = (sideNavn, data = {}) => {
    if (sideNavn !== 'avspiller') {
        forrigeSide = sideNavn;
        stoppOgNullstillVideo();
    }
    document.querySelectorAll('.side-visning').forEach(s => s.style.display = 'none');
    const targetSeksjon = document.getElementById(`view-${sideNavn}`);
    if (targetSeksjon) targetSeksjon.style.display = 'block';
    else byttSide('hjem');

    const isPlayer = sideNavn === 'avspiller';
    document.querySelector('.top-nav').style.display = isPlayer ? 'none' : 'flex';
    document.querySelector('.footer').style.display = isPlayer ? 'none' : 'block';

    document.querySelectorAll('a[data-side]').forEach(link => link.classList.toggle('active', link.dataset.side === sideNavn));
    window.scrollTo(0, 0);

    // Handle content loading for specific pages
    if (sideNavn === 'filminfo') renderFilminfoSide(data.itemId, data.itemType);
    else if (sideNavn === 'hjem' && !Object.keys(filmer).length) hentDataFraFirestore();
};

// ===============================================
// VIDEO PLAYER
// ===============================================
const stoppOgNullstillVideo = () => {
    const video = document.getElementById('video');
    if (video) { video.pause(); video.src = ""; }
};

const apneAvspiller = (videoUrl, tittel) => {
    const video = document.getElementById('video');
    const tittelEl = document.querySelector('#view-avspiller .movie-title');
    if (video && videoUrl) { video.src = videoUrl; video.play(); }
    if (tittelEl) tittelEl.textContent = tittel || "";
    byttSide('avspiller');
};

// ===============================================
// DATA FETCHING & RENDERING
// ===============================================
const hentDataFraFirestore = async () => {
    try {
        const [filmerSnap, serierSnap] = await Promise.all([getDocs(collection(db, "filmer")), getDocs(collection(db, "serier"))]);
        filmer = Object.fromEntries(filmerSnap.docs.map(doc => [doc.id, doc.data()]));
        serier = Object.fromEntries(serierSnap.docs.map(doc => [doc.id, doc.data()]));
        renderHjemmeside();
    } catch (err) { console.error("Error fetching data:", err); }
};

const renderHjemmeside = () => {
    renderGalleri('filmer-galleri', filmer, 'film');
    renderGalleri('serier-galleri', serier, 'serie');
    oppdaterBanner();
    document.getElementById('page-loader').style.display = 'none';
};

const renderGalleri = (galleryId, items, type) => {
    const galleri = document.getElementById(galleryId);
    if (!galleri) return;
    galleri.innerHTML = '';
    for (const key in items) {
        galleri.appendChild(createGalleryItem(key, items[key], type));
    }
};

const createGalleryItem = (id, item, type) => {
    const link = document.createElement('a');
    link.href = '#';
    link.className = 'gallery-item';
    link.dataset.side = 'filminfo';
    link.dataset.itemId = id;
    link.dataset.itemType = type;
    link.innerHTML = `<img src="${escapeHTML(item.poster || item.bilde)}" alt="${escapeHTML(item.tittel)}" loading="lazy"><div class="image-overlay">${escapeHTML(item.tittel)}</div>`;
    return link;
};

const oppdaterBanner = () => {
    const bannerItems = Object.values(filmer).filter(f => f.banner);
    if (!bannerItems.length) return;
    const item = bannerItems[Math.floor(Math.random() * bannerItems.length)];
    document.getElementById('banner-bilde').src = escapeHTML(item.banner);
    document.getElementById('banner-logo').src = escapeHTML(item.logo);
    document.getElementById('banner-beskrivelse').textContent = item.beskrivelse;
    document.getElementById('banner-metadata').textContent = (item.metadata || []).join(' • ');
    document.getElementById('banner-se-na').onclick = () => apneAvspiller(item.trailer, item.tittel);
};

const renderFilminfoSide = (itemId, itemType) => {
    const item = (itemType === 'film' ? filmer : serier)[itemId];
    if (!item) { byttSide('hjem'); return; }
    const view = document.getElementById('view-filminfo');
    view.innerHTML = `
        <div class="hero" style="background-image: url(${escapeHTML(item.banner)});"><div class="overlay"></div>
            <div class="content-wrapper">
                <img class="film-logo" src="${escapeHTML(item.logo)}" alt="Logo">
                <p class="description">${escapeHTML(item.beskrivelse)}</p>
                <div class="metadata">${(item.metadata || []).join(' • ')}</div>
                <button class="watch-button"><i class="fas fa-play"></i> Se nå</button>
            </div>
        </div>`;
    view.querySelector('.watch-button').onclick = () => apneAvspiller(item.trailer, item.tittel);
};

// ===============================================
// INITIALIZATION
// ===============================================
const initializeApp = () => {
    document.body.addEventListener('click', (e) => {
        const link = e.target.closest('a[data-side]');
        if (link) {
            e.preventDefault();
            byttSide(link.dataset.side, { ...link.dataset });
        }
    });
    document.getElementById('backButton')?.addEventListener('click', () => byttSide(forrigeSide));

    onAuthStateChanged(auth, user => {
        if (user) {
            console.log("User is logged in.");
            byttSide(forrigeSide || 'hjem');
        } else {
            console.log("User not logged in.");
            // Implement login view or redirect if necessary
            byttSide('hjem');
        }
    });
};

document.addEventListener('DOMContentLoaded', initializeApp);
