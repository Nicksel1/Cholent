(() => {
  const $ = (s) => document.querySelector(s);
  const dlg = $("#player"), frame = dlg && dlg.querySelector("iframe");
  const embed = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3`;
  let warmed = false, pre = null;
  const warm = () => { if (warmed) return; warmed = true; ["https://www.youtube-nocookie.com", "https://www.google.com", "https://i.ytimg.com", "https://static.doubleclick.net"].forEach((h) => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = h; l.crossOrigin = ""; document.head.append(l); }); };
  ["pointerover", "touchstart", "focusin"].forEach((ev) => document.addEventListener(ev, (e) => { if (e.target.closest?.("[data-yt]")) warm(); }, { passive: true }));
  document.addEventListener("pointerdown", (e) => { const b = e.target.closest("[data-yt]"); if (!b || !frame) return; warm(); pre = b.dataset.yt; dlg.classList.toggle("wide", b.dataset.vertical === "false"); frame.src = embed(pre); const id = pre; setTimeout(() => { if (pre === id && !dlg.open) { pre = null; frame.src = "about:blank"; } }, 900); }, { passive: true });
  if ("requestIdleCallback" in window) addEventListener("load", () => requestIdleCallback(warm, { timeout: 4000 }));
  document.addEventListener("click", async (e) => {
    const v = e.target.closest("[data-yt]");
    if (v) {
      e.preventDefault();
      if (!dlg?.showModal) return window.open("https://www.youtube.com/watch?v=" + v.dataset.yt, "_blank", "noopener");
      if (pre !== v.dataset.yt) { dlg.classList.toggle("wide", v.dataset.vertical === "false"); frame.src = embed(v.dataset.yt); }
      pre = null;
      dlg.showModal();
      return;
    }
    if (dlg?.open && (e.target === dlg || e.target.closest("[data-close]") || e.target.classList.contains("box"))) { frame.src = "about:blank"; dlg.close(); return; }
    const s = e.target.closest("[data-share]");
    if (s) {
      const url = location.href.split("#")[0];
      try {
        if (navigator.share) await navigator.share({ title: s.dataset.share + " · Cholent & Chill", url });
        else { await navigator.clipboard.writeText(url); s.lastChild.textContent = "Copied"; setTimeout(() => (s.lastChild.textContent = "Share"), 1600); }
      } catch (_) {}
    }
  });
  dlg?.addEventListener("close", () => (frame.src = "about:blank"));

  const tiles = (m) => {
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
  };
  const PIN = '<svg viewBox="0 0 26 34" aria-hidden="true"><path d="M13 33s11-12.4 11-20.2A11 11 0 0 0 2 12.8C2 20.6 13 33 13 33Z"/><circle cx="13" cy="12.8" r="4"/></svg>';
  const icon = (score, on) => score
    ? L.divIcon({ className: "mk", html: `<div class="pin-s${+score >= 9 ? " top" : ""}${on ? " on" : ""}">${(+score).toFixed(1)}</div>`, iconSize: [46, 36], iconAnchor: [23, 36] })
    : L.divIcon({ className: "mk", html: `<div class="pin${on ? " on" : ""}">${PIN}</div>`, iconSize: [26, 34], iconAnchor: [13, 33] });

  let loading;
  function loadLeaflet() {
    return loading ||= new Promise((res) => {
      const l = document.createElement("link"); l.rel = "stylesheet"; l.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css"; document.head.append(l);
      const s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"; s.onload = res; document.head.append(s);
    });
  }
  function whenL(el, fn) {
    if (!("IntersectionObserver" in window)) return loadLeaflet().then(fn);
    const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { io.disconnect(); loadLeaflet().then(fn); } }, { rootMargin: "300px" });
    io.observe(el);
  }
  const mini = $("#minimap");
  if (mini) whenL(mini, () => {
    const ll = [+mini.dataset.lat, +mini.dataset.lng];
    const m = L.map(mini, { scrollWheelZoom: false, dragging: !matchMedia("(pointer:coarse)").matches, zoomControl: true }).setView(ll, 16);
    tiles(m);
    L.marker(ll, { icon: icon(mini.dataset.score, true), keyboard: false }).addTo(m);
  });
  const cm = $("#citymap");
  if (cm) whenL(cm, () => {
    const pts = JSON.parse(cm.dataset.pts);
    const m = L.map(cm, { scrollWheelZoom: false, dragging: !matchMedia("(pointer:coarse)").matches });
    tiles(m);
    pts.forEach(([la, lo, sc, url, name]) => L.marker([la, lo], { icon: icon(sc), title: name }).on("click", () => (location.href = url)).addTo(m));
    m.fitBounds(L.latLngBounds(pts.map((p) => [p[0], p[1]])), { padding: [30, 30], maxZoom: 15 });
  });
  window.GPhotos?.observe(document);

  // Changes made in the admin page (edits, removals) apply to this location page too.
  const sid = (location.pathname.match(/^\/spots\/([^/]+)/) || [])[1];
  if (sid) fetch("/api/data").then((r) => r.json()).then((d) => {
    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    if ((d.hidden || []).includes(sid)) {
      $("#main").innerHTML = '<div class="notfound"><div class="wrap"><h1>Not listed anymore.</h1><p><a class="btn" href="/#locations">All locations</a></p></div></div>';
      return;
    }
    const f = (d.edits || {})[sid];
    if (!f) return;
    const DAYS = { "Thursday": "Thu night", "Thu & Fri": "Thu–Fri", "Wed-Fri": "Wed–Fri", "All Week": "All week" };
    const dl = $(".spot .facts");
    const set = (label, val, html) => {
      if (!dl) return;
      let dt = [...dl.querySelectorAll("dt")].find((x) => x.textContent === label);
      if (!val) { if (dt) { dt.nextElementSibling.remove(); dt.remove(); } return; }
      if (!dt) { dt = document.createElement("dt"); dt.textContent = label; const dd = document.createElement("dd"); dl.append(dt, dd); }
      dt.nextElementSibling.innerHTML = html || esc(val);
    };
    if ("address" in f) set("Address", f.address);
    if ("days" in f) set("When", DAYS[f.days] || f.days);
    if ("kosher" in f) set("Kashrut", f.kosher);
    if ("phone" in f) { const dg = f.phone.replace(/\D/g, ""); set("Phone", f.phone, `<a href="tel:+972${dg.replace(/^0/, "")}">${esc(f.phone)}</a>`); const call = [...document.querySelectorAll(".spot .act")].find((a) => a.textContent.trim() === "Call"); if (call && dg) { call.href = "tel:+972" + dg.replace(/^0/, ""); call.removeAttribute("aria-disabled"); } }
    if ("price" in f) set("Prices", f.price);
    if ("nameEn" in f && f.nameEn) { const h = $(".spot h1"); if (h) h.innerHTML = `<span class="en">${esc(f.nameEn)}</span>`; }
    if ("score" in f || "verdict" in f) {
      let v = $(".spot .verdict");
      const score = "score" in f ? f.score : parseFloat(v?.querySelector(".stamp")?.textContent) || null;
      const text = "verdict" in f ? f.verdict : v?.querySelector("blockquote")?.textContent.replace(/^“|”$/g, "") || "";
      if (score == null && !text) { v?.remove(); }
      else {
        if (!v) { v = document.createElement("div"); v.className = "verdict"; $(".spot .where")?.after(v); }
        v.innerHTML = `${score != null ? `<span class="stamp xl ${score >= 9 ? "top" : ""}">${score.toFixed(1)}<small>/10</small></span>` : ""}<div>${text ? `<blockquote>“${esc(text)}”</blockquote>` : ""}${v?.querySelector("cite")?.outerHTML || ""}</div>`;
      }
    }
    if (f.video) {
      const m = $(".spot .media");
      const html = `<img src="https://i.ytimg.com/vi/${f.video}/oar2.jpg" alt="" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${f.video}/hqdefault.jpg'"><span class="play" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg></span></span><button type="button" data-yt="${f.video}" data-vertical="true" aria-label="Watch the review"></button>`;
      if (m) { m.className = "media v"; m.removeAttribute("data-pid"); m.innerHTML = html; }
    }
  }).catch(() => {});
})();
