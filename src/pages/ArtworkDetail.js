import { useParams, Link, Navigate } from "react-router-dom";
import { paintings } from "../data/paintings";

function ArtworkDetail() {
  const { id } = useParams();
  const artwork = paintings.find((p) => p.id === id);

  if (!artwork) {
    return <Navigate to="/gallery" replace />;
  }

  const currentIndex = paintings.findIndex((p) => p.id === id);
  const prevArtwork = currentIndex > 0 ? paintings[currentIndex - 1] : null;
  const nextArtwork =
    currentIndex < paintings.length - 1 ? paintings[currentIndex + 1] : null;

  return (
    <main className="site-main">
      <section className="section artwork-detail">
        <div className="artwork-detail-container">
          <div className="artwork-detail-image">
            <img src={artwork.image} alt={artwork.title} />
          </div>
          <div className="artwork-detail-info">
            <h1>{artwork.title}</h1>
            <div className="artwork-detail-meta">
              <p>
                <strong>Year:</strong> {artwork.year}
              </p>
              <p>
                <strong>Medium:</strong> {artwork.medium}
              </p>
              <p>
                <strong>Size:</strong> {artwork.size}
              </p>
            </div>
            {artwork.description && (
              <p className="artwork-description">{artwork.description}</p>
            )}
            <div className="artwork-navigation">
              {prevArtwork && (
                <Link
                  to={`/artwork/${prevArtwork.id}`}
                  className="artwork-nav-link"
                >
                  ← Previous
                </Link>
              )}
              <Link to="/gallery" className="artwork-nav-link">
                Back to Gallery
              </Link>
              {nextArtwork && (
                <Link
                  to={`/artwork/${nextArtwork.id}`}
                  className="artwork-nav-link"
                >
                  Next →
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default ArtworkDetail;
