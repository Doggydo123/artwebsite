import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/coast-to-coast", label: "Coast to Coast" },
  { to: "/collecting", label: "Collecting" },
  { to: "/brewing", label: "Brewing" },
  { to: "/game", label: "Claude's Games" }
];

export default function TabNav({ onLogout }) {
  const [clock, setClock] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date().toLocaleTimeString()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="topbar hud-panel">
      <div className="topbar-left">
        <span className="brand-small">CLAUDIS</span>
        <span className="topbar-status">{clock}</span>
      </div>
      <nav className="tab-nav">
        {TABS.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            className={({ isActive }) => "tab-link" + (isActive ? " active" : "")}
          >
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <div className="topbar-right">
        <button className="btn btn-ghost" onClick={onLogout}>Log Out</button>
      </div>
    </header>
  );
}
