/* ==========================================
   LADER.JS (For vanlige HTML-sider)
   ========================================== */

(function () {
  /**
   * Finner og venter KUN på at hovedbanneret/hero-bildet på gjeldende HTML-side er klart.
   */
  function ventPåBanner() {
    // 1. Sjekk etter <img> i banner/hero-området
    const bannerImg = document.querySelector(
      ".hero img, .banner img, #hero img, img.hero-img, img.banner-img, [data-banner] img"
    );

    // 2. Sjekk etter elementer med bakgrunnsbilde (CSS)
    const bannerBg = document.querySelector(
      ".hero, .banner, #hero, [data-banner]"
    );

    const løfter = [];

    if (bannerImg) {
      // Hvis bildet ikke allerede er hentet fra nettleserens cache
      if (!bannerImg.complete || bannerImg.naturalWidth === 0) {
        løfter.push(
          new Promise((resolve) => {
            bannerImg.addEventListener("load", resolve, { once: true });
            bannerImg.addEventListener("error", resolve, { once: true });
          })
        );
      }
    } else if (bannerBg) {
      const bgVal = window.getComputedStyle(bannerBg).backgroundImage;
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
    }

    // Hvis siden ikke har noe bannerbilde (f.eks. en ren tekstside), fortsett umiddelbart
    if (løfter.length === 0) {
      return Promise.resolve();
    }

    return Promise.all(løfter);
  }

  function skjulLoader() {
    const loader = document.getElementById("page-loader");
    if (loader) {
      loader.classList.add("fade-out");
      loader.style.pointerEvents = "none";
      setTimeout(() => {
        if (loader && loader.parentNode) {
          loader.remove();
        }
      }, 300);
    }
  }

  async function startOpplasting() {
    // Vent på at kun bannerbildet er lastet
    await ventPåBanner();
    // Skjul loaderen umiddelbart
    skjulLoader();
  }

  // Start så fort HTML-strukturen er klar
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startOpplasting);
  } else {
    startOpplasting();
  }
})();
