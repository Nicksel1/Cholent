# Cholent & Chill — Coming Soon

The "Something big is cooking" landing page for chillingwithchill.com.

- `index.html` — the whole page (HTML, CSS and a little JavaScript in one file).
- `netlify.toml` — tells Netlify there's nothing to build; it just serves `index.html`.

## Editing

- **Social links:** near the top of the `<script>` at the bottom of `index.html`, fill in the `LINKS` object
  (`instagram`, `youtube`, `facebook`, `whatsapp`). Empty links are hidden.
- **Text:** the headline, subtitle and button text are plain HTML in `index.html`.

## Email sign-ups

The form uses **Netlify Forms** (`data-netlify="true"`, form name `notify`).
When the site is hosted on Netlify with form detection turned on, every sign-up appears under
**Site → Forms → notify** in the Netlify dashboard, and can be downloaded as a CSV.

## Deploying

Connect this repository in Netlify (**Add new site → Import an existing project → GitHub**),
leave the build command empty, and set the publish directory to `.` (already set in `netlify.toml`).
Every push to `main` then goes live automatically.
