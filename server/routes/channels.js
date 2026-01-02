// File: server/routes/channels.js
// (FINAL: MENYERTAKAN DATA MEMBER & AVATAR UNTUK LOGIKA FRONTEND)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");

// Konfigurasi Upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, "group-" + Date.now() + "-" + cleanName);
  },
});
const upload = multer({ storage: storage });

// Middleware Role
const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Akses ditolak" });
    }
    next();
  };
};

// 1. GET CHANNELS (Update: Sertakan info Member & Avatar)
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query;
    let params = [];

    // Query Common: Ambil detail channel + JSON Array member
    const selectFields = `
        c.channel_id, c.name, c.description, c.is_private, c.created_at, c.avatar_url,
        (
            SELECT json_agg(json_build_object(
                'user_id', u.user_id, 
                'username', u.username, 
                'avatar_url', u.avatar_url,
                'role', u.role
            ))
            FROM Channel_Members cm2
            JOIN Users u ON cm2.user_id = u.user_id
            WHERE cm2.channel_id = c.channel_id
        ) as members
    `;

    if (userRole === "admin") {
      query = `SELECT ${selectFields} FROM Channels c ORDER BY name ASC`;
    } else {
      query = `
        SELECT ${selectFields}, 
          cm.last_read_timestamp,
          (SELECT COUNT(*) FROM Messages m WHERE m.channel_id = c.channel_id AND m.created_at > cm.last_read_timestamp) AS unread_count
        FROM Channels c
        JOIN Channel_Members cm ON c.channel_id = cm.channel_id
        WHERE cm.user_id = $1 AND cm.is_visible = true
        ORDER BY c.name ASC
      `;
      params = [userId];
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET channels:", err.message);
    res.status(500).send("Server Error");
  }
});

