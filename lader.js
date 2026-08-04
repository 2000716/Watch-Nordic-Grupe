/* ==========================================
   OPTIMALISERT LADER.JS (Rettet for iPad)
   ========================================== */

// Forbedret iPad-deteksjon som fungerer på alle iPadOS-versjoner
function erIpad() {
  const ua = navigator.userAgent;
  const erKlassiskIpad = /iPad/i.test(ua);
  // Sjekker UserAgent (Macintosh) kombinert med touch-punkter
  const erNyIpad = /Macintosh/i.test(ua) && (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);

  return erKlassiskIpad || erNyIpad;
}

function skjulLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  loader.style.pointerEvents = "none";
  loader.classList.add("fade-out");

  window.setTimeout(() => {
    if (loader && loader.parentNode) {
      loader.remove();
    }
  }, 600);
}

function initLoaderHåndtering() {
  const loader = document.getElementById("page-loader");

  // HVIS HMTL-elementet ikke finnes ennå, vent og prøv igjen når DOM er klar
  if (!loader) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
    }
    return;
  }

  // HVIS DET ER EN IPAD: Skjul og fjern umiddelbart
  if (erIpad()) {
    loader.style.display = "none";
    loader.remove();
    return;
  }

  // NØD-FALLBACK for andre enheter (maks 2.5s)
  const nodTimeout = window.setTimeout(() => {
    skjulLoader();
  }, 2500);

  try {
    const sistLastet = Number(localStorage.getItem("watchNordicLastLoaded") || "0");
    const naa = Date.now();

    if (sistLastet && (naa - sistLastet < 300000)) {
      window.clearTimeout(nodTimeout);
      skjulLoader();
    } else {
      window.setTimeout(() => {
        window.clearTimeout(nodTimeout);
        skjulLoader();
        localStorage.setItem("watchNordicLastLoaded", String(naa));
      }, 800);
    }
  } catch (error) {
    window.clearTimeout(nodTimeout);
    skjulLoader();
  }
}

// Sørg for at koden alltid kjører etter at DOM-strukturen er klar
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}

window.addEventListener("load", () => {
  if (!erIpad()) {
    skjulLoader();
  }
});
