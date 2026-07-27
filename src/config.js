// ============================================================
// Public, client-side config — do not put real secrets here.
// This is a speed-bump login gate, not real security.
// ============================================================
export const APP_CONFIG = {
  auth: {
    username: "admin",
    // SHA-256 hex digest of the access code. Default code is "changeme".
    // To set your own: open devtools console on the deployed site and run:
    //   crypto.subtle.digest("SHA-256", new TextEncoder().encode("yourpassword"))
    //     .then(b => console.log([...new Uint8Array(b)].map(x => x.toString(16).padStart(2,"0")).join("")))
    // then paste the printed hex string in below.
    passwordHash: "057ba03d6c44104863dc7361fe4578965d1887360f90a0895882e58a6248fc86"
  },

  // Optional: Google Drive sync for the Collecting tab. Leave clientId
  // empty to disable the "Connect Drive Sync" button — the tab still
  // works fine on the browser's local storage alone. See README.md.
  google: {
    clientId: "",
    driveFileName: "jarvis-collecting-data.json"
  }
};
