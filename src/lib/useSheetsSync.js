import { useCallback, useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "../config";

// Optional Google Sheets sync, backed by the Apps Script Web App in
// google-apps-script/Code.gs. No OAuth popups — the script runs as its
// owner, so the site just calls a plain URL. Pulls the sheet once on
// mount (comparing updatedAt against the local copy) and pushes edits
// back, debounced.
//
// `resource` picks which sheet(s) the Apps Script reads/writes
// ("collecting" or "game") — see Code.gs. `push(payload)` sends
// whatever shape that resource needs (e.g. { items, updatedAt } or
// { entries, rules, updatedAt }); it's forwarded to the script as-is
// alongside the key and resource.
export function useSheetsSync({ resource = "collecting", onRemoteData }) {
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
        const url = `${webAppUrl}?key=${encodeURIComponent(accessKey)}&resource=${encodeURIComponent(resource)}`;
        const res = await fetch(url);
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
  }, [isConfigured, webAppUrl, accessKey, resource]);

  const push = useCallback((payload) => {
    if (!isConfigured) return;
    clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(async () => {
      try {
        setStatus("syncing");
        const res = await fetch(webAppUrl, {
          method: "POST",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify({ key: accessKey, resource, ...payload })
        });
        const json = await res.json();
        if (json.error) throw new Error(json.error);
        setStatus("synced");
      } catch (err) {
        console.error("Sheet save failed", err);
        setStatus("error");
      }
    }, 1500);
  }, [isConfigured, webAppUrl, accessKey, resource]);

  return { status, isConfigured, push };
}
