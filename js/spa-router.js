import inlineHandlers from "./spa-inline-handlers.js";

const root = document.getElementById("spa-root");
const templates = new Map(
  Array.from(document.querySelectorAll("template[data-route]"), template => [
    template.dataset.route,
    template
  ])
);
const viewCache = new Map();
const stylesheetCache = new Map();
const loadedScripts = new Set();
const routeByFile = new Map([
  ["index.html", "welcome"],
  ["innlogging.html", "login"],
  ["hovedside.html", "home"],
  ["søk.html", "search"],
  ["min-liste.html", "list"],
  ["film.html", "detail"],
  ["filminfo.html", "detail"],
  ["serie.html", "detail"],
  ["film-mal.html", "player"],
  ["konto.html", "account"],
  ["hvem-ser-på.html", "profiles"],
  ["velgprofilbilde.html", "profile-image"],
  ["om.html", "about"],
  ["kontakt.html", "contact"],
  ["hjelp.html", "contact"],
  ["personvern.html", "privacy"],
  ["passordfeil.html", "login"],
  ["serier.html", "home"],
  ["nyheter.html", "home"]
]);

let activeView = null;

function getRouteFromLocation() {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const hashRoute = hash.split(/[?&]/, 1)[0];

  if (templates.has(hashRoute)) {
    return { route: hashRoute, params: new URLSearchParams(window.location.search) };
  }

  if (hashRoute.startsWith("film-")) {
    const id = decodeURIComponent(hashRoute.slice(5));
    return { route: "detail", params: new URLSearchParams({ navn: id }) };
  }

  const file = decodeURIComponent(window.location.pathname.split("/").pop()).toLowerCase();
  const route = routeByFile.get(file) || "welcome";
  return { route, params: new URLSearchParams(window.location.search) };
}

