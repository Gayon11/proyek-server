// File: client/src/components/modals/ProfileModal.jsx
// (FINAL: EDIT PROFILE + BACKUP + REQUEST RESET PASSWORD)

import React, { useState, useEffect, useRef } from "react";
import Modal from "react-modal";
import axios from "axios";
import "./ProfileModal.css";

const ProfileModal = ({ isOpen, onClose }) => {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    role: "",
    full_name: "",
    bio: "",
    avatar_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("https://203.194.115.16.nip.io/api/users/profile", {
        headers: { "x-auth-token": token },
      });
      setFormData(res.data);
      setPreview(null);
      setSelectedFile(null);
    } catch (err) {
      console.error("Gagal ambil profil", err);
    }
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("full_name", formData.full_name || "");
    data.append("bio", formData.bio || "");
    data.append("username", formData.username || "");
    data.append("email", formData.email || "");

    if (selectedFile) {
      data.append("avatar", selectedFile);
    }

    try {
      const token = localStorage.getItem("token");
      await axios.put("https://203.194.115.16.nip.io/api/users/profile", data, {
        headers: {
          "x-auth-token": token,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("Profil berhasil diperbarui!");
      onClose();
      window.location.reload();
    } catch (err) {
      console.error("Gagal update profil:", err);
      const msg = err.response?.data?.message || "Gagal menyimpan.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBackup = async () => {
    if (!window.confirm("Kirim salinan semua pesan Anda (Pribadi & Grup) ke email?")) return;
    setBackupLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://203.194.115.16.nip.io/api/users/backup-self",
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert(res.data.message);
    } catch (err) {
      alert("Gagal mencadangkan pesan.");
    } finally {
      setBackupLoading(false);
    }
  };

  // --- FUNGSI REQUEST RESET PASSWORD (BARU) ---
  const handleRequestReset = async () => {
    if (!window.confirm("Ajukan permintaan ubah password ke Admin?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "https://203.194.115.16.nip.io/api/auth/request-reset",
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert("Gagal mengirim permintaan.");
    }
  };
  // --------------------------------------------

  const displayAvatar = preview ? preview : formData.avatar_url ? `https://203.194.115.16.nip.io${formData.avatar_url}` : "https://via.placeholder.com/150";

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} className="modal-content" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>Edit Profil</h2>
        <button onClick={onClose} className="modal-close-btn">
          &times;
        </button>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        <div className="avatar-section">
          <div className="avatar-wrapper">
            <img src={displayAvatar} alt="Avatar" className="profile-avatar" />
            <div className="avatar-overlay" onClick={() => fileInputRef.current.click()}>
              <i className="bi bi-camera-fill"></i>
            </div>
          </div>
          <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleFileChange} accept="image/*" />
        </div>

        <div className="form-row">
          <div className="form-group half">
            <label>Username</label>
            <input type="text" name="username" value={formData.username} onChange={handleChange} />
          </div>
          <div className="form-group half">
            <label>Role</label>
            <input type="text" value={formData.role} disabled className="input-disabled" style={{ textTransform: "capitalize" }} />
          </div>
        </div>

        <div className="form-group">
          <label>Email</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} />
        </div>

        <div className="form-group">
          <label>Nama Lengkap</label>
          <input type="text" name="full_name" value={formData.full_name || ""} onChange={handleChange} placeholder="Nama lengkap Anda" />
        </div>

        <div className="form-group">
          <label>Bio / Status</label>
          <textarea name="bio" value={formData.bio || ""} onChange={handleChange} placeholder="Ceritakan sedikit tentang diri Anda..." rows="3" />
        </div>

        {/* AREA TOMBOL EKSTRA */}
        <div style={{ margin: "20px 0", borderTop: "1px solid #eee", paddingTop: "15px", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Tombol Backup */}
          <button
            type="button"
            onClick={handleBackup}
            disabled={backupLoading}
            className="btn-extra"
            style={{ backgroundColor: "#ff9800", color: "white", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", gap: "8px" }}
          >
            {backupLoading ? (
              "Mengirim..."
            ) : (
              <>
                <i className="bi bi-envelope-paper"></i> Cadangkan Pesan Saya
              </>
            )}
          </button>

          {/* Tombol Ubah Password (BARU) */}
          <button
            type="button"
            onClick={handleRequestReset}
            className="btn-extra"
            style={{ backgroundColor: "#5bc0de", color: "white", border: "none", padding: "10px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", display: "flex", justifyContent: "center", gap: "8px" }}
          >
            <i className="bi bi-key-fill"></i> Ajukan Ubah Password
          </button>
        </div>

        <div className="form-actions">
          <button type="button" onClick={onClose} className="btn-cancel">
            Batal
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default ProfileModal;
