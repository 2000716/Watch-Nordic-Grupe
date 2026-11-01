import { auth, db } from "../firebase-oppsett.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const gallery = document.getElementById("minListeGallery");
const count = document.getElementById("listCount");
const topNav = document.getElementById("topNav");

window.addEventListener("scroll", () => {
  topNav?.classList.toggle("scrolled", window.scrollY > 20);
});

const savedImage = localStorage.getItem("profilbilde");
const profileImage = document.getElementById("menyProfilbilde");
if (savedImage && profileImage) profileImage.src = savedImage;

function readCachedProfiles() {
  try {
    return JSON.parse(localStorage.getItem("watch_nordic_profiles_cache") || "[]");
  } catch {
    return [];
  }
}

async function getActiveList(user) {
  const profiles = readCachedProfiles();
  const profileIndex = Number.parseInt(localStorage.getItem("aktivProfilIndex") || "0", 10) || 0;

  if (user) {
    try {
      const userSnapshot = await getDoc(doc(db, "users", user.uid));
      if (userSnapshot.exists()) {
        const latestProfiles = userSnapshot.data().profiler || [];
        localStorage.setItem("watch_nordic_profiles_cache", JSON.stringify(latestProfiles));
        return latestProfiles[profileIndex]?.minListe || [];
      }
    } catch (error) {
      console.error("Feil ved henting av listen fra Firebase:", error);
    }
  }

  return profiles[profileIndex]?.minListe || readLegacyList();
}

function readLegacyList() {
  try {
    return JSON.parse(localStorage.getItem("minListe") || "[]");
  } catch {
    return [];
  }
}

function parseListKey(value) {
  const text = String(value || "");
  const separator = text.indexOf(":");
  if (separator < 0) return { type: "", id: text };
  return { type: text.slice(0, separator), id: text.slice(separator + 1) };
}

async function getMedia(listKey) {
  const { type, id } = parseListKey(listKey);
  if (!id) return null;

  const collections = type === "serie" ? ["serier"] : type === "film" ? ["filmer"] : ["filmer", "serier"];
  for (const collectionName of collections) {
    try {
      const snapshot = await getDoc(doc(db, collectionName, id));
      if (snapshot.exists()) {
        return { ...snapshot.data(), id, type: collectionName === "serier" ? "serie" : "film" };
      }
    } catch (error) {
      console.error(`Feil ved henting av ${collectionName}/${id}:`, error);
    }
  }
  return null;
}

function buildCard(item) {
  const card = document.createElement("a");
  card.className = "movie-card";
  card.href = `film.html?navn=${encodeURIComponent(item.id)}&type=${item.type}`;

  const image = document.createElement("img");
  image.src = item.poster || item.bakgrunn || "https://via.placeholder.com/300x169";
  image.alt = item.tittel || "";
  image.loading = "lazy";

  const overlay = document.createElement("div");
  overlay.className = "movie-overlay";
  const title = document.createElement("div");
  title.className = "movie-title";
  title.textContent = item.tittel || "Uten tittel";

  const metadata = document.createElement("div");
  metadata.className = "movie-meta";
  const rating = document.createElement("span");
  rating.textContent = item.rating ? `★ ${item.rating}` : "";
  const genre = document.createElement("span");
  genre.textContent = Array.isArray(item.metadata) ? item.metadata[0] || "" : "";
  metadata.append(rating, genre);
  overlay.append(title, metadata);
  card.append(image, overlay);
  return card;
}

async function renderList(list) {
  if (!gallery) return;
  gallery.replaceChildren();

  const media = (await Promise.all(list.map(getMedia))).filter(Boolean);
  media.forEach(item => gallery.appendChild(buildCard(item)));

  if (count) count.textContent = `${media.length} ${media.length === 1 ? "tittel" : "titler"}`;
  if (!media.length) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";
    emptyState.innerHTML = '<i class="fas fa-bookmark"></i><p>Du har ingen titler i listen din ennå.</p><a href="Hovedside.html" class="browse-btn"><i class="fas fa-play"></i> Utforsk innhold</a>';
    gallery.appendChild(emptyState);
  }
}

onAuthStateChanged(auth, async user => {
  await renderList(await getActiveList(user));
});
