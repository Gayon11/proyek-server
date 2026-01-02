// File: server/routes/events.js
// (FINAL: ADMIN + OWNER + HRD)

const express = require("express");
const router = express.Router();
const pool = require("../db");
const auth = require("../middleware/auth");

// Middleware Cek Role (Admin, Owner, & HRD)
const authorizeAdmin = (req, res, next) => {
  // Pastikan role diambil dengan huruf kecil untuk keamanan
  const userRole = req.user.role.toLowerCase();

  // Perbaikan: Tambahkan 'admin' ke dalam array
  if (!["admin", "owner", "hrd"].includes(userRole)) {
    return res.status(403).json({ message: "Akses ditolak. Hanya Admin/HRD/Owner." });
  }
  next();
};

// @route   GET /api/events
router.get("/", auth, async (req, res) => {
  try {
    const events = await pool.query("SELECT * FROM Events ORDER BY start_time ASC");
    res.json(events.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   POST /api/events
router.post("/", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { title, description, start_time, end_time, importance } = req.body;
    const created_by = req.user.id;

    const newEvent = await pool.query(
      `INSERT INTO Events (title, description, start_time, end_time, importance, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, description, start_time, end_time, importance, created_by]
    );

    res.json(newEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   PUT /api/events/:id
router.put("/:id", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, start_time, end_time, importance } = req.body;

    const updateEvent = await pool.query(
      `UPDATE Events 
       SET title = $1, description = $2, start_time = $3, end_time = $4, importance = $5
       WHERE event_id = $6
       RETURNING *`,
      [title, description, start_time, end_time, importance, id]
    );

    if (updateEvent.rows.length === 0) {
      return res.status(404).json({ message: "Event tidak ditemukan" });
    }
    res.json(updateEvent.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

// @route   DELETE /api/events/:id
router.delete("/:id", [auth, authorizeAdmin], async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM Events WHERE event_id = $1", [id]);
    res.json({ message: "Event dihapus" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server Error");
  }
});

module.exports = router;
