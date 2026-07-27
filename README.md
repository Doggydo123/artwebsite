# J.A.R.V.I.S. Operations Console

A private, tabbed dashboard deployed at
[doggydo123.github.io/artwebsite](https://doggydo123.github.io/artwebsite),
styled as a dark sci-fi HUD. Built with Create React App, hosted for free
on GitHub Pages via `gh-pages`.

## Tabs

- **Coast to Coast** — countdown to the March 12, 2028 departure date, plus
  training milestones.
- **Collecting** — categorized inventory dashboard (bullion, collectibles,
  wine, etc.) with add/edit/delete, search/filter, and running value
  estimates.
- **Claude's Game System** — placeholder for a points system (pages read,
  fitness, etc.) — scoring rules aren't defined yet.

## Login gate

A username + access code gate sits in front of all three tabs. It's a
client-side speed bump, not real security — there's nothing sensitive
behind it, it just keeps casual visitors out.

Default login is `admin` / `changeme` — **change this before sharing the
link.**

1. Open the site, press F12 for devtools → Console tab, and run (replacing
   `yourpassword`):
   ```js
   crypto.subtle.digest("SHA-256", new TextEncoder().encode("yourpassword"))
     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
   ```
2. Copy the printed hex string into [src/config.js](src/config.js):
   ```js
   auth: {
     username: "yourusername",
     passwordHash: "<paste the hex string here>"
   }
   ```

## Data persistence (Collecting tab)

Since this is a static site, edits live in the browser's `localStorage` by
default — refreshing won't wipe them, but clearing browser data or
switching devices will. For cross-device sync, connect a Google Sheet as
the backing store — you can also just open that Sheet directly to eyeball
or bulk-edit your data.

This uses a small Google Apps Script Web App
([google-apps-script/Code.gs](google-apps-script/Code.gs)) instead of
OAuth: once deployed, the site just calls a plain URL to read/write rows —
no Google sign-in popups, ever, because the script always runs as you.

**Setup (about 5 minutes, one time):**

1. Create a new Google Sheet (sheets.new).
2. **Extensions → Apps Script**. Delete the placeholder code and paste in
   the full contents of [google-apps-script/Code.gs](google-apps-script/Code.gs).
3. **Project Settings** (gear icon, left sidebar) → **Script Properties**
   → **Add script property**: name `ACCESS_KEY`, value any long random
   string (e.g. run `crypto.randomUUID()` in a browser console to generate
   one, or make one up). This is what stops randos from finding the URL
   and writing to your sheet — see the caveat below.
4. Back in the script editor: **Deploy → New deployment** → gear icon →
   **Web app**. Set **Execute as: Me**, **Who has access: Anyone**. Deploy,
   and authorize it (it's your own script, acting on your own sheet).
5. Copy the **Web app URL** (ends in `/exec`).
6. Paste both values into [src/config.js](src/config.js):
   ```js
   sheets: {
     webAppUrl: "https://script.google.com/macros/s/XXXXXXX/exec",
     accessKey: "the-same-string-you-put-in-Script-Properties"
   }
   ```
7. Rebuild and redeploy (see below). The Collecting tab will show a
   **"Sheet Synced"** pill and start reading/writing rows automatically —
   no button to click.

**Caveat:** `accessKey` is not real security — it ships in the public JS
bundle like everything else in this repo, so anyone who opens devtools on
the deployed site can read it. It only stops the URL from being stumbled
on by accident; it isn't a substitute for the login gate, which is what
actually keeps casual visitors out.

The sheet gets two tabs: **Items** (one row per entry) and **Meta** (a
single `updatedAt` timestamp used to decide whether the sheet or a
browser's local copy is newer when they disagree).

## Local development

```sh
npm install
npm start
```

Opens at `http://localhost:3000`.

## Deploying

```sh
npm run build
npm run deploy
```

`npm run deploy` (via `gh-pages`) pushes the production build to the
`gh-pages` branch, which is what GitHub Pages serves from for this repo.
