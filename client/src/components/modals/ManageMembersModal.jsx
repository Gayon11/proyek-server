// File: client/src/components/modals/ManageMembersModal.jsx
// (PERBAIKAN: WARNING EXHAUSTIVE-DEPS DIHILANGKAN)

import React, { useState, useEffect } from "react";
import Modal from "react-modal";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./ManageMembersModal.css";

const ManageMembersModal = ({ isOpen, onClose, channelId, onGroupDeleted }) => {
  const [currentMembers, setCurrentMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user } = useAuth(); // --- useEffect: Panggil fetchData saat modal dibuka ---

  useEffect(() => {
    // --- FUNGSI FETCH DATA DIPINDAHKAN KE DALAM USEEFFECT ---
    const fetchData = async () => {
      setLoading(true);
      setError("");
      const token = localStorage.getItem("token");
      try {
        // 1. Ambil DAFTAR ANGGOTA SAAT INI
        const membersRes = await axios.get(`http://203.194.115.16:5000/api/channels/${channelId}/members`, {
          headers: { "x-auth-token": token },
        });
        setCurrentMembers(membersRes.data); // 2. Ambil SEMUA USER

        const usersRes = await axios.get("http://203.194.115.16:5000/api/users", {
          headers: { "x-auth-token": token },
        }); // 3. Filter user: Tampilkan hanya user yang BELUM JADI ANGGOTA

        const memberIds = new Set(membersRes.data.map((m) => m.user_id));
        const availableUsers = usersRes.data.filter((user) => !memberIds.has(user.user_id));

        setAllUsers(availableUsers);
      } catch (err) {
        console.error("Gagal fetch data:", err);
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    }; // --- BATAS FUNGSI FETCH DATA ---
    if (isOpen) {
      // Reset state dulu
      setCurrentMembers([]);
      setAllUsers([]);
      setSelectedUser("");
      setError("");
      fetchData(); // Panggil fungsi yang ada di scope effect
    }
  }, [isOpen, channelId]); // <-- Array dependensi ini SEKARANG BENAR // --- (Sisa kode handleAddMember, handleRemoveMember, handleDeleteGroup tetap sama) ---

  const handleAddMember = async (e) => {
    e.preventDefault();
    setError("");
    if (!selectedUser) {
      setError("Pilih user untuk ditambahkan.");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(`http://203.194.115.16:5000/api/channels/${channelId}/members`, { userId: selectedUser }, { headers: { "x-auth-token": token } });
      const newUser = res.data.member;
      setCurrentMembers((prevMembers) => [...prevMembers, newUser]);
      setAllUsers((prevUsers) => prevUsers.filter((u) => u.user_id !== newUser.user_id));
      setSelectedUser("");
    } catch (err) {
      console.error("Gagal tambah anggota:", err);
      const errMsg = err.response ? err.response.data.message : "Terjadi error";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (userToRemove) => {
    if (!window.confirm(`Anda yakin ingin mengeluarkan ${userToRemove.username} dari grup?`)) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://203.194.115.16:5000/api/channels/${channelId}/members/${userToRemove.user_id}`, { headers: { "x-auth-token": token } });
      setCurrentMembers((prevMembers) => prevMembers.filter((m) => m.user_id !== userToRemove.user_id));
      setAllUsers((prevUsers) => [...prevUsers, userToRemove]);
    } catch (err) {
      console.error("Gagal mengeluarkan anggota:", err);
      const errMsg = err.response ? err.response.data.message : "Terjadi error";
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("PERINGATAN: Anda akan menghapus grup ini secara permanen.")) {
      return;
    }
    if (!window.confirm("Ini akan menghapus semua pesan di dalamnya. Anda yakin?")) {
      return;
    }
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`http://203.194.115.16:5000/api/channels/${channelId}`, { headers: { "x-auth-token": token } });
      onGroupDeleted(res.data.deletedChannelId);
      onClose();
    } catch (err) {
      console.error("Gagal menghapus grup:", err);
      const errMsg = err.response ? err.response.data.message : "Terjadi error";
      setError(errMsg);
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onClose} contentLabel="Atur Anggota" className="modal-content" overlayClassName="modal-overlay">
           {" "}
      <div className="modal-header">
                <h2>Atur Anggota</h2>       {" "}
        <button onClick={onClose} className="modal-close-btn">
                    &times;        {" "}
        </button>
             {" "}
      </div>
           {" "}
      <div className="current-members-list">
                <h4>Anggota Saat Ini:</h4>        {loading && <p>Memuat...</p>}       {" "}
        {!loading && (
          <ul className="member-list">
                       {" "}
            {currentMembers.map((member) => (
              <li key={member.user_id}>
                               {" "}
                <span>
                                    {member.username} ({member.role})                {" "}
                </span>
                               {" "}
                {user.id !== member.user_id && (
                  <button className="remove-member-btn" onClick={() => handleRemoveMember(member)} disabled={loading}>
                                        Keluarkan                  {" "}
                  </button>
                )}
                             {" "}
              </li>
            ))}
                     {" "}
          </ul>
        )}
             {" "}
      </div>
            <hr className="divider" />     {" "}
      <form onSubmit={handleAddMember}>
                <h4>Tambah Anggota Baru</h4>       {" "}
        <div className="form-group">
                    <label htmlFor="user-select">Pilih User:</label>         {" "}
          <select id="user-select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)} disabled={loading}>
                       {" "}
            <option value="" disabled>
                            Pilih user...            {" "}
            </option>
                       {" "}
            {!loading && allUsers.length === 0 && (
              <option value="" disabled>
                                Semua user sudah jadi anggota              {" "}
              </option>
            )}
                       {" "}
            {!loading &&
              allUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                                    {u.username} ({u.role})                {" "}
                </option>
              ))}
                     {" "}
          </select>
                 {" "}
        </div>
                {error && <p className="form-error">{error}</p>}       {" "}
        <div className="form-actions">
                   {" "}
          <button type="button" onClick={onClose} className="btn-cancel">
                        Selesai          {" "}
          </button>
                   {" "}
          <button type="submit" className="btn-submit" disabled={loading || selectedUser === ""}>
                        {loading ? "..." : "Tambah"}         {" "}
          </button>
                 {" "}
        </div>
             {" "}
      </form>
            <hr className="divider" />     {" "}
      <div className="danger-zone">
                <h4>Zona Berbahaya</h4>       {" "}
        <button className="btn-danger" onClick={handleDeleteGroup} disabled={loading}>
                    {loading ? "Menghapus..." : "Hapus Grup Ini"}       {" "}
        </button>
                <p>Tindakan ini tidak dapat dibatalkan.</p>     {" "}
      </div>
         {" "}
    </Modal>
  );
};

export default ManageMembersModal;
