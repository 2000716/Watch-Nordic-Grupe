export default {
  "spa-handler-profile-image-1"(event) {
    flyttKarusell(-1)
  },
  "spa-handler-profile-image-2"(event) {
    flyttKarusell(1)
  },
  "spa-handler-profile-image-3"(event) {
    tilbakeTilKonto()
  },
  "spa-handler-about-14"(event) {
    window.spaNavigate('Hovedside.html');
  },
  "spa-handler-contact-15"(event) {
    window.spaNavigate('Hovedside.html');
  },
  "spa-handler-privacy-16"(event) {
    window.spaNavigate('Hovedside.html');
  }
};
