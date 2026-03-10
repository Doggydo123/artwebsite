import { Link } from "react-router-dom";
import { paintings } from "../data/paintings";
import Countdown from "../components/Countdown.js";

function Home() {
  return (
    <main className="site-main">
      <section id="about" className="section section-about">
        <Countdown />
{/*         <h2>About</h2>
        <p>
          Michelle is a painter based in Christchurch, working primarily
          with [oil/acrylic/watercolour] to explore themes of [light / memory /
          landscape / identity]. Her work focuses on [short, friendly
          description of style or subjects].
        </p>
        <p>
          She has exhibited in [local galleries / group shows] and creates both
          personal work and commissioned pieces.
        </p> */}
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
