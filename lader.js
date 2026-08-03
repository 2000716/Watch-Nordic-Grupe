function skjulLoader() {
  const loader = document.getElementById("page-loader");

  if (!loader || loader.classList.contains("fade-out")) return;

  loader.classList.add("fade-out");

  window.setTimeout(() => {
    loader.remove();
  }, 600);
}

window.addEventListener("load", () => {
  const loader = document.getElementById("page-loader");
  if (!loader) return;

  try {
    const sistLastet = Number(localStorage.getItem("watchNordicLastLoaded") || "0");
    const naa = Date.now();

    if (sistLastet && (naa - sistLastet < 300000)) {
      skjulLoader();
    } else {
      window.setTimeout(() => {
        skjulLoader();
      }, 1000);
      localStorage.setItem("watchNordicLastLoaded", String(naa));
    }
  } catch (error) {
    console.warn("Kunne ikke lese loader-cache:", error);
    skjulLoader();
  }
});
