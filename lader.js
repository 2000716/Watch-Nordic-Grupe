/* ==========================================
   LADER.JS (Hurtiglasting – Kun synlig innhold)
   ========================================== */

/**
 * Venter KUN på de første, mest kritiske bildene øverst på siden (f.eks. hero + 4 første plakater).
 * Bildene lenger nede får laste inn i bakgrunnen mens du bruker siden.
 */
function ventPåKritiskInnhold(container) {
  if (!container) return Promise.resolve();

  // 1. Hent kun de første 6 bildene i containeren (det som er synlig øverst)
  const alleBilder = Array.from(container.querySelectorAll("img"));
  const kritiskeBilder = alleBilder.slice(0, 6);

  const løfter = [];

  // Hjelpefunksjon som setter en maksgrense på 400ms per bilde
  const kjappSjekk = (promise) => {
    return Promise.race([
      promise,
      new Promise((resolve) => setTimeout(resolve, 400))
    ]);
  };

  kritiskeBilder.forEach((img) => {
    // Hvis bildet allerede er i minnet/cache, fortsett
    if (img.complete && img.naturalWidth !== 0) return;

    // Bruk moderne `decode()` hvis tilgjengelig, ellers vanlig load-event
    const bildeLøfte = img.decode
      ? img.decode().catch(() => {})
      : new Promise((resolve) => {
          img.addEventListener("load", resolve, { once: true });
          img.addEventListener("error", resolve, { once: true });
        });

    løfter.push(kjappSjekk(bildeLøfte));
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
    }, 300);
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
    }, 200);
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
  // 1. Første innlasting (F5 / Direktebesøk)
  const helsideLoader = document.getElementById("page-loader");

  if (helsideLoader) {
    const kjørHelsideSkanning = async () => {
      const hovedInnhold = document.querySelector("#hovedinnhold") || document.body;
      await ventPåKritiskInnhold(hovedInnhold);
      skjulHelsideLoader();
    };

    if (document.readyState === "complete") {
      kjørHelsideSkanning();
    } else {
      window.addEventListener("load", kjørHelsideSkanning, { once: true });
    }
  }

  // 2. HTMX – Vis lader i valgt container
  document.body.addEventListener("htmx:beforeRequest", (evt) => {
    const path = evt.detail.requestConfig ? evt.detail.requestConfig.path : "";
    if (path && path.includes("meny.html")) return;

    const target = evt.detail.target || document.querySelector("#hovedinnhold");

    if (!document.getElementById("page-loader")) {
      visLoaderForInnhold(target);
    }
  });

  // 3. HTMX etter bytte – Sjekk kun de øverste bildene i det nye innholdet
  document.body.addEventListener("htmx:afterSwap", async (evt) => {
    const targetElement = evt.detail.target || document.querySelector("#hovedinnhold");
    
    // Venter KUN på de første bildene øverst på skjermen
    await ventPåKritiskInnhold(targetElement);
    
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
