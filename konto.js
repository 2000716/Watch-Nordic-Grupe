/* ==========================================================================
   KONTO-SIDE – SPA-MODUL UTGAVE
   ========================================================================== */
import { auth, db } from "./firebase-oppsett.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

// --- CENTRAL STATE FOR KONTOSIDEN ---
let accountState = {
  aktivProfilIndex: 0,
  profiler: [],
  globalEpost: "",
  docRef: null,
  currentUser: null,
  unsubscribeAuth: null,
  eventListenersMap: new Map() // Brukes til ren opprydding
};

// --- HELPER FUNCTIONS ---
function safeGetElementById(id) {
  return document.getElementById(id) || null;
}

function lagreILokalStorage() {
  localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(accountState.profiler));
  localStorage.setItem("watch_nordic_email_cache", accountState.globalEpost);
}

/* ================= 1. SPA HOVEDFUNKSJONER ================= */
export async function renderAccountPage(params = {}) {
  // Hent index fra parametre eller URL-query
  const urlParams = new URLSearchParams(window.location.search);
  accountState.aktivProfilIndex = params.index !== undefined ? parseInt(params.index) : (parseInt(urlParams.get('index')) || 0);

  // Lokal cache-sjekk for rask initialisering
  const cachedProfiles = localStorage.getItem("watch_nordic_profiles_cache");
  const cachedEmail = localStorage.getItem("watch_nordic_email_cache");
  if (cachedProfiles && cachedEmail) {
    try {
      accountState.profiler = JSON.parse(cachedProfiles);
      accountState.globalEpost = cachedEmail;
      if (accountState.profiler[accountState.aktivProfilIndex]) {
        byggProfilgrensesnitt();
      }
    }  catch (error) {
      console.warn("Kunne ikke lese lokal profilcache:", error);
    }
  }

  // Registrer Auth Listener
  accountState.unsubscribeAuth = onAuthStateChanged(auth, (user) => {
    if (user) {
      accountState.currentUser = user;
      accountState.docRef = doc(db, "users", user.uid);
      accountState.globalEpost = user.email || accountState.globalEpost;
      hentKontodata();
    } else {
      accountState.currentUser = null;
      // SPA-håndtering: Naviger til login/index eller utløs ruteendring
      window.location.href = "index.html";
    }
  });

  oppsettEventListeners();
}

export async function destroyAccountPage() {
  // 1. Fjern Auth listener for å forhindre minnelekkasjer
  if (accountState.unsubscribeAuth) {
    accountState.unsubscribeAuth();
    accountState.unsubscribeAuth = null;
  }

  // 2. Fjern alle dynamiske event listeners knyttet til denne siden
  accountState.eventListenersMap.forEach((handler, element) => {
    if (element && handler) {
      element.removeEventListener(handler.event, handler.callback);
    }
  });
  accountState.eventListenersMap.clear();

  // 3. Nullstill state
  accountState.profiler = [];
  accountState.globalEpost = "";
  accountState.docRef = null;
  accountState.currentUser = null;

  console.log("Konto-side rydder opp og unmountes.");
}

/* ================= 2. EVENT LISTENERS SETUP ================= */
function leggTilEventListenerMedLagring(element, eventType, callback) {
  if (!element) return;
  element.addEventListener(eventType, callback);
  accountState.eventListenersMap.set(`${element.id || Math.random()}-${eventType}`, { element, event: eventType, callback });
}

