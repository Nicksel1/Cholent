// Netlify version of api/latest.js: newest videos from the YouTube channel feed.
// Videos hidden in the admin page, and videos of spots marked Closed, are left out.
import handler from "../../api/latest.js";
import { getStore } from "@netlify/blobs";

const store = () => getStore({ name: "cholent-chill" });
const siteSpots = (req) => fetch((process.env.URL || new URL(req.url).origin) + "/data/spots.json").then((r) => r.json()).catch(() => null);

async function offSite(req, spots) {
  try {
    const d = (await store().get("data", { type: "json" })) || {};
    const closed = Object.entries(d.edits || {}).filter(([, f]) => f.closed).map(([id]) => id);
    const out = new Set(d.videos || []);
    if (closed.length && spots) spots.filter((s) => closed.includes(s.id) && s.video).forEach((s) => out.add(s.video));
    return out;
  } catch (_) { return new Set(); }
}

// A new video with a rating and a location that isn't a location on the site yet: rebuild, so it becomes one
// (scripts/auto-spots.mjs). At most once every 6 hours, to keep deploys (and Netlify credits) low.
async function rebuildForNewReviews(list, spots) {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook || !spots) return;
  const onSite = new Set(spots.map((s) => s.video).filter(Boolean));
  if (!list.some((v) => v.score != null && v.place && !onSite.has(v.id))) return;
  const s = store(), last = await s.get("autoBuildAt").catch(() => null);
  if (last && Date.now() - Number(last) < 6 * 3600e3) return;
  await s.set("autoBuildAt", String(Date.now()));
  await fetch(hook, { method: "POST" }).catch(() => {});
}

export default async (req) => {
  let status = 200, body = {}; const headers = { "Content-Type": "application/json" };
  await handler({}, { setHeader: (k, v) => (headers[k] = v), status(s) { status = s; return this; }, json(o) { body = o; } });
  const spots = await siteSpots(req);
  const skip = await offSite(req, spots);
  if (skip.size && body.list) {
    body.list = body.list.filter((v) => !skip.has(v.id));
    if (skip.has(body.id)) { const next = body.list[0]; body = next ? { ...next, list: body.list } : { id: null, list: body.list }; }
  }
  try { await rebuildForNewReviews(body.list || [], spots); } catch (_) {}
  return new Response(JSON.stringify(body), { status, headers });
};
export const config = { path: "/api/latest" };
