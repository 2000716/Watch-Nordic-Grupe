// Funksjon som fader ut loaderen mykt og fjerner den fra HTML
function skjulLoader() {
  const loader = document.getElementById("page-loader");
  
  if (loader && !loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    
    // Fjerner elementet fra HTML etter at fade-animasjonen (0.6s) er ferdig
    setTimeout(() => {
      loader.remove();
    }, 600);
  }
}

window.addEventListener("load", () => {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  const sistLastet = localStorage.getItem("watchNordicLastLoaded");
  const naa = new Date().getTime();
  
  // Sjekker om siden er lastet i løpet av de siste 5 minuttene (300 000 ms)
  if (sistLastet && (naa - sistLastet < 300000)) {
    // Siden er nylig lastet: Fader ut MYKT med en gang (ingen ventetid/spinner)!
    skjulLoader();
  } else {
    // Første besøk: Venter 1 sekund så du ser Disney+-looken, deretter fader den ut mykt
    setTimeout(() => {
      skjulLoader();
    }, 1000);
    
    // Lagre tidspunktet
    localStorage.setItem("watchNordicLastLoaded", naa);
  }
});
