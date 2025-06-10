// search.js
import express from "express";
import { google } from "googleapis";

const router = express.Router();

const spreadsheetId = process.env.SPREADSHEET_ID;
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const targetTabs = ["Notes", "Chat Memory", "Health", "Goals"];

router.get("/search", async (req, res) => {
  const query = req.query.query?.toLowerCase();
  if (!query) return res.status(400).json({ error: "Missing query" });

  try {
    const authClient = await sheetsAuth.getClient();
    const sheets = google.sheets({ version: "v4", auth: authClient });
    const results = [];

    for (const tab of targetTabs) {
      const { data } = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${tab}!A1:Z`
      });
      const rows = data.values || [];
      rows.forEach(row => {
        if (row.some(cell => cell.toLowerCase().includes(query))) {
          results.push({ sheet: tab, row });
        }
      });
    }

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
