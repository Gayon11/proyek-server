// File: server/routes/upload.js

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");

// Konfigurasi Multer (Tempat simpan & nama file)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/"); // Simpan di folder 'uploads'
  },
  filename: function (req, file, cb) {
    // Format nama: timestamp-namaasli.ext
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage: storage });

// @route   POST /api/upload
// @desc    Upload file
router.post("/", upload.single("file"), (req, res) => {
  try {
    // Kembalikan URL file yang bisa diakses frontend
    // Contoh: /uploads/1748392-gambar.png
    const fileUrl = `/uploads/${req.file.filename}`;

    // Tentukan tipe file sederhana (image atau file biasa)
    const isImage = req.file.mimetype.startsWith("image/");
    const fileType = isImage ? "image" : "file";

    res.json({ fileUrl, fileType, originalName: req.file.originalname });
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload gagal");
  }
});

module.exports = router;
