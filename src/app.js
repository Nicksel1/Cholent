(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const SPOTS = window.SPOTS || [];
  const byId = Object.fromEntries(SPOTS.map((s) => [s.i, s]));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const desktop = matchMedia("(min-width:1080px)");
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const hasHe = (s) => /[֐-׿]/.test(s || "");
  const DAYS = { "Thursday": "Thu night", "Thu & Fri": "Thu–Fri", "Wed-Fri": "Wed–Fri", "All Week": "All week" };
  const ICON = {
    waze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 3h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 7 7l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
    share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>',
    map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"/></svg>',
    list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  };

  // header turns solid once you leave the photo hero
  if ($(".ho, .hb")) {
    const hero = $(".ho, .hb"), tc = $('meta[name="theme-color"]');
    const onS = () => {
      const sc = scrollY > hero.offsetHeight - 70;
      if (document.body.classList.contains("scrolled") === sc && onS.done) return;
      onS.done = true;
      document.body.classList.toggle("scrolled", sc);
      tc?.setAttribute("content", sc ? "#f3efe5" : "#0c0d11");
    };
    addEventListener("scroll", onS, { passive: true }); onS();
  }

  // Section links scroll without leaving "#top-rated" in the address, so shared or reopened links start at the top.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2) return;
    const t = document.getElementById(a.getAttribute("href").slice(1));
    if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
  });
  if (location.hash && document.referrer.indexOf(location.origin) !== 0) { history.replaceState(null, "", location.pathname + location.search); scrollTo(0, 0); }
  else if (location.hash) history.replaceState(null, "", location.pathname + location.search);

  // ---------- reveal ----------
  const io = "IntersectionObserver" in window && !reduce.matches
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" })
    : null;
  $$(".rv").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));
  reduce.addEventListener?.("change", () => $$(".rv").forEach((el) => el.classList.add("in")));

  // ---------- video player ----------
  const dlg = $("#player");
  const frame = dlg && $("iframe", dlg);
  function play(id, vertical) {
    if (!dlg || !dlg.showModal) { window.open("https://www.youtube.com/watch?v=" + id, "_blank", "noopener"); return; }
    dlg.classList.toggle("wide", !vertical);
    frame.src = embed(id);
    dlg.showModal();
  }
  function stop() { if (frame) frame.src = "about:blank"; if (dlg?.open) dlg.close(); }
  dlg?.addEventListener("click", (e) => { if (e.target === dlg || e.target.closest("[data-close]") || e.target.classList.contains("box")) stop(); });
  dlg?.addEventListener("close", () => { if (frame) frame.src = "about:blank"; });
  // Speed: open connections to YouTube when a finger or cursor nears a video, and start loading on press.
  let warmed = false, pre = null;
  function warm() {
    if (warmed) return; warmed = true;
    ["https://www.youtube-nocookie.com", "https://www.google.com", "https://i.ytimg.com", "https://googleads.g.doubleclick.net", "https://static.doubleclick.net"].forEach((h) => { const l = document.createElement("link"); l.rel = "preconnect"; l.href = h; l.crossOrigin = ""; document.head.append(l); });
  }
  const embed = (id) => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&playsinline=1&rel=0&modestbranding=1&controls=0&iv_load_policy=3`;
  ["pointerover", "touchstart", "focusin"].forEach((ev) => document.addEventListener(ev, (e) => { if (e.target.closest?.("[data-yt]")) warm(); }, { passive: true }));
  // Desktop: get the hero episode's player ready in the background, so a click plays at once.
  let idleId = null;
  const idleLoad = () => {
    const b = $(".frame[data-yt]");
    if (!b || !frame || dlg.open || !matchMedia("(hover:hover) and (pointer:fine)").matches) return;
    idleId = b.dataset.yt;
    dlg.classList.toggle("wide", b.dataset.vertical === "false");
    frame.src = embed(idleId).replace("autoplay=1", "autoplay=0") + "&enablejsapi=1";
  };
  addEventListener("load", () => setTimeout(idleLoad, 1500));
  dlg?.addEventListener("close", () => { idleId = null; });
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("[data-yt]");
    if (!b || !frame || b.dataset.yt === idleId) return;
    warm(); pre = b.dataset.yt;
    dlg.classList.toggle("wide", b.dataset.vertical === "false");
    frame.src = embed(pre);
    const id = pre;
    setTimeout(() => { if (pre === id && !dlg.open) { pre = null; frame.src = "about:blank"; } }, 900);
  }, { passive: true });
  if ("requestIdleCallback" in window) addEventListener("load", () => requestIdleCallback(warm, { timeout: 4000 }));
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-yt]");
    if (!b) return;
    e.preventDefault();
    if (idleId && idleId === b.dataset.yt && dlg?.showModal) { dlg.showModal(); frame.contentWindow?.postMessage('{"event":"command","func":"playVideo","args":""}', "*"); return; }
    if (pre === b.dataset.yt && dlg?.showModal) { dlg.showModal(); pre = null; return; }
    play(b.dataset.yt, b.dataset.vertical !== "false");
  });

  // ---------- this week's episode and the Reviews grid keep themselves current ----------
  const hf = $(".frame[data-yt]");
  fetch("/api/latest").then((r) => r.json()).then((d) => {
    if (hf && d.id && d.id !== hf.dataset.yt) {
      hf.dataset.yt = d.id; hf.dataset.vertical = "true";
      const im = $(".frame-img img", hf);
      im.onerror = () => { im.onerror = null; im.src = `https://i.ytimg.com/vi/${d.id}/hqdefault.jpg`; };
      im.src = `https://i.ytimg.com/vi/${d.id}/oar2.jpg`;
      $(".frame-cap strong", hf).textContent = d.name;
      $(".frame-cap .meta", hf).textContent = d.place || "";
      const st = $(".stamp", hf);
      if (st) { if (d.score) st.innerHTML = `${d.score.toFixed(1)}<small>/10</small>`; else st.remove(); }
      idleLoad();
    }
    const reel = $("#reviews .reel"), list = d.list || [];
    if (!reel || !list.length || reel.querySelector(`[data-yt="${list[0].id}"]`)) return;
    const known = Object.fromEntries(SPOTS.filter((s) => s.v).map((s) => [s.v, s]));
    const have = new Set($$("[data-yt]", reel).map((b) => b.dataset.yt));
    const fresh = list.filter((v) => !have.has(v.id)).reverse();
    for (const v of fresh) {
      const k = known[v.id], score = k?.s ?? v.score, name = k ? k.e || k.n : v.name;
      const b = document.createElement("button");
      b.className = "ep in"; b.type = "button"; b.dataset.yt = v.id; b.dataset.vertical = "true";
      b.innerHTML = `<span class="ph"><img src="https://i.ytimg.com/vi/${v.id}/oar2.jpg" alt="" loading="lazy" width="220" height="391" onerror="this.onerror=null;this.src='https://i.ytimg.com/vi/${v.id}/hqdefault.jpg'"><span class="play"><span>${ICON.play}</span></span>${score ? `<span class="stamp sm ${score >= 9 ? "top" : ""}">${score.toFixed(1)}<small>/10</small></span>` : ""}</span><strong>${esc(name)}</strong><span class="meta">${new Date(v.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>`;
      reel.prepend(b);
    }
    $$(".ep", reel).forEach((el, k) => { el.classList.toggle("ep-more", k >= 6); el.classList.toggle("ep-more-m", k >= 4 && k < 6); });
  }).catch(() => {});

  // ---------- share ----------
  async function share(title, url) {
    const data = { title: title + " · Cholent & Chill", url };
    try {
      if (navigator.share) { await navigator.share(data); return; }
      await navigator.clipboard.writeText(url);
      toast("Link copied");
    } catch (_) {}
  }
  function toast(msg) {
    let t = $("#toast");
    if (!t) { t = document.createElement("div"); t.id = "toast"; t.setAttribute("role", "status"); t.style.cssText = "position:fixed;left:50%;bottom:90px;transform:translateX(-50%);background:#17140f;color:#faf7f0;padding:10px 16px;border-radius:999px;font-weight:600;font-size:14px;z-index:90;transition:opacity .3s"; document.body.append(t); }
    t.textContent = msg; t.style.opacity = "1";
    clearTimeout(t._h); t._h = setTimeout(() => (t.style.opacity = "0"), 1800);
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-share]");
    if (!b) return;
    share(b.dataset.share, new URL(b.dataset.url || location.pathname, location.origin).href);
  });

  // ---------- directory ----------
  const list = $("#list");
  if (!list) return;
  const rows = Object.fromEntries($$(".row", list).map((li) => [li.dataset.id, li]));
  const state = { q: "", city: "", rated: false, tonight: false, sort: "top", me: null, sel: null };
  const order0 = $$(".row", list).map((li) => li.dataset.id);

  // Israel time decides what "tonight" means. Evening rolls into the next day's night only after midnight.
  function openTonight(days) {
    const d = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Jerusalem" })).getDay(); // 0 Sun .. 6 Sat
    if (days === "All Week") return d !== 5 && d !== 6;
    if (days === "Wed-Fri") return d >= 3 && d <= 5;
    if (days === "Thu & Fri") return d === 4 || d === 5;
    return d === 4;
  }
  const dayName = new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "Asia/Jerusalem" });
  const tonightChip = $('[data-f="tonight"]');
  if (tonightChip) tonightChip.textContent = dayName === "Friday" ? "Open today" : "Open tonight";

  const norm = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[֑-ׇ]/g, "").replace(/[’'`"״׳]/g, "");
  const hay = Object.fromEntries(SPOTS.map((s) => [s.i, norm([s.n, s.e, s.h, s.al, s.c, s.ch, s.a, s.k].join(" "))]));
  // Fuzzy search: exact text wins, otherwise allow small typos ("jeruslem", "bnei brack", "shabos").
  const toks = Object.fromEntries(SPOTS.map((s) => [s.i, [...new Set(hay[s.i].split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1))]]));
  function dist(a, b, max) {
    if (Math.abs(a.length - b.length) > max) return max + 1;
    let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
    for (let i = 1; i <= a.length; i++) {
      const cur = [i]; let best = i;
      for (let j = 1; j <= b.length; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) cur[j] = Math.min(cur[j], (prev2[j - 2] ?? 99) + 1);
        if (cur[j] < best) best = cur[j];
      }
      if (best > max) return max + 1;
      var prev2 = prev; prev = cur;
    }
    return prev[b.length];
  }
  const fcache = new Map();
  function fuzzy(id, w) {
    if (hay[id].includes(w)) return true;
    const max = w.length >= 8 ? 2 : w.length >= 4 ? 1 : 0;
    if (!max) return false;
    const k = id + "|" + w;
    if (fcache.has(k)) return fcache.get(k);
    const ok = toks[id].some((t) => dist(w, t.length > w.length + max ? t.slice(0, w.length) : t, max) <= max);
    fcache.set(k, ok);
    return ok;
  }
  const km = (s) => {
    if (!state.me || !s.la) return null;
    const R = 6371, r = Math.PI / 180;
    const dLa = (s.la - state.me[0]) * r, dLo = (s.lo - state.me[1]) * r;
    const a = Math.sin(dLa / 2) ** 2 + Math.cos(state.me[0] * r) * Math.cos(s.la * r) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  const MODE = $("#dir")?.dataset.map || "split"; // split | inline | panel | none
  const PAGE = desktop.matches ? +($("#dir")?.dataset.page || 12) : 6;
  state.limit = PAGE;
  const moreBtn = $("#list-more");
  let current = [];

  function apply(fit, keepLimit) {
    if (!keepLimit) state.limit = PAGE;
    const q = norm(state.q.trim());
    const ok = new Set();
    for (const s of SPOTS) {
      let pass = true;
      if (q && !q.split(/\s+/).every((w) => fuzzy(s.i, w))) pass = false;
      if (state.city === "__none" ? s.a : state.city && s.c !== state.city) pass = false;
      if (state.rated && s.s == null) pass = false;
      if (state.tonight && !openTonight(s.d)) pass = false;
      if (pass) ok.add(s.i);
    }
    let ids = order0.slice();
    if (state.sort === "near" && state.me) ids.sort((a, b) => (km(byId[a]) ?? 1e9) - (km(byId[b]) ?? 1e9));
    else if (state.sort === "az") ids.sort((a, b) => byId[a].c.localeCompare(byId[b].c) || byId[a].n.localeCompare(byId[b].n));
    if (state.sort !== "top" || apply.moved) {
      apply.moved = state.sort !== "top";
      const frag = document.createDocumentFragment();
      ids.forEach((id) => {
        const d = km(byId[id]);
        $(".dist", rows[id]).textContent = d == null ? "" : d < 1 ? Math.round(d * 1000) + " m" : d < 20 ? d.toFixed(1) + " km" : Math.round(d) + " km";
        frag.append(rows[id]);
      });
      list.append(frag);
    }
    current = ids.filter((id) => ok.has(id));
    let n = 0;
    ids.forEach((id) => { const show = ok.has(id) && n < state.limit; if (show) n++; rows[id].hidden = !show; });
    const left = current.length - n;
    moreBtn.hidden = left <= 0;
    moreBtn.textContent = `Show more (${left})`;
    $("#count").textContent = current.length === SPOTS.length ? `${current.length} locations` : `${current.length} of ${SPOTS.length} locations`;
    $("#empty").hidden = current.length > 0;
    window.GPhotos?.observe(list);
    updateMarkers(current.map((id) => byId[id]), fit);
  }
  moreBtn.addEventListener("click", () => { state.limit += PAGE * 2; apply(false, true); });

  let t;
  $("#q").addEventListener("input", (e) => { clearTimeout(t); t = setTimeout(() => { state.q = e.target.value; apply(true); }, 120); });
  $("#city").addEventListener("change", (e) => { state.city = e.target.value; apply(true); });
  $("#sort").addEventListener("change", (e) => {
    state.sort = e.target.value;
    if (state.sort === "near" && !state.me) locate(); else apply(false);
  });
  $$(".chip[data-f]").forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.f;
    if (f === "near") { if (state.me) { state.me = null; state.sort = "top"; $("#sort").value = "top"; b.setAttribute("aria-pressed", "false"); meMarker?.remove(); meMarker = null; apply(true); } else locate(); return; }
    state[f] = !state[f];
    b.setAttribute("aria-pressed", String(state[f]));
    apply(true);
  }));

  function locate() {
    const chip = $('[data-f="near"]');
    if (!navigator.geolocation) { toast("Location isn't available here"); return; }
    chip.setAttribute("aria-busy", "true");
    navigator.geolocation.getCurrentPosition((p) => {
      chip.removeAttribute("aria-busy");
      state.me = [p.coords.latitude, p.coords.longitude];
      state.sort = "near"; $("#sort").value = "near";
      chip.setAttribute("aria-pressed", "true");
      apply(false);
      ensureMap().then(() => {
        meMarker?.remove();
        meMarker = L.marker(state.me, { icon: L.divIcon({ className: "", html: '<div class="me-dot"></div>', iconSize: [16, 16] }), keyboard: false, interactive: false }).addTo(map);
        const near = SPOTS.filter((s) => s.la).sort((a, b) => km(a) - km(b)).slice(0, 5).map((s) => [s.la, s.lo]);
        map.fitBounds(L.latLngBounds([state.me, ...near]), { padding: [40, 40], maxZoom: 15 });
      });
      list.closest(".col").scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
    }, () => { chip.removeAttribute("aria-busy"); toast("Couldn't get your location"); $("#sort").value = state.sort = "top"; }, { enableHighAccuracy: false, timeout: 9000, maximumAge: 600000 });
  }

  // ---------- map (Leaflet + clustering, loaded on demand) ----------
  const CORE = [[31.69, 34.80], [32.11, 35.24]]; // Bnei Brak, Jerusalem, Beit Shemesh: where most locations are
  let map, cluster, markers = {}, meMarker, mapReady;
  function loadCss(href) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = href; document.head.append(l); }
  function loadJs(src) { return new Promise((res, rej) => { const s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = rej; document.head.append(s); }); }
  function ensureMap() {
    return mapReady ||= (async () => {
      loadCss("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css");
      await loadJs("https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js");
      await loadJs("https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js");
      initMap();
    })();
  }
  const PIN = '<svg viewBox="0 0 26 34" aria-hidden="true"><path d="M13 33s11-12.4 11-20.2A11 11 0 0 0 2 12.8C2 20.6 13 33 13 33Z"/><circle cx="13" cy="12.8" r="4"/></svg>';
  function pinIcon(s, on) {
    if (s.s != null) return L.divIcon({ className: "mk", html: `<div class="pin-s${s.s >= 9 ? " top" : ""}${on ? " on" : ""}">${s.s.toFixed(1)}</div>`, iconSize: [46, 36], iconAnchor: [23, 36] });
    return L.divIcon({ className: "mk", html: `<div class="pin${on ? " on" : ""}">${PIN}</div>`, iconSize: [26, 34], iconAnchor: [13, 33] });
  }
  function initMap() {
    map = L.map("map", { zoomControl: false, scrollWheelZoom: false, tap: true }).fitBounds(CORE);
    L.control.zoom({ position: "topright" }).addTo(map);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
    cluster = L.markerClusterGroup({
      maxClusterRadius: 44, showCoverageOnHover: false, spiderfyOnMaxZoom: true, disableClusteringAtZoom: 15,
      iconCreateFunction: (c) => {
        const kids = c.getAllChildMarkers();
        const best = Math.max(...kids.map((m) => m.options.score ?? 0));
        return L.divIcon({ className: "mk", html: `<div class="clu${best >= 9 ? " top" : ""}"><span>${kids.length}</span></div>`, iconSize: [40, 40], iconAnchor: [20, 20] });
      },
    });
    SPOTS.filter((s) => s.la).forEach((s) => {
      const m = L.marker([s.la, s.lo], { icon: pinIcon(s), title: s.n, riseOnHover: true, score: s.s, zIndexOffset: s.s != null ? 500 + s.s * 10 : 0 });
      m.on("click", () => select(s.i, "map"));
      m.on("mouseover", () => !s.v && window.GPhotos?.prefetch(s.pid));
      markers[s.i] = m;
    });
    map.addLayer(cluster);
    map.on("click", () => closeSheet());
    updateMarkers(current.map((id) => byId[id]), current.length !== SPOTS.length);
    // ctrl/cmd + wheel zooms; plain wheel keeps scrolling the page
    map.getContainer().addEventListener("wheel", (e) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();
      map.setZoom(map.getZoom() + (e.deltaY < 0 ? 1 : -1));
    }, { passive: false });
  }
  function updateMarkers(vis, fit) {
    if (!map) return;
    const want = vis.filter((s) => markers[s.i]).map((s) => markers[s.i]);
    cluster.clearLayers();
    cluster.addLayers(want);
    if (fit && want.length) {
      if (want.length === 1) map.setView(want[0].getLatLng(), 16);
      else map.fitBounds(L.latLngBounds(want.map((m) => m.getLatLng())), { padding: [40, 40], maxZoom: 15 });
    } else if (!fit && !state.sel && vis.length === SPOTS.length) map.fitBounds(CORE);
  }

  // desktop: load the map once the section gets close. Phones: only when asked.
  if ("IntersectionObserver" in window && (MODE === "split" || MODE === "inline")) {
    const mo = new IntersectionObserver((es) => { if (es[0].isIntersecting && (desktop.matches || MODE === "inline")) { ensureMap(); mo.disconnect(); } }, { rootMargin: "400px" });
    mo.observe($("#locations"));
  }
  $("#map-panel")?.addEventListener("click", (e) => {
    const open = $("#dir").classList.toggle("panel-open");
    e.currentTarget.setAttribute("aria-pressed", String(open));
    if (open) ensureMap().then(() => { map.invalidateSize(); updateMarkers(current.map((id) => byId[id]), current.length !== SPOTS.length); });
  });
  desktop.addEventListener?.("change", () => { if (desktop.matches && MODE === "split") ensureMap().then(() => map.invalidateSize()); });

  const dir = $("#dir");
  const tog = $("#map-toggle");
  function setMapView(on) {
    dir.classList.toggle("show-map", on);
    tog.innerHTML = on ? ICON.list + " List" : ICON.map + " Map";
    if (on) ensureMap().then(() => {
      map.invalidateSize();
      if (state.sel && byId[state.sel].la) map.setView([byId[state.sel].la, byId[state.sel].lo], 16);
      else updateMarkers(current.map((id) => byId[id]), current.length !== SPOTS.length);
    });
    else closeSheet();
  }
  tog.addEventListener("click", () => setMapView(!dir.classList.contains("show-map")));
  if ("IntersectionObserver" in window) {
    tog.hidden = true;
    new IntersectionObserver((es) => { tog.hidden = !es[0].isIntersecting && !dir.classList.contains("show-map"); }, { rootMargin: "-45% 0px -45% 0px" }).observe($("#locations"));
  }

  // ---------- detail sheet ----------
  const sheet = $("#sheet"), body = $("#sheet-body");
  function sheetHtml(s) {
    const media = s.v
      ? `<div class="d-media"><img src="${s.im}" alt="" style="object-position:50% 30%"><span class="play" aria-hidden="true"><span>${ICON.play}</span></span><button type="button" data-yt="${s.v}" data-vertical="${s.vv}" aria-label="Watch the review"></button>${s.ep ? `<span class="cap">${esc(s.ep)}</span>` : ""}</div>`
      : s.pid ? `<div class="d-media gp" data-pid="${s.pid}"><span class="tile" aria-hidden="true">${esc(s.l)}</span></div>` : "";
    const name = s.e ? `<span class="en">${esc(s.e)}</span>` : `<span lang="he" dir="rtl">${esc(s.n)}</span>`;
    const tonight = openTonight(s.d);
    return `${media}<div class="d-top"><div><h3>${name}</h3><div class="where">${esc(s.c)} · ${esc(DAYS[s.d] || s.d)}${tonight ? ' <span class="tag tonight">Open tonight</span>' : ""}</div>${s.e && s.h ? `<div class="where" lang="he" dir="rtl" style="text-align:left">${esc(s.h)}</div>` : ""}</div>${s.s != null ? `<span class="stamp ${s.s >= 9 ? "top" : ""}">${s.s.toFixed(1)}<small>/10</small></span>` : ""}</div>
${s.q ? `<p class="d-quote">“${esc(s.q)}”</p>` : ""}
<dl class="facts">
${s.a ? `<dt>Address</dt><dd ${hasHe(s.a) ? 'dir="rtl" lang="he"' : ""}>${esc(s.a)}</dd>` : ""}
${s.k ? `<dt>Kashrut</dt><dd ${hasHe(s.k) ? 'dir="rtl" lang="he"' : ""}>${esc(s.k)}</dd>` : ""}
${s.pr ? `<dt>Prices</dt><dd>${esc(s.pr)}</dd>` : ""}
${s.p ? `<dt>Phone</dt><dd><a href="${s.t}">${esc(s.p)}</a></dd>` : ""}
</dl>
<div class="acts">
<a class="act primary" href="${s.w}" target="_blank" rel="noopener">${ICON.waze}Waze</a>
<a class="act" href="${s.g}" target="_blank" rel="noopener">${ICON.pin}Maps</a>
<a class="act" ${s.t ? `href="${s.t}"` : 'aria-disabled="true"'}>${ICON.phone}Call</a>
<button class="act" type="button" data-share="${esc(s.n)}" data-url="${s.u}">${ICON.share}Share</button>
</div>
${s.u ? `<a class="more-link" href="${s.u}">Full page →</a>` : ""}`;
  }
  function focusMarker(id, from) {
    const m = markers[id];
    if (!m) return;
    const go = () => {
      m.setIcon(pinIcon(byId[id], true));
      const z = from === "map" ? Math.max(map.getZoom(), 15) : 16;
      const pt = map.project(m.getLatLng(), z);
      if (desktop.matches) pt.x -= (sheet.offsetWidth + 16) / 2; else if (MODE === "split") pt.y += Math.min(sheet.offsetHeight, innerHeight * 0.6) / 2;
      map.setView(map.unproject(pt, z), z, { animate: !reduce.matches });
    };
    if (cluster.hasLayer(m) && !m._icon) cluster.zoomToShowLayer(m, go); else go();
  }
  function select(id, from) {
    const s = byId[id];
    if (!s) return;
    if (state.sel && markers[state.sel]) markers[state.sel].setIcon(pinIcon(byId[state.sel]));
    $$(".row.sel", list).forEach((r) => r.classList.remove("sel"));
    state.sel = id;
    rows[id]?.classList.add("sel");
    body.innerHTML = sheetHtml(s);
    window.GPhotos?.observe(body);
    if (s.la) SPOTS.filter((x) => x.la && x.pid && !x.v && x !== s).sort((p, q) => Math.hypot(p.la - s.la, p.lo - s.lo) - Math.hypot(q.la - s.la, q.lo - s.lo)).slice(0, 3).forEach((x) => window.GPhotos?.prefetch(x.pid));
    sheet.classList.add("open");
    sheet.setAttribute("aria-hidden", "false");
    sheet.scrollTop = 0;
    if (map) focusMarker(id, from);
    if (from === "map" && desktop.matches && !rows[id]?.hidden) rows[id]?.scrollIntoView({ block: "nearest", behavior: reduce.matches ? "auto" : "smooth" });
  }
  function closeSheet() {
    sheet.classList.remove("open");
    sheet.setAttribute("aria-hidden", "true");
    if (state.sel && markers[state.sel]) markers[state.sel].setIcon(pinIcon(byId[state.sel]));
    rows[state.sel]?.classList.remove("sel");
    state.sel = null;
  }
  $("#sheet-x").addEventListener("click", closeSheet);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && sheet.classList.contains("open")) closeSheet(); });

  // warm the big photo for a location as soon as the pointer or finger lands on it
  ["pointerover", "touchstart"].forEach((ev) => list.addEventListener(ev, (e) => {
    const li = e.target.closest(".row"); const sp = li && byId[li.dataset.id];
    if (sp && !sp.v) window.GPhotos?.prefetch(sp.pid);
  }, { passive: true }));
  list.addEventListener("click", (e) => {
    const a = e.target.closest(".row > a");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1 || MODE === "none" || MODE === "panel") return;
    e.preventDefault();
    const id = a.parentElement.dataset.id;
    if (desktop.matches) ensureMap().then(() => select(id, "list"));
    else select(id, "list");
  });

  let y0 = null;
  sheet.addEventListener("touchstart", (e) => { if (sheet.scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  sheet.addEventListener("touchmove", (e) => { if (y0 != null && e.touches[0].clientY - y0 > 70) { y0 = null; closeSheet(); } }, { passive: true });
  sheet.addEventListener("touchend", () => (y0 = null));

  apply(false);

  // ---------- everything the admin page controls ----------
  const yt = (id, k = "hqdefault") => `https://i.ytimg.com/vi/${id}/${k}.jpg`;
  function rowEl(x) {
    const li = document.createElement("li");
    li.className = "row"; li.dataset.id = x.i;
    const img = x.im || (x.v ? yt(x.v) : "");
    li.innerHTML = `<a href="${x.u || x.g}"${x.u ? "" : ' target="_blank" rel="noopener"'}><span class="ph"${x.pid ? ` data-pid="${x.pid}"` : ""}>${img ? `<img src="${img}" alt="" loading="lazy" width="64" height="64">` : `<span class="tile" aria-hidden="true">${esc(x.l)}</span>`}</span>
<span class="nm"><strong>${x.e ? `<span class="en">${esc(x.e)}</span>` : `<span lang="he" dir="rtl">${esc(x.n)}</span>`}</strong><span class="sub">${esc(x.c)} · ${esc(DAYS[x.d] || x.d)}</span></span>
<span class="side">${x.s != null ? `<span class="stamp sm ${x.s >= 9 ? "top" : ""}">${x.s.toFixed(1)}<small>/10</small></span>` : x.v ? '<span class="tag">Video</span>' : ""}<span class="dist"></span></span></a>`;
    return li;
  }
  function links(x, name) {
    const q = encodeURIComponent([name, x.a || x.c, "Israel"].join(" "));
    x.w = x.la ? `https://waze.com/ul?ll=${x.la},${x.lo}&navigate=yes` : `https://waze.com/ul?q=${q}&navigate=yes`;
    x.g = x.pid ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${x.pid}` : x.la ? `https://www.google.com/maps/search/?api=1&query=${x.la},${x.lo}` : `https://www.google.com/maps/search/?api=1&query=${q}`;
  }
  // admin field names -> the short keys the page uses
  function patch(x, f) {
    const has = (k) => k in f;
    if (has("name")) { if (hasHe(f.name)) { x.h = f.name; if (!x.e) x.n = f.name; } else { x.e = f.name; x.n = f.name; } }
    if (has("nameEn")) { x.e = f.nameEn; x.n = f.nameEn || x.h || x.n; }
    if (has("city")) x.c = f.city;
    if (has("address")) x.a = f.address;
    if (has("days")) x.d = f.days;
    if (has("kosher")) x.k = f.kosher;
    if (has("phone")) { x.p = f.phone; const dg = f.phone.replace(/\D/g, ""); x.t = dg ? "tel:+972" + dg.replace(/^0/, "") : ""; }
    if (has("lat")) x.la = f.lat;
    if (has("lng")) x.lo = f.lng;
    if (has("placeId")) x.pid = f.placeId;
    if (has("score")) x.s = f.score;
    if (has("verdict")) x.q = f.verdict;
    if (has("video")) { if (f.video !== x.v) x.im = ""; x.v = f.video || null; x.vv = true; }
    if (has("ep")) x.ep = f.ep;
    if (has("price")) x.pr = f.price;
    x.l = (x.e || x.n).replace(/^(ה|the\s)/i, "").trim().charAt(0).toUpperCase();
    links(x, x.h || x.n);
    hay[x.i] = norm([x.n, x.e, x.h, x.al, x.c, x.ch, x.a, x.k].join(" "));
    toks[x.i] = [...new Set(hay[x.i].split(/[^\p{L}\p{N}]+/u).filter((t) => t.length > 1))];
  }
  function renderTops() {
    const ol = $("#tops, #tops-car");
    if (!ol) return;
    const ranked = SPOTS.filter((s) => s.s != null).sort((a, b) => b.s - a.s);
    const open = ol.classList.contains("all");
    ol.innerHTML = ranked.map((s, i) => `<li class="top-card in${i >= 8 ? " more" : i >= 4 ? " more-m" : ""}"><a href="${s.u || s.g}"${s.u ? "" : ' target="_blank" rel="noopener"'}>
<span class="ph"><img src="${s.im || (s.v ? yt(s.v, "oar2") : "")}" alt="" loading="lazy" width="480" height="600"${s.v ? ` onerror="this.onerror=null;this.src='${yt(s.v)}'"` : ""}><span class="rank">${i + 1}</span><span class="stamp ${s.s >= 9 ? "top" : ""}">${s.s.toFixed(1)}<small>/10</small></span></span>
<strong>${esc(s.e || s.n)}</strong><span class="where">${esc(s.c)}</span></a></li>`).join("");
    const btn = $("#tops-more");
    if (btn) { btn.parentElement.hidden = ranked.length <= 4; if (!open) btn.textContent = `Show all ${ranked.length}`; }
  }
  fetch("/api/data").then((r) => r.json()).then((d) => {
    const added = d.added || [], edits = d.edits || {}, hidden = new Set(d.hidden || []);
    if (!added.length && !Object.keys(edits).length && !hidden.size) return;
    for (const id of hidden) {
      const k = SPOTS.findIndex((s) => s.i === id);
      if (k < 0) continue;
      SPOTS.splice(k, 1); rows[id]?.remove(); delete rows[id]; delete byId[id];
      order0.splice(order0.indexOf(id), 1);
      if (markers[id]) { cluster?.removeLayer(markers[id]); delete markers[id]; }
    }
    for (const [id, f] of Object.entries(edits)) {
      const x = byId[id];
      if (!x) continue;
      patch(x, f);
      const el = rowEl(x); rows[id].replaceWith(el); rows[id] = el;
      if (markers[id]) { if (x.la) { markers[id].setLatLng([x.la, x.lo]); markers[id].setIcon(pinIcon(x)); markers[id].options.score = x.s; } }
    }
    for (const it of added) {
      if (byId[it.id]) continue;
      const x = { i: it.id, n: "", e: "", h: "", al: "", c: "", ch: "", a: "", la: null, lo: null, p: "", t: "", d: "Thursday", k: "", s: null, v: null, vv: true, q: "", pr: "", im: "", pid: "", l: "", u: "", ep: "" };
      patch(x, it);
      SPOTS.push(x); byId[x.i] = x; rows[x.i] = rowEl(x); order0.push(x.i);
      if (map && x.la) { const m = L.marker([x.la, x.lo], { icon: pinIcon(x), title: x.n, riseOnHover: true, score: x.s }); m.on("click", () => select(x.i, "map")); markers[x.i] = m; }
    }
    // rated first by score, then the rest in their existing order
    const pos = Object.fromEntries(order0.map((id, k) => [id, k]));
    order0.sort((a, b) => (byId[b].s ?? -1) - (byId[a].s ?? -1) || pos[a] - pos[b]);
    apply.moved = true;
    apply(false);
    renderTops();
  }).catch(() => {});

  // top rated: 8 first, then all
  const topsMore = $("#tops-more");
  topsMore?.addEventListener("click", () => {
    const open = $("#tops").classList.toggle("all");
    topsMore.textContent = open ? "Show fewer" : `Show all ${$$("#tops > li").length}`;
    if (!open) $("#top-rated").scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
    $$("#tops .rv").forEach((el) => el.classList.add("in"));
  });

  // ---------- hero search and quick links ----------
  function setFilter(name, on) {
    const chip = $(`.chip[data-f="${name}"]`);
    if (chip && (chip.getAttribute("aria-pressed") === "true") !== on) chip.click();
  }
  $$("[data-cat]").forEach((a) => a.addEventListener("click", () => {
    $$("[data-cat]").forEach((x) => x.classList.toggle("on", x === a));
    const c = a.dataset.cat;
    setFilter("rated", c === "rated"); setFilter("tonight", c === "tonight");
    const city = c.startsWith("city:") ? c.slice(5) : "";
    if ($("#city").value !== city) { $("#city").value = city; state.city = city; apply(true); }
    if (c === "near" && !state.me) locate();
  }));
  $$("[data-hsearch]").forEach((f) => f.addEventListener("submit", (e) => {
    e.preventDefault();
    const w = f.querySelector("[data-when]"); if (w) setFilter("tonight", w.value === "tonight");
    const v = new FormData(f).get("q") || "";
    const q = $("#q"); q.value = v; state.q = v; apply(true);
    $("#locations").scrollIntoView({ behavior: reduce.matches ? "auto" : "smooth" });
  }));
  $$("[data-go]").forEach((a) => a.addEventListener("click", () => {
    const chip = $(`.chip[data-f="${a.dataset.go}"]`);
    if (chip && chip.getAttribute("aria-pressed") !== "true") chip.click();
  }));

  $("#eps-more")?.addEventListener("click", (e) => {
    $("#reviews").classList.add("all-eps-open");
    e.currentTarget.parentElement.hidden = true;
    $$("#reviews .rv").forEach((el) => el.classList.add("in"));
  });
  $$("[data-car]").forEach((b) => b.addEventListener("click", () => {
    const c = $("#tops-car"); c.scrollBy({ left: +b.dataset.car * c.clientWidth * 0.8, behavior: reduce.matches ? "auto" : "smooth" });
  }));

  // ---------- add a spot ----------
  const form = $("#add-form"), done = $("#add-done"), msg = $("#add-msg");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(form);
    const name = (f.get("spot") || "").trim(), city = (f.get("city") || "").trim();
    if (!name) { $("#f-name").focus(); $("#f-name").setAttribute("aria-invalid", "true"); return; }
    if (!city) { $("#f-city").focus(); $("#f-city").setAttribute("aria-invalid", "true"); return; }
    const lines = [
      f.get("owner") ? "Hi! I own a cholent spot and would love a review." : "Hi! A cholent spot for the directory:",
      "", `Spot: ${name}`, `City: ${city}`, `When: ${f.get("days")}`,
      f.get("address") && `Address: ${f.get("address")}`,
      f.get("why") && `What's good: ${f.get("why")}`,
      f.get("from") && `From: ${f.get("from")}`, f.get("contact") && `Contact: ${f.get("contact")}`,
    ].filter((x) => x !== null && x !== undefined && x !== false);
    msg.value = lines.join("\n");
    navigator.clipboard?.writeText(msg.value).catch(() => {});
    window.open($("#add-open").href, "_blank", "noopener");
    form.hidden = true; done.hidden = false; done.focus();
  });
  $("#add-copy")?.addEventListener("click", async () => { try { await navigator.clipboard.writeText(msg.value); toast("Copied"); } catch (_) { msg.select(); } });
  $("#add-reset")?.addEventListener("click", () => { form.reset(); form.hidden = false; done.hidden = true; $("#f-name").focus(); });
})();
