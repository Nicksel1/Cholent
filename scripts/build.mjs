// Builds the static site into dist/. No dependencies. Run: node scripts/build.mjs
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { REVIEWS, VISITS } from "../src/data/reviews.mjs";
import { NAMES_EN, autoEn } from "../src/data/names-en.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const SRC = path.join(ROOT, "src");
const OUT = path.join(ROOT, "dist");
// On Netlify, URL is the site's own address and CONTEXT is "production" for the live site.
const SITE = (process.env.SITE || process.env.URL || "https://cholent-chill.vercel.app").replace(/\/$/, "");
const INDEX = process.env.INDEX === "1" || (process.env.NETLIFY === "true" && process.env.CONTEXT === "production" && process.env.INDEX !== "0"); // preview builds stay out of search engines
const IG = "https://www.instagram.com/cholent.and.chill/";
const YT = "https://www.youtube.com/@cholentandchill";
const FB = "https://www.facebook.com/CholentnChill";
const WA = "https://chat.whatsapp.com/DpTCsz7u7jH3WHedGOWra5";
const IG_DM = "https://ig.me/m/cholent.and.chill";
const V = Date.now().toString(36);
// Google key from the original site (Places photos, loaded in the browser). Override with GKEY in the build env.
const GKEY = process.env.GKEY || "AIzaSyBmmYP0kNJYAeaG5GNQpw26w-jwQ941j_Q";

// ---------- helpers ----------
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const slug = (s) => String(s).toLowerCase().normalize("NFKD").replace(/[’'`]/g, "").replace(/&/g, "and").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const hasHe = (s) => /[\u0590-\u05FF]/.test(s || "");
const tel = (p) => "tel:+972" + String(p).replace(/\D/g, "").replace(/^0/, "");
const fmtPhone = (p) => {
  const d = String(p).replace(/\D/g, "");
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 9) return `${d.slice(0, 2)}-${d.slice(2, 5)}-${d.slice(5)}`;
  return p;
};
const DAYS = { "Thursday": "Thu night", "Thu & Fri": "Thu–Fri", "Wed-Fri": "Wed–Fri", "All Week": "All week" };
const fmtDate = (d) => new Date(d + "T12:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const write = (rel, content) => {
  const f = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, content);
};
const cleanTitle = (t) => t.replace(/\p{Extended_Pictographic}/gu, "").replace(/[\u2060-\u206F\uFE0F]/g, "")
  .replace(/^\s*Cholent\s*(and|And)\s*Chill\s*[-–]\s*/i, "").replace(/📍.*$/u, "").replace(/\s+/g, " ").trim();

const ICON = {
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.4" cy="6.6" r="1.1" fill="currentColor" stroke="none"/></svg>',
  yt: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M22 8.2a3 3 0 0 0-2.1-2.1C18 5.6 12 5.6 12 5.6s-6 0-7.9.5A3 3 0 0 0 2 8.2 31 31 0 0 0 1.6 12 31 31 0 0 0 2 15.8a3 3 0 0 0 2.1 2.1c1.9.5 7.9.5 7.9.5s6 0 7.9-.5a3 3 0 0 0 2.1-2.1c.3-1.2.4-2.5.4-3.8s-.1-2.6-.4-3.8ZM10 15.1V8.9l5.2 3.1L10 15.1Z"/></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M7 4.5v15l13-7.5z"/></svg>',
  waze: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M3 11l18-8-8 18-2-8z"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 3h3.5l1.8 4.6-2.3 1.4a11 11 0 0 0 7 7l1.4-2.3L21 15.5V19a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2Z"/></svg>',
  fb: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M13.5 21v-7.5h2.6l.4-3h-3V8.6c0-.9.3-1.5 1.5-1.5h1.6V4.4c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H7.8v3h2.6V21h3.1Z"/></svg>',
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 3v13M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  locate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Zm0 0v14m6-12v14"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
};

// ---------- data ----------
const HE_CITY = {
  "ירושלים": "Jerusalem", "בני ברק": "Bnei Brak", "בית שמש": "Beit Shemesh", "אשדוד": "Ashdod", "חיפה": "Haifa",
  "ביתר עילית": "Beitar Illit", "פתח תקווה": "Petah Tikva", "נתניה": "Netanya", "אלעד": "Elad", "מודיעין עילית": "Modi'in Illit",
  "גבעת שמואל": "Givat Shmuel", "צפת": "Tzfat", "שעלבים": "Sha'alvim", "כפר חב\"ד": "Kfar Chabad", "יד בנימין": "Yad Binyamin",
  "אבני חפץ": "Avnei Hefetz", "ראשון לציון": "Rishon LeZion", "רכסים": "Rechasim", "קרית יערים": "Kiryat Yearim", "יבנאל": "Yavneel",
  "יבנה": "Yavne", "טבריה": "Tiberias", "אופקים": "Ofakim", "רעננה": "Raanana", "חדרה": "Hadera", "בת ים": "Bat Yam",
  "בית חלקיה": "Beit Helkia", "מירון": "Meron", "שילת": "Shilat Junction", "נתיבות": "Netivot",
};
const CITY_HE = Object.fromEntries(Object.entries(HE_CITY).map(([h, e]) => [e, h]));
const listings = JSON.parse(fs.readFileSync(path.join(SRC, "data/listings.json"), "utf8"));
const rawVideos = JSON.parse(fs.readFileSync(path.join(SRC, "data/videos-raw.json"), "utf8"));
const vidMeta = Object.fromEntries(rawVideos.map((v) => [v.id, v]));
const isVertical = (id) => vidMeta[id] ? vidMeta[id].short !== false : true;
const thumb = (id) => fs.existsSync(path.join(SRC, "img/ep", id + ".webp")) ? `/img/ep/${id}.webp` : null;

// ---------- review dates ----------
// A review's date is the day written in its video's description (when there is one), otherwise the upload date.
// Descriptions come from the YouTube feed (newest videos) and from videos-raw.json (the saved list).
const latestApi = createRequire(import.meta.url)("../api/latest.js");
let feed = null;
try {
  feed = await Promise.race([
    new Promise((ok) => latestApi({}, { setHeader() {}, status() { return this; }, json: ok })),
    new Promise((_, no) => setTimeout(() => no(new Error("timeout")), 10000)),
  ]);
} catch (e) { console.log("YouTube feed not reachable at build time:", e.message); }
const feedById = Object.fromEntries((feed?.list || []).map((v) => [v.id, v]));
const visitOf = (id) => (id && (feedById[id]?.visited || latestApi.visitDate(vidMeta[id]?.desc))) || "";
let redated = 0;
for (const r of [...REVIEWS, ...VISITS]) { const d = visitOf(r.video); if (d && d !== r.date) { r.date = d; redated++; } }
if (redated) console.log(`Review dates taken from video descriptions: ${redated}`);

// merge exact duplicates (same place, same address)
const groups = new Map();
for (const l of listings) {
  const key = l.name.replace(/\s*\(\d\)\s*$/, "") + "|" + (l.address || "") + "|" + l.num * (l.address ? 0 : 1);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(l);
}
const DAY_RANK = { "Thursday": 0, "Thu & Fri": 1, "Wed-Fri": 2, "All Week": 3 };
let spots = [];
for (const g of groups.values()) {
  const base = { ...g[0] };
  base.name = base.name.replace(/\s*\(\d\)\s*$/, "");
  base.nums = g.map((x) => x.num);
  base.days = g.map((x) => x.days).sort((a, b) => DAY_RANK[b] - DAY_RANK[a])[0];
  const tail = (base.address || "").split(",").pop().trim();
  if (HE_CITY[tail] && HE_CITY[tail] !== base.city) base.city = HE_CITY[tail];
  if (base.city === "Other") base.city = "";
  spots.push(base);
}
const byNum = (n) => spots.find((s) => s.nums.includes(n));