// 2. CREATE DM
router.post("/dm", auth, async (req, res) => {
  try {
    const myId = req.user.id;
    const { targetUserId } = req.body;
    if (!targetUserId) return res.status(400).json({ message: "Target required" });

    const existing = await pool.query(
      `
      SELECT c.channel_id FROM Channels c
      JOIN Channel_Members cm1 ON c.channel_id = cm1.channel_id
      JOIN Channel_Members cm2 ON c.channel_id = cm2.channel_id
      WHERE c.is_private = true AND cm1.user_id = $1 AND cm2.user_id = $2 LIMIT 1`,
      [myId, targetUserId]
    );

    if (existing.rows.length > 0) {
      const cid = existing.rows[0].channel_id;
      await pool.query("UPDATE Channel_Members SET is_visible = true WHERE user_id = $1 AND channel_id = $2", [myId, cid]);
      return res.json({ channel_id: cid });
    }

    const targetUser = await pool.query("SELECT username FROM Users WHERE user_id = $1", [targetUserId]);
    const name = `DM: ${targetUser.rows[0].username}`;
    const newC = await pool.query(`INSERT INTO Channels (name, description, is_private, created_by) VALUES ($1, 'DM', true, $2) RETURNING channel_id`, [name, myId]);
    await pool.query(`INSERT INTO Channel_Members (user_id, channel_id) VALUES ($1, $2), ($3, $2)`, [myId, newC.rows[0].channel_id, targetUserId]);
    res.json({ channel_id: newC.rows[0].channel_id });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 3. DELETE CHAT
router.delete("/:channelId/leave", auth, async (req, res) => {
  try {
    await pool.query(`UPDATE Channel_Members SET is_visible = false, cleared_history_at = NOW() WHERE user_id = $1 AND channel_id = $2`, [req.user.id, req.params.channelId]);
    res.json({ message: "Chat hidden", deletedChannelId: parseInt(req.params.channelId) });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error");
  }
});

// 4. UPDATE AVATAR GRUP
router.put("/:channelId/avatar", [auth, authorize(["owner", "hrd", "admin"]), upload.single("avatar")], async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  const url = `/uploads/${req.file.filename}`;
  const up = await pool.query("UPDATE Channels SET avatar_url = $1 WHERE channel_id = $2 RETURNING *", [url, req.params.channelId]);
  res.json(up.rows[0]);
});

// --- ROUTE LAIN ---

router.post("/", [auth, authorize(["owner", "hrd", "admin"])], async (req, res) => {
  const { name, description } = req.body;
  const creatorId = req.user.id;
  const newChannel = await pool.query(`INSERT INTO Channels (name, description, created_by) VALUES ($1, $2, $3) RETURNING channel_id, name, description`, [name, description, creatorId]);
  const createdChannel = newChannel.rows[0];
  await pool.query(`INSERT INTO Channel_Members (user_id, channel_id) VALUES ($1, $2)`, [creatorId, createdChannel.channel_id]);
  // Auto Create Doc
  const docContent = `<h1>Dokumen: ${name}</h1><p>Ruang kolaborasi untuk grup ${name}.</p>`;
  await pool.query(`INSERT INTO Documents (title, content, created_by, channel_id) VALUES ($1, $2, $3, $4)`, [`Docs: ${name}`, docContent, creatorId, createdChannel.channel_id]);
  res.status(201).json(createdChannel);
});

router.post("/:channelId/members", [auth, authorize(["owner", "hrd", "admin"])], async (req, res) => {
  const { channelId } = req.params;
  const { userId } = req.body;
  const exist = await pool.query("SELECT * FROM Channel_Members WHERE user_id=$1 AND channel_id=$2", [userId, channelId]);
  if (exist.rows.length > 0) {
    await pool.query("UPDATE Channel_Members SET is_visible=true WHERE user_id=$1 AND channel_id=$2", [userId, channelId]);
    return res.status(400).json({ message: "User added/restored" });
  }
  await pool.query(`INSERT INTO Channel_Members (user_id, channel_id) VALUES ($1, $2)`, [userId, channelId]);
  const u = await pool.query("SELECT user_id, username, role FROM Users WHERE user_id=$1", [userId]);
  res.status(201).json({ message: "Added", member: u.rows[0] });
});

router.get("/:channelId/members", [auth, authorize(["owner", "hrd", "admin"])], async (req, res) => {
  const m = await pool.query(`SELECT u.user_id, u.username, u.role FROM Users u JOIN Channel_Members cm ON u.user_id=cm.user_id WHERE cm.channel_id=$1 ORDER BY u.username ASC`, [req.params.channelId]);
  res.json(m.rows);
});

router.delete("/:channelId/members/:userId", [auth, authorize(["owner", "hrd", "admin"])], async (req, res) => {
  const { channelId, userId } = req.params;
  const channel = await pool.query("SELECT created_by FROM Channels WHERE channel_id = $1", [channelId]);
  if (channel.rows.length === 0) return res.status(404).json({ message: "Channel not found" });
  if (channel.rows[0].created_by === parseInt(userId)) return res.status(400).json({ message: "Cannot remove creator" });
  await pool.query("DELETE FROM Channel_Members WHERE user_id=$1 AND channel_id=$2", [userId, channelId]);
  res.json({ message: "Removed" });
});

router.delete("/:channelId", [auth, authorize(["owner", "hrd", "admin"])], async (req, res) => {
  const r = await pool.query("DELETE FROM Channels WHERE channel_id=$1 RETURNING channel_id", [req.params.channelId]);
  if (r.rowCount === 0) return res.status(404).json({ message: "Not found" });
  res.json({ message: "Deleted", deletedChannelId: r.rows[0].channel_id });
});

router.put("/:channelId/read", auth, async (req, res) => {
  await pool.query(`UPDATE Channel_Members SET last_read_timestamp=NOW() WHERE user_id=$1 AND channel_id=$2`, [req.user.id, req.params.channelId]);
  res.json({ message: "Read" });
});

router.get("/:channelId/files", auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;
    if (userRole !== "admin") {
      const memberCheck = await pool.query("SELECT * FROM Channel_Members WHERE user_id = $1 AND channel_id = $2", [userId, channelId]);
      if (memberCheck.rows.length === 0) return res.status(403).json({ message: "Akses ditolak" });
    }
    const files = await pool.query(
      `SELECT m.message_id, m.file_url, m.file_type, m.created_at, m.content, u.username
             FROM Messages m JOIN Users u ON m.user_id = u.user_id
             WHERE m.channel_id = $1 AND m.file_url IS NOT NULL ORDER BY m.created_at DESC`,
      [channelId]
    );
    res.json(files.rows);
  } catch (err) {
    console.error("Error GET Files:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
