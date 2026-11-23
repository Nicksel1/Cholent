// Everything the admin page controls. GET is public (the site reads it). Changes need the passcode.
const { put, list, del } = require("@vercel/blob");
const crypto = require("crypto");
const DATA = "data.json", AUTH = "auth.json";
const EMPTY = { added: [], edits: {}, hidden: [] };

// Each save is a new file (data/<time>.json) and reads take the newest, so a quick second change
// never sees a cached older copy.
async function versions(name) {
  const { blobs } = await list({ prefix: name.replace(".json", "/"), limit: 1000 });
  return blobs.sort((x, y) => (x.pathname < y.pathname ? 1 : -1));
}
async function readJson(name, fallback) {
  const v = await versions(name);
  if (!v.length) return fallback;
  const r = await fetch(v[0].url, { cache: "no-store" });
  return r.ok ? r.json() : fallback;
}
async function writeJson(name, data) {
  await put(`${name.replace(".json", "/")}${Date.now()}.json`, JSON.stringify(data), { access: "public", addRandomSuffix: false, contentType: "application/json" });
  const old = (await versions(name)).slice(5);
  if (old.length) await del(old.map((x) => x.url)).catch(() => {});
}
const hash = (code, salt) => crypto.scryptSync(String(code), salt, 32).toString("hex");
async function codeOk(code) {
  if (!code) return false;
  const a = await readJson(AUTH, null);
  if (a && a.hash) { const h = hash(code, a.salt); return h.length === a.hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(a.hash)); }
  return !!process.env.ADMIN_CODE && String(code) === process.env.ADMIN_CODE;
}

const clean = (v, n = 160) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const DAYS = ["Thursday", "Thu & Fri", "Wed-Fri", "All Week"];
// Only the keys that were sent are returned, so an edit can change one thing and leave the rest.
function fields(b) {
  const o = {}, has = (k) => Object.prototype.hasOwnProperty.call(b, k);
  if (has("name")) o.name = clean(b.name, 80);
  if (has("nameEn")) o.nameEn = clean(b.nameEn, 80);
  if (has("city")) o.city = clean(b.city, 60);
  if (has("address")) o.address = clean(b.address);
  if (has("days")) o.days = DAYS.includes(b.days) ? b.days : "Thursday";
  if (has("kosher")) o.kosher = clean(b.kosher, 100);
  if (has("phone")) o.phone = clean(b.phone, 20).replace(/[^\d+\-\s]/g, "");
  if (has("lat")) { const n = Number(b.lat); o.lat = Number.isFinite(n) && n ? n : null; }
  if (has("lng")) { const n = Number(b.lng); o.lng = Number.isFinite(n) && n ? n : null; }
  if (has("placeId")) o.placeId = clean(b.placeId, 80);
  if (has("score")) { const n = Number(b.score); o.score = b.score !== "" && b.score !== null && Number.isFinite(n) && n > 0 && n <= 10 ? Math.round(n * 10) / 10 : null; }
  if (has("verdict")) o.verdict = clean(b.verdict, 240);
  if (has("video")) o.video = (/(?:v=|shorts\/|youtu\.be\/|embed\/)([\w-]{11})/.exec(clean(b.video, 200)) || /^([\w-]{11})$/.exec(clean(b.video, 20)) || [])[1] || "";
  if (has("ep")) o.ep = clean(b.ep, 30);
  if (has("price")) o.price = clean(b.price, 80);
  return o;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") return res.status(200).json({ ...EMPTY, ...(await readJson(DATA, EMPTY)) });
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    if (b.action === "status") return res.status(200).json({ setup: false });
    if (!(await codeOk(b.code))) { await new Promise((r) => setTimeout(r, 900)); return res.status(401).json({ error: "Wrong code" }); }
    if (b.action === "check") return res.status(200).json({ ok: true });
    if (b.action === "passcode") {
      const n = String(b.newCode || "");
      if (n.length < 4 || n.length > 64) return res.status(400).json({ error: "Use at least 4 characters" });
      const salt = crypto.randomBytes(16).toString("hex");
      await writeJson(AUTH, { salt, hash: hash(n, salt), changed: new Date().toISOString() });
      return res.status(200).json({ ok: true });
    }
    const d = { ...EMPTY, ...(await readJson(DATA, EMPTY)) };
    const id = clean(b.id, 80), f = fields(b.fields || {});
    if (b.action === "add") {
      if (!f.name || !f.city) return res.status(400).json({ error: "Name and city are required" });
      d.added.push({ id: "x" + Date.now().toString(36), days: "Thursday", ...f, added: new Date().toISOString() });
    } else if (b.action === "update") {
      if (!id) return res.status(400).json({ error: "Missing location" });
      if ("name" in f && !f.name) delete f.name;
      if ("city" in f && !f.city) delete f.city;
      const own = d.added.find((x) => x.id === id);
      if (own) Object.assign(own, f); else d.edits[id] = { ...(d.edits[id] || {}), ...f };
    } else if (b.action === "remove") {
      if (d.added.some((x) => x.id === id)) d.added = d.added.filter((x) => x.id !== id);
      else if (id && !d.hidden.includes(id)) d.hidden.push(id);
    } else if (b.action === "restore") {
      d.hidden = d.hidden.filter((x) => x !== id);
    } else return res.status(400).json({ error: "Unknown action" });
    await writeJson(DATA, d);
    res.status(200).json({ ok: true, data: d });
  } catch (e) {
    res.status(500).json({ error: "Something went wrong. Try again." });
  }
};
