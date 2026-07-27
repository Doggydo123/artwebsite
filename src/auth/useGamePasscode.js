import { useCallback, useState } from "react";
import { APP_CONFIG } from "../config";

const SESSION_KEY = "claudis_game_session";
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

// A second, independent passcode gate for the Claude's Games tab —
// separate from the main site login, so only Claude can get past it
// even though everyone who knows the main password can see the tab
// exists.
export function useGamePasscode() {
  const [unlocked, setUnlocked] = useState(readSession);

  const unlock = useCallback(async (passcode) => {
    const hash = await sha256Hex(passcode);
    if (hash === APP_CONFIG.game.auth.passcodeHash) {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ expires: Date.now() + SESSION_TTL_MS }));
      setUnlocked(true);
      return true;
    }
    return false;
  }, []);

  const lock = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    setUnlocked(false);
  }, []);

  return { unlocked, unlock, lock };
}
