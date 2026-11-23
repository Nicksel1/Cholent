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
