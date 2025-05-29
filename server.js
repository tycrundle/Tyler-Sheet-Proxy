import express from "express";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;
const SCRIPT_URL = process.env.SCRIPT_URL;
const ACCESS_KEY = process.env.ACCESS_KEY;

app.post("/sheet", async (req, res) => {
  const action = req.query.action;
  const payload = req.body;

  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}&key=${ACCESS_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    res.status(response.status).send(text);
  } catch (error) {
    console.error("Proxy Error:", error);
    res.status(500).send("Proxy error");
  }
});

app.get("/health", (req, res) => res.send("Proxy is live"));

app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
