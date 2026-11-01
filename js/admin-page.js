import adminHandlers from "./admin-inline-handlers.js";

window.spaNavigate = target => {
  const destination = target.toLowerCase() === "hovedside.html" ? "index.html" : target;
  window.location.assign(destination);
};

for (const eventName of ["click", "input", "change", "submit"]) {
  document.addEventListener(eventName, event => {
    const element = event.target.closest(`[data-spa-${eventName}]`);
    if (!element) return;

    const handler = adminHandlers[element.getAttribute(`data-spa-${eventName}`)];
    if (typeof handler !== "function") return;

    if (eventName === "click") event.preventDefault();
    handler.call(element, event);
  }, true);
}

await import("./spa-admin-1.js");
