require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");
const crypto = require("crypto");
const { createClient } = require("@supabase/supabase-js");
const { readDB, writeDB } = require("./db");

const app = express();

app.set("trust proxy", true);

const PORT = Number(process.env.PORT || 3000);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

/* ---------------- ENV CHECK ---------------- */

if (!process.env.SUPABASE_URL) {
  console.warn("Missing SUPABASE_URL in environment variables.");
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.warn("Missing SUPABASE_SERVICE_ROLE_KEY in environment variables.");
}

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/* ---------------- SITE DATA API ---------------- */

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

/* ---------------- TOTAL UNIQUE VIEWS ---------------- */

function getVisitorKey(req) {
  const forwarded = req.headers["x-forwarded-for"];
  const ip = forwarded
    ? forwarded.split(",")[0].trim()
    : req.socket.remoteAddress || "unknown";

  const userAgent = req.headers["user-agent"] || "unknown";
  const rawKey = `${ip}|${userAgent}`;

  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

app.post("/api/view", async (req, res) => {
  try {
    const visitorKey = getVisitorKey(req);

    const { error: insertError } = await supabase
      .from("site_visitors")
      .insert({ visitor_hash: visitorKey });

    const isNewVisitor = !insertError;

    if (isNewVisitor) {
      const { data: currentData, error: readError } = await supabase
        .from("site_views")
        .select("total")
        .eq("id", 1)
        .single();

      if (readError) throw readError;

      const newTotal = Number(currentData.total || 0) + 1;

      const { error: updateError } = await supabase
        .from("site_views")
        .update({
          total: newTotal,
          updated_at: new Date().toISOString()
        })
        .eq("id", 1);

      if (updateError) throw updateError;
    }

    const { data, error } = await supabase
      .from("site_views")
      .select("total")
      .eq("id", 1)
      .single();

    if (error) throw error;

    res.json({
      total: data.total,
      counted: isNewVisitor
    });
  } catch (error) {
    console.error("View count error:", error);
    res.status(500).json({ error: "View count failed" });
  }
});

app.get("/api/view", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("site_views")
      .select("total")
      .eq("id", 1)
      .single();

    if (error) throw error;

    res.json({
      total: data.total
    });
  } catch (error) {
    console.error("View count read error:", error);
    res.status(500).json({ error: "View count failed" });
  }
});

/* ---------------- CURRENT ONLINE VIEWERS ---------------- */

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
  const timeout = 1 * 1000;

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

/* ---------------- WEBSITE FALLBACK LAST ---------------- */

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

/* ---------------- START SERVER ---------------- */

app.listen(PORT, () => {
  console.log(`VEXL site running: http://localhost:${PORT}`);
});