import { HashRouter as Router, Routes, Route } from "react-router-dom";
import "./App.css";
import Header from "./components/Header";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import Contact from "./pages/Contact";
import ArtworkDetail from "./pages/ArtworkDetail";

function App() {
  return (
    <Router>
      <div className="site">
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/artwork/:id" element={<ArtworkDetail />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
