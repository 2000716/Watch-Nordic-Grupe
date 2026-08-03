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

// Nød-fallback: Hvis noe i Firebase/API-et feiler eller tar uvanlig lang tid,
// tvangsskjules loaderen etter 8 sekunder slik at brukeren ikke blir stående fast.
window.addEventListener("load", () => {
  setTimeout(() => {
    skjulLoader();
  }, 8000);
});
