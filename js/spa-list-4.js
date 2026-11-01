
    import { auth, db } from "../firebase-oppsett.js";
    import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
    import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

    const minListeGallery = document.getElementById("minListeGallery");
    const listCountEl = document.getElementById("listCount");
    const topNav = document.getElementById("topNav");

    // Scroll-effekt for toppmeny
    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        topNav.classList.add("scrolled");
      } else {
        topNav.classList.remove("scrolled");
      }
    });

    // Profilbilde fra localStorage
    const lagretBilde = localStorage.getItem("profilbilde");
    if (lagretBilde) {
      document.getElementById("menyProfilbilde").src = lagretBilde;
    }

    // Datakilder
    const filmerData = typeof window.filmer !== "undefined" ? window.filmer : (typeof filmer !== "undefined" ? filmer : {});
    const serierData = typeof window.serier !== "undefined" ? window.serier : (typeof serier !== "undefined" ? serier : {});

    // Henting av brukerens liste via Firebase eller LocalStorage
    onAuthStateChanged(auth, async (user) => {
      let minListe = [];

      if (user) {
        const aktivProfilIndex = localStorage.getItem("aktivProfilIndex") || "0";
        try {
          const userDoc = await getDoc(doc(db, "brukere", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            const profiler = data.profiler || [];
            if (profiler[aktivProfilIndex]) {
              minListe = profiler[aktivProfilIndex].minListe || [];
            }
          }
        } catch (e) {
          console.error("Feil ved henting fra Firestore:", e);
          minListe = JSON.parse(localStorage.getItem("minListe")) || [];
        }
      } else {
        minListe = JSON.parse(localStorage.getItem("minListe")) || [];
      }

      visMinListe(minListe);
    });

    function visMinListe(liste) {
      minListeGallery.innerHTML = "";
      
      if (!liste || liste.length === 0) {
        listCountEl.textContent = "0 titler";
        minListeGallery.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-bookmark"></i>
            <p>Du har ingen titler i listen din ennå.</p>
            <a href="Hovedside.html" class="browse-btn"><i class="fas fa-play"></i> Utforsk innhold</a>
          </div>
        `;
        return;
      }

      let funnetAntall = 0;

      liste.forEach(tittelNavn => {
        // Sjekker om tittelen finnes enten i filmdata eller seriedata
        const data = filmerData[tittelNavn] || serierData[tittelNavn];
        
        if (data) {
          funnetAntall++;
          const card = document.createElement("div");
          card.className = "movie-card";

          const bildeSrc = data.poster || data.bakgrunn || "https://via.placeholder.com/300x169";
          const rating = data.rating ? `⭐ ${data.rating}` : "";
          const sjanger = data.metadata ? data.metadata[0] || "" : "";

          card.innerHTML = `
            <img src="${bildeSrc}" alt="${data.tittel || tittelNavn}" loading="lazy">
            <div class="movie-overlay">
              <div class="movie-title">${data.tittel || tittelNavn}</div>
              <div class="movie-meta">
                <span>${rating}</span>
                <span>${sjanger}</span>
              </div>
            </div>
          `;

          card.addEventListener("click", () => {
            window.spaNavigate(`filminfo.html?navn=${encodeURIComponent(tittelNavn)}`);
          });

          minListeGallery.appendChild(card);
        }
      });

      listCountEl.textContent = `${funnetAntall} ${funnetAntall === 1 ? 'tittel' : 'titler'}`;
    }
  