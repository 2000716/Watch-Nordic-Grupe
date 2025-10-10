// ==================== SERIEDATA ==================== //
const serier = {
  "i-mummidalen": {
    tittel: "I Mummidalen",
    bakgrunn: "https://gfx.nrk.no/dX0XYs1HRsBtIl6h4ZWoawCp6_b4VgKnn2dGKDMiObpA",
    banner: "https://image.tmdb.org/t/p/original/x2LSRK2Cm7MZhjluni1msVJ3wDF.jpg",
    logo: "https://occ-0-55-56.1.nflxso.net/art/8b26a/8b26a3dfc7b891f55ee4b04ff10d9bcd1b3a8f3a.png",
    poster: "https://image.tmdb.org/t/p/w1280/9yjEMASvxhJGSUq7peDpWgBO5JW.jpg",
    posterVertikal: "https://image.tmdb.org/t/p/w780/56v2KjBlU4XaOv9rVYEQypROD7P.jpg",
    beskrivelse:
      "De sjarmerende og animerte eventyrene til en skapning som heter Mummi og hans venner og familie.",
    metadata: ["Finland", "1990", "Alle", "Familie", "4 sesonger"],
    imdb: "https://www.imdb.com/title/tt0247117/",
    skuespillere: "Mummitrollet, Snusmumrikken, Lille My, Snorkfrøken",
    skapere: "Tove Jansson",
    antallSesonger: 4,
    antallEpisoder: 34,
    watchUrl: "spillerepisode.html?serie=i-mummidalen&s=1&e=1",
    status: "Pågående",
    expireDate: "2026-12-31T23:59:59",

    // 🔹 Legg til episoder her
    episoder: {
      "Sesong 1": [
        {
          tittel: "Episode 1: Vår i Mummidalen",
          varighet: "22 min",
          thumbnail: "https://media.themoviedb.org/t/p/w320_and_h180_bestv2/hW1HW2XIaBCZrUWcG7TUTYMGB76.jpg",
          watchUrl: "spillerepisode.html?serie=i-mummidalen&s=1&e=1"
        },
        {
          tittel: "Episode 2: Snusmumrikken vender tilbake",
          varighet: "21 min",
          thumbnail: "https://m.media-amazon.com/images/I/81EYlj8ePjL._AC_SY679_.jpg",
          watchUrl: "spillerepisode.html?serie=i-mummidalen&s=1&e=2"
        }
      ],
      "Sesong 2": [
        {
          tittel: "Episode 1: Den store flommen",
          varighet: "23 min",
          thumbnail: "https://m.media-amazon.com/images/I/81EYlj8ePjL._AC_SY679_.jpg",
          watchUrl: "spillerepisode.html?serie=i-mummidalen&s=2&e=1"
        }
      ]
    }
  },

  "the-office": {
    tittel: "The Office (US)",
    bakgrunn:
      "https://m.media-amazon.com/images/S/pv-target-images/bcfbfe85fd5c8a4441e8d27b1a6e961a7e6e034b3b909e520d4c5734cb1ee64e._UR1920,1080_SX1500_FMjpg_.jpg",
    banner: "https://image.tmdb.org/t/p/original/qWnJzyZhyy74gjpSjIXWmuk0ifX.jpg",
    logo: "https://occ-0-92-93.1.nflxso.net/art/622b5/622b58a22601ffb2ec64f88c8c92d685bc29124b.png",
    poster: "https://m.media-amazon.com/images/I/81EYlj8ePjL._AC_SY679_.jpg",
    posterVertikal: "https://image.tmdb.org/t/p/w780/hH4YaZuH89Hlyz0DEkf362Mj8Oa.jpg",
    beskrivelse:
      "En tøysete sjef, et håpløst kontorliv og en rekke latterlige situasjoner i Dunder Mifflin Paper Company. En komiserie filmet som en dokumentar.",
    metadata: ["USA", "2005–2013", "12+", "Komedie", "9 sesonger"],
    imdb: "https://www.imdb.com/title/tt0386676/",
    skuespillere: "Steve Carell, Rainn Wilson, John Krasinski, Jenna Fischer",
    skapere: "Greg Daniels",
    antallSesonger: 9,
    antallEpisoder: 201,
    watchUrl: "spillerepisode.html?serie=the-office&s=1&e=1",
    status: "Fullført",
    expireDate: "2027-06-15T23:59:59",

    episoder: {
      "Sesong 1": [
        {
          tittel: "Episode 1: Pilot",
          varighet: "23 min",
          thumbnail: "https://image.tmdb.org/t/p/w300/9HH4YaZuH89Hlyz0DEkf362Mj8Oa.jpg",
          watchUrl: "spillerepisode.html?serie=the-office&s=1&e=1"
        },
        {
          tittel: "Episode 2: Diversity Day",
          varighet: "22 min",
          thumbnail: "https://image.tmdb.org/t/p/w300/hH4YaZuH89Hlyz0DEkf362Mj8Oa.jpg",
          watchUrl: "spillerepisode.html?serie=the-office&s=1&e=2"
        }
      ],
      "Sesong 2": [
        {
          tittel: "Episode 1: The Dundies",
          varighet: "21 min",
          thumbnail: "https://image.tmdb.org/t/p/w300/aBcDeFgH123.jpg",
          watchUrl: "spillerepisode.html?serie=the-office&s=2&e=1"
        }
      ]
    }
  }
};

// Gjør tilgjengelig globalt
window.serier = serier;







