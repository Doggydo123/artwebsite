import { useState, useEffect } from "react";

export default function AboutSection() {
  const [timeLeft, setTimeLeft] = useState({});

  useEffect(() => {
    const targetDate = new Date("March 12, 2028 00:00:00").getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft({
          days: 0,
          hours: 0,
          minutes: 0,
          seconds: 0,
        });
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const minutes = Math.floor(
          (difference % (1000 * 60 * 60)) / (1000 * 60)
        );
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section id="about" className="section section-about">
      <h2>Countdown Till Coast to Coast 2028</h2>
      <div className="countdown">
        <div className="countdown-box">
          {timeLeft.days} <span className="countdown-label">Days</span>
        </div>
        <div className="countdown-box">
          {timeLeft.hours} <span className="countdown-label">Hours</span>
        </div>
        <div className="countdown-box">
          {timeLeft.minutes} <span className="countdown-label">Minutes</span>
        </div>
        <div className="countdown-box">
          {timeLeft.seconds} <span className="countdown-label">Seconds</span>
        </div>
      </div>
    </section>
  );
}