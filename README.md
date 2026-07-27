# CLAUDIS Operations Console

A private, tabbed dashboard deployed at
[doggydo123.github.io/artwebsite](https://doggydo123.github.io/artwebsite),
styled as a dark sci-fi HUD. Built with Create React App, hosted for free
on GitHub Pages via `gh-pages`.

## Tabs

- **Coast to Coast** — countdown to the March 12, 2028 departure date, plus
  training milestones.
- **Collecting** — categorized inventory dashboard (bullion, collectibles,
  wine, etc.) with add/edit/delete, search/filter, and running value
  estimates in NZD.
- **Brewing** — tracks in-progress batches (beer/cider/perry): specs (OG,
  expected FG, estimated ABV, yeast, ferment temp), a status (Pitched →
  Fermenting → Ready to bottle → Conditioning → Ready to drink), and a
  gravity-reading log per batch. Days since pitch, % through estimated
  fermentation, estimated bottling/drink-ready dates, and current ABV are
  all computed live from the latest reading you log.
- **Claude's Games** — a personal points system: log Gym sessions, Steps,
  Sleep, Pages Read, and Spending, and see them converted into a score
  using editable scoring rules. Has its own passcode on top of the main
  login (see below), so only Claude gets in.

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

### Claude's Games passcode

The Games tab has a second, independent passcode (no username) gating just
that tab, default `1234`. Once inside, there's a **"Change Passcode"**
button in the tab header — enter the current passcode plus a new one and
it takes effect immediately, no config.js edit or redeploy needed:

- If Google Sheets sync is set up (see below), the new passcode syncs
  there too, so it works from any device.
- Otherwise it's cached in that browser's `localStorage` only.

To set the *original* default (e.g. before handing the site over the
first time), edit config.js the same way as the main password:

```js
game: {
  auth: {
    passcodeHash: "<hash of the passcode, same crypto.subtle snippet as above>"
  }
}
```

## Data persistence (Collecting + Brewing + Claude's Games)

Since this is a static site, edits live in the browser's `localStorage` by
default — refreshing won't wipe them, but clearing browser data or
switching devices will. For cross-device sync, connect a Google Sheet as
the backing store — you can also just open that Sheet directly to eyeball
or bulk-edit data, and the Games tab's scoring rules can be tweaked
directly in its sheet tab too.

This uses a small Google Apps Script Web App
([google-apps-script/Code.gs](google-apps-script/Code.gs)) instead of
OAuth: once deployed, the site just calls a plain URL to read/write rows —
no Google sign-in popups, ever, because the script always runs as you. One
script + one spreadsheet serves all three tabs, each in their own sheet tabs.

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
7. Rebuild and redeploy (see below). All three tabs will show a
   **"Sheet Synced"** pill and start reading/writing rows automatically —
   no button to click.

**Updating the script later** (e.g. this repo ships a new `Code.gs`): paste
the new code into the same Apps Script project, then **Deploy → Manage
deployments** → pencil/edit icon on the existing deployment → **Version:
New version** → **Deploy**. This keeps the same `/exec` URL — creating a
new deployment instead would give you a different URL and break
`config.js`.

**Caveat:** `accessKey` is not real security — it ships in the public JS
bundle like everything else in this repo, so anyone who opens devtools on
the deployed site can read it. It only stops the URL from being stumbled
on by accident; it isn't a substitute for the login/passcode gates, which
are what actually keep casual visitors out.

The spreadsheet gets: **Items** + **Meta** (Collecting), **Brews** +
**BrewReadings** + **BrewMeta** (Brewing), and **GameEntries** +
**GameRules** + **GameMeta** (Claude's Games). Each `*Meta` sheet holds an
`updatedAt` timestamp (row 1) used to decide whether the sheet or a
browser's local copy is newer when they disagree; **GameMeta** also holds
the current passcode hash (row 2) once it's been changed in-app.

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
