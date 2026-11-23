// Newest videos from the YouTube channel feed, so the hero episode and the Reviews grid update themselves.
const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCtRykzWgIVNrF3FE5tkvOaw";
const un = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function shape(e) {
  const clean = e.title.replace(/\p{Extended_Pictographic}/gu, "").replace(/[⁠-⁯️]/g, "").replace(/📍.*$/u, "").trim();
  const name = (clean.split(/:\s*|Ep\.?\s*\d+\s*[-–:]?\s*/i).pop() || clean).trim().slice(0, 70);
  const rate = /(?:final rating|rating|ציון)[^\d]{0,14}(\d{1,2}(?:\.\d)?)/i.exec(e.desc);
  const loc = /(?:location|מיקום)\s*:?\s*([^\n]+)/i.exec(e.desc);
  const score = rate && +rate[1] <= 10 ? +rate[1] : null;
  return { id: e.id, name, place: loc ? loc[1].split(",").pop().trim().slice(0, 40) : "", score, date: e.date };
}
module.exports = async (req, res) => {
  try {
    const xml = await (await fetch(FEED)).text();
    const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => {
      const e = m[1];
      const pick = (re) => un((re.exec(e) || [])[1] || "");
      return { id: pick(/<yt:videoId>([^<]+)/), title: pick(/<title>([^<]*)/), date: pick(/<published>([^<]+)/), desc: pick(/<media:description>([\s\S]*?)<\/media:description>/) };
    }).filter((e) => e.id);
    const ep = entries.find((e) => /cholent\s*(and|&)\s*chill|\bep\.?\s*\d+/i.test(e.title)) || entries[0];
    if (!ep) throw new Error("empty feed");
    res.setHeader("Cache-Control", "public, s-maxage=1800, stale-while-revalidate=86400");
    res.status(200).json({ ...shape(ep), list: entries.slice(0, 12).map(shape) });
  } catch (err) {
    res.setHeader("Cache-Control", "public, s-maxage=300");
    res.status(200).json({ id: null, list: [] });
  }
};