for (const [kind, arr] of [["review", REVIEWS], ["visit", VISITS]]) {
  for (const r of arr) {
    if (r.abroad) continue;
    let s = r.spot ? byNum(r.spot) : null;
    if (!s) {
      s = { num: null, nums: [], name: r.name, city: r.place, days: "Thursday", kosher: r.kosher || "", phone: r.phone || "" };
      spots.push(s);
    }
    s.en = r.name;
    if (!s.lat && r.lat) { s.lat = r.lat; s.lng = r.lng; }
    if (!s.address && r.address) s.address = r.address;
    if (!s.city && r.place) s.city = r.place;
    if (r.kosher && !s.kosher) s.kosher = r.kosher;
    if (r.phone && !s.phone) s.phone = r.phone;
    if (!s.review || kind === "review") s.review = { ...r, kind };
  }
}

const missingEn = [];
// ids and display
const used = new Set();
for (const s of spots) {
  const cityPart = slug(s.city || "israel");
  let id = s.en ? slug(s.en) + (s.en && s.city && !slug(s.en).includes(cityPart) ? "-" + cityPart : "") : `${cityPart}-${s.nums[0]}`;
  while (used.has(id)) id += "-2";
  used.add(id);
  s.id = id;
  s.url = `/spots/${id}/`;
  s.score = s.review?.kind === "review" ? s.review.score : null;
  s.video = s.review?.video || null;
  s.img = (s.video && thumb(s.video)) || "";
  s.real = !!(s.video && thumb(s.video));
  s.cityLabel = s.city || "Israel";
  s.display = s.en || s.name;
  s.he = hasHe(s.name) ? s.name : "";
  s.alias = s.he ? (NAMES_EN[s.name] || "") + " " + autoEn(s.name) : "";
  if (s.he && !NAMES_EN[s.name]) missingEn.push(s.name);
}

// waze / maps
const q = (s) => [s.he || s.name, s.address || s.city].filter(Boolean).join(" ");
const wazeUrl = (s) => s.lat ? `https://waze.com/ul?ll=${s.lat},${s.lng}&navigate=yes` : `https://waze.com/ul?q=${encodeURIComponent(q(s))}&navigate=yes`;
const gmapsUrl = (s) => s.placeId
  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.he || s.name)}&query_place_id=${s.placeId}`
  : s.lat ? `https://www.google.com/maps/search/?api=1&query=${s.lat},${s.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q(s) + " Israel")}`;

spots.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (b.video ? 1 : 0) - (a.video ? 1 : 0) || a.cityLabel.localeCompare(b.cityLabel) || (a.nums[0] ?? 999) - (b.nums[0] ?? 999));

const cityCount = {};
spots.forEach((s) => { if (s.city) cityCount[s.city] = (cityCount[s.city] || 0) + 1; });
const CITIES = Object.entries(cityCount).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
const CITY_PAGES = CITIES.filter(([, n]) => n >= 3).map(([c]) => c);
const citySlug = (c) => slug(c);

const ranked = REVIEWS.slice().sort((a, b) => b.score - a.score || b.date.localeCompare(a.date));
const spotFor = (r) => spots.find((s) => s.review && s.review.id === r.id);
const rated = spots.filter((s) => s.score != null).length;
const total = spots.length;
let latest = REVIEWS.slice().sort((a, b) => b.date.localeCompare(a.date) || (b.ep ? 1 : 0) - (a.ep ? 1 : 0))[0];
// "This week's episode": ask the YouTube feed at build time, so the page is built with the newest
// episode and doesn't swap the picture after it loads. Uses the same reader as /api/latest.
// If YouTube can't be reached, the newest review above is used, as before.
{
  if (feed?.id && feed.id !== latest.video) {
    const known = [...REVIEWS, ...VISITS].find((r) => r.video === feed.id);
    latest = known ? { ...known, score: known.score ?? null } : { video: feed.id, name: feed.name, place: feed.place, score: feed.score ?? null };
  }
}
const heroThumb = (id) => thumb(id) || `https://i.ytimg.com/vi/${id}/oar2.jpg`;

// ---------- shared markup ----------
const FONTS = "https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;500;600;700;800;900&family=Suez+One&family=Ultra&display=swap";
const head = ({ title, desc, url, og = "/og/site.jpg?v=2", ld = [], extra = "" }) => `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
${INDEX ? "" : '<meta name="robots" content="noindex">'}
<link rel="canonical" href="${SITE}${url}">
<meta name="theme-color" content="#0c0d11">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Cholent &amp; Chill">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(desc)}">
<meta property="og:url" content="${SITE}${url}">
<meta property="og:image" content="${SITE}${og}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" as="font" type="font/woff2" href="/fonts/ultra-latin.woff2" crossorigin>
<link rel="preload" as="font" type="font/woff2" href="/fonts/libre-franklin-latin.woff2" crossorigin>
<link rel="stylesheet" href="/styles.css?v=${V}">
${extra}
${ld.map((x) => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, "\\u003c")}</script>`).join("\n")}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>`;

const header = (home) => {
  const h = home ? "" : "/";
  const links = [["#locations", "Locations"], ["#top-rated", "Top rated"], ["#reviews", "Reviews"], ["#about", "Follow"], ["#add", "Add a location"]];
  return `<header class="hdr"><div class="wrap">
