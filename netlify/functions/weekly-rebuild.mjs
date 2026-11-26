// Rebuilds the site once a week, so it re-reads the YouTube channel (titles, descriptions, dates)
// and picks up anything edited on YouTube that week. New uploads still appear within about 30 minutes
// through /api/latest, without waiting for this.
// Runs Thursdays at 12:00 UTC: 2 PM in Israel in winter, 3 PM in summer.
// Needs one setting in Netlify: BUILD_HOOK_URL = the address from Site configuration → Build & deploy → Build hooks.
export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) { console.log("BUILD_HOOK_URL is not set, skipping the weekly rebuild."); return new Response("not set", { status: 200 }); }
  const r = await fetch(hook, { method: "POST" });
  console.log("Weekly rebuild requested:", r.status);
  return new Response("ok");
};
export const config = { schedule: "0 12 * * 4" };
