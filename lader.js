/* ==========================================
   OPTIMALISERT LADER.JS (Ekskludert for iPad)
   ========================================== */

// Sjekk om enheten er en iPad
function erIpad() {
  const ua = navigator.userAgent;
  const erKlassiskIpad = /iPad/i.test(ua);
  // Nyere iPads på iPadOS rapporterer ofte som Mac, men har touch-skjerm
  const erNyIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;

  return erKlassiskIpad || erNyIpad;
}

function skjulLoader() {
  const loader = document.getElementById("page-loader");

  if (!loader || loader.classList.contains("fade-out")) return;

  // 1. Skru av klikk/touch UMIDDELBART når den begynner å forsvinne
  loader.style.pointerEvents = "none";
  loader.classList.add("fade-out");

  // 2. Fjern fra DOM etter at animasjonen (0.6s) er ferdig
  window.setTimeout(() => {
    if (loader.parentNode) {
      loader.remove();
    }
  }, 600);
}

function initLoaderHåndtering() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  // HVIS DET ER EN IPAD: Fjern loaderen umiddelbart og stopp kjøring
  if (erIpad()) {
    loader.remove();
    return;
  }

  // NØD-TIMEOUT: Tving loaderen til å forsvinne etter maks 2.5 sekunder
  const nodTimeout = window.setTimeout(() => {
    console.warn("Loader tidsavbrudd (Nød-fallback utløst).");
    skjulLoader();
  }, 2500);

  try {
    const sistLastet = Number(localStorage.getItem("watchNordicLastLoaded") || "0");
    const naa = Date.now();

    // Hvis du nylig har besøkt siden (siste 5 min) -> skjul nesten umiddelbart
    if (sistLastet && (naa - sistLastet < 300000)) {
      window.clearTimeout(nodTimeout);
      skjulLoader();
    } else {
      // Første besøk -> vent 800ms for at ting skal rekke å tegnes opp
      window.setTimeout(() => {
        window.clearTimeout(nodTimeout);
        skjulLoader();
        localStorage.setItem("watchNordicLastLoaded", String(naa));
      }, 800);
    }
  } catch (error) {
    console.warn("Kunne ikke lese loader-cache:", error);
    window.clearTimeout(nodTimeout);
    skjulLoader();
  }
}

// Kjør så fort HTML-en er klar (DOMContentLoaded er mye raskere og tryggere enn 'load')
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}

// Ekstra sikring: Hvis 'load' inntreffer superraskt, skjul den (gjelder kun ikke-iPad)
window.addEventListener("load", () => {
  if (!erIpad()) {
    skjulLoader();
  }
});
