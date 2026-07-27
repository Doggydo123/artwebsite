import { useCallback, useEffect, useRef, useState } from "react";
import { APP_CONFIG } from "../config";

// Optional Google Drive sync, scoped to a single JSON file this app
// creates itself ("drive.file" scope — it cannot see anything else in
// the user's Drive). If no clientId is configured, everything falls
// back to whatever local persistence the caller already has.
export function useDriveSync({ fileName, onRemoteData }) {
  const [status, setStatus] = useState("unconfigured");
  const tokenClient = useRef(null);
  const accessToken = useRef(null);
  const tokenExpiresAt = useRef(0);
  const fileId = useRef(localStorage.getItem(driveFileKey(fileName)) || null);
  const saveTimer = useRef(null);

  const isConfigured = Boolean(APP_CONFIG.google && APP_CONFIG.google.clientId);

  useEffect(() => {
    if (!isConfigured) {
      setStatus("unconfigured");
      return;
    }
    const raw = localStorage.getItem(tokenKey(fileName));
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        if (saved.expiresAt > Date.now()) {
          accessToken.current = saved.token;
          tokenExpiresAt.current = saved.expiresAt;
          setStatus("connected");
          return;
        }
      } catch {
        // ignore corrupt session
      }
    }
    setStatus("disconnected");
  }, [isConfigured, fileName]);

  const driveFetch = useCallback(async (url, options = {}) => {
    const res = await fetch(url, {
      ...options,
      headers: { ...(options.headers || {}), Authorization: `Bearer ${accessToken.current}` }
    });
    if (!res.ok) throw new Error(`Drive API ${res.status}: ${await res.text()}`);
    return res;
  }, []);

  const findRemoteFile = useCallback(async () => {
    const q = encodeURIComponent(`name='${fileName}' and trashed=false`);
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name)`);
    const json = await res.json();
    return json.files && json.files.length ? json.files[0].id : null;
  }, [driveFetch, fileName]);

  const createRemoteFile = useCallback(async (data) => {
    const boundary = "jarvis_boundary";
    const metadata = { name: fileName, mimeType: "application/json" };
    const body =
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
      `--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(data)}\r\n` +
      `--${boundary}--`;
    const res = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
      body
    });
    const json = await res.json();
    return json.id;
  }, [driveFetch, fileName]);

  const readRemoteFile = useCallback(async (id) => {
    const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
    return res.json();
  }, [driveFetch]);

  const writeRemoteFile = useCallback(async (id, data) => {
    await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
  }, [driveFetch]);

  const syncAfterConnect = useCallback(async () => {
    try {
      setStatus("syncing");
      fileId.current = fileId.current || localStorage.getItem(driveFileKey(fileName));
      if (!fileId.current) {
        fileId.current = await findRemoteFile();
      }
      if (fileId.current) {
        localStorage.setItem(driveFileKey(fileName), fileId.current);
        const remoteData = await readRemoteFile(fileId.current);
        onRemoteData(remoteData);
      } else {
        onRemoteData(null); // caller pushes current local data to create the file
      }
      setStatus("connected");
    } catch (err) {
      console.error("Drive sync failed", err);
      setStatus("error");
    }
  }, [fileName, findRemoteFile, readRemoteFile, onRemoteData]);

  const ensureTokenClient = useCallback(() => {
    if (tokenClient.current || !window.google || !isConfigured) return tokenClient.current;
    tokenClient.current = window.google.accounts.oauth2.initTokenClient({
      client_id: APP_CONFIG.google.clientId,
      scope: "https://www.googleapis.com/auth/drive.file",
      callback: async (resp) => {
        if (resp.error) {
          setStatus("error");
          return;
        }
        accessToken.current = resp.access_token;
        tokenExpiresAt.current = Date.now() + resp.expires_in * 1000;
        localStorage.setItem(tokenKey(fileName), JSON.stringify({ token: accessToken.current, expiresAt: tokenExpiresAt.current }));
        await syncAfterConnect();
      }
    });
    return tokenClient.current;
  }, [isConfigured, fileName, syncAfterConnect]);

  const connect = useCallback(() => {
    if (!isConfigured) {
      setStatus("unconfigured");
      return;
    }
    const client = ensureTokenClient();
    if (!client) return;
    const stillValid = accessToken.current && Date.now() < tokenExpiresAt.current;
    client.requestAccessToken({ prompt: stillValid ? "" : "consent" });
  }, [isConfigured, ensureTokenClient]);

  const disconnect = useCallback(() => {
    accessToken.current = null;
    tokenExpiresAt.current = 0;
    localStorage.removeItem(tokenKey(fileName));
    setStatus("disconnected");
  }, [fileName]);

  const push = useCallback((data) => {
    const connected = accessToken.current && Date.now() < tokenExpiresAt.current;
    if (!connected) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        setStatus("syncing");
        if (!fileId.current) {
          fileId.current = await createRemoteFile(data);
          localStorage.setItem(driveFileKey(fileName), fileId.current);
        } else {
          await writeRemoteFile(fileId.current, data);
        }
        setStatus("connected");
      } catch (err) {
        console.error("Drive save failed", err);
        setStatus("error");
      }
    }, 1500);
  }, [createRemoteFile, writeRemoteFile, fileName]);

  return { status, isConfigured, connect, disconnect, push };
}

function tokenKey(fileName) { return `jarvis_drive_token_${fileName}`; }
function driveFileKey(fileName) { return `jarvis_drive_file_${fileName}`; }
