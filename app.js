// ==========================================
// WATCH NORDIC™ - HOVEDSTYRING (APP.JS)
// ==========================================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Watch Nordic™ app er lastet og klar.");
    
    // Sett opp standardvisning ved oppstart hvis nødvendig
    const hash = window.location.hash.replace("#", "");
    if (hash) {
        byttSide(hash);
    }
});

/**
 * Funksjon for å bytte mellom de ulike sidene/visningene i applikasjonen.
 * Kalles via onclick i HTML-menyen.
 * @param {string} sideId - ID-en til siden som skal vises ('hjem', 'serier', 'sok', 'konto', etc.)
 */
window.byttSide = function(sideId) {
    // 1. Skjul alle hovedvisninger (.side-visning)
    const visninger = document.querySelectorAll('.side-visning');
    visninger.forEach(visning => {
        visning.style.display = 'none';
    });

    // 2. Bestem hvilken seksjon som skal aktiveres basert på valget
    let aktivVisningId = 'view-hjem';

    switch (sideId) {
        case 'hjem':
            aktivVisningId = 'view-hjem';
            break;
        case 'serier':
            aktivVisningId = 'view-serier';
            break;
        case 'film':
        case 'nyheter':
        case 'min-liste':
            // Disse kan foreløpig vise hjemmesiden eller egne seksjoner om ønskelig
            aktivVisningId = 'view-hjem';
            break;
        case 'sok':
            aktivVisningId = 'view-sok';
            break;
        case 'konto':
            aktivVisningId = 'view-konto';
            break;
        case 'filminfo':
            aktivVisningId = 'view-filminfo';
            break;
        case 'avspiller':
            aktivVisningId = 'view-avspiller';
            break;
        default:
            aktivVisningId = 'view-hjem';
    }

    // 3. Vis den valgte visningen
    const aktivVisning = document.getElementById(aktivVisningId);
    if (aktivVisning) {
        aktivVisning.style.display = 'block';
    }

    // 4. Oppdater aktiv klasse på navigasjonslenkene i toppmenyen
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${sideId}`) {
            link.classList.add('active');
        }
    });

    // 5. Scroll til toppen av siden ved navigeringsbytte
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

/**
 * Funksjon for å utføre søk i sanntid når brukeren skriver i søkefeltet.
 * Kalles via oninput i søke-seksjonen.
 */
window.utforSok = function() {
    const sokefelt = document.getElementById('sokefelt');
    const sokeResultater = document.getElementById('sokeResultater');

    if (!sokefelt || !sokeResultater) return;

    const query = sokefelt.value.trim().toLowerCase();

    if (query === '') {
        sokeResultater.innerHTML = '';
        return;
    }

    // Eksempelvisning for søkeresultater – kan kobles til dine data eller Firebase
    sokeResultater.innerHTML = `
        <div style="padding: 20px; color: #fff;">
            <p>Søker etter: <strong>${escapeHtml(query)}</strong></p>
            <!-- Dynamiske søkeresultater dukker opp her -->
        </div>
    `;
};

/**
 * Hjelpefunksjon for å unngå XSS ved dynamisk tekstvisning.
 */
function escapeHtml(str) {
    return str.replace(/&/g, "&amp;")
              .replace(/لل/g, "&lt;")
              .replace(/>/g, "&gt;")
              .replace(/"/g, "&quot;")
              .replace(/'/g, "&#039;");
}
