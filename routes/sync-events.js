// sync-events.js
import express from "express";
import { google } from "googleapis";

const router = express.Router();

// Setup auth
const spreadsheetId = process.env.SPREADSHEET_ID;
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);
oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

// Sheet header mapping
const HEADERS = [
  "ID", "Summary", "Description", "Start", "End", "Recurrence",
  "TimeZone", "Status", "Calendar", "Synced", "LastSyncedAt", "Notes"
];

// Utilities
const mapRowsToObjects = (rows) => rows.map((row, idx) => {
  const rowObj = {};
  HEADERS.forEach((key, i) => {
    rowObj[key] = row[i] || "";
  });
  rowObj._rowIndex = idx + 2; // track original row number for logging
  return rowObj;
});

const mapObjectsToRows = (objs) => objs.map(obj => HEADERS.map(h => obj[h] || ""));

// Main sync logic
router.get("/sync-events", async (req, res) => {
  try {
    const sheetsClient = google.sheets({ version: "v4", auth: await sheetsAuth.getClient() });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const readRange = "New Events!A2:L"; // assumes headers in A1:L1
    const { data } = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range: readRange
    });

    const rows = data.values || [];
    if (!rows.length) {
      console.log("🟡 No data rows found in 'New Events' tab.");
      return res.json({ status: "success", synced: 0, skipped: 0 });
    }

    const rowObjects = mapRowsToObjects(rows);
    const skipped = [];
    const eventsToSync = rowObjects.filter(row => {
      if (!row.Summary || !row.Start || !row.End || row.Status === "canceled") {
        skipped.push({ row: row._rowIndex, reason: "Missing required fields or status=canceled" });
        return false;
      }
      if (row.Synced === "TRUE") {
        skipped.push({ row: row._rowIndex, reason: "Already synced" });
        return false;
      }
      return true;
    });

    const updatedRows = [];
    for (let i = 0; i < eventsToSync.length; i++) {
      const row = eventsToSync[i];
      try {
        const event = {
          summary: row.Summary,
          description: row.Description,
          start: {
            dateTime: new Date(row.Start).toISOString(),
            timeZone: row.TimeZone || "UTC"
          },
          end: {
            dateTime: new Date(row.End).toISOString(),
            timeZone: row.TimeZone || "UTC"
          },
          recurrence: row.Recurrence ? [row.Recurrence] : undefined
        };

        let result;
        if (row.ID) {
          result = await calendar.events.update({
            calendarId: row.Calendar || "primary",
            eventId: row.ID,
            requestBody: event
          });
        } else {
          result = await calendar.events.insert({
            calendarId: row.Calendar || "primary",
            requestBody: event
          });
          row.ID = result.data.id;
        }

        row.Synced = "TRUE";
        row.LastSyncedAt = new Date().toISOString();
        updatedRows.push(row);

      } catch (eventErr) {
        console.error(`❌ Event sync failed (row ${row._rowIndex}):`, eventErr.message);
        skipped.push({ row: row._rowIndex, reason: `Event insert/update error: ${eventErr.message}` });
      }
    }

    if (updatedRows.length) {
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId,
        range: readRange,
        valueInputOption: "RAW",
        requestBody: {
          values: mapObjectsToRows(updatedRows)
        }
      });
    }

    console.log("✅ Sync completed.", { synced: updatedRows.length, skipped });
    res.json({ status: "success", synced: updatedRows.length, skipped });
  } catch (err) {
    console.error("/sync-events error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
