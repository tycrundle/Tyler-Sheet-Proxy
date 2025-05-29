import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const spreadsheetId = process.env.SPREADSHEET_ID;

const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ['https://www.googleapis.com/auth/spreadsheets']
});

let sheets;
auth.getClient().then(authClient => {
  sheets = google.sheets({ version: 'v4', auth: authClient });
  console.log("✅ Google Sheets client initialized");
}).catch(err => {
  console.error("❌ Auth init error:", err);
});

app.get("/read", async (req, res) => {
  const range = req.query.range || 'Sheet1!A1:Z100';

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range
    });

    res.json({ values: response.data.values || [] });
  } catch (error) {
    console.error("Read error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.post("/write", async (req, res) => {
  const { range, values, append = false } = req.body;

  if (!range || !values) {
    return res.status(400).json({ error: "Missing 'range' or 'values'" });
  }

  try {
    const result = append
      ? await sheets.spreadsheets.values.append({
          spreadsheetId,
          range,
          valueInputOption: "RAW",
          insertDataOption: "INSERT_ROWS",
          requestBody: { values }
        })
      : await sheets.spreadsheets.values.update({
          spreadsheetId,
          range,
          valueInputOption: "RAW",
          requestBody: { values }
        });

    res.json({ status: "success", updatedCells: result.data.updatedCells || 0 });
  } catch (error) {
    console.error("Write error:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/health", (req, res) => res.send("✅ Server is healthy"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
