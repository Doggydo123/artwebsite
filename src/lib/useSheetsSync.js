import { useCallback, useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "../config";

// Optional Google Sheets sync, backed by the Apps Script Web App in
// google-apps-script/Code.gs. No OAuth popups — the script runs as its
// owner, so the site just calls a plain URL. Pulls the sheet once on
// mount (comparing updatedAt against the local copy) and pushes edits
// back, debounced.
export function useSheetsSync({ onRemoteData }) {
  const { webAppUrl, accessKey } = APP_CONFIG.sheets || {};
  const isConfigured = Boolean(webAppUrl && accessKey);
  const [status, setStatus] = useState(isConfigured ? "loading" : "unconfigured");
  const pushTimer = useRef(null);

  useEffect(() => {
    if (!isConfigured) return;
    let cancelled = false;
    (async () => {
      try {
        setStatus("loading");
        const res = await fetch(`${webAppUrl}?key=${encodeURIComponent(accessKey)}`);
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        if (!cancelled) {
          onRemoteData(json);
          setStatus("synced");
        }
      } catch (err) {
        console.error("Sheet load failed", err);
        if (!cancelled) setStatus("error");
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConfigured, webAppUrl, accessKey]);

  const push = useCallback((data) => {
    if (!isConfigured) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        setStatus("syncing");
        const res = await fetch(webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: accessKey, items: data.items, updatedAt: data.updatedAt })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setStatus("synced");
      } catch (err) {
        console.error("Sheet save failed", err);
        setStatus("error");
      }
    }, 1500);
  }, [isConfigured, webAppUrl, accessKey]);

  return { status, isConfigured, push };
}
