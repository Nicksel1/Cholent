// Google Sheet as the location list for /api/data.
// Turned on when GOOGLE_SERVICE_ACCOUNT (the service-account JSON key) and GOOGLE_SHEET_ID are set in Netlify.
// The Sheet's first tab holds one row per location. Column headers are matched by name, so columns can be
// reordered and extra columns added. A location is never deleted: "Hidden" = yes takes it off the site.
import crypto from "node:crypto";

export const COLS = [
  ["id", "ID"], ["name", "Name"], ["nameEn", "English name"], ["city", "City"], ["address", "Address"],
  ["days", "Days"], ["kosher", "Hechsher"], ["phone", "Phone"], ["lat", "Lat"], ["lng", "Lng"],
  ["placeId", "Google place ID"], ["score", "Score"], ["verdict", "Verdict"], ["video", "YouTube"],
  ["ep", "Episode"], ["price", "Prices"], ["visited", "Visited"], ["hidden", "Hidden"], ["notes", "Notes"],
];
const KEY_BY_HEADER = Object.fromEntries(COLS.map(([k, h]) => [h.toLowerCase(), k]));
export const FIELDS = ["name", "nameEn", "city", "address", "days", "kosher", "phone", "lat", "lng", "placeId", "score", "verdict", "video", "ep", "price"];

export const sheetOn = () => !!(process.env.GOOGLE_SERVICE_ACCOUNT && process.env.GOOGLE_SHEET_ID);

const b64u = (b) => Buffer.from(b).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
let tok = null;
async function token() {
  if (tok && tok.exp > Date.now() + 60_000) return tok.value;
  const sa = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  const now = Math.floor(Date.now() / 1000);
  const head = b64u(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64u(JSON.stringify({ iss: sa.client_email, scope: "https://www.googleapis.com/auth/spreadsheets", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = b64u(crypto.createSign("RSA-SHA256").update(head + "." + claim).sign(sa.private_key));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${head}.${claim}.${sig}` }) });
  const d = await r.json();
  if (!d.access_token) throw new Error("Google sign-in failed: " + (d.error_description || d.error || r.status));
  tok = { value: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 };
  return tok.value;
}
async function api(path, opts = {}) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${process.env.GOOGLE_SHEET_ID}${path}`, { ...opts, headers: { Authorization: "Bearer " + (await token()), "Content-Type": "application/json" } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error("Google Sheets: " + (d.error?.message || r.status));
  return d;
}

// Rows as { _row, id, name, ... } using the first tab.
let tabName = null;
export async function readRows() {
  if (!tabName) tabName = (await api("?fields=sheets.properties.title")).sheets[0].properties.title;
  const d = await api(`/values/${encodeURIComponent(`'${tabName}'`)}?valueRenderOption=UNFORMATTED_VALUE`);
  const [head = [], ...rest] = d.values || [];
  const keys = head.map((h) => KEY_BY_HEADER[String(h).trim().toLowerCase()] || null);
  const rows = rest.map((v, i) => { const o = { _row: i + 2 }; keys.forEach((k, j) => { if (k) o[k] = v[j] ?? ""; }); return o; }).filter((o) => String(o.id || "").trim() || String(o.name || "").trim());
  return { head, keys, rows };
}
const cell = (k, v) => k === "video" && v ? "https://youtu.be/" + v : v == null ? "" : v;
export async function writeRow(sheet, row, values) {
  // row: existing row number, or null to append. Only the given keys are written; other cells stay as they are.
  const { head, keys } = sheet;
  for (const [k, v] of Object.entries(values)) if (!keys.includes(k)) throw new Error(`The Sheet has no "${COLS.find((c) => c[0] === k)?.[1] || k}" column`);
  const q = encodeURIComponent(`'${tabName}'`);
  if (row == null) {
    const line = keys.map((k) => (k && k in values ? cell(k, values[k]) : ""));
    await api(`/values/${q}!A1:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`, { method: "POST", body: JSON.stringify({ values: [line] }) });
    return;
  }
  const data = Object.entries(values).map(([k, v]) => {
    let n = keys.indexOf(k) + 1, col = "";
    while (n) { const m = (n - 1) % 26; col = String.fromCharCode(65 + m) + col; n = (n - m - 1) / 26; }
    return { range: `'${tabName}'!${col}${row}`, values: [[cell(k, v)]] };
  });
  await api("/values:batchUpdate", { method: "POST", body: JSON.stringify({ valueInputOption: "RAW", data }) });
}

// Read a Sheet row the same way the admin form saves a location.
const yes = (v) => /^(y|yes|true|1|כן|x|✓)$/i.test(String(v).trim());
export function rowToFields(r, clean) {
  const f = clean(Object.fromEntries(FIELDS.filter((k) => k in r).map((k) => [k, r[k]])));
  return { id: String(r.id || "").trim(), hidden: yes(r.hidden), fields: f };
}

// Same shape as before ({ added, edits, hidden }), worked out by comparing the Sheet to the built list.
const same = (k, a, b) => {
  if (k === "phone") return String(a ?? "").replace(/\D/g, "").replace(/^0+/, "") === String(b ?? "").replace(/\D/g, "").replace(/^0+/, "");
  if (k === "lat" || k === "lng" || k === "score") return (a == null || a === "" ? null : Number(a)) === null ? (b == null || b === "") : Math.abs(Number(a) - Number(b)) < 1e-5;
  return String(a ?? "").trim() === String(b ?? "").trim();
};
export function overlay(rows, base, clean) {
  const byId = Object.fromEntries(base.map((b) => [b.id, b]));
  const out = { added: [], edits: {}, hidden: [] };
  for (const r of rows) {
    const { id, hidden, fields } = rowToFields(r, clean);
    const b = byId[id];
    if (hidden) { if (id) out.hidden.push(id); continue; }
    if (!b) { if (fields.name && fields.city) out.added.push({ days: "Thursday", ...fields, id: id || "row" + r._row }); continue; }
    const diff = {};
    for (const [k, v] of Object.entries(fields)) {
      const blank = v == null || v === "";
      if (blank && (k === "name" || k === "city")) continue;       // a cleared name or city keeps the original
      if (!same(k, v, b[k])) diff[k] = v;
    }
    if (Object.keys(diff).length) out.edits[id] = diff;
  }
  return out;
}
