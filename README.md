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
switching devices will. For cross-device sync, connect Google Drive:

1. [Google Cloud Console](https://console.cloud.google.com/) → new project
   → **APIs & Services → Enabled APIs** → enable **Google Drive API**.
2. **OAuth consent screen** → External → fill in app name/email → leave in
   "Testing" mode and add your own Google account as a test user.
3. **Credentials → Create Credentials → OAuth client ID** → Web
   application → **Authorized JavaScript origins**:
   `https://doggydo123.github.io` (and `http://localhost:3000` for local
   testing) → copy the Client ID.
4. Paste it into [src/config.js](src/config.js):
   ```js
   google: {
     clientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
     driveFileName: "jarvis-collecting-data.json"
   }
   ```
5. Rebuild and redeploy. A **"Connect Drive Sync"** button appears on the
   Collecting tab — it uses the restrictive `drive.file` scope, so the app
   can only ever see the one JSON file it creates, nothing else in your
   Drive.

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
