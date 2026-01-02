// File: server/routes/messages.js
// (FINAL: MENAMBAHKAN SENDER_ROLE)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

// @route   GET /api/messages/:channelId
router.get("/:channelId", auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // 1. Cek Keanggotaan
    let clearedAt = null;
    if (userRole !== "admin") {
      const memberCheck = await pool.query("SELECT cleared_history_at FROM Channel_Members WHERE user_id = $1 AND channel_id = $2", [userId, channelId]);

      if (memberCheck.rows.length === 0) {
        return res.status(403).json({ message: "Akses ditolak" });
      }
      clearedAt = memberCheck.rows[0].cleared_history_at;
    }

    // 2. Read Receipts Data
    const readStatus = await pool.query("SELECT user_id, last_read_timestamp FROM Channel_Members WHERE channel_id = $1", [channelId]);
    const memberReadTimes = readStatus.rows;

    // 3. Query Pesan (TAMBAHAN: u.role AS sender_role)
    let query = `
      SELECT m.message_id, m.content, m.created_at, m.status, 
             u.username AS sender_username, m.user_id,
             u.avatar_url AS sender_avatar,
             u.role AS sender_role, -- <--- KITA BUTUH INI
             m.file_url, m.file_type
      FROM Messages m
      JOIN Users u ON m.user_id = u.user_id
      WHERE m.channel_id = $1
    `;

    const params = [channelId];

    if (clearedAt) {
      query += ` AND m.created_at > $2`;
      params.push(clearedAt);
    }

    query += ` ORDER BY m.created_at ASC`;

    const messagesRes = await pool.query(query, params);

    res.json({
      messages: messagesRes.rows,
      memberReadTimes: memberReadTimes,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/messages/:messageId/unsend
router.put("/:messageId/unsend", auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;
    const message = await pool.query("SELECT user_id, channel_id FROM Messages WHERE message_id = $1", [messageId]);

    if (message.rows.length === 0) return res.status(404).json({ message: "Pesan tidak ditemukan" });
    if (message.rows[0].user_id !== userId) return res.status(403).json({ message: "Akses ditolak" });

    const updatedMessage = await pool.query(`UPDATE Messages SET status = 'unsent', unsent_at = NOW() WHERE message_id = $1 RETURNING message_id, channel_id`, [messageId]);
    res.json({ message: "Pesan berhasil ditarik", data: updatedMessage.rows[0] });
  } catch (err) {
    console.error("Error unsend:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
