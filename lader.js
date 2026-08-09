/* ==========================================
   OPTIMALISERT LADER.JS (Synkronisert med Firebase & htmx)
   ========================================== */

function skjulLoader() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  loader.style.pointerEvents = "none";
  loader.classList.add("fade-out");

  window.setTimeout(() => {
    if (loader && loader.parentNode) {
      loader.remove();
    }
  }, 600); // Gir tid til at CSS fade-out animasjonen kan spilles av
}

function visLoaderForInnhold() {
  // Sjekk om loader allerede finnes, hvis ikke lager vi en midlertidig for innholdet
  let loader = document.getElementById("page-loader");
  if (!loader) {
    loader = document.createElement("div");
    loader.id = "page-loader";
    loader.className = "content-loader"; // Egen klasse for kun innholdsområdet
    // Sett inn loaderen i hovedinnholdet eller over body (tilpass etter din HTML-struktur)
    const mainContent = document.querySelector("main") || document.body;
    mainContent.appendChild(loader);
  } else {
    loader.classList.remove("fade-out");
    loader.style.pointerEvents = "auto";
  }
}

function initLoaderHåndtering() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  const erDynamiskSide = window.location.search.includes("navn=");

  const nodTimeout = window.setTimeout(() => {
    skjulLoader();
  }, 8000);

  if (erDynamiskSide) {
    if (document.body && document.body.classList.contains("loaded")) {
      window.clearTimeout(nodTimeout);
      skjulLoader();
      return;
    }

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" && document.body.classList.contains("loaded")) {
          window.clearTimeout(nodTimeout);
          skjulLoader();
          observer.disconnect();
        }
      });
    });

    if (document.body) {
      observer.observe(document.body, { attributes: true });
    } else {
      document.addEventListener("DOMContentLoaded", () => {
        observer.observe(document.body, { attributes: true });
      });
    }
  } else {
    window.addEventListener("load", () => {
      window.clearTimeout(nodTimeout);
      skjulLoader();
    });
  }

  // HTMX INTEGRASJON: Håndterer overganger uten at menyen berøres
  document.body.addEventListener('htmx:beforeRequest', () => {
    visLoaderForInnhold();
  });

  document.body.addEventListener('htmx:afterSwap', () => {
    skjulLoader();
  });
}

// Sørg for at koden alltid kjører
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}
