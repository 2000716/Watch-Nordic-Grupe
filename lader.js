/* ==========================================
   STABIL LADER.JS (Helside ved F5, Innhold ved HTMX)
   ========================================== */

function skjulLoader() {
  // 1. Skjul helside-loaderen (ved F5 / oppdatering)
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

  // 2. Skjul innholds-loaderne (ved HTMX-klikk)
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

function visLoaderForInnhold(targetElement) {
  // Finn innholdsområdet (bruker HTMX sitt målelement eller #hovedinnhold / main)
  const targetContainer = targetElement || document.querySelector("#hovedinnhold") || document.querySelector("main");

  // STRENG SPERRE: Skal ALDRI legge seg på body eller dekke menyen
  if (!targetContainer || targetContainer === document.body) return;

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
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    // Kun vis innholds-loader hvis helside-loaderen (F5) ikke er aktiv
    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold(evt.detail?.target);
    }
  });

  document.body.addEventListener("htmx:afterSwap", () => {
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
