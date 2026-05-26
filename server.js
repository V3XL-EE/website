require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const { readDB, writeDB } = require("./db");

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/site", (req, res) => {
  try {
    res.json(readDB());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/site", (req, res) => {
  try {
    const current = readDB();
    const next = { ...current, ...req.body };
    res.json(writeDB(next));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`VEXL site running: http://localhost:${PORT}`);
});
