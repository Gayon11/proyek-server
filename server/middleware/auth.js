// File: server/middleware/auth.js

const jwt = require("jsonwebtoken");
require("dotenv").config();

module.exports = function (req, res, next) {
  // 1. Ambil token dari header
  const token = req.header("x-auth-token");

  // 2. Cek jika tidak ada token
  if (!token) {
    return res.status(401).json({ message: "Tidak ada token, otorisasi ditolak" });
  }

  // 3. Verifikasi token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Simpan payload (data user) dari token ke 'req.user'
    // Ingat, kita menyimpan { user: { id: ..., role: ... } } di token
    req.user = decoded.user;

    next(); // Lanjutkan ke route selanjutnya
  } catch (err) {
    res.status(401).json({ message: "Token tidak valid" });
  }
};