function oppsettEventListeners() {
  const avatarContainer = safeGetElementById("avatarContainer");
  if (avatarContainer) {
    leggTilEventListenerMedLagring(avatarContainer, "click", () => {
      // SPA-vennlig navigasjon (bytt ut med router-kall om du har det)
      window.location.href = `VelgProfilbilde.html?index=${accountState.aktivProfilIndex}`;
    });
  }

  const navHovedsideBtn = safeGetElementById("navHovedsideBtn");
  if (navHovedsideBtn) {
    leggTilEventListenerMedLagring(navHovedsideBtn, "click", () => {
      window.location.href = `hvem-ser-på.html?index=${accountState.aktivProfilIndex}`;
    });
  }

  const navLoggUtBtn = safeGetElementById("navLoggUtBtn");
  if (navLoggUtBtn) leggTilEventListenerMedLagring(navLoggUtBtn, "click", loggUt);

  const sletteKnapp = safeGetElementById("sletteKnapp");
  if (sletteKnapp) leggTilEventListenerMedLagring(sletteKnapp, "click", slettProfil);

  const loggutAlleBtn = safeGetElementById("loggutAlleBtn");
  if (loggutAlleBtn) {
    leggTilEventListenerMedLagring(loggutAlleBtn, "click", async () => {
      try {
        await signOut(auth);
        localStorage.removeItem("watch_nordic_profiles_cache");
        localStorage.removeItem("watch_nordic_email_cache");
        window.location.href = "index.html";
      } catch (error) {
        console.error("Kunne ikke logge ut alle enheter:", error);
        alert("Kunne ikke logge ut akkurat nå. Prøv igjen.");
      }
    });
  }

  /* --- Endre Navn Logikk --- */
  const endreNavnKnapp = safeGetElementById("endreNavnKnapp");
  const editNavnBox = safeGetElementById("editNavnBox");
  const nyttNavnInput = safeGetElementById("nyttNavnInput");
  const lagreNavnBtn = safeGetElementById("lagreNavnBtn");
  const avbrytNavnBtn = safeGetElementById("avbrytNavnBtn");

  if (endreNavnKnapp && editNavnBox && nyttNavnInput) {
    leggTilEventListenerMedLagring(endreNavnKnapp, "click", () => {
      nyttNavnInput.value = accountState.profiler[accountState.aktivProfilIndex]?.navn || "";
      editNavnBox.classList.remove("hidden");
      endreNavnKnapp.classList.add("hidden");
      nyttNavnInput.focus();
    });
  }

  if (avbrytNavnBtn && editNavnBox && endreNavnKnapp) {
    leggTilEventListenerMedLagring(avbrytNavnBtn, "click", () => {
      editNavnBox.classList.add("hidden");
      endreNavnKnapp.classList.remove("hidden");
    });
  }

  if (lagreNavnBtn && nyttNavnInput && editNavnBox && endreNavnKnapp) {
    leggTilEventListenerMedLagring(lagreNavnBtn, "click", async () => {
      if (!accountState.profiler[accountState.aktivProfilIndex]) return;
      const nyttNavn = nyttNavnInput.value.trim();
      if (nyttNavn && nyttNavn !== accountState.profiler[accountState.aktivProfilIndex].navn) {
        accountState.profiler[accountState.aktivProfilIndex].navn = nyttNavn;
        await oppdaterProfilData();
        byggProfilgrensesnitt();
      }
      editNavnBox.classList.add("hidden");
      endreNavnKnapp.classList.remove("hidden");
    });
  }

  /* --- PIN Toggle Logikk --- */
  const pinToggleBtn = safeGetElementById("pinToggleBtn");
  const editPinBox = safeGetElementById("editPinBox");
  const nyPinInput = safeGetElementById("nyPinInput");
  const lagrePinBtn = safeGetElementById("lagrePinBtn");
  const avbrytPinBtn = safeGetElementById("avbrytPinBtn");
  const pinToggleText = pinToggleBtn ? pinToggleBtn.querySelector(".pin-toggle-text") : null;

  if (pinToggleBtn && editPinBox && nyPinInput) {
    leggTilEventListenerMedLagring(pinToggleBtn, "click", async () => {
      if (!accountState.profiler[accountState.aktivProfilIndex]) return;

      if (pinToggleBtn.classList.contains("active")) {
        accountState.profiler[accountState.aktivProfilIndex].pin = null;
        await oppdaterProfilData();
        byggProfilgrensesnitt();
        return;
      }

      nyPinInput.value = "";
      editPinBox.classList.remove("hidden");
      nyPinInput.focus();
    });
  }

  if (avbrytPinBtn && editPinBox && pinToggleBtn && pinToggleText) {
    leggTilEventListenerMedLagring(avbrytPinBtn, "click", () => {
      editPinBox.classList.add("hidden");
      const harPin = Boolean(accountState.profiler[accountState.aktivProfilIndex]?.pin);
      pinToggleBtn.classList.toggle("active", harPin);
      pinToggleBtn.setAttribute("aria-pressed", harPin ? "true" : "false");
      pinToggleText.textContent = harPin ? "Kode på" : "Kode av";
    });
  }

  if (lagrePinBtn && nyPinInput && editPinBox) {
    leggTilEventListenerMedLagring(lagrePinBtn, "click", async () => {
      if (!accountState.profiler[accountState.aktivProfilIndex]) return;
      const nyPin = nyPinInput.value.trim();
      if (!nyPin) {
        alert("Skriv inn en kode først.");
        return;
      }
      accountState.profiler[accountState.aktivProfilIndex].pin = nyPin;
      await oppdaterProfilData();
      byggProfilgrensesnitt();
      editPinBox.classList.add("hidden");
    });
  }
}

