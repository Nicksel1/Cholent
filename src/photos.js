// Google listing photos, loaded live from Google only for locations that scroll into view.
window.GPhotos = (() => {
  const KEY = window.GKEY;
  const CK = "cc_gphotos_v1";
  let cache = {};
  try { cache = JSON.parse(sessionStorage.getItem(CK) || "{}"); } catch (_) {}
  const save = () => { try { sessionStorage.setItem(CK, JSON.stringify(cache)); } catch (_) {} };
  let svc, booting;
  const waiting = {};
  const queue = [];
  let active = 0;

  function boot() {
    return booting ||= new Promise((res, rej) => {
      if (!KEY) return rej();
      window.__ccPlaces = () => { svc = new google.maps.places.PlacesService(document.createElement("div")); res(); };
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${KEY}&libraries=places&callback=__ccPlaces&loading=async&language=en&region=IL`;
      s.async = true; s.onerror = rej;
      document.head.append(s);
    });
  }
  function credit(p) {
    const h = (p.html_attributions || [])[0] || "";
    const d = new DOMParser().parseFromString(h, "text/html").querySelector("a");
    return d ? { n: d.textContent.trim(), u: d.getAttribute("href") } : null;
  }
  function pump() {
    while (active < 3 && queue.length) {
      const pid = queue.shift();
      active++;
      svc.getDetails({ placeId: pid, fields: ["photos"] }, (place, status) => {
        active--;
        const p = status === "OK" && place?.photos?.[0];
        cache[pid] = p ? { s: p.getUrl({ maxWidth: 200, maxHeight: 200 }), l: p.getUrl({ maxWidth: 720 }), c: credit(p) } : 0;
        save();
        (waiting[pid] || []).forEach((f) => f(cache[pid]));
        delete waiting[pid];
        pump();
      });
    }
  }
  function get(pid) {
    if (pid in cache) return Promise.resolve(cache[pid]);
    return new Promise((res) => {
      if (waiting[pid]) return waiting[pid].push(res);
      waiting[pid] = [res];
      boot().then(() => { queue.push(pid); pump(); }, () => res(0));
    });
  }
  function fill(el) {
    const pid = el.dataset.pid;
    if (!pid || el.dataset.done) return;
    el.dataset.done = "1";
    get(pid).then((r) => {
      if (!r) return;
      const big = el.classList.contains("gp");
      const img = new Image();
      img.alt = "";
      img.decoding = "async";
      img.onload = () => el.classList.add("has-photo");
      if (big) {
        // show the small list photo at once (usually already loaded), then sharpen
        img.src = r.s; img.classList.add("lo");
        const hi = new Image();
        hi.onload = () => { img.src = r.l; img.classList.remove("lo"); };
        hi.src = r.l;
      } else img.src = r.s;
      el.prepend(img);
      if (big) {
        const c = document.createElement("span");
        c.className = "gcredit";
        c.textContent = "Google" + (r.c?.n ? " · " + r.c.n : "");
        el.append(c);
      }
    });
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { io.unobserve(e.target); fill(e.target); } }), { rootMargin: "200px" }) : null;
  function observe(root = document) {
    root.querySelectorAll("[data-pid]:not([data-done])").forEach((el) => (io ? io.observe(el) : fill(el)));
  }
  const warmed = new Set();
  function prefetch(pid) {
    if (!pid || warmed.has(pid)) return;
    warmed.add(pid);
    get(pid).then((r) => { if (r) { new Image().src = r.s; new Image().src = r.l; } });
  }
  return { observe, fill, prefetch };
})();
