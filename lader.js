// Vent til hele vinduet (inkludert alt av eksterne elementer) er lastet inn
window.addEventListener("load", function () {
    const loader = document.getElementById("page-loader");
    
    if (loader) {
        // Legger til CSS-klassen som fader den ut
        loader.classList.add("fade-out");
        
        // Fjerner elementet helt fra HTML-strukturen når fade-animasjonen er ferdig (0.6 sekunder)
        setTimeout(function () {
            loader.remove();
        }, 600);
    }
});
