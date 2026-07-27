import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import { useAuth } from "./auth/useAuth";
import LoginScreen from "./auth/LoginScreen";
import TabNav from "./components/TabNav";
import CoastToCoast from "./pages/CoastToCoast";
import Collecting from "./pages/Collecting";
import Brewing from "./pages/Brewing";
import Running from "./pages/Running";
import GameSystem from "./pages/GameSystem";

function App() {
  const { isAuthenticated, login, logout } = useAuth();

  if (!isAuthenticated) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <Router>
      <div className="app-shell">
        <div className="scanlines" />
        <TabNav onLogout={logout} />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/coast-to-coast" replace />} />
            <Route path="/coast-to-coast" element={<CoastToCoast />} />
            <Route path="/collecting" element={<Collecting />} />
            <Route path="/brewing" element={<Brewing />} />
            <Route path="/running" element={<Running />} />
            <Route path="/game" element={<GameSystem />} />
            <Route path="*" element={<Navigate to="/coast-to-coast" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
