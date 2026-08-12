/* ==========================================
   LADER.JS (Universell for alle sider & elementer)
   ========================================== */

/**
 * Skanner alt innhold i en valgt container (eller hele siden)
 * og venter på at både <img> og CSS-bakgrunnsbilder er 100% hentet.
 */
function ventPåBilderIElement(container = document) {
  // 1. Finn alle standard <img>-tagger
  const bilder = Array.from(container.querySelectorAll("img"));

  // 2. Finn elementer som har bakgrunnsbilde via CSS
  const elementerMedBg = Array.from(container.querySelectorAll("*")).filter((el) => {
    const bg = window.getComputedStyle(el).backgroundImage;
    return bg && bg !== "none" && bg.startsWith("url(");
  });

  const løfter = [];

  // Hjelper for å laste en bilde-URL (brukes på bakgrunnsbilder)
  const lastUrl = (url) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = url;
      if (img.complete) return resolve();
      img.onload = resolve;
      img.onerror = resolve;
    });
  };

  // Sjekk <img>-tagger
  bilder.forEach((img) => {
    if (img.complete && img.naturalWidth !== 0) {
      løfter.push(Promise.resolve());
    } else {
      løfter.push(
        new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        })
      );
    }
  });

  // Sjekk CSS-bakgrunnsbilder
  elementerMedBg.forEach((el) => {
    const bgVal = window.getComputedStyle(el).backgroundImage;
    const cleanUrl = bgVal.slice(4, -1).replace(/["']/g, "");
    if (cleanUrl) løfter.push(lastUrl(cleanUrl));
  });

  if (løfter.length === 0) return Promise.resolve();
  return Promise.all(løfter);
}

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

/**
 * Legger lader dynamisk i målområdet som oppdateres, 
 * uavhengig av hva containeren heter på den aktuelle siden.
 */
function visLoaderForInnhold(targetContainer) {
  const container = targetContainer || document.querySelector("#hovedinnhold") || document.body;
  if (!container) return;

  if (container.querySelector(".content-loader")) return;

  const loader = document.createElement("div");
  loader.className = "content-loader";
  loader.innerHTML = '<div class="spinner"></div>';

  // Sikre at laderen plasserer seg riktig i containeren
  const pos = window.getComputedStyle(container).position;
  if (pos === "static") {
    container.style.position = "relative";
  }

  container.appendChild(loader);
}

function initLoaderHåndtering() {
  // 1. Første innlasting av ENHVILKEN SOM HELST side (F5 eller direkte lenke)
  const helsideLoader = document.getElementById("page-loader");

  // Sikkerhetsnett hvis et bilde eller et nettverkskall henger
  const maxTimeout = window.setTimeout(() => {
    skjulHelsideLoader();
  }, 8000);

  const kjørHelsideSkanning = async () => {
    await ventPåBilderIElement(document);
    window.clearTimeout(maxTimeout);
    skjulHelsideLoader();
  };

  if (helsideLoader) {
    if (document.readyState === "complete") {
      kjørHelsideSkanning();
    } else {
      window.addEventListener("load", kjørHelsideSkanning, { once: true });
    }
  }

  // 2. HTMX-navigasjon mellom undersider/innhold
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    const path = evt.detail.requestConfig ? evt.detail.requestConfig.path : "";
    if (path && path.includes("meny.html")) return;

    // Finn ut hvilket element HTMX er i ferd med å oppdatere
    const target = evt.detail.target || document.querySelector("#hovedinnhold");

    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold(target);
    }
  });

  document.body.addEventListener("htmx:afterSwap", async (evt) => {
    // Skann kun det nye området som akkurat ble byttet ut på siden
    const targetElement = evt.detail.target || document;
    
    await ventPåBilderIElement(targetElement);
    
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
