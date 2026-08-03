function skjulLoader() {
  const loader = document.getElementById("page-loader");
  if (loader && !loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    setTimeout(() => {
      loader.remove();
    }, 600);
  }
}

window.addEventListener("load", () => {
  const loader = document.getElementById("page-loader");
  const sistLastet = localStorage.getItem("watchNordicLastLoaded");
  const naa = new Date().getTime();

  // Hvis siden ble lastet for under 5 minutter siden -> Dropp loaderen helt
  if (sistLastet && (naa - sistLastet < 300000)) {
    if (loader) loader.remove();
  } else {
    // Første besøk: Lagre tidsstempel
    localStorage.setItem("watchNordicLastLoaded", naa);
    
    // MERK: Her lar du dine egne Firebase-kall / funksjoner koble seg på, 
    // eller bruker en kjapp fallback slik at den aldri henger seg opp:
    setTimeout(() => {
      skjulLoader();
    }, 1200); 
  }
});
