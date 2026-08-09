/* ==========================================
   STABIL LADER.JS (Helside ved F5, Innhold ved HTMX)
   ========================================== */

function skjulLoader() {
  // 1. Skjul helside-loaderen (F5)
  const helsideLoader = document.getElementById("page-loader");
  if (helsideLoader) {
    helsideLoader.classList.add("fade-out");
    helsideLoader.style.pointerEvents = "none";
    window.setTimeout(() => {
      if (helsideLoader && helsideLoader.parentNode) {
        helsideLoader.remove();
      }
    }, 600);
  }

  // 2. Skjul innholds-loaderne (HTMX)
  const contentLoaders = document.querySelectorAll(".content-loader");
  contentLoaders.forEach((loader) => {
    loader.classList.add("fade-out");
    loader.style.pointerEvents = "none";
    window.setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.remove();
      }
    }, 400);
  });
}

function visLoaderForInnhold() {
  // Finn hovedinnholdet (endre #hovedinnhold hvis du bruker en annen ID)
  const targetContainer = document.querySelector("#hovedinnhold") || document.querySelector("main") || document.body;
  if (!targetContainer) return;

  if (targetContainer.querySelector(".content-loader")) return;

  const computedStyle = window.getComputedStyle(targetContainer);
  if (computedStyle.position === "static") {
    targetContainer.style.position = "relative";
  }

  const loader = document.createElement("div");
  loader.className = "content-loader";
  loader.innerHTML = '<div class="spinner"></div>';
  targetContainer.appendChild(loader);
}

function initLoaderHåndtering() {
  const helsideLoader = document.getElementById("page-loader");
  const erDynamiskSide = window.location.search.includes("navn=");

  const nodTimeout = window.setTimeout(() => {
    skjulLoader();
  }, 8000);

  if (helsideLoader) {
    // Sjekk om Firebase allerede har merket siden som 'loaded'
    if (document.body && document.body.classList.contains("loaded")) {
      window.clearTimeout(nodTimeout);
      skjulLoader();
    } else if (erDynamiskSide) {
      const observer = new MutationObserver(() => {
        if (document.body.classList.contains("loaded")) {
          window.clearTimeout(nodTimeout);
          skjulLoader();
          observer.disconnect();
        }
      });
      observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    } else {
      window.addEventListener("load", () => {
        window.clearTimeout(nodTimeout);
        skjulLoader();
      });
    }
  }

  // HTMX INTEGRASJON
  document.body.addEventListener("htmx:beforeRequest", () => {
    // Bare vis innholds-loader hvis helside-loaderen allerede er borte
    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold();
    }
  });

  document.body.addEventListener("htmx:afterOnLoad", () => {
    skjulLoader();
  });

  document.body.addEventListener("htmx:responseError", () => {
    skjulLoader();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}
