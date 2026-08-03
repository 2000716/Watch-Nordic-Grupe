// Funksjon som fjerner loaderen trygt
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
  
  // Sjekk om siden allerede har blitt lastet inn i løpet av de siste 5 minuttene (300 000 ms)
  // eller om den ligger lagret i hurtigbufferen/session.
  const sistLastet = localStorage.getItem("watchNordicLastLoaded");
  const naa = new Date().getTime();
  
  // 5 minutter = 300000 millisekunder (du kan endre dette om du vil ha kortere/lengre tid)
  if (sistLastet && (naa - sistLastet < 300000)) {
    // Siden er nylig lastet / ligger lokalt -> Fjern loaderen med en gang uten ventetid!
    if (loader) loader.remove();
  } else {
    // Første besøk eller lenge siden sist -> Vis den kule Disney+-loaderen i 1 sekund
    setTimeout(() => {
      skjulLoader();
    }, 1000);
    
    // Lagre tidspunktet for når den ble lastet
    localStorage.setItem("watchNordicLastLoaded", naa);
  }
});
