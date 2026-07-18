const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = "https://www.googleapis.com/auth/drive.file";
const API = "https://www.googleapis.com/drive/v3";

let tokenClient: any = null;
let gisLoaded: Promise<void> | null = null;

function loadGIS(): Promise<void> {
  if (gisLoaded) return gisLoaded;
  gisLoaded = new Promise((resolve) => {
    if ((window as any).google?.accounts?.oauth2) return resolve();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.onload = () => resolve();
    document.head.appendChild(s);
  });
  return gisLoaded;
}

export async function getAccessToken(): Promise<string> {
  await loadGIS();
  return new Promise((resolve, reject) => {
    tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (resp: any) => {
        if (resp.error) return reject(new Error(resp.error));
        resolve(resp.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });
}

async function findFolder(token: string, name: string, parentId?: string): Promise<string | null> {
  const q = `name='${name.replace(/'/g, "\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : ""}`;
  const res = await fetch(`${API}/files?q=${encodeURIComponent(q)}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return data.files?.[0]?.id || null;
}

async function createFolder(token: string, name: string, parentId?: string): Promise<string> {
  const body: any = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) body.parents = [parentId];
  const res = await fetch(`${API}/files`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return data.id;
}

async function ensureFolder(token: string, name: string, parentId?: string): Promise<string> {
  const existing = await findFolder(token, name, parentId);
  if (existing) return existing;
  return createFolder(token, name, parentId);
}

export async function uploadToDrive(
  file: File,
  year: string,
  irigationType: string,
  areaName: string,
  onProgress?: (pct: number) => void,
): Promise<{ fileId: string; fileUrl: string }> {
  const token = await getAccessToken();
  onProgress?.(10);

  const root = await ensureFolder(token, "SIDORI");
  const yearFolder = await ensureFolder(token, year, root);
  const typeFolder = await ensureFolder(token, irigationType, yearFolder);
  const areaFolder = await ensureFolder(token, areaName, typeFolder);
  onProgress?.(20);

  const metadata = JSON.stringify({ name: file.name, parents: [areaFolder] });
  const form = new FormData();
  form.append("metadata", new Blob([metadata], { type: "application/json" }));
  form.append("file", file);
  onProgress?.(30);

  const xhr = new XMLHttpRequest();
  const result = await new Promise<any>((resolve, reject) => {
    const timer = setTimeout(() => { xhr.abort(); reject(new Error("Upload timeout")); }, 300000);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(30 + Math.round((e.loaded / e.total) * 60));
    };
    xhr.onload = () => {
      clearTimeout(timer);
      if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
      else reject(new Error(`HTTP ${xhr.status}`));
    };
    xhr.onerror = () => { clearTimeout(timer); reject(new Error("Network error")); };
    xhr.open("POST", `${API}/files?uploadType=multipart`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(form);
  });
  onProgress?.(95);

  return {
    fileId: result.id,
    fileUrl: `https://drive.google.com/file/d/${result.id}/view`,
  };
}
