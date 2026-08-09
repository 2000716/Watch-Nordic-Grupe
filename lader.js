/* ==========================================
   LADER.JS (Tilpasset Z-Index Hierarki)
   ========================================== */

function skjulHelsideLoader() {
  const helsideLoader = document.getElementById("page-loader");
  if (helsideLoader) {
    helsideLoader.classList.add("fade-out");
    helsideLoader.style.pointerEvents = "none";
    window.setTimeout(() => {
      if (helsideLoader && helsideLoader.parentNode) {
        helsideLoader.remove();
      }
    }, 500);
  }
}

function skjulInnholdsLoader() {
  const contentLoaders = document.querySelectorAll(".content-loader");
  contentLoaders.forEach((loader) => {
    loader.classList.add("fade-out");
    loader.style.pointerEvents = "none";
    window.setTimeout(() => {
      if (loader && loader.parentNode) {
        loader.remove();
      }
    }, 300);
  });
}

function visLoaderForInnhold() {
  const targetContainer = document.querySelector("#hovedinnhold");
  if (!targetContainer) return;

  // Unngå doble loadere
  if (targetContainer.querySelector(".content-loader")) return;

  // Bygg loaderen
  const loader = document.createElement("div");
  loader.className = "content-loader";
  loader.innerHTML = '<div class="spinner"></div>';

  // Legges rett inn i #hovedinnhold (CSS styrer posisjon/z-index under menyen)
  targetContainer.appendChild(loader);
}

function initLoaderHåndtering() {
  // 1. Full oppdatering (F5)
  const helsideLoader = document.getElementById("page-loader");
  
  const maxTimeout = window.setTimeout(() => {
    skjulHelsideLoader();
  }, 8000);

  if (helsideLoader) {
    window.addEventListener("load", () => {
      window.clearTimeout(maxTimeout);
      skjulHelsideLoader();
    });
  }

  // 2. HTMX-navigasjon (Kun innhold)
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    // Ignorer hvis HTMX henter selve meny.html
    const path = evt.detail.requestConfig ? evt.detail.requestConfig.path : "";
    if (path && path.includes("meny.html")) return;

    // Vis kun innholdsloader hvis helsideladeren allerede er fjernet
    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold();
    }
  });

  document.body.addEventListener("htmx:afterSwap", () => {
    skjulInnholdsLoader();
  });

  document.body.addEventListener("htmx:responseError", () => {
    skjulInnholdsLoader();
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initLoaderHåndtering);
} else {
  initLoaderHåndtering();
}
