// Netlify version of api/latest.js: newest videos from the YouTube channel feed.
import handler from "../../api/latest.js";
export default async () => {
  let status = 200, body = {}; const headers = { "Content-Type": "application/json" };
  await handler({}, { setHeader: (k, v) => (headers[k] = v), status(s) { status = s; return this; }, json(o) { body = o; } });
  return new Response(JSON.stringify(body), { status, headers });
};
export const config = { path: "/api/latest" };
