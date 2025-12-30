// File: client/src/components/modals/CreateGroupModal.jsx
// (DIUPDATE UNTUK MEMANGGIL API)

import React, { useState } from "react";
import Modal from "react-modal";
import axios from "axios"; // <-- 1. IMPORT AXIOS
import "./CreateGroupModal.css";

// 2. Tambah prop baru: 'onGroupCreated'
const CreateGroupModal = ({ isOpen, onClose, onGroupCreated }) => {
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false); // Mencegah double submit

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!groupName) {
      setError("Nama grup tidak boleh kosong");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      // 3. Ambil token
      const token = localStorage.getItem("token");

      // 4. Panggil API Backend
      const res = await axios.post(
        "http://203.194.115.16:5000/api/channels",
        { name: groupName, description: description }, // Ini adalah 'body'
        {
          headers: {
            "x-auth-token": token, // Kirim token untuk otorisasi
          },
        }
      );

      // 5. Kirim data grup baru (res.data) ke parent (SubSidebar)
      onGroupCreated(res.data);

      // 6. Tutup modal
      handleClose();
    } catch (err) {
      console.error("Gagal membuat grup:", err);
      // Tampilkan error dari server jika ada
      const errMsg = err.response ? err.response.data.message : "Terjadi error";
      setError(errMsg);
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    // Reset form saat ditutup
    setError("");
    setGroupName("");
    setDescription("");
    setIsSubmitting(false); // Reset status submit
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={handleClose} contentLabel="Buat Grup Baru" className="modal-content" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>Buat Grup Baru</h2>
        <button onClick={handleClose} className="modal-close-btn">
          &times;
        </button>
      </div>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="groupName">Nama Grup</label>
          <input type="text" id="groupName" value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="Contoh: Tim KP" />
        </div>
        <div className="form-group">
          <label htmlFor="description">Deskripsi (Opsional)</label>
          <input type="text" id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Contoh: Diskusi progres mingguan" />
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="form-actions">
          <button type="button" onClick={handleClose} className="btn-cancel" disabled={isSubmitting}>
            Batal
          </button>
          <button type="submit" className="btn-submit" disabled={isSubmitting}>
            {isSubmitting ? "Membuat..." : "Buat"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateGroupModal;
