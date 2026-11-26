// Rebuilds the site once a day, so a new YouTube episode (and Google Sheet edits) show up on their own.
// Needs one setting in Netlify: BUILD_HOOK_URL = the address from Site configuration → Build & deploy → Build hooks.
export default async () => {
  const hook = process.env.BUILD_HOOK_URL;
  if (!hook) { console.log("BUILD_HOOK_URL is not set, skipping the daily rebuild."); return new Response("not set", { status: 200 }); }
  const r = await fetch(hook, { method: "POST" });
  console.log("Daily rebuild requested:", r.status);
  return new Response("ok");
};
export const config = { schedule: "@daily" };
