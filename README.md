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

## Google Sheet (optional, recommended)

The location list can live in a Google Sheet: **Cholent & Chill – Locations** in Nechemiah's Google Drive.
When it is connected, the site and the admin page both use it:

- Edit a row, add a row, or put **yes** in **Hidden** in the Sheet, and the site shows it within about a minute. No rebuild needed.
- Changes made in `/admin` are written into the Sheet, so the Sheet is always the full list.
- Rows are never deleted by the site. Removing a location in `/admin` sets **Hidden** to yes; clear it to bring the location back.
- Column headers are matched by name, so you can reorder columns or add your own. Keep the **ID** column as it is: it links each row to its page on the site.
- The admin passcode stays in Netlify Blobs, as before.

To connect it, add two environment variables in Netlify (Site configuration → Environment variables), then redeploy:

| Name | Value |
|---|---|
| `GOOGLE_SHEET_ID` | `1TAmE5lyy-qGNuK6pQAS0roEFs16SFRv21hVCgIABXHU` |
| `GOOGLE_SERVICE_ACCOUNT` | The whole JSON key file of a Google Cloud service account that has the Google Sheets API enabled |

Then share the Sheet (Share button) with the service account's email address (the `client_email` in the key file) as **Editor**.

Without these two settings the site works exactly as before and keeps its admin changes in Netlify Blobs.
The code is in `lib/sheet.mjs` and `netlify/functions/data.mjs`.

## Daily rebuild

`netlify/functions/daily-rebuild.mjs` rebuilds the site once a day so the newest YouTube episode is built into the homepage.
It needs `BUILD_HOOK_URL` set in Netlify (create one under Site configuration → Build & deploy → Build hooks).
