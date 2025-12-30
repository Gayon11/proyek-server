// File: client/src/components/contacts/ContactList.jsx
// (FINAL FIX: STRUKTUR RENDER YANG BENAR)

import React, { useState, useEffect } from "react";
import axios from "axios";
import "./ContactList.css";

const ContactList = ({ onStartDm, onlineUsers, searchQuery }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://203.194.115.16:5000/api/users", {
          headers: { "x-auth-token": token },
        });

        // Urutkan: Owner -> HRD -> Staf -> Admin
        const rolePriority = { owner: 1, hrd: 2, staf: 3, admin: 4 };
        const sortedUsers = res.data.sort((a, b) => {
          const priorityA = rolePriority[a.role] || 99;
          const priorityB = rolePriority[b.role] || 99;
          return priorityA - priorityB;
        });

        setUsers(sortedUsers);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  // --- FUNGSI RENDER GROUP ---
  const renderGroup = (title, roleKey) => {
    // 1. Filter awal berdasarkan Role
    let groupUsers = users.filter((u) => u.role === roleKey);

    // 2. Filter lanjutan berdasarkan Pencarian (Search Query)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      groupUsers = groupUsers.filter((u) => u.username.toLowerCase().includes(query) || u.email.toLowerCase().includes(query));
    }

    // Jika tidak ada user di grup ini (atau tidak cocok dengan pencarian), jangan tampilkan apa-apa
    if (groupUsers.length === 0) return null;

    return (
      <div className="contact-group-wrapper">
        {/* HEADER GRUP (Hanya Sekali) */}
        <div className="contact-group-header">{title}</div>

        {/* DAFTAR USER DI BAWAH HEADER */}
        <div className="contact-group-list">
          {groupUsers.map((user) => {
            const isOnline = onlineUsers && onlineUsers.some((u) => String(u.userId) === String(user.user_id));

            return (
              <div key={user.user_id} className="contact-list-item" onClick={() => onStartDm(user.user_id)} title={`Chat dengan ${user.username}`}>
                <div className="contact-list-avatar-container">
                  <div className="contact-list-avatar">
                    {/* Jika ada avatar, tampilkan gambar. Jika tidak, inisial */}
                    {user.avatar_url ? <img src={`http://203.194.115.16:5000${user.avatar_url}`} alt="ava" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : user.username.charAt(0).toUpperCase()}
                  </div>
                  {isOnline && <div className="online-indicator"></div>}
                </div>

                <div className="contact-list-info">
                  <span className="contact-list-name">{user.username}</span>
                  <span className="contact-list-email">{user.email}</span>
                </div>

                <div className="contact-list-action">
                  <i className="bi bi-chat-text-fill"></i>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) return <div style={{ padding: "20px", color: "#666" }}>Memuat kontak...</div>;

  // Cek apakah ada hasil pencarian sama sekali (untuk pesan "Tidak ditemukan")
  const hasResults = users.some((u) => !searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="contact-list-container">
      <div className="contact-header-main">
        <i className="bi bi-person-lines-fill"></i>
        <span>Daftar Kontak</span>
      </div>

      <div className="contact-scroll-area">
        {/* Render Grup sesuai urutan */}
        {renderGroup("👑 Owner", "owner")}
        {renderGroup("👔 HRD", "hrd")}
        {renderGroup("👥 Staf", "staf")}
        {renderGroup("🛡️ Admin", "admin")}

        {/* Pesan jika tidak ada hasil pencarian */}
        {!hasResults && (
          <div className="empty-search">
            <p>Tidak ditemukan kontak "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContactList;
