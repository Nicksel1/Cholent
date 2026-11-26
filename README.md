# Cholent & Chill

The cholent directory site. Static pages plus two small server functions.

## Run it on Netlify

1. In Netlify: **Add new site → Import an existing project → GitHub →** this repo.
2. Leave the settings as they are (they come from `netlify.toml`: build `node scripts/build.mjs`, publish `dist`).
3. Deploy. Then open `/admin` on the new site and create a passcode. Nothing else to set up.

Storage for the admin page is Netlify Blobs, which is built in.

## Admin

`/admin` (also linked at the bottom of every page).

- **Locations:** every location, with edit, remove and restore.
- **Add location / Add review:** score, verdict and YouTube link update the list, the map and Top rated straight away.
- **Settings:** change the passcode.

"This week's episode" and the Reviews grid read the YouTube channel feed, so they update when a video is posted.

## Where things are

- `src/data/listings.json` the original locations. `src/data/reviews.mjs` scores and verdicts. `src/data/names-en.mjs` English spellings for search.
- `scripts/build.mjs` builds `dist/`. `scripts/og.mjs` re-renders the share images (needs Chrome and ffmpeg, only when a rated location changes).
- `netlify/functions/` the two server functions (`/api/data` for the admin, `/api/latest` for the YouTube feed). `api/` holds the same two for Vercel.
- The Google Maps key in `scripts/build.mjs` is the one from the original site. It loads listing photos in the browser.

## Note

`index.html` in this folder is the old "coming soon" page. GitHub Pages still serves it. Netlify ignores it and serves the built site from `dist/`.

## YouTube sync (weekly)

The Reviews strip and the review dates use the channel's videos. With `YOUTUBE_API_KEY` set in Netlify
(a Google Cloud API key restricted to "YouTube Data API v3"), every build reads the whole channel fresh:
titles, descriptions and upload dates, so edits made on YouTube show after the next build.
Without the key the saved list in `src/data/videos-raw.json` is used. Code: `scripts/youtube.mjs`.

A review's date is the filming date written in its video's description (e.g. "February 5th, 2025" or
"5.2.2025"), otherwise the upload date.

`netlify/functions/weekly-rebuild.mjs` rebuilds the site every Thursday at 12:00 UTC (2 PM Israel in winter,
3 PM in summer). It needs `BUILD_HOOK_URL` in Netlify (Site configuration → Build & deploy → Build hooks).
New uploads don't wait for it: "This week's episode" and the start of the Reviews strip check YouTube's feed
about every 30 minutes.

## Locations from YouTube (automatic)

Every build reads the channel (see "YouTube sync") and turns rated videos into locations. A video counts when
its description has a rating and a location, for example:

    📍 Location: HaRav Kook 12, Jerusalem
    Final rating: 9.2/10

Optional lines: `Verdict: ...`, `Kashrut: ...`, `Price: ...`. Hebrew works too (`📍 רבי עקיבא 19, ביתר עילית`, `ציון: 8.5/10`).
The map pin comes from Google (using the address); these spots show "from YouTube, check the pin" in `/admin`.

Existing spots are never overwritten. A video that already belongs to a spot is skipped. A video matching an
existing spot (same name, same street and number, same Google place, or a rated spot within 50 m, or within 300 m
with the same score) only adds a rating to a spot that has none. Hidden videos are skipped.

The 30-minute YouTube check (`/api/latest`) starts a rebuild when it sees a new rated video that isn't a location
yet, at most once every 6 hours. `/admin` → Settings → "Update from YouTube now" rebuilds right away.
Code: `scripts/auto-spots.mjs`.
