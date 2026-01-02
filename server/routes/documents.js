// File: server/routes/documents.js
// (DIUPDATE: FILTER DOKUMEN BERDASARKAN AKSES CHANNEL USER)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth"); // Butuh login

// --- Middleware Otorisasi Role ---
const authorizeAdmin = (req, res, next) => {
  // Hanya Owner dan HRD yang boleh lanjut
  if (!["owner", "hrd"].includes(req.user.role)) {
    return res.status(403).json({ message: "Akses ditolak: Hanya untuk HRD & Owner" });
  }
  next();
};

// @route   GET /api/documents
// @desc    Ambil dokumen (Hanya dari channel yang diikuti user)
// @access  Private
router.get("/", auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(
      `SELECT d.*, u.username 
       FROM Documents d
       JOIN Users u ON d.created_by = u.user_id
       -- JOIN ke Channel_Members untuk cek akses
       JOIN Channel_Members cm ON d.channel_id = cm.channel_id
       WHERE cm.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("Error GET Documents:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   GET /api/documents/:id
// @desc    Ambil satu dokumen detail (Bisa diakses SEMUA user)
// @access  Private
router.get("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT d.*, u.username 
       FROM Documents d
       JOIN Users u ON d.created_by = u.user_id
       WHERE d.doc_id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error GET Document Detail:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/documents
// @desc    Buat dokumen baru
// @access  Private (HANYA OWNER & HRD)
router.post("/", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { title, content } = req.body;
    const created_by = req.user.id;

    // 1. Insert Dokumen
    const newDoc = await pool.query(
      `INSERT INTO Documents (title, content, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [title, content || "", created_by]
    );

    const createdDoc = newDoc.rows[0];

    // 2. Ambil Username
    const userRes = await pool.query("SELECT username FROM Users WHERE user_id = $1", [createdDoc.created_by]);

    // 3. Gabungkan data
    const finalDoc = {
      ...createdDoc,
      username: userRes.rows[0].username,
    };

    res.json(finalDoc);
  } catch (err) {
    console.error("Error POST Document:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/documents/:id
// @desc    Update dokumen
// @access  Private (HANYA OWNER & HRD)
router.put("/:id", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;

    const updateDoc = await pool.query(
      `UPDATE Documents 
       SET title = $1, content = $2, updated_at = NOW()
       WHERE doc_id = $3
       RETURNING *`,
      [title, content, id]
    );

    if (updateDoc.rows.length === 0) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan" });
    }

    res.json(updateDoc.rows[0]);
  } catch (err) {
    console.error("Error PUT Document:", err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/documents/:id
// @desc    Hapus dokumen
// @access  Private (HANYA OWNER & HRD)
router.delete("/:id", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { id } = req.params;

    const deleteDoc = await pool.query("DELETE FROM Documents WHERE doc_id = $1 RETURNING *", [id]);

    if (deleteDoc.rows.length === 0) {
      return res.status(404).json({ message: "Dokumen tidak ditemukan" });
    }

    res.json({ message: "Dokumen berhasil dihapus" });
  } catch (err) {
    console.error("Error DELETE Document:", err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
