// Definier rutene og hvilken HTML-fil de tilsvarer
const routes = {
    "/": "hovedside.html",
    "/film": "film.html",
    "/min-liste": "Min-Liste.html",
    "/kontakt": "kontakt.html",
    "/om": "om.html"
};

async function router() {
    // Hent hash fra URL (f.eks. #/film blir til /film)
    let path = window.location.hash.slice(1) || "/";
    
    // Finn filnavnet som tilhører ruten, eller fall tilbake til hovedsiden
    let targetPage = routes[path] || routes["/"];

    try {
        // Hent innholdet fra den aktuelle HTML-filen
        const response = await fetch(targetPage);
        if (!response.ok) throw new Error("Kunne ikke laste siden");
        
        const html = await response.text();
        
        // Parse HTML-en for å hente ut kun <body>-innholdet eller hele teksten
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        
        // Sett inn innholdet i SPA-beholderen
        const appContainer = document.getElementById("app");
        appContainer.innerHTML = doc.body.innerHTML;

        // Valgfritt: Kjør spesifikke skrifter/initialiseringer for den gitte siden her om nødvendig
        executePageScript(path);

    } catch (error) {
        console.error("Feil ved lasting av side:", error);
        document.getElementById("app").innerHTML = "<h2>404 - Siden ble ikke funnet</h2>";
    }
}

// Håndter klikk på lenker slik at siden ikke lastes på nytt
window.addEventListener("click", e => {
    if (e.target.matches("[data-link]")) {
        e.preventDefault();
        window.location.hash = e.target.getAttribute("href").substring(1);
    }
});

// Lytt til endringer i historikk/hash
window.addEventListener("hashchange", router);
window.addEventListener("DOMContentLoaded", router);

function executePageScript(path) {
    // Her kan du legge til logikk for å trigge spesifikke JS-funksjoner per side hvis nødvendig
    console.Hologram ? console.log("Lastet rute:", path) : null;
}
