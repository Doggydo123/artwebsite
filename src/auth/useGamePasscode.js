import { useCallback, useState } from "react";
import { APP_CONFIG } from "../config";
import { sha256Hex } from "../lib/hash";

const SESSION_KEY = "claudis_game_session";
// Locally cached override so a passcode change works even without Sheets
// sync configured, and as a fast fallback if the Sheet fetch fails.
const OVERRIDE_KEY = "claudis_game_passcode_override";
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

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

async function fetchRemotePasscodeHash() {
  const { webAppUrl, accessKey } = APP_CONFIG.sheets || {};
  if (!webAppUrl || !accessKey) return null;
  try {
    const res = await fetch(`${webAppUrl}?key=${encodeURIComponent(accessKey)}&resource=game`);
    const json = await res.json();
    return json.passcodeHash || null;
  } catch {
    return null;
  }
}

// The passcode currently in effect: whatever's stored in the Sheet (synced
// across devices) takes priority, then a locally-cached override, then the
// hardcoded default in config.js.
async function effectivePasscodeHash() {
  const remote = await fetchRemotePasscodeHash();
  if (remote) return remote;
  const local = localStorage.getItem(OVERRIDE_KEY);
  if (local) return local;
  return APP_CONFIG.game.auth.passcodeHash;
}

export function useGamePasscode() {
  const [unlocked, setUnlocked] = useState(readSession);

  const unlock = useCallback(async (passcode) => {
    const hash = await sha256Hex(passcode);
    const expected = await effectivePasscodeHash();
    if (hash === expected) {
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

// Called from inside the unlocked dashboard's "Change Passcode" form.
// Returns { ok: true, newHash } on success (caller is responsible for
// syncing newHash into the persisted game data so it reaches the Sheet),
// or { ok: false, error } if the current passcode didn't match.
export async function changeGamePasscode(currentPasscode, newPasscode) {
  const enteredHash = await sha256Hex(currentPasscode);
  const expected = await effectivePasscodeHash();
  if (enteredHash !== expected) {
    return { ok: false, error: "Current passcode is incorrect." };
  }
  const newHash = await sha256Hex(newPasscode);
  localStorage.setItem(OVERRIDE_KEY, newHash);
  return { ok: true, newHash };
}
