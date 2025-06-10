import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// Google Sheets setup
const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
const spreadsheetId = process.env.SPREADSHEET_ID;

const sheetsAuth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

let sheets;
sheetsAuth.getClient().then(authClient => {
  sheets = google.sheets({ version: "v4", auth: authClient });
  console.log("✅ Google Sheets client initialized");
}).catch(err => {
  console.error("❌ Sheets auth error:", err);
});

// Sheets read
app.get("/read", async (req, res) => {
  const range = req.query.range || "Sheet1!A1:Z100";
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

// Sheets write
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

// Google Calendar OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// Generate calendar auth URL
app.get("/authurl", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"]
  });
  res.send(`<a href="${authUrl}" target="_blank">Click here to authorize access to your calendar</a>`);
});

// Handle OAuth callback
app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log("🎉 Calendar access token received:", tokens);
    res.send("🎉 Authorization successful! You can close this tab.");
  } catch (error) {
    console.error("OAuth error:", error);
    res.status(500).send("Authorization failed.");
  }
});

// Health check
app.get("/health", (req, res) => res.send("✅ Server is healthy"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
