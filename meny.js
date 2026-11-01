function updateNavState() {
  const scrolled = window.scrollY > 0;
  document.body.classList.toggle("scrolled-y", scrolled);
  document.querySelectorAll(".top-nav, .top-menu").forEach(nav => {
    nav.classList.toggle("scrolled", scrolled);
  });
}

function updateActiveLinks() {
  const currentRoute = window.location.hash.match(/^#\/?([^?]+)/)?.[1] || "welcome";
  const routeByPage = {
    "hovedside.html": ["home", "detail"],
    "serier.html": ["home"],
    "film.html": ["home"],
    "nyheter.html": ["home"],
    "min-liste.html": ["list"],
    "søk.html": ["search"],
    "hvem-ser-på.html": ["profiles"]
  };

  document.querySelectorAll(".top-nav, .top-menu").forEach(nav => {
    nav.querySelectorAll(".nav-links a").forEach(link => {
      const href = (link.getAttribute("href") || "").split("/").pop().toLowerCase();
      const routes = routeByPage[href] || [];
      link.classList.toggle("active", routes.includes(currentRoute) && (currentRoute !== "home" || href === "hovedside.html"));
    });
  });
}

function updateProfileImage() {
  const savedImage = localStorage.getItem("profilbilde");
  const image = document.getElementById("menyProfilbilde");
  if (!image) return;

  image.src = savedImage && savedImage !== "null" && savedImage !== "undefined" && savedImage.trim()
    ? savedImage
    : "https://res.cloudinary.com/ocv4zhpk/image/upload/v1785856037/Muffins_profil_100_k1qd4h.png";
}

function initNav() {
  updateActiveLinks();
  updateNavState();
  updateProfileImage();
}

if (!window.__watchNordicNavListeners) {
  window.addEventListener("spa:routechange", () => {
    updateActiveLinks();
    updateNavState();
    updateProfileImage();
  });

  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    window.requestAnimationFrame(() => {
      updateNavState();
      ticking = false;
    });
    ticking = true;
  }, { passive: true });

  window.__watchNordicNavListeners = true;
}

window.initNav = initNav;
