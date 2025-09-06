// --- FILMOPPSETT ---
const filmer = {
  "corpse-bride": {
    tittel: "Corpse Bride",
    watchUrl: "film-mal.html?id=corpse-bride",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_a659818165894e4894228ad4804060f4/1080p/mp4/file.mp4",
    subtitleUrl: "Corpse-bride.VTT",
    tilbakeUrl: "film.html?navn=corpse-bride",
    audioLanguages: [{ code: "en", label: "Engelsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "hook": {
    tittel: "Hook",
    watchUrl: "film-mal.html?id=hook",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_4900b93cc027487693fc66246b1ae100/720p/mp4/file.mp4",
    subtitleUrl: "Hook.VTT",
    tilbakeUrl: "film.html?navn=hook",
    audioLanguages: [{ code: "en", label: "Engelsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "kaptein-sabeltann": {
    tittel: "Kaptein Sabeltann og den magiske diamant",
    watchUrl: "film-mal.html?id=kaptein-sabeltann",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_6e01d7be2fda439fb39701d649b7f8b1/1080p/mp4/file.mp4",
    subtitleUrl: "Kaptein-sabeltann.VTT",
    tilbakeUrl: "film.html?navn=kaptein-sabeltann",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "burlesque": {
    tittel: "Burlesque",
    watchUrl: "film-mal.html?id=burlesque",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_7462cc0c8b1741fe813b5bf84c073e84/720p/mp4/file.mp4",
    subtitleUrl: "Burlesque.VTT",
    tilbakeUrl: "film.html?navn=burlesque",
    audioLanguages: [{ code: "en", label: "Engelsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "dog-man": {
    tittel: "Hundemannen",
    watchUrl: "film-mal.html?id=dog-man",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_f18a5454a4584c6e9b4d7f6e1e97413a/1080p/mp4/file.mp4",
    subtitleUrl: "Dog-man.VTT",
    tilbakeUrl: "film.html?navn=dog-man",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "dyrene-i-hakkabakkeskogen": {
    tittel: "Dyrene i Hakkabakkeskogen",
    watchUrl: "film-mal.html?id=dyrene-i-hakkabakkeskogen",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_e702a89f1d8d4d7b8cecfc4692d04493/720p/mp4/file.mp4",
    subtitleUrl: "",
    tilbakeUrl: "film.html?navn=dyrene-i-hakkabakkeskogen",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: []
  },
  "jul-i-flåklypa": {
    tittel: "Jul i Flåklypa",
    watchUrl: "film-mal.html?id=jul-i-flåklypa",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_26bfed9bfc254af8b14f41820a066eec/720p/mp4/file.mp4",
    subtitleUrl: "Jul-i-flåklypa.VTT",
    tilbakeUrl: "film.html?navn=jul-i-flåklypa",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "bamse-og-dunderklokken": {
    tittel: "Bamse og dunderklokken",
    watchUrl: "film-mal.html?id=bamse-og-dunderklokken",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_747e98649cb54331a25845335a07d608/1080p/mp4/file.mp4",
    subtitleUrl: "Bamse-og-dunderklokken.VTT",
    tilbakeUrl: "film.html?navn=bamse-og-dunderklokken",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "elio": {
    tittel: "Elio",
    watchUrl: "film-mal.html?id=elio",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_e2a1c24ef9da432dbdfae032ea242136/720p/mp4/file.mp4",
    subtitleUrl: "Elio.VTT",
    tilbakeUrl: "film.html?navn=elio",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "elvis": {
    tittel: "Elvis",
    watchUrl: "film-mal.html?id=elvis",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_9cbfa31964034f40b9471fa95cf6a170/720p/mp4/file.mp4",
    subtitleUrl: "Elvis.VTT",
    tilbakeUrl: "film.html?navn=elvis",
    audioLanguages: [{ code: "en", label: "Engelsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "comet-in-moominland": {
    tittel: "Comet in Moominland",
    watchUrl: "film-mal.html?id=comet-in-moominland",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_b4f49d491bc344f99d49bf3e297648db/720p/mp4/file.mp4",
    subtitleUrl: "",
    tilbakeUrl: "film.html?navn=comet-in-moominland",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: []
  },
  "kongens-nei": {
    tittel: "Kongens Nei",
    watchUrl: "film-mal.html?id=kongens-nei",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_16a47b758eee49719f0166dd9ee859d7/720p/mp4/file.mp4",
    subtitleUrl: "Kongens nei.VTT",
    tilbakeUrl: "film.html?navn=kongens-nei",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  },
  "max-manus": {
    tittel: "Max manus",
    watchUrl: "film-mal.html?id=max-manus",
    videoUrl: "https://video.wixstatic.com/video/fd2fb2_3057b85398be48ce997098642c08485e/720p/mp4/file.mp4",
    subtitleUrl: "",
    tilbakeUrl: "film.html?navn=max-manus",
    audioLanguages: [{ code: "no", label: "Norsk" }],
    subtitleLanguages: [{ code: "no", label: "Norsk" }, { code: "off", label: "Av" }]
  }
};

// --- RESTEN AV KODEN ER IDENTISK ---
// (her beholder du alt du hadde fra: 
// "const urlParams = new URLSearchParams(window.location.search);" 
// og ned til slutten av scriptet)

// Kopier hele funksjonaliteten for play/pause, UI, captions, lagring osv.
// Jeg kan lime inn *hele* ferdig JS-filen hvis du ønsker.
