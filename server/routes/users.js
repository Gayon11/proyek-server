// File: server/routes/users.js
// (FINAL: LENGKAP SEMUA FITUR + HAPUS USER + STATUS TOGGLE)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const multer = require("multer");
const path = require("path");
const sendEmail = require("../utils/emailService");

// --- Konfigurasi Multer ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const cleanName = file.originalname.replace(/[^a-zA-Z0-9.]/g, "_");
    cb(null, "avatar-" + Date.now() + "-" + cleanName);
  },
});
const upload = multer({ storage: storage });

// ==========================================
// FITUR UMUM
// ==========================================

// @route   GET /api/users
router.get("/", auth, async (req, res) => {
  try {
    const allUsers = await pool.query("SELECT user_id, username, email, role, full_name, avatar_url, bio FROM Users ORDER BY username ASC");
    const otherUsers = allUsers.rows.filter((user) => user.user_id !== req.user.id);
    res.json(otherUsers);
  } catch (err) {
    console.error("Error GET Users:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/users/profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await pool.query("SELECT user_id, username, email, role, full_name, bio, avatar_url FROM Users WHERE user_id = $1", [req.user.id]);
    res.json(user.rows[0]);
  } catch (err) {
    console.error("Error GET Profile:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/users/profile
router.put("/profile", [auth, upload.single("avatar")], async (req, res) => {
  try {
    const { full_name, bio, username, email } = req.body;
    const userId = req.user.id;
    let avatarUrl = null;

    if (req.file) avatarUrl = `/uploads/${req.file.filename}`;

    let query = `UPDATE Users SET full_name = $1, bio = $2, username = $3, email = $4, updated_at = NOW()`;
    const params = [full_name, bio, username, email];

    if (avatarUrl) {
      query += `, avatar_url = $5 WHERE user_id = $6`;
      params.push(avatarUrl, userId);
    } else {
      query += ` WHERE user_id = $5`;
      params.push(userId);
    }

    const updatedUser = await pool.query(query + " RETURNING user_id, username, email, role, full_name, bio, avatar_url", params);
    res.json(updatedUser.rows[0]);
  } catch (err) {
    if (err.code === "23505") return res.status(400).json({ message: "Username/Email sudah digunakan." });
    res.status(500).send("Server Error");
  }
});

// ==========================================
// FITUR ADMIN (APPROVAL & ROLE)
// ==========================================

const authorizeAdminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak: Hanya Admin." });
  }
  next();
};

// 1. Approval: Get Pending
router.get("/pending", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, username, email, role, created_at FROM Users WHERE is_active = false ORDER BY created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 2. Approval: Approve User
router.post("/approve/:id", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const updateUser = await pool.query(`UPDATE Users SET is_active = true, otp_code = $1 WHERE user_id = $2 RETURNING email, username`, [otp, id]);

    if (updateUser.rows.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    const user = updateUser.rows[0];
    await sendEmail(user.email, "Akun Disetujui - Kode OTP Anda", `Halo ${user.username},\n\nAkun Anda telah disetujui oleh Admin.\n\nKode OTP Login Anda: ${otp}`);

    res.json({ message: `User ${user.username} disetujui & OTP dikirim.` });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 3. Role Management: Get All
router.get("/all", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, username, email, role, is_active, created_at FROM Users WHERE user_id != $1 ORDER BY username ASC", [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 4. Role Management: Update Role
router.put("/:id/role", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!["admin", "owner", "hrd", "staf"].includes(role)) return res.status(400).json({ message: "Role tidak valid" });

    const updatedUser = await pool.query("UPDATE Users SET role = $1 WHERE user_id = $2 RETURNING user_id, username, role", [role, id]);
    if (updatedUser.rows.length === 0) return res.status(404).json({ message: "User tidak ditemukan" });

    res.json({ message: "Role berhasil diubah", user: updatedUser.rows[0] });
  } catch (err) {
    res.status(500).send("Server Error");
  }
});

// 5. DELETE USER (Tolak Pendaftaran / Hapus User)
router.delete("/:id", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    const deleteUser = await pool.query("DELETE FROM Users WHERE user_id = $1 RETURNING username", [id]);

    if (deleteUser.rowCount === 0) return res.status(404).json({ message: "User tidak ditemukan." });
    res.json({ message: `User ${deleteUser.rows[0].username} berhasil dihapus.` });
  } catch (err) {
    console.error("Error Delete User:", err.message);
    res.status(500).send("Server Error");
  }
});

// 6. UPDATE STATUS USER (AKTIF/NONAKTIF) - BARU
router.put("/:id/status", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const updatedUser = await pool.query("UPDATE Users SET is_active = $1 WHERE user_id = $2 RETURNING user_id, username, is_active", [is_active, id]);

    if (updatedUser.rows.length === 0) return res.status(404).json({ message: "User tidak ditemukan." });

    res.json({ message: "Status user berhasil diubah.", user: updatedUser.rows[0] });
  } catch (err) {
    console.error("Error Update Status:", err.message);
    res.status(500).send("Server Error");
  }
});

// ==========================================
// FITUR BACKUP PRIBADI
// ==========================================

router.post("/backup-self", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRes = await pool.query("SELECT username, email, full_name, role FROM Users WHERE user_id = $1", [userId]);
    const userData = userRes.rows[0];

    const messagesRes = await pool.query(
      `SELECT m.message_id, m.content, m.created_at, c.name as channel_name
       FROM Messages m
       JOIN Channels c ON m.channel_id = c.channel_id
       WHERE m.user_id = $1 OR m.channel_id IN (SELECT channel_id FROM Channel_Members WHERE user_id = $1)
       ORDER BY m.created_at DESC`,
      [userId]
    );

    const backupData = {
      user: userData,
      timestamp: new Date().toISOString(),
      total_messages: messagesRes.rowCount,
      messages: messagesRes.rows,
    };
    const jsonString = JSON.stringify(backupData, null, 2);

    await sendEmail(userData.email, `Backup Pesan Anda`, `Halo ${userData.username},\n\nTerlampir backup pesan Anda.`, [{ filename: `my-chat-backup-${Date.now()}.json`, content: jsonString }]);

    res.json({ message: `Backup berhasil dikirim ke ${userData.email}` });
  } catch (err) {
    console.error("Self Backup Error:", err);
    res.status(500).send("Gagal melakukan backup.");
  }
});

module.exports = router;
