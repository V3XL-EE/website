require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { readDB, writeDB } = require("./db");

const app = express();

app.set("trust proxy", true);

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

const viewsPath = path.join(__dirname, "data", "views.json");

function readViews() {
  if (!fs.existsSync(viewsPath)) {
    const defaultData = {
      total: 0,
      visitors: []
    };

    fs.writeFileSync(viewsPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }

  return JSON.parse(fs.readFileSync(viewsPath, "utf8"));
}

function saveViews(data) {
  fs.writeFileSync(viewsPath, JSON.stringify(data, null, 2));
}

function getVisitorKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress || "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  const rawKey = `${ip}|${userAgent}`;

  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

app.post("/api/view", (req, res) => {
  const views = readViews();
  const visitorKey = getVisitorKey(req);

  const alreadyVisited = views.visitors.includes(visitorKey);

  if (!alreadyVisited) {
    views.visitors.push(visitorKey);
    views.total += 1;
    saveViews(views);
  }

  res.json({
    total: views.total,
    counted: !alreadyVisited
  });
});

app.get("/api/view", (req, res) => {
  const views = readViews();

  res.json({
    total: views.total
  });
});

// Current active viewers
const activeViewers = new Map();

function getActiveViewerKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress || "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  const rawKey = `${ip}|${userAgent}`;

  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

function cleanActiveViewers() {
  const now = Date.now();
  const timeout = 45 * 1000; // 45 seconds

  for (const [key, lastSeen] of activeViewers.entries()) {
    if (now - lastSeen > timeout) {
      activeViewers.delete(key);
    }
  }
}

app.post("/api/active", (req, res) => {
  const viewerKey = getActiveViewerKey(req);

  activeViewers.set(viewerKey, Date.now());
  cleanActiveViewers();

  res.json({
    active: activeViewers.size
  });
});

app.get("/api/active", (req, res) => {
  cleanActiveViewers();

  res.json({
    active: activeViewers.size
  });
});

app.listen(PORT, () => {
  console.log(`VEXL site running: http://localhost:${PORT}`);
});
