// File: client/src/components/admin/AdminDashboard.jsx
// (FINAL: LENGKAP DENGAN SEMUA FITUR - SUSPEND & DELETE USER)

import React, { useState, useEffect } from "react";
import axios from "axios";
import { format } from "date-fns";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [resetRequests, setResetRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [backupLoading, setBackupLoading] = useState(false);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const config = { headers: { "x-auth-token": token } };

      const resPending = await axios.get("http://203.194.115.16:5000/api/users/pending", config);
      setPendingUsers(resPending.data);

      const resAll = await axios.get("http://203.194.115.16:5000/api/users/all", config);
      setAllUsers(resAll.data);

      const resReset = await axios.get("http://203.194.115.16:5000/api/admin/reset-requests", config);
      setResetRequests(resReset.data);
    } catch (err) {
      console.error("Gagal ambil data admin:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // --- HANDLE APPROVE USER BARU ---
  const handleApprove = async (userId, username) => {
    if (!window.confirm(`Setujui akun ${username}?`)) return;
    setProcessingId(userId);
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://203.194.115.16:5000/api/users/approve/${userId}`,
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert(`Sukses! OTP terkirim ke ${username}.`);
      fetchData();
    } catch (err) {
      alert("Gagal menyetujui user.");
    } finally {
      setProcessingId(null);
    }
  };

  // --- HANDLE REJECT (TOLAK) USER BARU ---
  const handleReject = async (userId, username) => {
    if (!window.confirm(`Tolak dan hapus pendaftaran ${username}?`)) return;

    setProcessingId(userId);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://203.194.115.16:5000/api/users/${userId}`, {
        headers: { "x-auth-token": token },
      });
      alert(`Pendaftaran ${username} ditolak dan dihapus.`);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus user.");
    } finally {
      setProcessingId(null);
    }
  };

  // --- HANDLE UBAH ROLE ---
  const handleChangeRole = async (userId, newRole) => {
    if (!window.confirm(`Ubah role user ini menjadi ${newRole}?`)) {
      fetchData();
      return;
    }
    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://203.194.115.16:5000/api/users/${userId}/role`, { role: newRole }, { headers: { "x-auth-token": token } });
      alert("Role berhasil diubah!");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal mengubah role.");
    }
  };

  // --- HANDLE TOGGLE STATUS (AKTIF/NONAKTIF) - BARU ---
  const handleToggleStatus = async (userId, currentStatus, username) => {
    const action = currentStatus ? "menonaktifkan" : "mengaktifkan";
    if (!window.confirm(`Yakin ingin ${action} akun ${username}?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.put(`http://203.194.115.16:5000/api/users/${userId}/status`, { is_active: !currentStatus }, { headers: { "x-auth-token": token } });
      alert(`Status akun ${username} berhasil diperbarui.`);
      fetchData();
    } catch (err) {
      alert("Gagal mengubah status user.");
    }
  };

  // --- HANDLE DELETE USER AKTIF (HAPUS PERMANEN) - BARU ---
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`PERINGATAN: Hapus permanen user ${username}?\nData tidak bisa dikembalikan.`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://203.194.115.16:5000/api/users/${userId}`, {
        headers: { "x-auth-token": token },
      });
      alert(`User ${username} dihapus permanen.`);
      fetchData();
    } catch (err) {
      alert("Gagal menghapus user.");
    }
  };

  // --- HANDLE APPROVE RESET PASSWORD ---
  const handleApproveReset = async (userId, username) => {
    if (!window.confirm(`Setujui reset password untuk ${username} dan kirim link ke emailnya?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://203.194.115.16:5000/api/admin/approve-reset/${userId}`,
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert(`Link reset password telah dikirim ke email ${username}.`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal memproses permintaan.");
    }
  };

  // --- HANDLE REJECT RESET PASSWORD ---
  const handleRejectReset = async (userId, username) => {
    if (!window.confirm(`Tolak permintaan reset password untuk ${username}?`)) return;

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `http://203.194.115.16:5000/api/admin/reject-reset/${userId}`,
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert("Permintaan ditolak.");
      fetchData();
    } catch (err) {
      console.error(err);
      alert("Gagal menolak permintaan.");
    }
  };

  // --- HANDLE BACKUP ---
  const handleBackup = async () => {
    if (!window.confirm("Kirim backup data lengkap ke email Admin Anda?")) return;

    setBackupLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post(
        "http://203.194.115.16:5000/api/admin/backup",
        {},
        {
          headers: { "x-auth-token": token },
        }
      );
      alert(res.data.message);
    } catch (err) {
      console.error(err);
      alert("Gagal melakukan backup.");
    } finally {
      setBackupLoading(false);
    }
  };

  if (loading) return <div className="admin-loading">Memuat data dashboard...</div>;

  return (
    <div className="admin-container">
      <div className="admin-header">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>🛡️ Admin Dashboard</h2>
            <p>Pusat kontrol pengguna, hak akses, dan data.</p>
          </div>

          <button onClick={handleBackup} className="btn-approve" style={{ backgroundColor: "#e65100", fontSize: "0.9rem" }} disabled={backupLoading}>
            {backupLoading ? "Mengirim..." : "📥 Backup Data ke Email"}
          </button>
        </div>
      </div>

      <div className="admin-content">
        {/* TABEL 1: APPROVAL USER BARU */}
        <div className="admin-section">
          <h3>⏳ Pendaftaran User Baru</h3>
          {pendingUsers.length === 0 ? (
            <div className="empty-state">
              <p>Tidak ada pendaftaran baru.</p>
            </div>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((user) => (
                  <tr key={user.user_id}>
                    <td>{format(new Date(user.created_at), "dd/MM/yyyy HH:mm")}</td>
                    <td>
                      <strong>{user.username}</strong>
                    </td>
                    <td>{user.email}</td>
                    <td>
                      <button className="btn-approve" onClick={() => handleApprove(user.user_id, user.username)} disabled={processingId === user.user_id} style={{ marginRight: "10px" }}>
                        {processingId === user.user_id ? "..." : "Setujui"}
                      </button>

                      <button className="btn-reject" onClick={() => handleReject(user.user_id, user.username)} disabled={processingId === user.user_id} title="Tolak & Hapus">
                        Tolak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ height: "30px" }}></div>

        {/* TABEL 2: PERMINTAAN RESET PASSWORD */}
        <div className="admin-section" style={{ borderLeft: "5px solid #ffffffff" }}>
          <h3 style={{ color: "#000000ff" }}>🔑 Permintaan Reset Password</h3>
          {resetRequests.length === 0 ? (
            <div className="empty-state">
              <p>Tidak ada permintaan reset password.</p>
            </div>
          ) : (
            <table className="user-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Email</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {resetRequests.map((u) => (
                  <tr key={u.user_id}>
                    <td>
                      <strong>{u.username}</strong> ({u.role})
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <button className="btn-approve" style={{ backgroundColor: "#00796b", marginRight: "10px" }} onClick={() => handleApproveReset(u.user_id, u.username)}>
                        Kirim Link
                      </button>

                      <button className="btn-reject" onClick={() => handleRejectReset(u.user_id, u.username)} title="Batalkan Permintaan">
                        Tolak
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ height: "30px" }}></div>

        {/* TABEL 3: MANAJEMEN PENGGUNA AKTIF (DENGAN AKSI BARU) */}
        <div className="admin-section">
          <h3>👥 Manajemen Pengguna Aktif</h3>
          <table className="user-table">
            <thead>
              <tr>
                <th>Username</th>
                <th>Email</th>
                <th>Status</th>
                <th>Role (Ubah di sini)</th>
                <th>Aksi</th> {/* Kolom Baru */}
              </tr>
            </thead>
            <tbody>
              {allUsers.map((user) => (
                <tr key={user.user_id}>
                  <td>
                    <strong>{user.username}</strong>
                  </td>
                  <td>{user.email}</td>
                  <td>{user.is_active ? <span style={{ color: "green", fontWeight: "bold" }}>Aktif</span> : <span style={{ color: "red", fontWeight: "bold" }}>Nonaktif</span>}</td>
                  <td>
                    <select className="role-select" value={user.role} onChange={(e) => handleChangeRole(user.user_id, e.target.value)}>
                      <option value="staf">Staf</option>
                      <option value="hrd">HRD</option>
                      <option value="owner">Owner</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    {/* TOMBOL NONAKTIFKAN / AKTIFKAN */}
                    <button className={user.is_active ? "btn-reject" : "btn-approve"} onClick={() => handleToggleStatus(user.user_id, user.is_active, user.username)} style={{ marginRight: "10px", fontSize: "0.8rem", padding: "6px 10px" }}>
                      {user.is_active ? "Nonaktifkan" : "Aktifkan"}
                    </button>

                    {/* TOMBOL HAPUS PERMANEN */}
                    <button className="btn-reject" style={{ backgroundColor: "#660b0bff", fontSize: "0.8rem", padding: "6px 10px" }} onClick={() => handleDeleteUser(user.user_id, user.username)} title="Hapus Permanen">
                      Hapus
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
