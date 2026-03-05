import { getSheetsClient } from "./googleAuth.js";

const header = ["date", "session1", "session2", "session3", "session4", "dailyTargetHours", "actualHours", "level", "xp"];

function dateToISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function normalizeRow(row = []) {
  const mapped = {};
  header.forEach((key, i) => {
    mapped[key] = row[i] ?? "";
  });

  const checks = ["session1", "session2", "session3", "session4"].reduce((acc, key) => {
    acc[key] = String(mapped[key]).toLowerCase() === "true";
    return acc;
  }, {});

  return {
    date: mapped.date,
    checks,
    dailyTargetHours: Number(mapped.dailyTargetHours || 6),
    actualHours: Number(mapped.actualHours || 0),
    xp: Number(mapped.xp || 0)
  };
}

function calculateXp(checks) {
  const completed = Object.values(checks).filter(Boolean).length;
  return completed * 25;
}

function levelFromXp(xp) {
  return Math.floor(xp / 100) + 1;
}

function pickAvatarStage(level) {
  if (level >= 15) return "sage";
  if (level >= 10) return "elite";
  if (level >= 5) return "warrior";
  return "rookie";
}

async function ensureTab(sheets, sheetId, tabName) {
  const metadata = await sheets.spreadsheets.get({ spreadsheetId: sheetId });
  const tabs = metadata.data.sheets ?? [];
  const exists = tabs.some((sheet) => sheet.properties?.title === tabName);

  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: { title: tabName }
            }
          }
        ]
      }
    });
  }
}

async function ensureHeader(sheets, sheetId, tabName) {
  await ensureTab(sheets, sheetId, tabName);
  const range = `${tabName}!A1:I1`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });

  if (!response.data.values || response.data.values.length === 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "RAW",
      requestBody: {
        values: [header]
      }
    });
  }
}

async function getAllRows(sheets, sheetId, tabName) {
  await ensureHeader(sheets, sheetId, tabName);
  const range = `${tabName}!A2:I`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range
  });

  const rows = response.data.values ?? [];
  return rows.map((row, index) => ({
    rowNumber: index + 2,
    item: normalizeRow(row)
  }));
}

export async function bootstrapSheet({ accessToken, tabName, profileEmail, existingSheetId }) {
  const sheets = getSheetsClient(accessToken);

  if (existingSheetId) {
    await ensureHeader(sheets, existingSheetId, tabName);
    return {
      sheetId: existingSheetId,
      sheetUrl: `https://docs.google.com/spreadsheets/d/${existingSheetId}/edit`,
      ownerEmail: profileEmail
    };
  }

  const created = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title: `LevelUp Tracker - ${profileEmail}`
      },
      sheets: [
        {
          properties: {
            title: tabName
          }
        }
      ]
    }
  });

  const sheetId = created.data.spreadsheetId;
  await ensureHeader(sheets, sheetId, tabName);

  return {
    sheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    ownerEmail: profileEmail
  };
}

export async function getDashboard({ accessToken, sheetId, tabName, days = 150 }) {
  const sheets = getSheetsClient(accessToken);
  const rows = await getAllRows(sheets, sheetId, tabName);
  const today = dateToISO(new Date());

  const byDate = new Map(rows.map((r) => [r.item.date, r]));

  const history = [];
  let cumulativeXp = 0;
  for (let i = days - 1; i >= 0; i -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateIso = dateToISO(date);

    if (byDate.has(dateIso)) {
      const record = byDate.get(dateIso).item;
      cumulativeXp += record.xp;
      history.push({
        date: dateIso,
        actualHours: record.actualHours,
        targetHours: record.dailyTargetHours,
        completedSessions: Object.values(record.checks).filter(Boolean).length,
        dailyXp: record.xp,
        cumulativeXp,
        level: levelFromXp(cumulativeXp)
      });
    } else {
      history.push({
        date: dateIso,
        actualHours: 0,
        targetHours: 6,
        completedSessions: 0,
        dailyXp: 0,
        cumulativeXp,
        level: levelFromXp(cumulativeXp)
      });
    }
  }

  const currentXp = history.length ? history[history.length - 1].cumulativeXp : 0;
  const currentLevel = levelFromXp(currentXp);

  return {
    today,
    currentLevel,
    currentXp,
    avatarStage: pickAvatarStage(currentLevel),
    todayRecord: byDate.get(today)?.item ?? {
      date: today,
      checks: { session1: false, session2: false, session3: false, session4: false },
      dailyTargetHours: 6,
      actualHours: 0,
      xp: 0
    },
    history
  };
}

async function appendRecord(sheets, sheetId, tabName, date, checks, targetHours) {
  const xp = calculateXp(checks);
  const level = levelFromXp(xp);
  const actualHours = (Object.values(checks).filter(Boolean).length * targetHours) / 4;

  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: `${tabName}!A:I`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: {
      values: [[date, checks.session1, checks.session2, checks.session3, checks.session4, targetHours, actualHours, level, xp]]
    }
  });

  return { date, checks, dailyTargetHours: targetHours, actualHours, level, xp };
}

async function updateRow(sheets, sheetId, tabName, rowNumber, date, checks, targetHours) {
  const xp = calculateXp(checks);
  const level = levelFromXp(xp);
  const actualHours = (Object.values(checks).filter(Boolean).length * targetHours) / 4;

  const range = `${tabName}!A${rowNumber}:I${rowNumber}`;
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [[date, checks.session1, checks.session2, checks.session3, checks.session4, targetHours, actualHours, level, xp]]
    }
  });

  return { date, checks, dailyTargetHours: targetHours, actualHours, level, xp };
}

export async function toggleSession({ accessToken, sheetId, tabName, date, sessionKey, completed, targetHours = 6 }) {
  const sheets = getSheetsClient(accessToken);
  const rows = await getAllRows(sheets, sheetId, tabName);
  const existing = rows.find((r) => r.item.date === date);

  const safeChecks = existing
    ? { ...existing.item.checks }
    : { session1: false, session2: false, session3: false, session4: false };

  safeChecks[sessionKey] = completed;

  if (existing) {
    return updateRow(sheets, sheetId, tabName, existing.rowNumber, date, safeChecks, existing.item.dailyTargetHours || targetHours);
  }

  return appendRecord(sheets, sheetId, tabName, date, safeChecks, targetHours);
}