<a class="logo" href="/">Cholent <span class="amp">&amp;</span> Chill</a>
<nav class="nav" aria-label="Main">${links.filter(([k]) => k !== "#about").map(([k, t]) => `<a href="${h}${k}">${t}</a>`).join("")}</nav>
<div class="hdr-social"><a class="icon-btn" href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a><a class="icon-btn" href="${YT}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.yt}</a><a class="icon-btn" href="${FB}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a><a class="icon-btn" href="${WA}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a></div>
<details class="menu"><summary class="icon-btn" aria-label="Menu"><span class="burger" aria-hidden="true"><i></i><i></i><i></i></span></summary>
<nav class="menu-panel" aria-label="Menu" onclick="if(event.target.closest('a'))this.closest('details').open=false">
${links.filter(([k]) => k !== "#about").map(([k, t]) => `<a href="${h}${k}">${t}</a>`).join("")}
<div class="menu-social"><a href="${IG}" target="_blank" rel="noopener">${ICON.ig} Instagram</a><a href="${YT}" target="_blank" rel="noopener">${ICON.yt} YouTube</a><a href="${FB}" target="_blank" rel="noopener">${ICON.fb} Facebook</a><a href="${WA}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a></div>
</nav></details>
</div></header>`;
};

const footer = () => `<footer class="ftr"><div class="wrap">
<div><a class="logo" href="/">Cholent <span class="amp">&amp;</span> Chill</a></div>
<div><p class="fh">Cities</p><ul>${CITY_PAGES.slice(0, 6).map((c) => `<li><a href="/cities/${citySlug(c)}/">${esc(c)}</a></li>`).join("")}</ul></div>
<div><p class="fh">More cities</p><ul>${CITY_PAGES.slice(6, 12).map((c) => `<li><a href="/cities/${citySlug(c)}/">${esc(c)}</a></li>`).join("")}<li><a href="/#locations">All locations</a></li></ul></div>
<div><p class="fh">Follow</p><ul><li><a href="${IG}" target="_blank" rel="noopener">Instagram</a></li><li><a href="${YT}" target="_blank" rel="noopener">YouTube</a></li><li><a href="/#add">Add a location</a></li></ul></div>
<p class="legal"><strong>Please note:</strong> Cholent &amp; Chill is an independent review and directory platform, not the businesses listed. Hechsherim, opening hours, prices, addresses and whether a place is still open can change at any time, so always check with the business directly before you go. Ratings and reviews are personal opinions. Cholent &amp; Chill is not responsible for any business, its kashrut, its food or service, or anyone's experience there.</p>
<div class="base"><span>© ${new Date().getFullYear()} Cholent &amp; Chill</span><span><a href="/admin/" style="color:inherit;text-decoration:none">Admin</a></span></div>
</div></footer>
<dialog class="player" id="player" aria-label="Video"><div class="box"><button class="icon-btn x" type="button" data-close aria-label="Close video">${ICON.x}</button><iframe title="Episode" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen></iframe></div></dialog>`;

const stamp = (score, cls = "") => score == null ? "" : `<span class="stamp ${score >= 9 ? "top" : ""} ${cls}"><span class="vh">Rated </span>${score.toFixed(1)}<small>/10</small></span>`;
const initial = (s) => (s.en || s.name).replace(/^(ה|the\s)/i, "").trim().charAt(0).toUpperCase();
const nameHtml = (s) => s.en ? `<span class="en">${esc(s.en)}</span>` : `<span lang="he" dir="rtl">${esc(s.name)}</span>`;
const sub = (s) => [s.cityLabel, DAYS[s.days] || s.days].filter(Boolean).join(" · ");

const row = (s) => `<li class="row" data-id="${s.id}"><a href="${s.url}">
<span class="ph"${s.placeId ? ` data-pid="${s.placeId}"` : ""}>${s.real ? `<img src="${s.img}" alt="" loading="lazy" decoding="async" width="64" height="64">` : `<span class="tile" aria-hidden="true">${esc(initial(s))}</span>`}</span>
<span class="nm"><strong>${nameHtml(s)}</strong><span class="sub">${esc(sub(s))}</span>${s.kosher ? `<span class="k" lang="${hasHe(s.kosher) ? "he" : "en"}">${esc(s.kosher)}</span>` : ""}</span>
<span class="side">${s.score != null ? stamp(s.score, "sm") : s.video ? '<span class="tag">Video</span>' : ""}<span class="dist"></span></span>
</a></li>`;

const clientSpot = (s) => ({
  i: s.id, n: s.display, e: s.en || "", h: s.he, al: s.alias.trim(), c: s.cityLabel, ch: CITY_HE[s.city] || "", a: s.address || "", la: s.lat, lo: s.lng, p: s.phone ? fmtPhone(s.phone) : "",
  t: s.phone ? tel(s.phone) : "", d: s.days, k: s.kosher || "", s: s.score, v: s.video, vv: s.video ? isVertical(s.video) : true,
  q: s.review?.verdict || "", pr: s.review?.price || "", cm: !!s.review?.comped, im: s.real ? s.img : "", pid: s.placeId || "", l: initial(s), real: s.real, u: s.url, w: wazeUrl(s), g: gmapsUrl(s),
  ep: s.review?.ep || "",
});

// ---------- home ----------
const H1 = "Where are you eating tonight?";
const nextThu = (() => { const d = new Date(); d.setDate(d.getDate() + ((4 - d.getDay() + 7) % 7)); return d; })();
const thuStr = nextThu.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
const eps = rawVideos.filter((v) => !/^October|^Taste Testing|^We tried making/.test(v.title) && v.id !== "46rbDy-FkVA").sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12);
const revByVideo = Object.fromEntries([...REVIEWS, ...VISITS].map((r) => [r.video, r]));
const ymd = (d) => fmtDate(d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6));

const weekCard = () => `<button class="week" type="button" data-yt="${latest.video}" data-vertical="${isVertical(latest.video)}">
<span class="week-thumb"><img src="${heroThumb(latest.video)}" alt="" width="86" height="134"><span class="play"><span>${ICON.play}</span></span></span>
<span class="week-body"><span class="label">This week's episode</span><strong>${esc(latest.name)}</strong><span class="meta">${esc(latest.place)}</span></span>
${stamp(latest.score)}
</button>`;

const SEC = {
  heroMain: () => `<section class="hero"><div class="wrap">
<div><h1>${H1}</h1>
<div class="hero-cta"><a class="btn" href="#locations">${ICON.search} Find a location</a><a class="btn ghost" href="#top-rated">Top rated</a></div></div>
<div class="hero-media">
<img src="/img/hero-960.webp" srcset="/img/hero-960.webp 960w, /img/hero-1800.webp 1800w" sizes="(min-width:860px) 50vw, 100vw" alt="" width="960" height="540" fetchpriority="high">
${weekCard()}
</div></div></section>`,

  topGrid: () => `<section id="top-rated"><div class="wrap">
<div class="sec-head"><h2>Top rated</h2></div>
<ol class="tops" id="tops">
${ranked.map((r, i) => { const s = spotFor(r); return `<li class="top-card rv${i >= 8 ? " more" : i >= 4 ? " more-m" : ""}"><a href="${s ? s.url : "#"}">
<span class="ph"><img src="${thumb(r.video)}" alt="" loading="lazy" width="480" height="600"><span class="rank">${i + 1}</span>${stamp(r.score)}</span>
<strong>${esc(r.name)}</strong><span class="where">${esc(r.place)}</span></a></li>`; }).join("\n")}
</ol>
<div class="more-wrap"><button class="btn ghost" type="button" id="tops-more">Show all ${ranked.length}</button></div>
</div></section>`,

  locations: () => `<section id="locations"><div class="wrap">
