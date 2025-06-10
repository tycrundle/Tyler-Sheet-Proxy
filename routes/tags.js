// tags.js
import express from "express";

const router = express.Router();

const tagMap = [
  { tag: "#task", sheet: "To-Do", description: "General task or action item" },
  { tag: "#goal", sheet: "Goals", description: "Long-term personal or work objective" },
  { tag: "#event", sheet: "Agenda", description: "Scheduled meeting or block" },
  { tag: "#travel", sheet: "Travel", description: "Trip or itinerary" },
  { tag: "#pet", sheet: "Pets", description: "Pet care logs and activities" },
  { tag: "#health", sheet: "Health", description: "Wellness, mood, and symptoms" },
  { tag: "#memory", sheet: "Chat Memory", description: "AI memories or assistant logs" },
  { tag: "#note", sheet: "Notes", description: "Free-form journaling or reflection" }
];

router.get("/tags", (req, res) => {
  res.json({ tags: tagMap });
});

export default router;
