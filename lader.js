/* ==========================================
   OPTIMALISERT LADER.JS (Helside ved F5, Innhold ved HTMX)
   ========================================== */

function skjulLoader() {
  // 1. Skjul helside-loaderen (ved full oppdatering)
  const helsideLoader = document.getElementById("page-loader");
  if (helsideLoader) {
    helsideLoader.style.pointerEvents = "none";
    helsideLoader.classList.add("fade-out");
    window.setTimeout(() => {
      if (helsideLoader && helsideLoader.parentNode) {
        helsideLoader.remove();
      }
    }, 600);
  }

  // 2. Skjul alle eventuelle innholds-loaderne (ved htmx)
  const contentLoaders = document.querySelectorAll(".content-loader");
  contentLoaders.forEach(l => {
    l.style.pointerEvents = "none";
    l.classList.add("fade-out");
    window.setTimeout(() => l.remove(), 400);
  });
}

function visLoaderForInnhold() {
  // Finn innholdsområdet der HTMX bytter ut elementer (tilpass ID om nødvendig, f.eks. #hovedinnhold eller main)
  const targetContainer = document.querySelector("#hovedinnhold") || document.querySelector("main") || document.body;
  
  if (!targetContainer) return;

  // Ikke lag ny om den allerede finnes
  if (targetContainer.querySelector(".content-loader")) return;

  const loader = document.createElement("div");
  loader.className = "content-loader";
  loader.innerHTML = '<div class="spinner"></div>';

  // Sørg for at containeren har relative posisjonering slik at loaderen holder seg inni den
  const computedStyle = window.getComputedStyle(targetContainer);
  if (computedStyle.position === "static") {
    targetContainer.style.position = "relative";
  }

  targetContainer.appendChild(loader);
}

function initLoaderHåndtering() {
  const helsideLoader = document.getElementById("page-loader");
  const erDynamiskSide = window.location.search.includes("navn=");

  const nodTimeout = window.setTimeout(() => {
    skjulLoader();
  }, 8000);

  if (helsideLoader) {
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
  }

  // HTMX INTEGRASJON: Viser loader KUN over innholdet, lar menyen være i fred
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