<div class="sec-head"><h2>Locations</h2></div>
<div class="dir" id="dir">
<div class="col">
<div class="tools">
<div class="search">${ICON.search}<label class="vh" for="q">Search locations</label><input id="q" type="search" placeholder="Name or city" autocomplete="off" enterkeyhint="search"></div>
<div class="chips" role="group" aria-label="Filters">
<button class="chip" type="button" data-f="tonight" aria-pressed="false">Open tonight</button>
<button class="chip" type="button" data-f="rated" aria-pressed="false">Rated by Nechemiah</button>
<button class="chip" type="button" data-f="near" aria-pressed="false">${ICON.locate.replace('aria-hidden="true"', 'aria-hidden="true" width="16" height="16"')} Near me</button>
<label class="chip city"><span class="vh">City</span><select id="city"><option value="">All cities</option>${CITIES.map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`).join("")}<option value="__none">No address</option></select></label>
</div>
<p class="count"><span id="count" aria-live="polite">${total} locations</span><label>Sort <select id="sort"><option value="top">Top rated</option><option value="az">City A–Z</option><option value="near">Nearest</option></select></label></p>
</div>
<ul class="list" id="list">
${spots.map(row).join("\n")}
</ul>
<p class="empty" id="empty" hidden>No matches.</p>
<div class="more-wrap"><button class="btn ghost" type="button" id="list-more" hidden>Show more</button></div>
</div>
<div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Map of locations"></div>
<aside class="sheet" id="sheet" aria-label="Location details" aria-hidden="true"><div class="grab" aria-hidden="true"></div><button class="icon-btn x" type="button" id="sheet-x" aria-label="Close">${ICON.x}</button><div id="sheet-body"></div></aside>
</div>
</div>
<button class="btn map-toggle" type="button" id="map-toggle">${ICON.map} Map</button>
</div></section>`,

  reviews: () => `<section id="reviews"><div class="wrap">
<div class="sec-head"><h2>Reviews</h2><a class="btn ghost sm" href="${YT}/shorts" target="_blank" rel="noopener">${ICON.yt} YouTube</a></div>
<div class="reel">
${eps.map((v, i) => { const r = revByVideo[v.id]; const t = r ? r.name : cleanTitle(v.title); return `<button class="ep rv${i >= 6 ? " ep-more" : i >= 4 ? " ep-more-m" : ""}" type="button" data-yt="${v.id}" data-vertical="${v.short !== false}">
<span class="ph"><img src="${thumb(v.id)}" alt="" loading="lazy" width="220" height="391"><span class="play"><span>${ICON.play}</span></span>${r?.score ? stamp(r.score, "sm") : ""}</span>
<strong ${hasHe(t) ? 'lang="he" dir="rtl" style="font-family:var(--f-he);text-align:left"' : ""}>${esc(t)}</strong><span class="meta">${r ? esc(r.place) + " · " : ""}${visitOf(v.id) ? fmtDate(visitOf(v.id)) : ymd(v.date)}</span></button>`; }).join("\n")}
</div>
<div class="more-wrap eps-more-wrap"><button class="btn ghost" type="button" id="eps-more">Show more</button></div>
</div></section>`,

  about: () => `<section class="follow" id="about"><div class="wrap">
<div class="f-head"><div class="portrait"><img src="/img/nechemiah.webp" alt="Nechemiah Seltzer" loading="lazy" width="760" height="774"></div>
<div><h2>Follow along</h2><p class="role">New review every Thursday</p></div></div>
<div class="f-cards">
<a class="f-card" href="${IG}" target="_blank" rel="noopener">${ICON.ig}<span><strong>Instagram</strong><span>@cholent.and.chill</span></span><i aria-hidden="true">→</i></a>
<a class="f-card" href="${YT}" target="_blank" rel="noopener">${ICON.yt}<span><strong>YouTube</strong><span>@cholentandchill</span></span><i aria-hidden="true">→</i></a>
</div>
</div></section>`,

  add: () => `<section id="add"><div class="wrap">
<div class="add-left">
<h2>Add a location</h2>
<div class="art"><img src="/img/hero/iron-pot.webp" alt="" loading="lazy" width="1100" height="1100"></div>
</div>
<div>
<form class="add" id="add-form" novalidate>
<div class="f"><label for="f-name">Name</label><input id="f-name" name="spot" required autocomplete="off"></div>
<div class="f2">
<div class="f"><label for="f-city">City</label><input id="f-city" name="city" required list="cities" autocomplete="off"><datalist id="cities">${CITIES.map(([c]) => `<option value="${esc(c)}">`).join("")}</datalist></div>
<div class="f"><label for="f-days">Open</label><select id="f-days" name="days"><option>Thursday night</option><option>Thursday and Friday</option><option>All week</option><option>Not sure</option></select></div>
</div>
<div class="f"><label for="f-addr">Address</label><input id="f-addr" name="address" autocomplete="off"></div>
<div class="f"><label for="f-why">Notes</label><textarea id="f-why" name="why"></textarea></div>
<div class="f2">
<div class="f"><label for="f-you">Your name</label><input id="f-you" name="from" autocomplete="name"></div>
<div class="f"><label for="f-phone">Phone or email</label><input id="f-phone" name="contact" autocomplete="email"></div>
</div>
<label class="check"><input type="checkbox" name="owner" id="f-owner"> I'm the owner</label>
<button class="btn" type="submit">Send</button>
</form>
<div class="done" id="add-done" hidden tabindex="-1">
<h3>Paste and send</h3>
<textarea id="add-msg" readonly aria-label="Your message"></textarea>
<div style="display:flex;gap:10px;flex-wrap:wrap"><a class="btn" id="add-open" href="${IG_DM}" target="_blank" rel="noopener">${ICON.ig} Open Instagram</a><button class="btn ghost" type="button" id="add-copy">Copy</button><button class="btn ghost" type="button" id="add-reset">New</button></div>
</div>
</div>
</div></section>`,
};

// ---------- mockup building blocks ----------
const cardPhoto = (s) => s.real
  ? `<span class="cph"><img src="${s.img}" alt="" loading="lazy" decoding="async" width="480" height="600"></span>`
  : `<span class="cph gp"${s.placeId ? ` data-pid="${s.placeId}"` : ""}><span class="tile" aria-hidden="true">${esc(initial(s))}</span></span>`;
const card = (s) => `<li class="row card" data-id="${s.id}"><a href="${s.url}">
${cardPhoto(s)}${s.score != null ? `<span class="pill${s.score >= 9 ? " top" : ""}">Rated ${s.score.toFixed(1)}</span>` : s.video ? '<span class="pill vid">Video</span>' : ""}
<span class="c-body"><span class="c-top"><strong>${nameHtml(s)}</strong>${s.score != null ? `<span class="c-score">★ ${s.score.toFixed(1)}</span>` : ""}</span>
<span class="sub">${esc(sub(s))}</span>${s.kosher ? `<span class="k" lang="${hasHe(s.kosher) ? "he" : "en"}">${esc(s.kosher)}</span>` : ""}<span class="dist"></span></span></a></li>`;
const cityTop = (c) => spots.filter((s) => s.city === c && s.real).sort((a, b) => (b.score ?? 0) - (a.score ?? 0))[0];
const filtersHtml = () => `<button class="chip" type="button" data-f="tonight" aria-pressed="false">Open tonight</button>
<button class="chip" type="button" data-f="rated" aria-pressed="false">Rated by Nechemiah</button>
<button class="chip" type="button" data-f="near" aria-pressed="false">${ICON.locate.replace('aria-hidden="true"', 'aria-hidden="true" width="16" height="16"')} Near me</button>
<label class="chip city"><span class="vh">City</span><select id="city"><option value="">All cities</option>${CITIES.map(([c, n]) => `<option value="${esc(c)}">${esc(c)} (${n})</option>`).join("")}<option value="__none">No address</option></select></label>`;
const dirBlock = ({ mode, cards = false, page = 12, title = "Locations", extraTools = "", searchPh = "Name or city" }) => `<section id="locations" class="loc-${mode}"><div class="wrap">
${title ? `<div class="sec-head"><h2>${title}</h2></div>` : ""}
<div class="dir" id="dir" data-map="${mode}" data-page="${page}">
<div class="col">
<div class="tools">
<div class="tools-row"><div class="search">${ICON.search}<label class="vh" for="q">Search locations</label><input id="q" type="search" placeholder="${searchPh}" autocomplete="off" enterkeyhint="search"></div>${extraTools}</div>
<div class="chips" role="group" aria-label="Filters">${filtersHtml()}</div>
<p class="count"><span id="count" aria-live="polite">${total} locations</span><label>Sort <select id="sort"><option value="top">Top rated</option><option value="az">City A–Z</option><option value="near">Nearest</option></select></label></p>
</div>
<ul class="list${cards ? " cards" : ""}" id="list">
${spots.map(cards ? card : row).join("\n")}
</ul>
<p class="empty" id="empty" hidden>No matches.</p>
<div class="more-wrap"><button class="btn ghost" type="button" id="list-more" hidden>Show more</button></div>
</div>
<div class="mapbox" id="mapbox"><div id="map" role="region" aria-label="Map of locations"></div>
<aside class="sheet" id="sheet" aria-label="Location details" aria-hidden="true"><div class="grab" aria-hidden="true"></div><button class="icon-btn x" type="button" id="sheet-x" aria-label="Close">${ICON.x}</button><div id="sheet-body"></div></aside>
</div>
</div>
<button class="btn map-toggle" type="button" id="map-toggle">${ICON.map} Map</button>
</div></section>`;
const byline = `By Nechemiah Seltzer · ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}`;

