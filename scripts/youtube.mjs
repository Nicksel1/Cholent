// Reads the whole YouTube channel at build time (title, description, upload date, length) with the
// YouTube Data API, so edits made on YouTube reach the site on the next build (weekly, or any deploy).
// Needs YOUTUBE_API_KEY in Netlify. Without it, or if YouTube can't be reached, the saved list
// (src/data/videos-raw.json) is used as before.
const CHANNEL = "UCtRykzWgIVNrF3FE5tkvOaw";
const API = "https://www.googleapis.com/youtube/v3/";

async function get(path, params) {
  const u = API + path + "?" + new URLSearchParams({ ...params, key: process.env.YOUTUBE_API_KEY });
  const r = await fetch(u, { signal: AbortSignal.timeout(15000) });
  const d = await r.json();
  if (!r.ok) throw new Error(d.error?.message || "HTTP " + r.status);
  return d;
}
// "PT1M9S" -> 69
const seconds = (iso) => {
  const m = /P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || "") || [];
  return (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0);
};

export async function syncVideos(saved) {
  if (!process.env.YOUTUBE_API_KEY) { console.log("YOUTUBE_API_KEY not set: using the saved video list."); return saved; }
  try {
    const ch = await get("channels", { part: "contentDetails", id: CHANNEL });
    const uploads = ch.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploads) throw new Error("channel not found");
    const ids = [];
    let pageToken = "";
    do {
      const pl = await get("playlistItems", { part: "contentDetails", playlistId: uploads, maxResults: 50, ...(pageToken && { pageToken }) });
      ids.push(...pl.items.map((i) => i.contentDetails.videoId));
      pageToken = pl.nextPageToken || "";
    } while (pageToken && ids.length < 2000);
    const byId = Object.fromEntries(saved.map((v) => [v.id, v]));
    const out = [];
    for (let i = 0; i < ids.length; i += 50) {
      const vs = await get("videos", { part: "snippet,contentDetails,statistics,status", id: ids.slice(i, i + 50).join(",") });
      for (const v of vs.items) {
        if (v.status?.privacyStatus && v.status.privacyStatus !== "public") continue; // private or unlisted: not on the site
        const old = byId[v.id] || {};
        const dur = seconds(v.contentDetails?.duration);
        out.push({
          id: v.id,
          title: v.snippet.title,
          date: v.snippet.publishedAt.slice(0, 10).replace(/-/g, ""),
          dur,
          views: +(v.statistics?.viewCount || old.views || 0),
          short: old.short ?? dur <= 180,
          desc: v.snippet.description || "",
        });
      }
    }
    if (!out.length) throw new Error("no public videos returned");
    console.log(`YouTube: read ${out.length} videos from the channel.`);
    return out;
  } catch (e) {
    console.log("YouTube API not reachable, using the saved video list:", e.message);
    return saved;
  }
}
