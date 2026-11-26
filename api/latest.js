// Newest videos from the YouTube channel feed, so the hero episode and the Reviews grid update themselves.
const FEED = "https://www.youtube.com/feeds/videos.xml?channel_id=UCtRykzWgIVNrF3FE5tkvOaw";
// The day he was there, when the description says it (e.g. "February 5th, 2025", "5.2.2025", "5 בפברואר 2025").
// Returns "YYYY-MM-DD", or "" when the description has no date. Scores like "9.3/10" are not dates.
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
  "ינואר": 1, "פברואר": 2, "מרץ": 3, "מרס": 3, "אפריל": 4, "מאי": 5, "יוני": 6, "יולי": 7, "אוגוסט": 8, "ספטמבר": 9, "אוקטובר": 10, "נובמבר": 11, "דצמבר": 12 };
const EN = "(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|june?|july?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\\.?";
const HE = "ב?-?(ינואר|פברואר|מרץ|מרס|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר)";
const DATE_RES = [
  [new RegExp(`\\b${EN}\\s+(\\d{1,2})(?:st|nd|rd|th)?,?\\s+(20\\d\\d)\\b`, "i"), (m) => [m[3], MONTHS[m[1].slice(0, 3).toLowerCase()], m[2]]],
  [new RegExp(`\\b(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?${EN},?\\s+(20\\d\\d)\\b`, "i"), (m) => [m[3], MONTHS[m[2].slice(0, 3).toLowerCase()], m[1]]],
  [new RegExp(`(?:^|[^\\d])(\\d{1,2})\\s+${HE},?\\s+(20\\d\\d)`), (m) => [m[3], MONTHS[m[2]], m[1]]],
  [/(?:^|[^\d.\/])(\d{1,2})[.\/-](\d{1,2})[.\/-](20\d\d)(?![\d])/, (m) => [m[3], m[2], m[1]]], // Israeli order: day.month.year
];
function visitDate(desc) {
  const s = String(desc || "");
  for (const [re, parts] of DATE_RES) {
    const m = re.exec(s);
    if (!m) continue;
    const [y, mo, d] = parts(m).map(Number);
    const dt = new Date(Date.UTC(y, mo - 1, d));
    if (!mo || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d || dt > new Date() || y < 2020) continue;
    return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return "";
}
const un = (s) => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function shape(e) {
  const clean = e.title.replace(/\p{Extended_Pictographic}/gu, "").replace(/[⁠-⁯️]/g, "").replace(/📍.*$/u, "").trim();
  const name = (clean.split(/:\s*|Ep\.?\s*\d+\s*[-–:]?\s*/i).pop() || clean).trim().slice(0, 70);
  const rate = /(?:final rating|rating|ציון)[^\d]{0,14}(\d{1,2}(?:\.\d)?)/i.exec(e.desc);
  const loc = /(?:location|מיקום)\s*:?\s*([^\n]+)/i.exec(e.desc);
  const score = rate && +rate[1] <= 10 ? +rate[1] : null;
  return { id: e.id, name, place: loc ? loc[1].split(",").pop().trim().slice(0, 40) : "", score, date: e.date, visited: visitDate(e.desc) };
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
module.exports.visitDate = visitDate;