Object.assign(SEC, {
  /* 1. Guide, after The Infatuation */
  infTop: () => `<div class="inf-sub"><div class="wrap"><span class="inf-city">Israel</span><nav><a href="#locations">Locations</a><a href="#top-rated">Top rated</a><a href="#reviews">Reviews</a><a href="#guides">Cities</a></nav></div></div>
<section class="inf-front"><div class="wrap">
<h1 class="vh">${H1}</h1>
<a class="inf-lead" href="#top-rated"><span class="ph"><img src="/img/mock/table-1800.webp" alt="" fetchpriority="high" width="1800" height="771"></span><strong>The ${ranked.length} best cholents in Israel</strong></a>
<div class="inf-side">
<button class="inf-card" type="button" data-yt="${latest.video}" data-vertical="${isVertical(latest.video)}"><span class="ph"><img src="${heroThumb(latest.video)}" alt="" width="480" height="600"><span class="play"><span>${ICON.play}</span></span></span><strong>This week: ${esc(latest.name)}</strong></button>
<a class="inf-card" href="/cities/beit-shemesh/"><span class="ph"><img src="${cityTop("Beit Shemesh")?.img}" alt="" loading="lazy" width="480" height="600"></span><strong>Where to eat cholent in Beit Shemesh</strong></a>
<a class="inf-card wide" href="/cities/bnei-brak/"><span class="ph"><img src="${cityTop("Bnei Brak")?.img}" alt="" loading="lazy" width="480" height="600"></span><strong>The Bnei Brak cholent guide</strong></a>
</div></div></section>
<section class="inf-search"><div class="wrap"><p class="inf-q">${H1}</p><form class="hsearch" data-hsearch role="search">${ICON.search}<input name="q" placeholder="Name or city" aria-label="Search locations" autocomplete="off"><button class="btn" type="submit">Search</button></form></div></section>`,
  infReviews: () => `<section id="top-rated" class="inf-rev"><div class="wrap">
<div class="sec-head"><h2>Top rated</h2><a class="more-link" href="#locations">All locations →</a></div>
<div class="inf-row">${ranked.map((r, i) => { const s = spotFor(r); return `<a class="inf-rc" href="${s?.url || "#"}"><span class="ph"><img src="${thumb(r.video)}" alt="" loading="lazy" width="480" height="600"><span class="inf-rate${r.score >= 9 ? " top" : ""}">${r.score.toFixed(1)}</span></span><strong>${esc(r.name)}</strong><span class="where">${esc(r.place)}</span><span class="q">“${esc(r.verdict)}”</span></a>`; }).join("")}</div>
</div></section>`,
  infGuides: () => `<section id="guides" class="inf-guides"><div class="wrap">
<div class="sec-head"><h2>Cities</h2></div>
<div class="inf-cities">${CITY_PAGES.map((c) => `<a href="/cities/${citySlug(c)}/"><strong>${esc(c)}</strong><span>${cityCount[c]} locations</span></a>`).join("")}</div>
</div></section>`,
  infDir: () => dirBlock({ mode: "split", title: "Every location" }),

  /* 2. Directory, after the Michelin Guide */
  michTop: () => `<section class="mich-top"><div class="wrap"><h1>${H1}</h1></div></section>`,
  michDir: () => dirBlock({ mode: "panel", cards: true, page: 16, title: "", searchPh: "Search all locations", extraTools: `<button class="icon-btn map-btn" type="button" id="map-panel" aria-pressed="false" aria-label="Show map">${ICON.map}</button>` }),
  michTopRated: () => `<section id="top-rated" class="mich-tr"><div class="wrap">
<div class="sec-head"><h2>Rated by Nechemiah</h2></div>
<ol class="mich-grid">${ranked.slice(0, 8).map((r, i) => { const s = spotFor(r); return `<li><a href="${s?.url || "#"}"><span class="ph"><img src="${thumb(r.video)}" alt="" loading="lazy" width="480" height="600"></span><span class="m-rate"><b>${r.score.toFixed(1)}</b> / 10</span><strong>${esc(r.name)}</strong><span class="where">${esc(r.place)}</span></a></li>`; }).join("")}</ol>
</div></section>`,

  /* 3. Map list, after Eater maps */
  eat: () => `<section class="eat"><div class="eat-mast"><div class="wrap"><span class="rule"></span><span class="eat-region">Israel</span><span class="rule"></span></div></div>
<div class="wrap eat-grid">
<div class="eat-left">
<header class="eat-intro">
<div class="eat-face"><img src="/img/nechemiah.webp" alt="Nechemiah Seltzer" width="760" height="774"></div>
<span class="eat-kick">Leil Shishi</span>
<h1>${H1}</h1>
<p class="eat-dek">The ${ranked.length} best cholents in Israel</p>
<span class="squig" aria-hidden="true"></span>
<p class="eat-by">${byline}</p>
<div class="eat-share"><button class="icon-btn" type="button" data-share="The ${ranked.length} best cholents in Israel" aria-label="Share">${ICON.share}</button><a class="icon-btn" href="${IG}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a><a class="icon-btn" href="${YT}" target="_blank" rel="noopener" aria-label="YouTube">${ICON.yt}</a></div>
</header>
<ol class="eat-list" id="top-rated">
${ranked.map((r, i) => { const s = spotFor(r); return `<li class="entry" data-n="${i + 1}" data-lat="${s?.lat ?? ""}" data-lng="${s?.lng ?? ""}">
<div class="e-head"><span class="e-num">${i + 1}</span><div><h2><a href="${s?.url || "#"}">${esc(r.name)}</a></h2><p class="e-addr">${esc(s?.address || r.place)}</p></div>${stamp(r.score, "sm")}</div>
<button class="e-media" type="button" data-yt="${r.video}" data-vertical="${isVertical(r.video)}"><img src="${thumb(r.video)}" alt="" loading="lazy" width="480" height="600"><span class="play"><span>${ICON.play}</span></span></button>
<p class="e-verdict">${esc(r.verdict)}${r.more ? " " + esc(r.more) : ""}</p>
<div class="e-acts"><button class="btn sm" type="button" data-yt="${r.video}" data-vertical="${isVertical(r.video)}">${ICON.play.replace("<svg", '<svg width="14" height="14"')} Watch review</button>${s ? `<a class="btn ghost sm" href="${wazeUrl(s)}" target="_blank" rel="noopener">Waze</a><a class="btn ghost sm" href="${gmapsUrl(s)}" target="_blank" rel="noopener">Maps</a>` : ""}</div>
</li>`; }).join("\n")}
</ol>
</div>
<div class="eat-mapcol"><div class="eat-map" id="emap" role="region" aria-label="Map of the top ${ranked.length}"></div></div>
</div></section>`,
  eatAll: () => dirBlock({ mode: "none", title: "All locations", page: 10 }),

  /* 4. Explore, after Airbnb */
  airTop: () => `<section class="air-top"><div class="wrap">
<h1 class="vh">${H1}</h1>
<form class="air-search" data-hsearch role="search"><label><span>Where</span><input name="q" placeholder="Name or city" autocomplete="off"></label><label><span>When</span><select name="when" data-when><option value="">Any night</option><option value="tonight">Tonight</option></select></label><button type="submit" aria-label="Search">${ICON.search}</button></form>
<nav class="air-cats" aria-label="Categories">
<a href="#locations" class="on" data-cat="">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 10.5 12 4l9 6.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>'}All</a>
<a href="#locations" data-cat="rated">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'}Top rated</a>
<a href="#locations" data-cat="tonight">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>'}Tonight</a>
<a href="#locations" data-cat="near">${ICON.locate}Near me</a>
${["Jerusalem", "Bnei Brak", "Beit Shemesh"].map((c) => `<a href="#locations" data-cat="city:${c}">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M4 21V9l5-4v16M9 21V3l11 5v13M13 11h3M13 15h3"/></svg>'}${c}</a>`).join("")}
<a href="#reviews">${ICON.play.replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="1.6"')}Reviews</a>
</nav></div></section>`,
  airDir: () => dirBlock({ mode: "inline", cards: true, page: 12, title: "" }),
  airTabs: () => `<nav class="air-tabbar" aria-label="Sections"><a href="#locations">${ICON.search}<span>Explore</span></a><a href="#top-rated">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>'}<span>Top rated</span></a><a href="#reviews">${ICON.play.replace('fill="currentColor"', 'fill="none" stroke="currentColor" stroke-width="1.8"')}<span>Reviews</span></a><a href="#add">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 5v14M5 12h14"/></svg>'}<span>Add</span></a></nav>`,
});

// ---------- variations of the live home page ----------
const heroWrap = (left, right, cls = "") => `<section class="hero${cls}"><div class="wrap">${left}${right}</div></section>`;
const heroImg = `<img src="/img/hero-960.webp" srcset="/img/hero-960.webp 960w, /img/hero-1800.webp 1800w" sizes="(min-width:860px) 50vw, 100vw" alt="" width="960" height="540" fetchpriority="high">`;
const img = (src, pos) => `<img src="${src}" alt="" fetchpriority="high" style="object-position:${pos}">`;
Object.assign(SEC, {
  heroSearch: () => heroWrap(`<div><h1>${H1}</h1>
<form class="hsearch light" data-hsearch role="search">${ICON.search}<input name="q" type="search" enterkeyhint="search" placeholder="Name or city" aria-label="Search locations" autocomplete="off"><button class="btn" type="submit">Search</button></form>
<div class="hero-chips"><a class="chip" href="#locations" data-go="tonight"><span class="d-only">Open tonight</span><span class="m-only">Tonight</span></a><a class="chip" href="#locations" data-go="rated">Rated by Nechemiah</a><a class="chip" href="#locations" data-go="near">${ICON.locate.replace('aria-hidden="true"', 'aria-hidden="true" width="16" height="16"')} Near me</a></div></div>`,
    `<div class="hero-media"><img src="/img/mock/table-1200.webp" srcset="/img/mock/table-1200.webp 1200w, /img/mock/table-1800.webp 1800w" sizes="(min-width:860px) 50vw, 100vw" alt="" width="1200" height="514" fetchpriority="high">${weekCard()}</div>`),
  heroShow: () => heroWrap(`<div><h1>${H1}</h1>
<div class="hero-cta"><a class="btn" href="#locations">${ICON.search} Find a location</a><a class="btn ghost" href="#top-rated">Top rated</a></div></div>`,
    `<div class="ep-hero">
<button class="big-ep" type="button" data-yt="${latest.video}" data-vertical="${isVertical(latest.video)}"><img src="${heroThumb(latest.video)}" alt="" width="480" height="600" fetchpriority="high"><span class="play"><span>${ICON.play}</span></span>${stamp(latest.score, "lg")}<span class="be-cap"><span class="label">This week</span><strong>${esc(latest.name)}</strong><span>${esc(latest.place)}</span></span></button>
<div class="next-eps">${eps.filter((v) => v.id !== latest.video).slice(0, 3).map((v) => { const r = revByVideo[v.id]; return `<button type="button" data-yt="${v.id}" data-vertical="${v.short !== false}"><img src="${thumb(v.id)}" alt="" width="160" height="200"><span class="play"><span>${ICON.play}</span></span>${r?.score ? stamp(r.score, "sm") : ""}</button>`; }).join("")}<a href="#reviews" class="all-eps">All reviews</a></div>
</div>`, " show-hero"),
  heroDark: () => heroWrap(`<div><h1>${H1}</h1>
<div class="hero-cta"><a class="btn tan" href="#locations">${ICON.search} Find a location</a><a class="btn ghost inv" href="#top-rated">Top rated</a></div></div>`,
    `<div class="hero-media">${img("/img/mock/bowl-900.webp", "50% 70%")}${weekCard()}</div>`, " dark"),
  topCarousel: () => `<section id="top-rated"><div class="wrap">
<div class="sec-head"><h2>Top rated</h2><div class="car-nav"><button class="icon-btn" type="button" data-car="-1" aria-label="Previous">‹</button><button class="icon-btn" type="button" data-car="1" aria-label="Next">›</button></div></div>
<ol class="tops carousel" id="tops-car">
${ranked.map((r, i) => { const s = spotFor(r); return `<li class="top-card"><a href="${s ? s.url : "#"}">
<span class="ph"><img src="${thumb(r.video)}" alt="" loading="lazy" width="480" height="600"><span class="rank">${i + 1}</span>${stamp(r.score)}</span>
<strong>${esc(r.name)}</strong><span class="where">${esc(r.place)}</span></a></li>`; }).join("\n")}
</ol></div></section>`,
  locInline: () => dirBlock({ mode: "inline", title: "Locations" }).replace('<section id="locations" class="loc-inline">', '<section id="locations" class="loc-inline loc-live">'),
});
const hs = (cls = "") => `<form class="hsearch ${cls}" data-hsearch role="search">${ICON.search}<input name="q" type="search" enterkeyhint="search" placeholder="Name or city" aria-label="Search locations" autocomplete="off"><button class="btn tan" type="submit">Search</button></form>`;
const pic = (n) => `<picture><source media="(min-width:760px)" srcset="/img/hero/${n}-wide.webp"><img src="/img/hero/${n}-tall.webp" alt="" fetchpriority="high"></picture>`;
Object.assign(SEC, {
  heroMix: () => `<section class="ho ho2 mix"><img class="rbowl" src="/img/hero/real-bowl.webp" alt="" fetchpriority="high" width="1500" height="2000">
<div class="wrap">
<a class="byline" href="#about"><img src="/img/nechemiah.webp" alt="" width="76" height="77"><span>Nechemiah Seltzer<small>The Cholent Guy</small></span></a>
<h1>${H1}</h1>${hs()}${weekCard()}</div>
<a class="photo-credit" href="https://commons.wikimedia.org/wiki/File:Liat_Portal_for_Foodie_Disorder_-_Hamin_(Cholent)_cooked_overnight_for_Shabbat.jpg" target="_blank" rel="noopener">Photo: Liat Portal, CC BY-SA 4.0</a></section>`,
  heroMe: () => `<section class="hero me"><div class="wrap">
<div class="me-txt"><h1>${H1}</h1>${hs("light")}${weekCard()}</div>
<a class="me-pic" href="#about"><span class="disc"><img src="/img/nechemiah.webp" alt="Nechemiah Seltzer" width="760" height="774" fetchpriority="high"></span><span class="me-name">Nechemiah Seltzer<small>The Cholent Guy</small></span></a>
</div></section>`,
  heroBowl: () => `<section class="hb"><div class="wrap">
<div class="hb-txt"><h1>${H1}</h1>
<div class="hero-cta"><a class="btn tan" href="#locations">${ICON.search} Find a location</a><a class="btn ghost inv" href="#top-rated">Top rated</a></div></div>
<div class="hb-art">
<img class="hb-bowl" src="/img/hero/bowl-real.webp" alt="" width="1100" height="1100" fetchpriority="high">
<button class="frame" type="button" data-yt="${latest.video}" data-vertical="${isVertical(latest.video)}">
<span class="frame-img"><img src="${heroThumb(latest.video)}" alt="" width="480" height="853"><span class="play"><span>${ICON.play}</span></span>${stamp(latest.score)}</span>
<span class="frame-cap"><span class="label">This week's episode</span><strong>${esc(latest.name)}</strong><span class="meta">${esc(latest.place)}</span></span>
</button>
</div>
</div></section>`,
  heroO1: () => `<section class="ho ho1">${pic("pot")}<div class="wrap"><h1>${H1}</h1>${hs()}</div></section>`,
  heroO2: () => `<section class="ho ho2">${pic("steam")}<div class="wrap"><h1>${H1}</h1>${hs()}</div></section>`,
  heroO3: () => `<section class="ho3"><div class="wrap"><h1>${H1}</h1>${hs("light")}<div class="bowl"><img src="/img/hero/bowl.webp" alt="" fetchpriority="high" width="1100" height="1100"></div></div></section>`,
});
const VARIANTS = {
  o1: ["heroO1", "topGrid", "locations", "reviews", "about", "add"],
  o2: ["heroO2", "topGrid", "locations", "reviews", "about", "add"],
  o3: ["heroO3", "topGrid", "locations", "reviews", "about", "add"],
  main: ["heroBowl", "topGrid", "locations", "reviews", "about", "add"],
  v1: ["heroSearch", "topGrid", "locations", "reviews", "about", "add"],
  v2: ["heroShow", "reviews", "topGrid", "locations", "about", "add"],
  v3: ["heroDark", "topGrid", "locations", "reviews", "about", "add"],
  v4: ["heroMain", "locInline", "topCarousel", "reviews", "about", "add"],
};

function home(variant = "main") {
  const ldHome = [
    { "@context": "https://schema.org", "@type": "WebSite", name: "Cholent & Chill", url: SITE + "/" },
    { "@context": "https://schema.org", "@type": "Person", name: "Nechemiah Seltzer", alternateName: "The Cholent Guy", url: SITE + "/", sameAs: [IG, YT] },
  ];
  const pre = variant === "main" ? `<link rel="preload" as="image" href="/img/hero/bowl-real.webp">` : "";
  return head({
    title: "Cholent & Chill · Where are you eating tonight?",
    desc: `Israel's #1 cholent directory. ${total} Leil Shishi locations, reviewed by Nechemiah Seltzer, The Cholent Guy.`,
    url: variant === "main" ? "/" : `/mockups/${variant}/`,
    ld: variant === "main" ? ldHome : [],
    extra: pre,
  }).replace("<body>", `<body class="v-${variant}${["main", "o1", "o2"].includes(variant) ? " hov" : ""}">`) + header(true) + `
<main id="main" tabindex="-1">
${VARIANTS[variant].map((k) => SEC[k]()).join("\n\n")}
</main>
` + footer() + `
<script>window.SPOTS=${JSON.stringify(spots.map(clientSpot)).replace(/</g, "\\u003c")};</script>
<script>window.GKEY="${GKEY}";</script>
<script src="/photos.js?v=${V}" defer></script>
<script src="/app.js?v=${V}" defer></script>
${variant === "maplist" ? `<script src="/maplist.js?v=${V}" defer></script>` : ""}
</body></html>`;
}

