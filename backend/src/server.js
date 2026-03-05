import express from "express";
import cors from "cors";
import { config } from "./config.js";
import { requireGoogleAuth } from "./googleAuth.js";
import { bootstrapSheet, getDashboard, toggleSession } from "./sheetsService.js";

const app = express();

app.use(cors({ origin: config.frontendOrigin === "*" ? true : config.frontendOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/me", requireGoogleAuth, async (req, res) => {
  res.json({
    email: req.google.profile.email,
    name: req.google.profile.name,
    picture: req.google.profile.picture
  });
});

app.post("/api/bootstrap", requireGoogleAuth, async (req, res) => {
  const { sheetId } = req.body ?? {};

  try {
    const result = await bootstrapSheet({
      accessToken: req.google.accessToken,
      tabName: config.defaultTabName,
      profileEmail: req.google.profile.email,
      existingSheetId: sheetId
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to initialize Google Sheet",
      error: error.message
    });
  }
});

app.get("/api/dashboard", requireGoogleAuth, async (req, res) => {
  const sheetId = req.query.sheetId;
  if (!sheetId) {
    return res.status(400).json({ message: "Missing sheetId query parameter" });
  }

  try {
    const dashboard = await getDashboard({
      accessToken: req.google.accessToken,
      sheetId,
      tabName: config.defaultTabName,
      days: 150
    });
    return res.json(dashboard);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to load dashboard from Google Sheets",
      error: error.message
    });
  }
});

app.post("/api/check", requireGoogleAuth, async (req, res) => {
  const { sheetId, date, sessionKey, completed, targetHours } = req.body ?? {};

  const allowed = new Set(["session1", "session2", "session3", "session4"]);
  if (!sheetId || !date || !allowed.has(sessionKey) || typeof completed !== "boolean") {
    return res.status(400).json({ message: "Invalid payload" });
  }

  try {
    const record = await toggleSession({
      accessToken: req.google.accessToken,
      sheetId,
      tabName: config.defaultTabName,
      date,
      sessionKey,
      completed,
      targetHours
    });
    return res.json(record);
  } catch (error) {
    return res.status(500).json({
      message: "Failed to update Google Sheets",
      error: error.message
    });
  }
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
