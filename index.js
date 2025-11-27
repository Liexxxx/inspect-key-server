const express = require("express");
const bodyParser = require("body-parser");
const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

const DB_FILE = path.join(__dirname, "db.json");
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || "changeme";

const app = express();
app.use(bodyParser.json());

// load DB (keys)
function readDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ keys: {} }, null, 2));
  }
  const raw = fs.readFileSync(DB_FILE, "utf8");
  return JSON.parse(raw);
}
function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// POST /api/verify
// body: { key: "xxx", hwid: "..." }
app.post("/api/verify", (req, res) => {
  const { key, hwid } = req.body || {};
  if (!key || !hwid) {
    return res.status(400).json({ status: "invalid", message: "Missing key or hwid" });
  }

  const db = readDB();
  const record = db.keys[key];

  if (!record) {
    return res.json({ status: "invalid", message: "Key not found" });
  }

  // revoked
  if (record.status === "revoked") {
    return res.json({ status: "invalid", message: "Key revoked" });
  }

  // not linked: link now
  if (!record.hwid) {
    record.hwid = hwid;
    record.status = "linked";
    record.linkedAt = new Date().toISOString();
    writeDB(db);
    return res.json({ status: "valid", linked: true });
  }

  // linked -> check match
  if (record.hwid === hwid) {
    return res.json({ status: "valid", linked: true });
  }

  // mismatch
  return res.json({ status: "invalid", message: "HWID mismatch" });
});


// Admin: list keys (protected by ADMIN_TOKEN)
app.get("/admin/keys", (req, res) => {
  const token = req.header("x-admin-token");
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  const db = readDB();
  return res.json(db.keys);
});

// Admin: generate new key
app.post("/admin/generate", (req, res) => {
  const token = req.header("x-admin-token");
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });

  const prefix = (req.body && req.body.prefix) ? req.body.prefix : "INSPECT";
  const key = `${nanoid(8)}_${prefix}`;
  const db = readDB();
  db.keys[key] = { hwid: "", status: "available", createdAt: new Date().toISOString() };
  writeDB(db);
  return res.json({ key });
});

// Admin: revoke key
app.post("/admin/revoke", (req, res) => {
  const token = req.header("x-admin-token");
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: "unauthorized" });
  const { key } = req.body || {};
  if (!key) return res.status(400).json({ error: "missing key" });
  const db = readDB();
  if (!db.keys[key]) return res.status(404).json({ error: "not found" });
  db.keys[key].status = "revoked";
  writeDB(db);
  return res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server listening on", PORT));
