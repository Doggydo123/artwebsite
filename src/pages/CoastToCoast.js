import { useEffect, useState } from "react";

const TARGET_DATE = new Date("March 12, 2028 00:00:00").getTime();

const MILESTONES = ["Kayaking", "Running", "Cycling"];

function getTimeLeft() {
  const diff = TARGET_DATE - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000)
  };
}

export default function CoastToCoast() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft);

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 className="page-title">Coast to Coast 2028</h1>
      <p className="c2c-tagline">Claude &middot; Dominic &middot; kayaker TBD</p>

      <section className="hud-panel panel">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <h2 className="panel-title">Countdown to Departure</h2>
        <div className="countdown">
          <div className="countdown-box"><strong>{timeLeft.days}</strong><span>Days</span></div>
          <div className="countdown-box"><strong>{timeLeft.hours}</strong><span>Hours</span></div>
          <div className="countdown-box"><strong>{timeLeft.minutes}</strong><span>Minutes</span></div>
          <div className="countdown-box"><strong>{timeLeft.seconds}</strong><span>Seconds</span></div>
        </div>
      </section>

      <section className="hud-panel panel">
        <span className="hud-corner tl" /><span className="hud-corner tr" />
        <span className="hud-corner bl" /><span className="hud-corner br" />
        <h2 className="panel-title">Training Milestones</h2>
        <ul className="milestone-list">
          {MILESTONES.map((m) => (
            <li key={m} className="milestone-item">{m}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
