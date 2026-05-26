const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "data", "site.json");

function readDB() {
  if (!fs.existsSync(dbPath)) {
    throw new Error("Missing data/site.json");
  }
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), "utf8");
  return data;
}

module.exports = { readDB, writeDB };
