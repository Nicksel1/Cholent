// Eater-style list: numbered pins, the map follows the entry you're reading.
(() => {
  const el = document.getElementById("emap");
  if (!el) return;
  const entries = [...document.querySelectorAll(".entry")].filter((e) => e.dataset.lat);
  const load = (src) => new Promise((r) => { const s = document.createElement("script"); s.src = src; s.onload = r; document.head.append(s); });
  const css = document.createElement("link"); css.rel = "stylesheet"; css.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.append(css);
  load("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js").then(() => {
    const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, attributionControl: true });
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    const icon = (n, on) => L.divIcon({ className: "mk", html: `<div class="num-pin${on ? " on" : ""}">${n}</div>`, iconSize: [30, 30], iconAnchor: [15, 15] });
    const marks = new Map();
    entries.forEach((e) => {
      const m = L.marker([+e.dataset.lat, +e.dataset.lng], { icon: icon(e.dataset.n), zIndexOffset: 100 - +e.dataset.n }).addTo(map);
      m.on("click", () => e.scrollIntoView({ behavior: "smooth", block: "start" }));
      marks.set(e, m);
    });
    map.fitBounds(L.latLngBounds([...marks.values()].map((m) => m.getLatLng())), { padding: [30, 30] });
    let active = null;
    const setActive = (e) => {
      if (active === e) return;
      if (active) { marks.get(active).setIcon(icon(active.dataset.n)); active.classList.remove("on"); }
      active = e; e.classList.add("on");
      const m = marks.get(e); m.setIcon(icon(e.dataset.n, true)); m.setZIndexOffset(1000);
      map.flyTo(m.getLatLng(), Math.max(map.getZoom(), 12), { duration: matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 0.6 });
    };
    const io = new IntersectionObserver((es) => es.forEach((x) => { if (x.isIntersecting) setActive(x.target); }), { rootMargin: "-45% 0px -50% 0px" });
    entries.forEach((e) => io.observe(e));
  });
})();
