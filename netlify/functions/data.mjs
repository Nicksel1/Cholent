// Netlify version of the admin data API. Storage is Netlify Blobs (built in, nothing to set up).
import { getStore } from "@netlify/blobs";
import crypto from "node:crypto";
import { sheetOn, readRows, writeRow, overlay } from "../../lib/sheet.mjs";

const EMPTY = { added: [], edits: {}, hidden: [] };
const store = () => getStore({ name: "cholent-chill", consistency: "strong" });
const hash = (code, salt) => crypto.scryptSync(String(code), salt, 32).toString("hex");
const json = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

// Passcode: whatever was set in the admin page. Before that, the ADMIN_CODE setting on Netlify if there is one.
async function auth(s) { return (await s.get("auth", { type: "json" })) || null; }
async function codeOk(s, code) {
  if (!code) return false;
  const a = await auth(s);
  if (a?.hash) { const h = hash(code, a.salt); return h.length === a.hash.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(a.hash)); }
  const env = process.env.ADMIN_CODE;
  return !!env && String(code) === env;
}
async function setCode(s, code) {
  const salt = crypto.randomBytes(16).toString("hex");
  await s.setJSON("auth", { salt, hash: hash(code, salt), changed: new Date().toISOString() });
}

const clean = (v, n = 160) => String(v ?? "").replace(/[<>]/g, "").trim().slice(0, n);
const DAYS = ["Thursday", "Thu & Fri", "Wed-Fri", "All Week"];
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

// ---------- Google Sheet mode (when GOOGLE_SERVICE_ACCOUNT and GOOGLE_SHEET_ID are set) ----------
let baseCache = null, sheetCache = null;
async function baseList(req) {
  if (baseCache && baseCache.at > Date.now() - 600_000) return baseCache.list;
  const origin = process.env.URL || new URL(req.url).origin;
  const list = await fetch(origin + "/data/spots.json").then((r) => r.json());
  baseCache = { at: Date.now(), list };
  return list;
}
async function sheetData(req, fresh = false) {
  if (!fresh && sheetCache && sheetCache.at > Date.now() - 30_000) return sheetCache.data;
  const [sheet, base] = await Promise.all([readRows(), baseList(req)]);
  const data = overlay(sheet.rows, base, fields);
  sheetCache = { at: Date.now(), data, sheet };
  return data;
}
async function sheetAction(req, b) {
  await sheetData(req, true);
  const sheet = sheetCache.sheet, base = await baseList(req);
  const id = clean(b.id, 80), f = fields(b.fields || {});
  const rowOf = (x) => sheet.rows.find((r) => String(r.id).trim() === x || (!String(r.id).trim() && "row" + r._row === x));
  if (b.action === "add") {
    if (!f.name || !f.city) return json({ error: "Name and city are required" }, 400);
    await writeRow(sheet, null, { days: "Thursday", ...f, id: "x" + Date.now().toString(36), visited: f.score != null ? "yes" : "", notes: "Added in admin " + new Date().toISOString().slice(0, 10) });
  } else if (b.action === "update") {
    if (!id) return json({ error: "Missing location" }, 400);
    if ("name" in f && !f.name) delete f.name;
    if ("city" in f && !f.city) delete f.city;
    const r = rowOf(id);
    if (r) await writeRow(sheet, r._row, f);
    else { const bs = base.find((x) => x.id === id); if (!bs) return json({ error: "Location not found" }, 404); await writeRow(sheet, null, { ...Object.fromEntries(Object.entries(bs).filter(([k]) => k !== "id")), ...f, id }); }
  } else if (b.action === "remove" || b.action === "restore") {
    const r = rowOf(id), v = b.action === "remove" ? "yes" : "";
    if (r) await writeRow(sheet, r._row, { hidden: v });
    else if (base.some((x) => x.id === id)) await writeRow(sheet, null, { id, name: base.find((x) => x.id === id).name, hidden: v });
  } else return json({ error: "Unknown action" }, 400);
  return json({ ok: true, data: await sheetData(req, true) });
}

export default async (req) => {
  try {
    if (req.method === "GET") {
      if (sheetOn()) return new Response(JSON.stringify(await sheetData(req)), { headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });
      const s = store();
      return json({ ...EMPTY, ...((await s.get("data", { type: "json" })) || {}) });
    }
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const s = store();
    const b = await req.json().catch(() => ({}));
    // First visit, nothing set yet: the admin page asks him to create a passcode.
    if (b.action === "status") return json({ setup: !(await auth(s)) && !process.env.ADMIN_CODE });
    if (b.action === "setup") {
      if ((await auth(s)) || process.env.ADMIN_CODE) return json({ error: "Already set up" }, 400);
      const n = String(b.newCode || "");
      if (n.length < 4 || n.length > 64) return json({ error: "Use at least 4 characters" }, 400);
      await setCode(s, n);
      return json({ ok: true });
    }
    if (!(await codeOk(s, b.code))) { await new Promise((r) => setTimeout(r, 900)); return json({ error: "Wrong code" }, 401); }
    if (b.action === "check") return json({ ok: true });
    if (b.action === "passcode") {
      const n = String(b.newCode || "");
      if (n.length < 4 || n.length > 64) return json({ error: "Use at least 4 characters" }, 400);
      await setCode(s, n);
      return json({ ok: true });
    }
    if (sheetOn()) return await sheetAction(req, b);
    const d = { ...EMPTY, ...((await s.get("data", { type: "json" })) || {}) };
    const id = clean(b.id, 80), f = fields(b.fields || {});
    if (b.action === "add") {
      if (!f.name || !f.city) return json({ error: "Name and city are required" }, 400);
      d.added.push({ id: "x" + Date.now().toString(36), days: "Thursday", ...f, added: new Date().toISOString() });
    } else if (b.action === "update") {
      if (!id) return json({ error: "Missing location" }, 400);
      if ("name" in f && !f.name) delete f.name;
      if ("city" in f && !f.city) delete f.city;
      const own = d.added.find((x) => x.id === id);
      if (own) Object.assign(own, f); else d.edits[id] = { ...(d.edits[id] || {}), ...f };
    } else if (b.action === "remove") {
      if (d.added.some((x) => x.id === id)) d.added = d.added.filter((x) => x.id !== id);
      else if (id && !d.hidden.includes(id)) d.hidden.push(id);
    } else if (b.action === "restore") {
      d.hidden = d.hidden.filter((x) => x !== id);
    } else return json({ error: "Unknown action" }, 400);
    await s.setJSON("data", d);
    return json({ ok: true, data: d });
  } catch (e) {
    console.error(e);
    if (sheetOn() && req.method === "GET") return json(EMPTY); // the site still shows its built list if the Sheet can't be reached
    return json({ error: /Google/.test(e.message) ? e.message : "Something went wrong. Try again." }, 500);
  }
};
export const config = { path: "/api/data" };
