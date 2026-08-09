/* ==========================================
   STABIL LADER.JS (F5 vs HTMX)
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
    }, 600);
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
    }, 400);
  });
}

function visLoaderForInnhold() {
  const targetContainer = document.querySelector("#hovedinnhold");
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
  // --- 1. HÅNDTER F5 / FULL OPPDATERING ---
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

  // --- 2. HÅNDTER HTMX-KLIKK (KUN INNHOLD) ---
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    // Vis kun innholdsloader dersom helsideladeren allerede er fjernet
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