/* ================= 3. FIREBASE & HJELPEFUNKSJONER ================= */
async function hentKontodata() {
  if (!accountState.docRef) return;
  try {
    const docSnap = await getDoc(accountState.docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      accountState.profiler = Array.isArray(data.profiler) ? data.profiler : [];
      accountState.globalEpost = data.epost || accountState.globalEpost;
      lagreILokalStorage();
      byggProfilgrensesnitt();
    } else {
      accountState.profiler = [];
    }
  } catch (e) {
    console.error("Feil ved henting av data:", e);
  }
}

function byggProfilgrensesnitt() {
  const gjeldendeProfil = accountState.profiler[accountState.aktivProfilIndex];
  if (!gjeldendeProfil) return;

  const navnDisplay = safeGetElementById("navnDisplay");
  const navnView = safeGetElementById("navnView");
  const epostView = safeGetElementById("epostView");
  const profilbilde = safeGetElementById("profilbilde");
  const pinView = safeGetElementById("pinView");
  const pinToggleBtn = safeGetElementById("pinToggleBtn");
  const editPinBox = safeGetElementById("editPinBox");
  const endreNavnKnapp = safeGetElementById("endreNavnKnapp");

  if (navnDisplay) navnDisplay.innerText = gjeldendeProfil.navn;
  if (navnView) navnView.innerText = gjeldendeProfil.navn;
  if (epostView) epostView.innerText = accountState.globalEpost;
  if (profilbilde) profilbilde.src = gjeldendeProfil.bilde || "https://via.placeholder.com/160";

  const harPin = Boolean(gjeldendeProfil.pin);
  if (pinView) pinView.innerText = harPin ? "Kode satt" : "Ingen kode satt";

  if (pinToggleBtn) {
    pinToggleBtn.classList.toggle("active", harPin);
    pinToggleBtn.setAttribute("aria-pressed", harPin ? "true" : "false");
    const pinToggleText = pinToggleBtn.querySelector(".pin-toggle-text");
    if (pinToggleText) pinToggleText.textContent = harPin ? "Kode på" : "Kode av";
  }

  if (editPinBox) editPinBox.classList.add("hidden");

  if (endreNavnKnapp) {
    if (gjeldendeProfil.isKids) {
      endreNavnKnapp.classList.add("hidden");
    } else {
      endreNavnKnapp.classList.remove("hidden");
    }
  }
}

async function slettProfil() {
  if (!accountState.profiler[accountState.aktivProfilIndex]) return;

  if (accountState.profiler.length <= 1) {
    alert("Du kan ikke slette den eneste profilen på kontoen.");
    return;
  }

  if (confirm(`Er du sikker på at du vil slette profilen "${accountState.profiler[accountState.aktivProfilIndex].navn}" permanent?`)) {
    accountState.profiler.splice(accountState.aktivProfilIndex, 1);
    await oppdaterProfilData();
    window.location.href = "hvem-ser-på.html?index=0";
  }
}

async function oppdaterProfilData() {
  if (!accountState.docRef || !accountState.currentUser) return;
  await setDoc(accountState.docRef, {
    profiler: accountState.profiler,
    epost: accountState.globalEpost,
    sistOppdatert: new Date().toISOString()
  }, { merge: true });
  lagreILokalStorage();
}

async function loggUt() {
  try {
    await signOut(auth);
    localStorage.removeItem("watch_nordic_profiles_cache");
    localStorage.removeItem("watch_nordic_email_cache");
    window.location.href = "index.html";
  } catch (error) {
    console.error("Kunne ikke logge ut:", error);
    alert("Kunne ikke logge ut akkurat nå. Prøv igjen.");
  }
}
