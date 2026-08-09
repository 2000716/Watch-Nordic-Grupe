// ==========================================
// WATCH NORDIC - ENKEL SPA ROUTER
// ==========================================

const sider = {
  hjem: "hjem",
  filminfo: "filminfo",
  avspiller: "avspiller",
  sok: "sok",
  profil: "profil",
  minListe: "min-liste"
};


// ------------------------------------------
// Bytter mellom sidene
// ------------------------------------------

window.byttSide = function (sideId, params = {}) {

  console.log("Navigerer til:", sideId, params);

  // Skjul alle sider
  document.querySelectorAll("[data-side]").forEach(side => {
    side.style.display = "none";
  });

  // Finn siden vi skal vise
  const side = document.querySelector(
    `[data-side="${sideId}"]`
  );

  if (!side) {
    console.error("Fant ikke siden:", sideId);
    return;
  }

  // Vis siden
  side.style.display = "block";

  // Oppdater URL
  const queryString = new URLSearchParams(params).toString();

  const nyHash =
    "#" +
    sideId +
    (queryString ? "?" + queryString : "");

  if (window.location.hash !== nyHash) {
    history.pushState(null, "", nyHash);
  }

  // Gi app.js beskjed om hvilken film/serie som skal lastes
  if (sideId === "filminfo") {

    const id =
      params.id ||
      params.navn;

    if (id && typeof window.lastFilminfoMedId === "function") {
      window.lastFilminfoMedId(id);
    }
  }

  // Avspiller
  if (sideId === "avspiller") {

    console.log("Åpner avspiller:", params);

    // Her kan avspilleren din initialiseres senere.
  }
};


// ------------------------------------------
// Leser URL/hash
// ------------------------------------------

function lesHash() {

  const hash = window.location.hash;

  if (!hash) {
    return {
      side: "hjem",
      params: {}
    };
  }

  const utenHash = hash.substring(1);

  const [sideId, query] =
    utenHash.split("?");

  const params =
    query
      ? Object.fromEntries(
          new URLSearchParams(query)
        )
      : {};

  return {
    side: sideId,
    params
  };
}


// ------------------------------------------
// Starter riktig side
// ------------------------------------------

function startRouter() {

  const route = lesHash();

  window.byttSide(
    route.side,
    route.params
  );
}


// ------------------------------------------
// Når brukeren trykker tilbake/frem
// ------------------------------------------

window.addEventListener("popstate", () => {
  const route = lesHash();

  window.byttSide(
    route.side,
    route.params
  );
});


// ------------------------------------------
// Start router når HTML er klar
// ------------------------------------------

if (document.readyState === "loading") {

  document.addEventListener(
    "DOMContentLoaded",
    startRouter,
    { once: true }
  );

} else {

  startRouter();

}
