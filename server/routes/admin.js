// File: server/routes/admin.js
// (FINAL: BACKUP + RESET APPROVAL + REJECT RESET)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");
const sendEmail = require("../utils/emailService");
const crypto = require("crypto");

// Middleware Khusus Admin
const authorizeAdminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Akses ditolak: Hanya Admin." });
  }
  next();
};

// ==========================================
// 1. FITUR BACKUP SYSTEM
// ==========================================

// @route   POST /api/admin/backup
router.post("/backup", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    console.log("Memulai proses backup...");

    const users = await pool.query("SELECT * FROM Users");
    const channels = await pool.query("SELECT * FROM Channels");
    const messages = await pool.query("SELECT * FROM Messages");
    const documents = await pool.query("SELECT * FROM Documents");
    const events = await pool.query("SELECT * FROM Events");
    const channelMembers = await pool.query("SELECT * FROM Channel_Members");

    const backupData = {
      timestamp: new Date().toISOString(),
      counts: {
        users: users.rowCount,
        messages: messages.rowCount,
        documents: documents.rowCount,
        channels: channels.rowCount,
        events: events.rowCount,
      },
      data: {
        users: users.rows,
        channels: channels.rows,
        channel_members: channelMembers.rows,
        messages: messages.rows,
        documents: documents.rows,
        events: events.rows,
      },
    };

    const jsonString = JSON.stringify(backupData, null, 2);

    const adminQuery = await pool.query("SELECT email FROM Users WHERE user_id = $1", [req.user.id]);
    const targetEmail = adminQuery.rows[0].email;

    const emailSubject = `Backup Data Platform - ${new Date().toLocaleDateString()}`;
    const emailBody = `Halo Admin,\n\nBerikut adalah file backup data lengkap dari sistem.\nTotal User: ${users.rowCount}\nTotal Pesan: ${messages.rowCount}\n`;

    const attachments = [
      {
        filename: `backup-kp-platform-${Date.now()}.json`,
        content: jsonString,
      },
    ];

    await sendEmail(targetEmail, emailSubject, emailBody, attachments);

    res.json({ message: `Backup berhasil dikirim ke ${targetEmail}` });
  } catch (err) {
    console.error("Backup Error:", err);
    res.status(500).send("Gagal melakukan backup.");
  }
});

// ==========================================
// 2. FITUR RESET PASSWORD APPROVAL
// ==========================================

// @route   GET /api/admin/reset-requests
router.get("/reset-requests", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const result = await pool.query("SELECT user_id, username, email, role, created_at FROM Users WHERE password_reset_pending = true");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/admin/approve-reset/:id
// @desc    Setujui Reset & Kirim Link ke User
router.post("/approve-reset/:id", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Generate Token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expireDate = new Date(Date.now() + 3600000); // 1 jam

    // 2. Update User
    const userRes = await pool.query(
      `UPDATE Users 
             SET reset_token = $1, reset_token_expires = $2, password_reset_pending = false 
             WHERE user_id = $3 
             RETURNING email, username`,
      [resetToken, expireDate, id]
    );

    if (userRes.rows.length === 0) return res.status(404).json({ message: "User not found" });

    const user = userRes.rows[0];

    // 3. Kirim Email Link
    const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
    const emailBody = `Halo ${user.username},\n\nAdmin telah menyetujui permintaan ubah password Anda.\n\nSilakan klik link berikut untuk membuat password baru:\n${resetUrl}\n\nLink ini berlaku selama 1 jam.`;

    await sendEmail(user.email, "Persetujuan Ubah Password", emailBody);

    res.json({ message: "Permintaan disetujui. Link reset dikirim ke email user." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/admin/reject-reset/:id
// @desc    Tolak permintaan reset password (Hapus status pending) - BARU
router.post("/reject-reset/:id", [auth, authorizeAdminOnly], async (req, res) => {
  try {
    const { id } = req.params;

    // Cukup kembalikan status pending menjadi false
    const result = await pool.query("UPDATE Users SET password_reset_pending = false WHERE user_id = $1 RETURNING username", [id]);

    if (result.rowCount === 0) return res.status(404).json({ message: "User not found" });

    res.json({ message: `Permintaan reset password untuk ${result.rows[0].username} telah ditolak.` });
  } catch (err) {
    console.error("Error Reject Reset:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
