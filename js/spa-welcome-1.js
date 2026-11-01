
    import { db } from "../firebase-oppsett.js";
    import { collection, getDocs } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

    const rows = [
      document.querySelector(".row1"),
      document.querySelector(".row2"),
      document.querySelector(".row3"),
      document.querySelector(".row4")
    ];

    const CACHE_KEY = "watch_nordic_poster_wall_cache_v4";
    const CACHE_TIME_KEY = "watch_nordic_poster_wall_time_v4";
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;

    async function lastInnPosters() {
      let basePosters = [];
      const cachedData = localStorage.getItem(CACHE_KEY);
      const cachedTime = localStorage.getItem(CACHE_TIME_KEY);
      const now = Date.now();

      if (cachedData && cachedTime && (now - Number(cachedTime) < ONE_DAY_MS)) {
        try {
          basePosters = JSON.parse(cachedData);
        } catch (e) {
          console.warn("Mellomlager kunne ikke leses, henter fra Firebase i stedet.");
        }
      }

      if (basePosters.length === 0) {
        try {
          async function hentFraSamling(samlingNavn) {
            const snap = await getDocs(collection(db, samlingNavn));
            snap.forEach(doc => {
              const data = doc.data();
              if (data.poster) {
                basePosters.push({ url: data.poster, type: 'horizontal' });
              }
              if (data.posterVertikal) {
                basePosters.push({ url: data.posterVertikal, type: 'vertical' });
              }
            });
          }

          await hentFraSamling("filmer");
          await hentFraSamling("serier");

          if (basePosters.length > 0) {
            localStorage.setItem(CACHE_KEY, JSON.stringify(basePosters));
            localStorage.setItem(CACHE_TIME_KEY, now.toString());
          }
        } catch (err) {
          console.error("Feil ved henting av posters fra Firebase:", err);
        }
      }

      if (basePosters.length > 0) {
        rows.forEach(row => {
          if (row) {
            let rowPosters = [...basePosters];
            const rowFragment = document.createDocumentFragment();

            for (let i = 0; i < 4; i++) {
              rowPosters.sort(() => Math.random() - 0.5);

              rowPosters.forEach(item => {
                const img = document.createElement("img");
                img.src = item.url;
                img.loading = "lazy";
                
                let cssClass = item.type === 'vertical' ? "vertical" : "horizontal";

                if (Math.random() < 0.15) {
                  cssClass += " glow";
                }

                img.className = cssClass;
                rowFragment.appendChild(img);
              });
            }
            row.appendChild(rowFragment);
          }
        });
      }
    }

    lastInnPosters();

    // --- COOKIE LOGIKK ---
    const cookieBanner = document.getElementById("cookieBanner");
    const cookieOptions = document.getElementById("cookieOptions");
    const btnAccept = document.getElementById("btnAccept");
    const btnReject = document.getElementById("btnReject");
    const btnCustomize = document.getElementById("btnCustomize");

    window.addEventListener("DOMContentLoaded", () => {
      const cookieConsent = localStorage.getItem("watch_nordic_cookie_consent");
      if (!cookieConsent) {
        setTimeout(() => {
          cookieBanner.classList.add("show");
        }, 1000);
      }
    });

    function saveConsent(consentType, details) {
      localStorage.setItem("watch_nordic_cookie_consent", consentType);
      localStorage.setItem("watch_nordic_cookie_details", JSON.stringify(details));
      cookieBanner.classList.remove("show");
    }

    btnAccept.addEventListener("click", () => {
      saveConsent("all", { analytics: true, marketing: true });
    });

    btnReject.addEventListener("click", () => {
      saveConsent("essential", { analytics: false, marketing: false });
    });

    btnCustomize.addEventListener("click", () => {
      if (cookieOptions.style.display === "grid") {
        const analytics = document.getElementById("cookieAnalytics").checked;
        const marketing = document.getElementById("cookieMarketing").checked;
        saveConsent("custom", { analytics, marketing });
      } else {
        cookieOptions.style.display = "grid";
        btnCustomize.innerText = "Lagre mine valg";
      }
    });
  