import { useState } from "react";

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const ok = await onLogin(username, password);
    if (!ok) {
      setError(true);
    }
  }

  return (
    <section className="screen login-screen">
      <div className="scanlines" />
      <div className="hud-panel login-panel">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <h1 className="brand"><span className="brand-glow">J.A.R.V.I.S.</span></h1>
        <p className="brand-sub">Personal Operations Console</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span>Operator ID</span>
            <input
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </label>
          <label>
            <span>Access Code</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>
          <button type="submit" className="btn btn-primary">Authenticate</button>
          {error && <p className="login-error">ACCESS DENIED — credentials not recognized</p>}
        </form>
      </div>
    </section>
  );
}
