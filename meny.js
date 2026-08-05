// meny.js
function initNav() {
  const navs = Array.from(document.querySelectorAll('.top-nav, .top-menu'));

  const updateNavState = () => {
    const scrolled = window.scrollY > 0;
    document.body.classList.toggle('scrolled-y', scrolled);

    navs.forEach((nav) => {
      nav.classList.toggle('scrolled', scrolled);
    });
  };

  const activateLink = () => {
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();
    const normalizedCurrent = currentPage || 'hovedside.html'; // Tilpasset din hovedside

    navs.forEach((nav) => {
      const links = nav.querySelectorAll('.nav-links a');
      links.forEach((link) => {
        const href = (link.getAttribute('href') || '').split('/').pop().toLowerCase();
        const isActive = href && (href === normalizedCurrent || (normalizedCurrent === 'hovedside.html' && href === 'hovedside.html'));
        link.classList.toggle('active', isActive);
      });
    });
  };

  activateLink();
  updateNavState();

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        updateNavState();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}
