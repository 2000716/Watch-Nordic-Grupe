
import { auth, db } from "../firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const aktivProfilIndex = parseInt(urlParams.get('index')) || 0;

const alleProfiler = [
  { 
    url: 'https://res.cloudinary.com/ocv4zhpk/image/upload/v1785856037/Muffins_profil_100_k1qd4h.png', 
    navn: "Detektiv Muffins", 
    erPng: false, 
    farge: '#e9c46a',
    logoUrl: 'https://res.cloudinary.com/ocv4zhpk/image/upload/v1785856037/Muffisn_logo_22_edited_edited_zsxu4r.png'
  },
  { 
    url: 'https://res.cloudinary.com/ocv4zhpk/image/upload/v1785856036/Marshmellows_edited_omilcb.png', 
    navn: "Herr Marshmellows", 
    erPng: false, 
    farge: '#46cee3',
    logoUrl: 'https://res.cloudinary.com/ocv4zhpk/image/upload/v1785856037/Muffisn_logo_22_edited_edited_zsxu4r.png'
  }
];

const sporEl = document.getElementById('karusell-spor');
const viewportEl = document.getElementById('viewport');
const pilVenstre = document.getElementById('pil-venstre');
const pilHoyre = document.getElementById('pil-hoyre');

let scrollPosisjon = 0;
let valgtBilde = null;
let profiler = [];
let docRef = null;

// Les inn cache med en gang for å forhindre layout-hopp
const cachedProfiles = localStorage.getItem("watch_nordic_profiles_cache");
if (cachedProfiles) {
  try {
    profiler = JSON.parse(cachedProfiles);
    if (profiler[aktivProfilIndex]) {
      valgtBilde = profiler[aktivProfilIndex].bilde || null;
    }
  } catch (e) {
    console.error("Feil ved lesing av cache:", e);
  }
}

byggKarusell();

function byggKarusell() {
  sporEl.innerHTML = "";

  alleProfiler.forEach(item => {
    const avatarItem = document.createElement('div');
    avatarItem.className = 'avatar-item';
    avatarItem.dataset.url = item.url;
    
    if (item.farge) {
      avatarItem.style.setProperty('--active-color', item.farge);
    }

    const wrap = document.createElement('div');
    wrap.className = 'avatar-bilde-wrap';

    const bg = document.createElement('div');
    bg.className = 'avatar-bg';

    const badge = document.createElement('div');
    badge.className = 'valgt-badget';
    badge.innerHTML = '<i class="fa-solid fa-check"></i>';

    const img = document.createElement('img');
    img.src = item.url;
    img.alt = item.navn;
    img.className = `avatar-bilde ${item.erPng ? 'png-karakter' : ''}`;

    wrap.appendChild(bg);
    wrap.appendChild(badge);
    wrap.appendChild(img);

    if (item.logoUrl) {
      const logoWrap = document.createElement('div');
      logoWrap.className = 'film-logo-wrap';

      const logoImg = document.createElement('img');
      logoImg.src = item.logoUrl;
      logoImg.alt = "Logo";
      logoImg.className = "film-logo";

      logoWrap.appendChild(logoImg);
      wrap.appendChild(logoWrap);
    }

    avatarItem.appendChild(wrap);

    const navnEl = document.createElement('div');
    navnEl.className = 'karakter-navn';
    navnEl.textContent = item.navn;
    avatarItem.appendChild(navnEl);

    avatarItem.addEventListener('click', () => {
      valgtBilde = item.url;
      oppdaterValgMarkering();
    });

    sporEl.appendChild(avatarItem);
  });

  oppdaterValgMarkering();

  setTimeout(() => {
    fokuserePaaValgtProfil();
  }, 50);
}

function hentMaksScroll() {
  const style = window.getComputedStyle(viewportEl);
  const paddingLeft = parseFloat(style.paddingLeft) || 0;
  const paddingRight = parseFloat(style.paddingRight) || 0;
  
  const synthViewportWidth = viewportEl.clientWidth - paddingLeft - paddingRight;
  const totalBredde = sporEl.scrollWidth;
  const maks = -(totalBredde - synthViewportWidth);
  return maks > 0 ? 0 : maks;
}

