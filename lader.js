// Funksjon som fjerner loaderen trygt
function skjulLoader() {
  const loader = document.getElementById("page-loader");
  
  if (loader && !loader.classList.contains("fade-out")) {
    loader.classList.add("fade-out");
    
    // Fjerner elementet fra HTML etter at fade-animasjonen på 0.6 sekunder er ferdig
    setTimeout(() => {
      loader.remove();
    }, 600);
  }
}

// Disney+-stil: Vis laderen raskt, og fjern den automatisk etter 1 sekund (1000 millisekunder) 
// slik at siden føles lynrask og responsiv, samtidig som du beholder den proffe looken.
window.addEventListener("load", () => {
  setTimeout(() => {
    skjulLoader();
  }, 1000); // Endre til f.eks. 800 for enda raskere, eller 1200 om du vil ha den litt lengre
});
