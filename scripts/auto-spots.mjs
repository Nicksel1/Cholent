// Turns rated YouTube videos into locations, so a new episode shows up in the list, on the map and in Top rated
// without being added by hand. A video counts when its description has a rating and a location, e.g.
//
//   Location: HaRav Kook 12, Jerusalem
//   Final rating: 9.2/10
//
// Optional lines: "Verdict: ...", "Kashrut: ...", "Price: ...".
// Existing spots are never overwritten: a video that already belongs to a spot is skipped, and a video that matches
// an existing spot (same name or same street and number) only fills in a rating if that spot has none yet.

const RATE = /(?:final rating|rating|ציון)[^\d\n]{0,14}(\d{1,2}(?:\.\d)?)\s*(?:\/\s*10)?/i;
const LOC = /^[^\S\n]*(?:[-•*]\s*)?(?:📍\s*)?(?:location|address|מיקום|כתובת)?\s*[:：]?\s*(?:📍\s*)?[:：]?\s*(.+)$/im;
const LOC_LINE = /^.*(?:📍|location\s*[:：]|address\s*[:：]|מיקום\s*[:：]|כתובת\s*[:：]).*$/im;
const line = (desc, re) => (re.exec(desc) || [])[1]?.trim() || "";

export function parseVideo(v) {
  const desc = String(v.desc || "");
  const rate = RATE.exec(desc);
  const locLine = (LOC_LINE.exec(desc) || [])[0] || "";
  if (!rate || !locLine) return null;
  const score = +rate[1];
  if (!(score > 0 && score <= 10)) return null;
  const address = (LOC.exec(locLine) || [])[1]?.replace(/^[\s:：\-–📍]+/u, "").replace(/\s+/g, " ").trim().slice(0, 160) || "";
  if (address.length < 4) return null;
  const title = String(v.title || "").replace(/\p{Extended_Pictographic}/gu, "").replace(/[⁠-⁯️]/g, "");
  const ep = (/S(\d+)\s*Ep\.?\s*(\d+)/i.exec(title) || []).slice(1);
  const epOnly = /\bEp\.?\s*(\d+)/i.exec(title);
  const name = title
    .replace(/cholent\s*(?:and|&|n)\s*chill/gi, "")
    .replace(/^\s*rated\s*[-–:]\s*/i, "")
    .replace(/S\d+\s*Ep\.?\s*\d+\s*[-–:]?/gi, "").replace(/\bEp\.?\s*\d+\s*[-–:]?/gi, "")
    .replace(/^[\s\-–:|]+|[\s\-–:|]+$/g, "").replace(/\s{2,}/g, " ").trim().slice(0, 70);
  if (!name) return null;
  return {
    name, address, score,
    city: address.split(",").pop().trim(),
    verdict: line(desc, /^(?:verdict|in short|בקיצור)\s*[:：]\s*(.+)$/im).slice(0, 240),
    kosher: line(desc, /^(?:kashrut|hechsher|kosher|כשרות|השגחה)\s*[:：]\s*(.+)$/im).slice(0, 100),
    price: line(desc, /^(?:price|prices|מחיר)\s*[:：]\s*(.+)$/im).slice(0, 80),
    ep: ep.length ? `S${ep[0]} Ep ${ep[1]}` : epOnly ? `Ep ${epOnly[1]}` : "",
  };
}

const normName = (s) => String(s || "").toLowerCase().normalize("NFKD").replace(/[֑-ׇ]/g, "").replace(/^(the|ha)\s*/, "").replace(/[^\p{L}\p{N}]/gu, "");
// "HaShaked 69, Beit Meir" -> "hashaked69"
const streetKey = (a) => { const m = /([\p{L}'"״׳.\- ]{2,}?)\s+(\d+)/u.exec(String(a || "")); return m ? normName(m[1]).slice(-8) + m[2] : ""; };

// distance in km between two { lat, lng }
const km = (a, b) => { const R = 6371, r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLng = (b.lng - a.lng) * r; const x = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(x)); };

/**
 * @param videos   the channel's videos [{ id, title, desc, date }]
 * @param spots    the site's spots so far (each may have .review with .video and .score)
 * @param skip     (videoId) => true for hidden videos
 * @param geocode  async (query) => { lat, lng, placeId, address } | null
 * @param cityOf   (address, fallback) => city name used by the site
 * @returns { added: [review], filled: [spot] } — reviews to add to the site, and existing spots that got a rating
 */
export async function autoSpots({ videos, spots, skip, geocode, cityOf, visitOf }) {
  const linked = new Set(spots.map((s) => s.review?.video).filter(Boolean));
  const added = [], filled = [];
  for (const v of videos) {
    if (linked.has(v.id) || skip(v.id)) continue;
    const p = parseVideo(v);
    if (!p) continue;
    const key = streetKey(p.address), nm = normName(p.name);
    const g = await geocode(`${p.address}${/israel|ישראל/i.test(p.address) ? "" : ", Israel"}`).catch(() => null);
    // Same place if: same name, same street and number, same Google place, or a spot he already rated that is within
    // 50 m, or within 300 m with the same score (a re-upload of the same review, e.g. a Hebrew version).
    // Distance never merges into an unrated spot: two different shops can be next door to each other.
    const match = spots.find((s) => (nm.length >= 3 && [s.en, s.name, s.review?.name].some((x) => normName(x) === nm)) || (key && streetKey(s.address) === key) || (g?.placeId && s.placeId === g.placeId))
      || (g && spots.find((s) => s.review?.kind === "review" && s.lat && (km(s, g) < 0.05 || (km(s, g) < 0.3 && Math.abs((s.review.score ?? -9) - p.score) < 0.05))));
    if (match && match.review?.kind === "review") { linked.add(v.id); continue; } // already rated: keep his existing review
    const date = visitOf(v.id) || `${v.date.slice(0, 4)}-${v.date.slice(4, 6)}-${v.date.slice(6, 8)}`;
    const r = { id: "yt-" + v.id, name: p.name, place: cityOf(p.address, p.city), score: p.score, verdict: p.verdict, video: v.id, date, ep: p.ep, price: p.price, kosher: p.kosher, address: p.address, auto: true };
    if (g && !match?.lat) { r.lat = g.lat; r.lng = g.lng; r.placeId = g.placeId; }
    if (match) filled.push(match);
    added.push({ review: r, spot: match || null });
    linked.add(v.id);
  }
  return { added, filled };
}