function resolveTarget(target) {
  const url = new URL(target, window.location.href);
  if (url.origin !== window.location.origin) return null;

  const hashRoute = url.hash.replace(/^#\/?/, "").split(/[?&]/, 1)[0];
  if (templates.has(hashRoute)) {
    return { route: hashRoute, params: new URLSearchParams(url.search), url };
  }

  if (hashRoute.startsWith("film-")) {
    const id = decodeURIComponent(hashRoute.slice(5));
    return { route: "detail", params: new URLSearchParams({ navn: id }), url };
  }

  const fileName = decodeURIComponent(url.pathname.split("/").pop());
  const file = fileName.toLowerCase();
  if (fileName === "Film.html") {
    return { route: "home", params: new URLSearchParams(url.search), url, section: "alle-filmer-seksjon" };
  }
  const route = routeByFile.get(file);
  if (!route) return null;

  if (["serier.html", "nyheter.html"].includes(file)) {
    return { route, params: new URLSearchParams(url.search), url, section: file === "serier.html" ? "serier-seksjon" : "dokumentar-seksjon" };
  }

  return { route, params: new URLSearchParams(url.search), url };
}

function setStyles(template, route) {
  const links = Array.from(template.content.querySelectorAll("link[data-spa-style]"));
  const activeStyles = [];

  for (const marker of links) {
    const href = new URL(marker.dataset.href, window.location.href).href;
    let link = stylesheetCache.get(`${route}:${href}`);
    if (!link) {
      link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.spaOwner = route;
      document.head.appendChild(link);
      stylesheetCache.set(`${route}:${href}`, link);
    }
    activeStyles.push(link);
  }

  for (const style of stylesheetCache.values()) {
    style.disabled = !activeStyles.includes(style);
  }
}

function createView(route, template, routeKey) {
  const container = document.createElement("div");
  container.className = "spa-view";
  container.dataset.route = route;

  const fragment = template.content.cloneNode(true);
  const scriptMarkers = Array.from(fragment.querySelectorAll('script[type="application/x-spa-script"]'));
  fragment.querySelectorAll("[data-spa-style]").forEach(marker => marker.remove());
  scriptMarkers.forEach(marker => marker.remove());
  container.appendChild(fragment);

  return {
    route,
    routeKey,
    title: template.dataset.title || "Watch Nordic",
    bodyClass: template.dataset.bodyClass || "",
    bodyStyle: template.dataset.bodyStyle || "",
    container,
    scripts: scriptMarkers.map(marker => ({
      src: marker.dataset.spaSrc,
      type: marker.dataset.spaType || ""
    })),
    initialized: false
  };
}

function loadScript(scriptInfo, routeKey) {
  const sourceUrl = new URL(scriptInfo.src, window.location.href).href;
  const url = scriptInfo.type === "module"
    ? `${sourceUrl}${sourceUrl.includes("?") ? "&" : "?"}spaView=${encodeURIComponent(routeKey)}`
    : sourceUrl;
  const cacheKey = scriptInfo.type === "module"
    ? `${routeKey}:${scriptInfo.type}:${url}`
    : `classic:${url}`;
  if (loadedScripts.has(cacheKey)) return Promise.resolve();

  return new Promise(resolve => {
    const script = document.createElement("script");
    if (scriptInfo.type) script.type = scriptInfo.type;
    script.src = url;
    script.onload = () => {
      loadedScripts.add(cacheKey);
      resolve();
    };
    script.onerror = () => {
      console.error("Kunne ikke laste side-script:", url);
      loadedScripts.add(cacheKey);
      resolve();
    };
    document.body.appendChild(script);
  });
}

async function activateView(view, section) {
  if (activeView) {
    activeView.container.querySelectorAll("video").forEach(video => video.pause());
    window.dispatchEvent(new Event("spa:leave"));
    window.dispatchEvent(new Event("beforeunload"));
    activeView.bodyClass = document.body.className;
    activeView.bodyStyle = document.body.getAttribute("style") || "";
    activeView.container.remove();
  }

  setStyles(templates.get(view.route), view.route);
  document.title = view.title;
  document.body.className = view.bodyClass;
  if (view.bodyStyle) document.body.setAttribute("style", view.bodyStyle);
  else document.body.removeAttribute("style");

  root.removeAttribute("data-spa-loading");
  root.replaceChildren(view.container);
  activeView = view;

  if (!view.initialized) {
    for (const script of view.scripts) {
      await loadScript(script, view.routeKey);
    }
    if (typeof window.initNav === "function") window.initNav();
    document.dispatchEvent(new Event("DOMContentLoaded", { bubbles: true }));
    view.initialized = true;
  }

  window.dispatchEvent(new CustomEvent("spa:routechange", {
    detail: { route: view.route, params: new URLSearchParams(window.location.search) }
  }));

  if (section) {
    requestAnimationFrame(() => document.getElementById(section)?.scrollIntoView());
  } else {
    window.scrollTo(0, 0);
  }
}

async function render(route, params = new URLSearchParams(), section) {
  const template = templates.get(route);
  if (!template) {
    console.error("Fant ikke SPA-view:", route);
    return;
  }

  const query = params.toString();
  const routeKey = `${route}?${query}`;
  let view = viewCache.get(routeKey);
  if (!view) {
    view = createView(route, template, routeKey);
    viewCache.set(routeKey, view);
  }

  await activateView(view, section);
}

window.spaNavigate = async function(target, options = {}) {
  const resolved = resolveTarget(target);
  if (!resolved) {
    window.location.assign(target);
    return;
  }

  const query = resolved.params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}#/${resolved.route}`;
  if (options.replace) history.replaceState({ route: resolved.route }, "", nextUrl);
  else history.pushState({ route: resolved.route }, "", nextUrl);

  await render(resolved.route, resolved.params, resolved.section);
};

function isModifiedClick(event) {
  return event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function runInlineHandler(eventName, event) {
  const element = event.target.closest(`[data-spa-${eventName}]`);
  if (!element) return false;

  const handlerId = element.getAttribute(`data-spa-${eventName}`);
  const handler = inlineHandlers[handlerId];
  if (typeof handler !== "function") return false;

  if (eventName === "click") event.preventDefault();
  handler.call(element, event);
  return true;
}

for (const eventName of ["click", "input", "change", "submit"]) {
  document.addEventListener(eventName, event => runInlineHandler(eventName, event), true);
}

document.addEventListener("click", event => {
  if (event.defaultPrevented || isModifiedClick(event)) return;

  const link = event.target.closest("a[href]");
  if (link && !link.target && !link.hasAttribute("download")) {
    const resolved = resolveTarget(link.href);
    if (resolved) {
      event.preventDefault();
      event.stopImmediatePropagation();
      window.spaNavigate(link.href);
      return;
    }
  }

  const clickable = event.target.closest("[onclick]");
  const inlineNavigation = clickable?.getAttribute("onclick")?.match(/^\s*window\.location\.href\s*=\s*(['"])(.*?)\1\s*;?\s*$/);
  if (inlineNavigation && resolveTarget(inlineNavigation[2])) {
    event.preventDefault();
    event.stopImmediatePropagation();
    window.spaNavigate(inlineNavigation[2]);
  }
}, true);

window.addEventListener("popstate", () => {
  const { route, params } = getRouteFromLocation();
  render(route, params);
});

const initial = getRouteFromLocation();
render(initial.route, initial.params);
