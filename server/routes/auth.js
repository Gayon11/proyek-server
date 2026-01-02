// File: server/routes/auth.js
// (FINAL: REGISTER PENDING + LOGIN 2FA + RESET PASSWORD LOGIC)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const sendEmail = require("../utils/emailService");
const crypto = require("crypto");
const auth = require("../middleware/auth"); // <-- JANGAN LUPA IMPORT INI

// --- 1. LOGIN & REGISTER ---

// @route   POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const userExist = await pool.query("SELECT * FROM Users WHERE email = $1 OR username = $2", [email, username]);
    if (userExist.rows.length > 0) {
      return res.status(400).json({ message: "Username atau Email sudah terdaftar." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await pool.query(
      `INSERT INTO Users (username, email, password_hash, role, is_active) 
       VALUES ($1, $2, $3, 'staf', false) 
       RETURNING user_id, email, username`,
      [username, email, passwordHash]
    );

    res.json({
      message: "Registrasi Berhasil. Akun Anda sedang ditinjau oleh Admin. Tunggu notifikasi email.",
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await pool.query("SELECT * FROM Users WHERE email = $1", [email]);
    if (user.rows.length === 0) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    if (!user.rows[0].is_active) {
      return res.status(403).json({ message: "Akun belum diaktifkan oleh Admin." });
    }

    const validPassword = await bcrypt.compare(password, user.rows[0].password_hash);
    if (!validPassword) {
      return res.status(401).json({ message: "Email atau password salah" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await pool.query("UPDATE Users SET otp_code = $1, otp_expires_at = NOW() + interval '10 minutes' WHERE email = $2", [otp, email]);

    const emailSubject = "Kode OTP Login";
    const emailBody = `Halo ${user.rows[0].username},\n\nKode OTP untuk login adalah: ${otp}\n\nKode ini berlaku selama 10 menit.`;

    await sendEmail(email, emailSubject, emailBody);

    res.json({
      message: "OTP telah dikirim ke email Anda.",
      requireOtp: true,
      email: email,
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// @route   POST /api/auth/verify-otp
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await pool.query("SELECT * FROM Users WHERE email = $1 AND otp_code = $2 AND otp_expires_at > NOW()", [email, otp]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Kode OTP salah atau kadaluarsa." });
    }

    await pool.query("UPDATE Users SET otp_code = NULL WHERE email = $1", [email]);

    const payload = {
      user: {
        id: user.rows[0].user_id,
        role: user.rows[0].role,
      },
    };

    jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "365d" }, (err, token) => {
      if (err) throw err;
      res.json({ token });
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
});

// --- 2. FITUR RESET PASSWORD ---

// @route   POST /api/auth/request-reset
// @desc    User meminta reset password (dari Profil)
router.post("/request-reset", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    // SKENARIO ADMIN: Langsung kirim email tanpa approval
    if (userRole === "admin") {
      const resetToken = crypto.randomBytes(32).toString("hex");
      const expireDate = new Date(Date.now() + 3600000);

      const userRes = await pool.query("UPDATE Users SET reset_token = $1, reset_token_expires = $2 WHERE user_id = $3 RETURNING email, username", [resetToken, expireDate, userId]);
      const user = userRes.rows[0];

      const resetUrl = `http://localhost:3000/reset-password/${resetToken}`;
      const emailBody = `Halo Admin ${user.username},\n\nSilakan klik link di bawah untuk mengubah password Anda:\n\n${resetUrl}\n\nLink ini berlaku 1 jam.`;

      await sendEmail(user.email, "Reset Password Admin", emailBody);

      return res.json({ message: "Link ubah password telah dikirim ke email Anda." });
    }

    // SKENARIO USER BIASA: Masuk antrean pending
    else {
      await pool.query("UPDATE Users SET password_reset_pending = true WHERE user_id = $1", [userId]);
      return res.json({ message: "Permintaan terkirim. Mohon tunggu persetujuan Admin." });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/auth/reset-password
// @desc    Proses simpan password baru (User klik link dari email)
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    const user = await pool.query("SELECT * FROM Users WHERE reset_token = $1 AND reset_token_expires > NOW()", [token]);

    if (user.rows.length === 0) {
      return res.status(400).json({ message: "Link tidak valid atau sudah kadaluarsa." });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await pool.query(
      `UPDATE Users 
             SET password_hash = $1, reset_token = NULL, reset_token_expires = NULL, password_reset_pending = false 
             WHERE user_id = $2`,
      [passwordHash, user.rows[0].user_id]
    );

    res.json({ message: "Password berhasil diubah. Silakan login dengan password baru." });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
