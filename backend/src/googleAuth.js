import { google } from "googleapis";

function getAccessToken(req) {
  const authHeader = req.headers.authorization ?? "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }
  return token;
}

function getOAuthClient(accessToken) {
  const client = new google.auth.OAuth2();
  client.setCredentials({ access_token: accessToken });
  return client;
}

export async function requireGoogleAuth(req, res, next) {
  const accessToken = getAccessToken(req);
  if (!accessToken) {
    return res.status(401).json({ message: "Missing Google access token" });
  }

  try {
    const auth = getOAuthClient(accessToken);
    const oauth2 = google.oauth2({ version: "v2", auth });
    const profile = await oauth2.userinfo.get();

    req.google = {
      accessToken,
      profile: profile.data
    };

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired Google access token", error: error.message });
  }
}

export function getSheetsClient(accessToken) {
  const auth = getOAuthClient(accessToken);
  return google.sheets({ version: "v4", auth });
}