function fokuserePaaValgtProfil() {
  if (!valgtBilde) return;

  const kortListe = Array.from(sporEl.querySelectorAll('.avatar-item'));
  const valgtIndex = kortListe.findIndex(el => el.dataset.url === valgtBilde);

  if (valgtIndex !== -1) {
    const kort = kortListe[0];
    if (!kort) return;

    const kortBredde = kort.offsetWidth;
    const gap = 50; 
    const totalKortBredde = kortBredde + gap;
    
    const style = window.getComputedStyle(viewportEl);
    const paddingLeft = parseFloat(style.paddingLeft) || 0;
    const paddingRight = parseFloat(style.paddingRight) || 0;
    const synthViewportWidth = viewportEl.clientWidth - paddingLeft - paddingRight;

    let nyPosisjon = -(valgtIndex * totalKortBredde) + (synthViewportWidth / 2) - (kortBredde / 2);
    const maksScroll = hentMaksScroll();

    if (nyPosisjon < maksScroll) nyPosisjon = maksScroll;
    if (nyPosisjon > 0) nyPosisjon = 0;

    scrollPosisjon = nyPosisjon;
    sporEl.style.transform = `translateX(${scrollPosisjon}px)`;
    oppdaterPilSynlighet();
  }
}

function flyttKarusell(retning) {
  const kort = sporEl.querySelector('.avatar-item');
  if (!kort) return;

  const stegBredde = kort.offsetWidth + 50; 
  const maksScroll = hentMaksScroll();

  scrollPosisjon -= retning * stegBredde;

  if (scrollPosisjon < maksScroll) scrollPosisjon = maksScroll;
  if (scrollPosisjon > 0) scrollPosisjon = 0;

  sporEl.style.transform = `translateX(${scrollPosisjon}px)`;
  oppdaterPilSynlighet();
}

function oppdaterPilSynlighet() {
  const maksScroll = hentMaksScroll();
  
  pilVenstre.disabled = scrollPosisjon >= -2;
  pilHoyre.disabled = scrollPosisjon <= (maksScroll + 2);
}

function oppdaterValgMarkering() {
  document.querySelectorAll('.avatar-item').forEach(el => {
    const isSelected = el.dataset.url === valgtBilde;
    el.classList.toggle('selected', isSelected);
  });
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') flyttKarusell(-1);
  if (e.key === 'ArrowRight') flyttKarusell(1);
  if (e.key === 'Enter') tilbakeTilKonto();
});

let startX = 0;

viewportEl.addEventListener('touchstart', (e) => {
  startX = e.touches[0].clientX;
}, { passive: true });

viewportEl.addEventListener('touchend', (e) => {
  const diffX = startX - e.changedTouches[0].clientX;
  if (Math.abs(diffX) > 40) {
    flyttKarusell(diffX > 0 ? 1 : -1);
  }
}, { passive: true });

window.addEventListener('resize', () => {
  fokuserePaaValgtProfil();
});

onAuthStateChanged(auth, (user) => {
  if (user) {
    docRef = doc(db, "users", user.uid);
    hentProfilbildeFraDb();
  } else {
    window.spaNavigate("Innlogging.html");
  }
});

async function hentProfilbildeFraDb() {
  try {
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      profiler = docSnap.data().profiler || [];
      localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(profiler));
      if (profiler[aktivProfilIndex]) {
        valgtBilde = profiler[aktivProfilIndex].bilde || null;
        oppdaterValgMarkering();
        fokuserePaaValgtProfil();
      }
    }
  } catch (err) {
    console.error("Feil ved henting fra DB:", err);
  }
}

async function tilbakeTilKonto() {
  if (profiler[aktivProfilIndex] && valgtBilde) {
    profiler[aktivProfilIndex].bilde = valgtBilde;
    localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(profiler));

    if (localStorage.getItem("aktivProfilIndex") === String(aktivProfilIndex)) {
      localStorage.setItem("profilbilde", valgtBilde);
    }

    if (docRef) {
      try {
        await setDoc(docRef, { profiler: profiler }, { merge: true });
      } catch (err) {
        console.error("Feil ved lagring til Firestore:", err);
      }
    }
  }
  window.spaNavigate(`konto.html?index=${aktivProfilIndex}`);
}

window.flyttKarusell = flyttKarusell;
window.tilbakeTilKonto = tilbakeTilKonto;
