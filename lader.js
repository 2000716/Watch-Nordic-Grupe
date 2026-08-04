/* ==========================================
   OPTIMALISERT LADER.JS (iPad & Mobil-trygg)
   ========================================== */

function skjulLoader() {
  const loader = document.getElementById("page-loader");

  if (!loader || loader.classList.contains("fade-out")) return;

  // 1. Skru av klikk/touch UMONTBART når den begynner å forsvinne
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

  // NØD-TIMEOUT: Tving loaderen til å forsvinne etter maks 2.5 sekunder,
  // selv om iPad/nettverket henger på et bilde eller Firebase.
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

// Ekstra sikring: Hvis 'load' (alt ferdig) inntreffer superraskt, skjul den
window.addEventListener("load", skjulLoader);
