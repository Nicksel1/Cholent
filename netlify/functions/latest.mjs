// Netlify version of api/latest.js: newest videos from the YouTube channel feed.
// Videos hidden in the admin page, and videos of spots marked Closed, are left out.
import handler from "../../api/latest.js";
import { getStore } from "@netlify/blobs";

async function offSite(req) {
  try {
    const d = (await getStore({ name: "cholent-chill" }).get("data", { type: "json" })) || {};
    const closed = Object.entries(d.edits || {}).filter(([, f]) => f.closed).map(([id]) => id);
    const out = new Set(d.videos || []);
    if (closed.length) {
      const spots = await fetch((process.env.URL || new URL(req.url).origin) + "/data/spots.json").then((r) => r.json());
      spots.filter((s) => closed.includes(s.id) && s.video).forEach((s) => out.add(s.video));
    }
    return out;
  } catch (_) { return new Set(); }
}

export default async (req) => {
  let status = 200, body = {}; const headers = { "Content-Type": "application/json" };
  await handler({}, { setHeader: (k, v) => (headers[k] = v), status(s) { status = s; return this; }, json(o) { body = o; } });
  const skip = await offSite(req);
  if (skip.size && body.list) {
    body.list = body.list.filter((v) => !skip.has(v.id));
    if (skip.has(body.id)) { const next = body.list[0]; body = next ? { ...next, list: body.list } : { id: null, list: body.list }; }
  }
  return new Response(JSON.stringify(body), { status, headers });
};
export const config = { path: "/api/latest" };
