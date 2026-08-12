/* ==========================================
   LADER.JS (Målsentrert skanning av kun nytt innhold)
   ========================================== */

/**
 * Skanner KUN bildene som ligger inne i den gitte containeren (f.eks #hovedinnhold).
 * Venter nøyaktig til bildene er lastet ned, helt uten kunstige forsinkelser.
 */
function ventPåInnhold(container) {
  if (!container) return Promise.resolve();

  // 1. Hent KUN <img>-tagger direkte inne i denne beholderen
  const bilder = Array.from(container.querySelectorAll("img"));

  // 2. Hent KUN elementer med bakgrunnsbilde direkte inne i denne beholderen
  const bgElementer = Array.from(
    container.querySelectorAll("[style*='background-image'], .hero, .banner, .card, .poster")
  );

  const løfter = [];

  // Sjekk standard <img>-tagger i innholdet
  bilder.forEach((img) => {
    // Hvis bildet allerede er i minnet/cache, hopp over
    if (img.complete && img.naturalWidth !== 0) return;

    løfter.push(
      new Promise((resolve) => {
        img.addEventListener("load", resolve, { once: true });
        img.addEventListener("error", resolve, { once: true });
      })
    );
  });

  // Sjekk bakgrunnsbilder i innholdet
  bgElementer.forEach((el) => {
    const bgVal = window.getComputedStyle(el).backgroundImage;
    if (bgVal && bgVal.startsWith("url(")) {
      const match = bgVal.match(/url\((['"]?)(.*?)\1\)/);
      if (match && match[2]) {
        løfter.push(
          new Promise((resolve) => {
            const tempImg = new Image();
            tempImg.src = match[2];
            if (tempImg.complete) return resolve();
            tempImg.onload = resolve;
            tempImg.onerror = resolve;
          })
        );
      }
    }
  });

  // Hvis det ikke er noen bilder i innholdet, fortsett umiddelbart
  if (løfter.length === 0) return Promise.resolve();

  // Vent nøyaktig til alle medier i innholdet er lastet
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

function visLoaderForInnhold(targetContainer) {
  const container = targetContainer || document.querySelector("#hovedinnhold");
  if (!container) return;

  if (container.querySelector(".content-loader")) return;

  const loader = document.createElement("div");
  loader.className = "content-loader";
  loader.innerHTML = '<div class="spinner"></div>';

  const pos = window.getComputedStyle(container).position;
  if (pos === "static") {
    container.style.position = "relative";
  }

  container.appendChild(loader);
}

function initLoaderHåndtering() {
  // 1. Første innlasting (F5) - skanner kun #hovedinnhold
  const helsideLoader = document.getElementById("page-loader");

  if (helsideLoader) {
    const kjørHelsideSkanning = async () => {
      const hovedInnhold = document.querySelector("#hovedinnhold") || document.body;
      await ventPåInnhold(hovedInnhold);
      skjulHelsideLoader();
    };

    if (document.readyState === "complete") {
      kjørHelsideSkanning();
    } else {
      window.addEventListener("load", kjørHelsideSkanning, { once: true });
    }
  }

  // 2. HTMX-navigasjon - Viser loader i målområdet
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    const path = evt.detail.requestConfig ? evt.detail.requestConfig.path : "";
    if (path && path.includes("meny.html")) return;

    const target = evt.detail.target || document.querySelector("#hovedinnhold");

    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold(target);
    }
  });

  // 3. HTMX etter bytte - Skanner KUN det nye target-elementet som ble satt inn
  document.body.addEventListener("htmx:afterSwap", async (evt) => {
    const targetElement = evt.detail.target || document.querySelector("#hovedinnhold");
    
    // Skanner BARE innholdet som skal spilles av/vises i målområdet
    await ventPåInnhold(targetElement);
    
    // Fjern loader umiddelbart når innholdet er klart
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
