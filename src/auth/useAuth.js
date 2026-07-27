import { useCallback, useState } from "react";
import { APP_CONFIG } from "../config";

const SESSION_KEY = "jarvis_session";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function readSession() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    return Date.now() < session.expires;
  } catch {
    return false;
  }
}

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(readSession);

  const login = useCallback(async (username, password) => {
    const hash = await sha256Hex(password);
    const cfg = APP_CONFIG.auth;
    if (username === cfg.username && hash === cfg.passwordHash) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ expires: Date.now() + SESSION_TTL_MS }));
      setIsAuthenticated(true);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
  }, []);

  return { isAuthenticated, login, logout };
}