// ---------- spot page ----------
const media = (s) => {
  if (s.video) {
    const v = isVertical(s.video);
    return `<div class="media ${v ? "v" : "h"}"><img src="${s.img}" fetchpriority="high" alt="${esc(s.display)}, from the episode" width="480" height="${v ? 853 : 270}"><span class="play" aria-hidden="true"><span>${ICON.play}</span></span><button type="button" data-yt="${s.video}" data-vertical="${v}" aria-label="Watch the review of ${esc(s.display)}"></button></div>`;
  }
  return s.placeId ? `<div class="media h gp" data-pid="${s.placeId}"><span class="tile" aria-hidden="true">${esc(initial(s))}</span></div>` : "";
};
const facts = (s) => `<dl class="facts">
${s.address ? `<dt>Address</dt><dd ${hasHe(s.address) ? 'dir="rtl" lang="he"' : ""}>${esc(s.address)}</dd>` : ""}
<dt>When</dt><dd>${esc(DAYS[s.days] || s.days)}</dd>
${s.kosher ? `<dt>Kashrut</dt><dd ${hasHe(s.kosher) ? 'dir="rtl" lang="he"' : ""}>${esc(s.kosher)}</dd>` : ""}
${s.phone ? `<dt>Phone</dt><dd><a href="${tel(s.phone)}">${fmtPhone(s.phone)}</a></dd>` : ""}
${s.review?.price ? `<dt>Prices</dt><dd>${esc(s.review.price)}</dd>` : ""}
</dl>`;
const actions = (s) => `<div class="acts">
<a class="act primary" href="${wazeUrl(s)}" target="_blank" rel="noopener">${ICON.waze}Waze</a>
<a class="act" href="${gmapsUrl(s)}" target="_blank" rel="noopener">${ICON.pin}Maps</a>
<a class="act" ${s.phone ? `href="${tel(s.phone)}"` : 'aria-disabled="true"'}>${ICON.phone}Call</a>
<button class="act" type="button" data-share="${esc(s.display)}">${ICON.share}Share</button>
</div>`;

