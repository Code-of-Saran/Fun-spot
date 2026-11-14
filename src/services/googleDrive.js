/**
 * FUN SPOT — LOOK A LIKE: Google Drive Integration Service
 * Manages authorization, dedicated "Fun Spot - Look A Like" folder discovery/creation,
 * and multipart image upload.
 */

const FOLDER_NAME = 'Fun Spot - Look A Like';
const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const STORAGE_KEY_TOKEN = 'funspot_gdrive_access_token';
const STORAGE_KEY_EXPIRY = 'funspot_gdrive_token_expiry';

/**
 * Checks if a cached Google OAuth access token is valid.
 */
export function getSavedAccessToken() {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    const expiry = localStorage.getItem(STORAGE_KEY_EXPIRY);
    if (!token) return null;
    if (expiry && Date.now() > Number(expiry)) {
      clearSavedToken();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function saveAccessToken(token, expiresInSeconds = 3600) {
  try {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    localStorage.setItem(STORAGE_KEY_EXPIRY, String(Date.now() + (expiresInSeconds - 60) * 1000));
  } catch {
    // ignore storage quotas
  }
}

export function clearSavedToken() {
  try {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
    localStorage.removeItem(STORAGE_KEY_EXPIRY);
  } catch {
    // ignore
  }
}

/**
 * Loads the Google Identity Services (GIS) client script dynamically if needed.
 */
export function loadGoogleIdentityServices() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }
    const existing = document.getElementById('google-gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google?.accounts?.oauth2));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'google-gsi-client';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google?.accounts?.oauth2);
    script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
    document.head.appendChild(script);
  });
}

/**
 * Requests OAuth2 token from Google via popup prompt using GIS.
 *
 * @param {string} clientId - Google OAuth Client ID (optional, defaults to VITE_GOOGLE_CLIENT_ID)
 * @returns {Promise<string>} Access token
 */
export async function requestGoogleDriveAuth(clientId = null) {
  const activeClientId = clientId || import.meta.env.VITE_GOOGLE_CLIENT_ID;
  if (!activeClientId) {
    throw new Error('Google Client ID is not configured. Set VITE_GOOGLE_CLIENT_ID or provide an Access Token.');
  }

  const oauth2 = await loadGoogleIdentityServices();
  if (!oauth2) {
    throw new Error('Google Identity Services unavailable.');
  }

  return new Promise((resolve, reject) => {
    try {
      const client = oauth2.initTokenClient({
        client_id: activeClientId,
        scope: SCOPE,
        callback: (response) => {
          if (response?.error) {
            reject(new Error(response.error_description || response.error));
            return;
          }
          if (response?.access_token) {
            saveAccessToken(response.access_token, response.expires_in || 3600);
            resolve(response.access_token);
          } else {
            reject(new Error('No access token returned from Google.'));
          }
        },
      });
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Finds or creates the "Fun Spot - Look A Like" folder in Google Drive.
 *
 * @param {string} accessToken
 * @returns {Promise<string>} Folder ID
 */
export async function getOrCreateLookALikeFolder(accessToken) {
  const q = `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id,name)`;

  const searchRes = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!searchRes.ok) {
    const errorText = await searchRes.text();
    throw new Error(`Google Drive folder search failed: ${searchRes.status} ${errorText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    const errorText = await createRes.text();
    throw new Error(`Google Drive folder creation failed: ${createRes.status} ${errorText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Uploads an image blob to the dedicated Google Drive folder using multipart upload.
 *
 * @param {Blob|string} imageSource - Blob or base64 dataURL
 * @param {string} filename - e.g. "LookALike_20261106_1423.png"
 * @param {string} accessToken - OAuth access token
 * @returns {Promise<{ ok: boolean, fileId: string, webViewLink: string, folderName: string }>}
 */
export async function uploadImageToGoogleDrive(imageSource, filename, accessToken) {
  let blob = imageSource;
  if (typeof imageSource === 'string') {
    // DataURL to Blob
    const res = await fetch(imageSource);
    blob = await res.blob();
  }

  const folderId = await getOrCreateLookALikeFolder(accessToken);

  const metadata = {
    name: filename,
    mimeType: blob.type || 'image/png',
    parents: [folderId],
  };

  const boundary = '-------FunSpotLookALikeBoundary' + Math.random().toString(36).substring(2);
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const mediaPartHeader = `${delimiter}Content-Type: ${blob.type || 'image/png'}\r\n\r\n`;

  // Combine into single multipart request body
  const multipartBody = new Blob([metadataPart, mediaPartHeader, blob, closeDelimiter]);

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody,
    },
  );

  if (!uploadRes.ok) {
    const errorText = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errorText}`);
  }

  const fileData = await uploadRes.json();
  return {
    ok: true,
    fileId: fileData.id,
    webViewLink: fileData.webViewLink || `https://drive.google.com/file/d/${fileData.id}/view`,
    folderName: FOLDER_NAME,
  };
}

/**
 * Backend fallback: saves lookalike composite image via Fun Spot backend
 * when Google API is not directly reachable or running in local Kiosk mode.
 */
export async function saveCompositeToBackend(dataUrl, metadata = {}) {
  const response = await fetch('/api/look-a-like/drive-save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image: dataUrl,
      timestamp: Date.now(),
      mode: metadata.mode || 'solo',
      participantsCount: metadata.participantsCount || 1,
      folder: FOLDER_NAME,
    }),
  });

  if (!response.ok) {
    throw new Error(`Backend storage failed: status ${response.status}`);
  }

  return response.json();
}
