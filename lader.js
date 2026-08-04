/* ==========================================
   OPTIMALISERT LADER.JS (Synkronisert med Firebase)
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

function initLoaderHåndtering() {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  // Sjekker om dette er en side som henter data fra Firebase (f.eks. har ?navn= i URL-en)
  const erDynamiskSide = window.location.search.includes("navn=");

  // NØD-FALLBACK: Hvis nettet er ekstremt tregt eller noe krasjer, fjerner vi loaderen etter 8 sekunder uansett.
  const nodTimeout = window.setTimeout(() => {
    skjulLoader();
  }, 8000);

  if (erDynamiskSide) {
    // 1. Hvis koden allerede har rukket å si at den er ferdig:
    if (document.body && document.body.classList.contains("loaded")) {
      window.clearTimeout(nodTimeout);
      skjulLoader();
      return;
    }

    // 2. Hvis ikke, setter vi opp en "vakt" (Observer) som venter på at Firebase blir ferdig
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "class" && document.body.classList.contains("loaded")) {
          window.clearTimeout(nodTimeout);
          skjulLoader();
          observer.disconnect(); // Slutter å overvåke når den er ferdig
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
    // For vanlige sider (som Hovedside.html) som ikke venter på filmdata
    window.addEventListener("load", () => {
      window.clearTimeout(nodTimeout);
      skjulLoader();
    });
  }
}

// Sørg for at koden alltid kjører
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}
