// log-note.js
import express from "express";
import { google } from "googleapis";

const router = express.Router();

const spreadsheetId = process.env.SPREADSHEET_ID;
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

router.post("/log-note", async (req, res) => {
  const { note, tags = [] } = req.body;
  if (!note) return res.status(400).json({ error: "Missing note content" });
  try {
    const authClient = await sheetsAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });
    const timestamp = new Date().toISOString();
    const values = [[timestamp, note, tags.join(", ")]];
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: "Notes!A1",
      valueInputOption: "RAW",
      insertDataOption: "INSERT_ROWS",
      requestBody: { values }
    });
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
