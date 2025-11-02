// public/app.js
const API = (location.origin.includes('localhost') || location.origin.includes('127.0.0.1'))
  ? 'http://localhost:4000/api'
  : '/api';

let registreringsmodus = false;

window.addEventListener("DOMContentLoaded", async () => {
  const lagretEpost = localStorage.getItem("epost");
  if (lagretEpost) document.getElementById("epost").value = lagretEpost;
});

// Hovedskjema
async function handterSkjema() {
  const epost = document.getElementById("epost").value.trim().toLowerCase();
  const passord = document.getElementById("passord").value.trim();
  const navn = document.getElementById("navn").value.trim();
  const feilmelding = document.getElementById("feilmelding");
  feilmelding.textContent = "";

  if (!epost || !passord || (registreringsmodus && !navn)) {
    feilmelding.textContent = registreringsmodus
      ? "Fyll ut navn, e-post og passord."
      : "Fyll ut e-post og passord.";
    return false;
  }

  if (registreringsmodus) {
    const res = await fetch(`${API}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: epost, name: navn, password: passord })
    });
    const body = await res.json();
    if (!res.ok) {
      feilmelding.textContent = body.error || 'Feil ved registrering';
      return false;
    }
    alert('Registrering vellykket — logg inn');
    visInnlogging();
    return false;
  } else {
    const res = await fetch(`${API}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: epost, password: passord })
    });
    const body = await res.json();
    if (!res.ok) {
      feilmelding.textContent = body.error || 'Feil ved innlogging';
      return false;
    }
    // lagre token – i produksjon: bruk HTTP-only cookies fra server for bedre sikkerhet
    localStorage.setItem('token', body.token);
    localStorage.setItem('epost', epost);
    window.location.href = '/Hovedside.html';
    return false;
  }
}

function visRegistrering() {
  registreringsmodus = true;
  document.getElementById("formTitle").textContent = "Registrer deg";
  document.getElementById("submitKnapp").textContent = "Opprett konto";
  document.getElementById("toggleText").innerHTML =
    'Allerede medlem? <a onclick="visInnlogging()">Logg inn</a>';
  document.getElementById("navnGruppe").style.display = "block";
  document.getElementById("feilmelding").textContent = "";
  document.getElementById("passord").setAttribute("autocomplete", "new-password");
}

function visInnlogging() {
  registreringsmodus = false;
  document.getElementById("formTitle").textContent = "Logg inn";
  document.getElementById("submitKnapp").textContent = "Fortsett";
  document.getElementById("toggleText").innerHTML =
    'Er du ikke medlem? <a onclick="visRegistrering()">Registrer deg</a>';
  document.getElementById("navnGruppe").style.display = "none";
  document.getElementById("feilmelding").textContent = "";
  document.getElementById("passord").setAttribute("autocomplete", "current-password");
}

// Glemt passord
document.getElementById('forgotLink').addEventListener('click', async (e) => {
  e.preventDefault();
  const email = prompt('Skriv inn e-posten du registrerte med:');
  if (!email) return;
  await fetch(`${API}/forgot`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  alert('Hvis e-posten finnes, har vi sendt instruksjoner (eller token er opprettet).');
});
