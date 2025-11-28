import { Link } from "react-router-dom";
import { paintings } from "../data/paintings";

function Gallery() {
  return (
    <main className="site-main">
      <section id="gallery" className="section section-gallery">
        <h2>Selected Works</h2>
        <div className="gallery-grid">
          {paintings.map((piece, index) => (
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
      </section>
    </main>
  );
}

export default Gallery;
