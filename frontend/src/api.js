const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8787";

function authHeaders(accessToken) {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json"
  };
}

async function parseJson(response, fallbackMessage) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = data.error ? ` (${data.error})` : "";
    throw new Error((data.message || fallbackMessage) + detail);
  }
  return data;
}

export async function fetchMe(accessToken) {
  const response = await fetch(`${API_BASE}/api/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
  return parseJson(response, "Unable to fetch Google profile");
}

export async function bootstrapSheet(accessToken, sheetId) {
  const response = await fetch(`${API_BASE}/api/bootstrap`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify({ sheetId })
  });
  return parseJson(response, "Unable to initialize Google Sheet");
}

export async function fetchDashboard(accessToken, sheetId) {
  const url = new URL(`${API_BASE}/api/dashboard`);
  url.searchParams.set("sheetId", sheetId);

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  return parseJson(response, "Unable to load dashboard");
}

export async function updateSession(accessToken, payload) {
  const response = await fetch(`${API_BASE}/api/check`, {
    method: "POST",
    headers: authHeaders(accessToken),
    body: JSON.stringify(payload)
  });

  return parseJson(response, "Unable to sync checkbox with Google Sheets");
}