function nearest(s, n = 6) {
  if (!s.lat) return spots.filter((x) => x !== s && x.city && x.city === s.city).slice(0, n);
  const d = (a) => Math.hypot(a.lat - s.lat, (a.lng - s.lng) * Math.cos((s.lat * Math.PI) / 180));
  return spots.filter((x) => x !== s && x.lat).sort((a, b) => d(a) - d(b)).slice(0, n);
}

function spotPage(s) {
  const r = s.review;
  const where = [s.cityLabel, DAYS[s.days]].filter(Boolean).join(" · ");
  const title = `${s.display}${s.en && s.he ? " (" + s.he + ")" : ""} · Cholent in ${s.cityLabel} | Cholent & Chill`;
  const desc = s.score != null
    ? `Rated ${s.score}/10 by The Cholent Guy. “${r.verdict}” Address, hours, kashrut and directions.`
    : `${s.display}, Leil Shishi cholent in ${s.cityLabel}. ${DAYS[s.days] || ""}. Address, kashrut, phone and directions.`;
  const ld = {
    "@context": "https://schema.org", "@type": "Restaurant", name: s.display, alternateName: s.en && s.he ? s.he : undefined,
    servesCuisine: ["Kosher", "Jewish"], url: SITE + s.url, telephone: s.phone ? "+972" + s.phone.replace(/\D/g, "").replace(/^0/, "") : undefined,
    address: { "@type": "PostalAddress", streetAddress: s.address || undefined, addressLocality: s.city || undefined, addressCountry: "IL" },
    geo: s.lat ? { "@type": "GeoCoordinates", latitude: s.lat, longitude: s.lng } : undefined,
    image: s.real ? SITE + s.img : undefined,
    review: s.score != null ? { "@type": "Review", author: { "@type": "Person", name: "Nechemiah Seltzer" }, datePublished: r.date, reviewBody: r.verdict, reviewRating: { "@type": "Rating", ratingValue: s.score, bestRating: 10, worstRating: 0 } } : undefined,
  };
  const og = s.score != null ? `/og/${s.id}.jpg` : "/og/site.jpg?v=2";
  const gkey = s.placeId && !s.real;
  return head({ title, desc, url: s.url, og, ld: [ld], extra: gkey ? '<link rel="preconnect" href="https://maps.googleapis.com"><link rel="preconnect" href="https://maps.gstatic.com" crossorigin><link rel="preconnect" href="https://lh3.googleusercontent.com">' : "" }) + header(false) + `
<main id="main" tabindex="-1">
<div class="wrap crumbs"><a href="/#locations">All locations</a>${s.city && CITY_PAGES.includes(s.city) ? ` / <a href="/cities/${citySlug(s.city)}/">${esc(s.city)}</a>` : ""}</div>
<article class="spot"><div class="wrap">
<div class="sp-top">
${r?.ep ? `<div class="label">${esc(r.ep)}</div>` : ""}
<h1>${s.en ? `<span class="en">${esc(s.en)}</span>` : `<span lang="he" dir="rtl">${esc(s.name)}</span>`}</h1>
${s.en && s.he ? `<div class="alt" lang="he" dir="rtl">${esc(s.he)}</div>` : ""}
<div class="where">${esc(where)}</div>
${r?.verdict ? `<div class="verdict">${stamp(s.score, "xl")}<div><blockquote>“${esc(r.verdict)}”</blockquote><cite>Nechemiah Seltzer${r.date ? ", " + fmtDate(r.date) : ""}${r.comped ? ' · <span class="comp" style="margin-left:0">Comped</span>' : ""}</cite></div></div>` : ""}
${r?.more ? `<p class="more">${esc(r.more)}</p>` : ""}
</div>
${media(s)}
<div class="sp-bot">
${facts(s)}
${actions(s)}
${s.lat ? `<div class="minimap" id="minimap" data-lat="${s.lat}" data-lng="${s.lng}" data-score="${s.score ?? ""}" role="img" aria-label="Map showing ${esc(s.display)}"></div>` : ""}
</div>
</div></article>
<section class="near"><div class="wrap"><h2>${s.lat ? "Nearby" : "More in " + esc(s.cityLabel)}</h2><ul class="list">${nearest(s).map(row).join("")}</ul></div></section>
</main>
` + footer() + `
<script>window.GKEY="${GKEY}";</script>
<script src="/photos.js?v=${V}" defer></script>
<script src="/page.js?v=${V}" defer></script>
</body></html>`;
}

