import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// Global variabel for å holde styr på om spilleren er i gang
let avspillerAktiv = false;

// 1. Sjekk innlogging med en gang siden lastes
window.addEventListener('DOMContentLoaded', () => {
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "Innlogging.html";
        } else {
            settInnProfilbilde();
            byttSide('hjem');
            initialiserFilmKort(); // Aktiverer klikk på filmkort på tvers av sider
        }
    });

    initialiserAvspillerKontroller();
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
    if (sideNavn !== 'avspiller') {
        stoppOgNullstillVideo();
    }

    // Scroll alltid til toppen ved sidebytte for å hindre låst scrolling
    window.scrollTo(0, 0);

    const navbar = document.querySelector('.navbar') || document.querySelector('nav');
    const footer = document.querySelector('footer');

    if (sideNavn === 'avspiller') {
        if (navbar) navbar.style.display = 'none';
        if (footer) footer.style.display = 'none';
    } else {
        if (navbar) navbar.style.display = 'flex';
        if (footer) footer.style.display = 'block';
    }

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

    if (sideNavn === 'avspiller') {
        avspillerAktiv = true;
    }
}

// 4. Funksjon for å hente data kun fra 'serier' i Firestore
async function visFilmInfo(filmId) {
    if (!filmId) return;

    const loader = document.querySelector('#view-filminfo .page-loader-seksjon');
    if (loader) loader.style.display = 'flex';

    try {
        // Henter kun fra 'serier'-kolleksjonen nå
        const docRef = doc(db, "serier", filmId);
        const docSnap = await getDoc(docRef);
        let data = null;

        if (docSnap.exists()) {
            data = docSnap.data();
        }

        if (data) {
            // Bakgrunnsbilde
            const bgImg = document.getElementById('backgroundImage');
            if (bgImg) bgImg.src = data.bakgrunn || data.bilde || '';

            // Logo bilde
            const filmLogo = document.querySelector('#view-filminfo .film-logo');
            if (filmLogo) {
                if (data.logo) {
                    filmLogo.src = data.logo;
                    filmLogo.style.display = 'block';
                } else {
                    filmLogo.style.display = 'none';
                }
            }

            // Beskrivelse
            const beskrivelseEl = document.querySelector('#view-filminfo .description');
            if (beskrivelseEl) beskrivelseEl.textContent = data.beskrivelse || data.synopsis || '';

            // Metadata (årstall, sjanger, aldersgrense)
            const metadataEl = document.querySelector('#view-filminfo .metadata');
            if (metadataEl) {
                metadataEl.innerHTML = `
                    <span>${data.aar || ''}</span>
                    <span>${data.sjanger || ''}</span>
                    <span>${data.aldersgrense || ''}</span>
                `;
            }

            // "Se nå"-knapp funksjonalitet
            const watchBtn = document.getElementById('watchBtn');
            if (watchBtn) {
                const nyWatchBtn = watchBtn.cloneNode(true);
                watchBtn.parentNode.replaceChild(nyWatchBtn, watchBtn);
                
                nyWatchBtn.addEventListener('click', () => {
                    apneAvspiller(data.videoUrl || data.url, data.tittel || filmId);
                });
            }

            byttSide('filminfo');
        } else {
            console.warn("Fant ikke serie med ID:", filmId);
        }
    } catch (error) {
        console.error("Feil ved henting av serieinfo fra Firebase:", error);
    } finally {
        if (loader) loader.style.display = 'none';
    }
}

// 5. Automatisk gjenkjenning av klikk på filmkort overalt på nettsiden
function initialiserFilmKort() {
    document.body.addEventListener('click', (e) => {
        const filmKort = e.target.closest('.movie-card, [data-film-id], [data-film-navn]');
        if (filmKort) {
            const filmId = filmKort.getAttribute('data-film-id') || 
                           filmKort.getAttribute('data-film-navn') || 
                           filmKort.dataset.id || 
                           filmKort.dataset.navn;
            if (filmId) {
                e.preventDefault();
                visFilmInfo(filmId);
            }
        }
    });
}

// 6. Funksjon for å starte avspilleren
function apneAvspiller(videoUrl, tittel) {
    const videoEl = document.getElementById('video');
    const tittelEl = document.querySelector('.movie-title');

    if (videoEl && videoUrl) {
        videoEl.src = videoUrl;
        videoEl.load();
        videoEl.play().catch(err => console.log("Autoplay krevde brukerinteraksjon:", err));
    }

    if (tittelEl) {
        tittelEl.textContent = tittel || "Watch Nordic Video";
    }

    byttSide('avspiller');
}

// 7. Stopp video og nullstill
function stoppOgNullstillVideo() {
    const videoEl = document.getElementById('video');
    if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
    }
    
    const trailerVideo = document.getElementById('trailerVideo');
    if (trailerVideo) {
        trailerVideo.pause();
        trailerVideo.currentTime = 0;
    }

    avspillerAktiv = false;
}

// 8. Koble opp lyttere for knapper
function initialiserAvspillerKontroller() {
    const tilbakeKnapp = document.getElementById('backButton');
    if (tilbakeKnapp) {
        tilbakeKnapp.addEventListener('click', (e) => {
            e.preventDefault();
            stoppOgNullstillVideo();
            byttSide('hjem');
        });
    }

    const bannerSeNa = document.getElementById('banner-se-na');
    if (bannerSeNa) {
        bannerSeNa.addEventListener('click', () => {
            apneAvspiller("https://www.w3schools.com/html/mov_bbb.mp4", "Big Buck Bunny");
        });
    }
}

// 9. GJØR FUNKSJONER TILGJENGELIG GLOBALMENT
window.byttSide = byttSide;
window.visFilmInfo = visFilmInfo;
window.apneAvspiller = apneAvspiller;
window.stoppOgNullstillVideo = stoppOgNullstillVideo;
