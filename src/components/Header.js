import { Link, useLocation } from "react-router-dom";

function Header() {
  const location = useLocation();

  return (
    <header className="site-header">
      <Link to="/" className="profile">
        <img
          src="/profileii.jpeg"
          alt="Portrait"
          className="profile-image"
        />
        <div>
          <h1 className="artist-name">Coast To Coast 2028</h1>
          <p className="artist-tagline">Claude · Dominic · kayaker TBD</p>
        </div>
      </Link>
      <nav className="site-nav">
       {/*  <Link to="/" className={location.pathname === "/" ? "active" : ""}>
          About
        </Link>
        <Link
          to="/gallery"
          className={location.pathname === "/gallery" ? "active" : ""}
        >
          Gallery
        </Link>
        <Link
          to="/contact"
          className={location.pathname === "/contact" ? "active" : ""}
        >
          Contact
        </Link> */}
      </nav>
    </header>
  );
}

export default Header;
