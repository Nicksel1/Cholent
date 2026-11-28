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

// YouTube's public feed (no key needed): the 15 newest videos with title, description and date.
// Used on every build, so new uploads always reach the site even if the API key isn't working.
const FEED = `https://www.youtube.com/feeds/videos.xml?channel_id=${CHANNEL}`;
const un = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
async function feedVideos() {
  try {
    const xml = await (await fetch(FEED, { signal: AbortSignal.timeout(15000) })).text();
    const out = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1], pick = (re) => un((re.exec(e) || [])[1] || "");
      return { id: pick(/<yt:videoId>([^<]+)/), title: pick(/<title>([^<]*)/), date: pick(/<published>([^<]+)/).slice(0, 10).replace(/-/g, ""), desc: pick(/<media:description>([\s\S]*?)<\/media:description>/) };
    }).filter((v) => v.id);
    console.log(`YouTube feed: read ${out.length} newest videos.`);
    return out;
  } catch (e) { console.log("YouTube feed not reachable:", e.message); return []; }
}
// Newest videos from the feed win over the list they're merged into (titles and descriptions edited on YouTube).
function withFeed(list, feed) {
  const byId = Object.fromEntries(list.map((v) => [v.id, v]));
  for (const f of feed) {
    const old = byId[f.id];
    if (old) Object.assign(old, { title: f.title, desc: f.desc });
    else { const v = { ...f, dur: 0, views: 0, short: true }; list.push(v); byId[f.id] = v; }
  }
  return list;
}

export async function syncVideos(saved) {
  const feed = await feedVideos();
  const all = await channelVideos(saved);
  return withFeed(all.map((v) => ({ ...v })), feed);
}

async function channelVideos(saved) {
  if (!process.env.YOUTUBE_API_KEY) { console.log("YOUTUBE_API_KEY not set: using the saved video list (plus the feed)."); return saved; }
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
    console.log("YouTube API not reachable, using the saved video list (plus the feed):", e.message);
    return saved;
  }
}