// ---------- city page ----------
function cityPage(c) {
  const list = spots.filter((s) => s.city === c);
  const r = list.filter((s) => s.score != null);
  const he = CITY_HE[c];
  const title = `Cholent in ${c}: ${list.length} Thursday night spots | Cholent & Chill`;
  const desc = `${list.length} places for Leil Shishi cholent in ${c}${r.length ? `, ${r.length} rated on camera` : ""}. Addresses, kashrut, hours and directions.`;
  const pts = list.filter((s) => s.lat).map((s) => [s.lat, s.lng, s.score ?? "", s.url, s.display]);
  return head({ title, desc, url: `/cities/${citySlug(c)}/`, ld: [{ "@context": "https://schema.org", "@type": "ItemList", name: `Cholent in ${c}`, itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, url: SITE + s.url, name: s.display })) }] }) + header(false) + `
<main id="main" tabindex="-1">
<div class="wrap crumbs"><a href="/#locations">All locations</a> / ${esc(c)}</div>
<section class="city-hero"><div class="wrap">
<div class="label">${list.length} locations${he ? ` · <bdi lang="he" style="letter-spacing:0">${esc(he)}</bdi>` : ""}</div>
<h1>Cholent in ${esc(c)}</h1>
</div></section>
<section class="city-list"><div class="wrap city-grid"><ul class="list">${list.map(row).join("")}</ul>
${pts.length ? `<div class="city-map" id="citymap" data-pts='${esc(JSON.stringify(pts))}' role="img" aria-label="Map of cholent spots in ${esc(c)}"></div>` : ""}</div></section>
</main>
` + footer() + `
<script>window.GKEY="${GKEY}";</script>
<script src="/photos.js?v=${V}" defer></script>
<script src="/page.js?v=${V}" defer></script>
</body></html>`;
}

// ---------- write ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(SRC, "img"), path.join(OUT, "img"), { recursive: true });
fs.cpSync(path.join(SRC, "fonts"), path.join(OUT, "fonts"), { recursive: true });
if (fs.existsSync(path.join(SRC, "og"))) fs.cpSync(path.join(SRC, "og"), path.join(OUT, "og"), { recursive: true });
for (const f of ["styles.css", "app.js", "page.js", "photos.js", "maplist.js", "favicon.svg", "apple-touch-icon.png"]) if (fs.existsSync(path.join(SRC, f))) fs.copyFileSync(path.join(SRC, f), path.join(OUT, f));
write("index.html", home("main"));
for (const v of ["o1", "o2", "o3"]) write(`mockups/${v}/index.html`, home(v));
write("admin/index.html", fs.readFileSync(path.join(SRC, "admin.html"), "utf8").replace("__GKEY__", GKEY).replace("/styles.css", `/styles.css?v=${V}`));
if (fs.existsSync(path.join(SRC, "mockups.html"))) write("mockups/index.html", fs.readFileSync(path.join(SRC, "mockups.html"), "utf8"));
for (const s of spots) write(`spots/${s.id}/index.html`, spotPage(s));
for (const c of CITY_PAGES) write(`cities/${citySlug(c)}/index.html`, cityPage(c));
write("404.html", head({ title: "Not found | Cholent & Chill", desc: "This page doesn't exist.", url: "/404" }) + header(false) + `<main id="main" class="notfound"><div class="wrap"><h1>Empty pot.</h1><p><a class="btn" href="/">Home</a></p></div></main>` + footer() + "</body></html>");
const urls = ["/", ...CITY_PAGES.map((c) => `/cities/${citySlug(c)}/`), ...spots.map((s) => s.url)];
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${u}</loc></url>`).join("\n")}\n</urlset>\n`);
write("robots.txt", INDEX ? `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n");
write("data/spots.json", JSON.stringify(spots.map((s) => ({ id: s.id, name: s.name, nameEn: s.en || "", city: s.city || "", address: s.address || "", days: s.days, kosher: s.kosher || "", phone: s.phone || "", lat: s.lat ?? null, lng: s.lng ?? null, placeId: s.placeId || "", score: s.score, verdict: s.review?.verdict || "", video: s.video || "", ep: s.review?.ep || "", price: s.review?.price || "" }))));
write("og-list.json", JSON.stringify({ site: { total, rated }, spots: spots.filter((s) => s.score != null).map((s) => ({ id: s.id, name: s.display, place: s.cityLabel, score: s.score, img: s.img, verdict: s.review.verdict })) }));

if (missingEn.length) console.log(`No English spelling yet (automatic one used): ${missingEn.join(", ")}`);
console.log(`Built ${spots.length} spots (${rated} rated), ${CITY_PAGES.length} city pages. SITE=${SITE} INDEX=${INDEX}`);
