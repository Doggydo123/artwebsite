import { Link } from "react-router-dom";
import { paintings } from "../data/paintings";
import Countdown from "../components/Countdown.js";

function Home() {
  return (
    <main className="site-main">
      <section id="about" className="section section-about">
        <Countdown />
       <h2>Miletstones</h2>
        <p>
          -Kayaking

          -Running

          -Cycling
        </p>
      </section>
      {/* 
      <section id="gallery" className="section section-gallery">
        <h2>Featured Works</h2>
        <div className="gallery-grid">
          {paintings.slice(0, 3).map((piece, index) => (
            <Link
              to={`/artwork/${piece.id}`}
              className="gallery-item"
              key={index}
            >
              <div className="gallery-image-wrapper">
                <img
                  src={piece.image}
                  alt={piece.title}
                  className="gallery-image"
                />
              </div>
              <div className="gallery-meta">
                <h3>{piece.title}</h3>
                <p className="gallery-meta-line">
                  {piece.year} · {piece.medium}
                </p>
                <p className="gallery-meta-line">{piece.size}</p>
              </div>
            </Link>
          ))}
        </div>
        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link to="/gallery" className="artwork-nav-link">
            View All Works →
          </Link>
        </div>
      </section> */}
    </main>
  );
}

export default Home;
