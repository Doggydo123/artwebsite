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

  // Optional: Google Sheets sync for the Collecting, Brewing, and
  // Claude's Games tabs, all backed by the Apps Script in
  // google-apps-script/Code.gs. Leave webAppUrl empty to stay on
  // local-storage-only — every tab still works fine without it.
  // See README.md for the deployment steps.
  sheets: {
    // The /exec URL you get after deploying the Apps Script as a Web App.
    webAppUrl: "https://script.google.com/macros/s/AKfycbyAAVZTKjYGLBCsLflr0Rlt3JTuVTFI9jXlYN2Z1NKgLzfv8aR8p7mK0av_cLRm94yN/exec",
    // Must exactly match the ACCESS_KEY script property you set in the
    // Apps Script project. This is not a real secret — it ships in the
    // public JS bundle like everything else here — it just keeps the
    // sync endpoint from being casually stumbled on.
    accessKey: "claudesaho3"
  },

  // Claude's Games tab has its own passcode gate on top of the main
  // login, so only Claude gets in even though everyone gets past the
  // front door. Default passcode is "1234" — change it the same way as
  // the main password (see auth.passwordHash above), just hash whatever
  // passcode you want and paste it in here.
  game: {
    auth: {
      passcodeHash: "03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4"
    }
  }
};
