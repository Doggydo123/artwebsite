import { useState } from "react";

export default function GamePasscodeScreen({ onUnlock }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onUnlock(passcode);
    if (!ok) {
      setError(true);
      setPasscode("");
    }
  }

  return (
    <div className="hud-panel panel passcode-panel">
      <span className="hud-corner tl" /><span className="hud-corner tr" />
      <span className="hud-corner bl" /><span className="hud-corner br" />
      <h2 className="panel-title">Restricted — Claude's Games</h2>
      <p className="passcode-hint">This section has its own passcode. Only Claude gets in.</p>
      <form onSubmit={handleSubmit} className="passcode-form">
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          placeholder="Passcode"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary">Unlock</button>
      </form>
      {error && <p className="login-error">Incorrect passcode</p>}
    </div>
  );
}
