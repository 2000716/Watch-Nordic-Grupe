const serier = {
  "MinSerie": {
    tittel: "Min Store Serie",
    bakgrunn: "bakgrunn.jpg",
    logo: "logo.png",
    beskrivelse: "En spennende serie med mange episoder.",
    metadata: ["2025", "Action", "10 sesonger"],
    skuespillere: "Skuespiller 1, Skuespiller 2",
    skaper: "Navn Navnesen",

    // Sesonger
    sesonger: [
      {
        // autogenerer 50 episoder
        episoder: Array.from({ length: 50 }, (_, i) => ({
          tittel: `Episode ${i + 1}`,
          beskrivelse: `Dette er beskrivelse for episode ${i + 1}.`,
          bilde: `bilder/s1e${i + 1}.jpg`,   // bildene kan hete s1e1.jpg, s1e2.jpg, osv.
          watchUrl: `avspiller.html?serie=MinSerie&sesong=1&ep=${i + 1}`
        }))
      },
      {
        // autogenerer 50 episoder til
        episoder: Array.from({ length: 50 }, (_, i) => ({
          tittel: `Episode ${i + 1}`,
          beskrivelse: `Dette er sesong 2 episode ${i + 1}.`,
          bilde: `bilder/s2e${i + 1}.jpg`,
          watchUrl: `avspiller.html?serie=MinSerie&sesong=2&ep=${i + 1}`
        }))
      }
    ]
  }
};


