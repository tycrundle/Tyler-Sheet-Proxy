import express from "express";
import { google } from "googleapis";

const app = express();
app.use(express.json());

// -------------------- GOOGLE SHEETS SETUP --------------------
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

// -------------------- GOOGLE CALENDAR SETUP --------------------
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// OPTIONAL: load refresh token from environment
if (process.env.GOOGLE_REFRESH_TOKEN) {
  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });
  console.log("🔁 Refresh token loaded for Calendar");
}

// -------------------- SHEETS API --------------------
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

// -------------------- CALENDAR AUTH FLOW --------------------
app.get("/authurl", (req, res) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: ["https://www.googleapis.com/auth/calendar"]
  });

  res.send(`<h2>Authorize Google Calendar Access</h2><a href="${authUrl}" target="_blank">Click here to connect your calendar</a>`);
});

app.get("/oauth2callback", async (req, res) => {
  const { code } = req.query;
  try {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    console.log("🎉 Calendar tokens:", tokens);

    // OUTPUT the refresh token for permanent use
    if (tokens.refresh_token) {
      console.log("\n🛡️  SAVE THIS REFRESH TOKEN to .env:");
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    }

    res.send("🎉 Authorization complete. Check your server logs for the token.");
  } catch (error) {
    console.error("❌ OAuth error:", error);
    res.status(500).send("Authorization failed.");
  }
});

// -------------------- HEALTH CHECK --------------------
app.get("/health", (req, res) => res.send("✅ Server is healthy"));

// -------------------- START SERVER --------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
