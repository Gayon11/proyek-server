// File: client/src/components/layout/SubSidebar.jsx
// (FINAL: NAMA DM DINAMIS & AVATAR SIDEBAR & FITUR SEARCH)

import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import CreateGroupModal from "../modals/CreateGroupModal";
import "./SubSidebar.css";

const SubSidebar = ({ channels, loading, onChannelSelect, selectedChannelId, onGroupCreated, searchQuery }) => {
  const { user } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Helper: Tentukan Nama & Avatar untuk ditampilkan
  const getChannelDisplay = (channel) => {
    // Jika DM (Private)
    if (channel.is_private) {
      // Cari member yang BUKAN diri sendiri
      const otherMember = channel.members?.find((m) => String(m.user_id) !== String(user.id));

      if (otherMember) {
        return {
          // Tampilkan Nama + Role
          name: `${otherMember.username} (${otherMember.role})`,
          avatar: otherMember.avatar_url ? `https://203.194.115.16.nip.io${otherMember.avatar_url}` : null,
          initial: otherMember.username.charAt(0).toUpperCase(),
          isDm: true,
        };
      } else {
        // Fallback
        return { name: "Chat Pribadi", avatar: null, initial: "?", isDm: true };
      }
    } else {
      // Jika Grup
      return {
        name: channel.name,
        avatar: channel.avatar_url ? `https://203.194.115.16.nip.io${channel.avatar_url}` : null,
        initial: "#",
        isDm: false,
      };
    }
  };

  // --- LOGIKA FILTER SEARCH ---
  const filteredChannels = channels.filter((channel) => {
    if (!searchQuery) return true; // Jika kosong, tampilkan semua

    const display = getChannelDisplay(channel);
    const query = searchQuery.toLowerCase();

    // Cari berdasarkan nama tampilan (User atau Grup)
    return display.name.toLowerCase().includes(query);
  });
  // ----------------------------

  if (loading) {
    return (
      <div className="sub-sidebar">
        <div className="conversation-list">
          <p style={{ padding: "15px" }}>Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sub-sidebar">
      <div className="sub-sidebar-header">
        {user && ["owner", "hrd", "admin"].includes(user.role?.toLowerCase()) && (
          <button className="create-channel-btn" onClick={() => setIsModalOpen(true)}>
            + Buat Grup Baru
          </button>
        )}
      </div>

      <div className="conversation-list-header">
        <i className="bi bi-list-task"></i>
        <span>Semua Obrolan</span>
      </div>

      <div className="conversation-list">
        {filteredChannels.length > 0 ? (
          filteredChannels.map((channel) => {
            const display = getChannelDisplay(channel);

            return (
              <div className={`conversation-item ${channel.channel_id === selectedChannelId ? "active" : ""}`} key={channel.channel_id} onClick={() => onChannelSelect(channel.channel_id)}>
                {/* 1. TAMPILAN AVATAR (KIRI) */}
                <div className="sidebar-avatar">
                  {display.isDm && display.avatar ? <img src={display.avatar} alt="ava" /> : <span className={display.isDm ? "dm-initial" : "group-initial"}>{display.isDm ? display.initial : <i className="bi bi-people-fill"></i>}</span>}
                </div>

                {/* 2. TAMPILAN NAMA (TENGAH) */}
                <div className="conversation-info">
                  <h4>{display.name}</h4>
                  <p>{channel.description || (display.isDm ? "Pesan Langsung" : "Grup Diskusi")}</p>
                </div>

                <div className="conversation-status">{channel.unread_count > 0 && <span className="unread-badge">{channel.unread_count}</span>}</div>
              </div>
            );
          })
        ) : (
          <p style={{ padding: "15px", textAlign: "center", color: "#888" }}>{searchQuery ? "Tidak ditemukan." : "Belum ada obrolan."}</p>
        )}
      </div>

      <CreateGroupModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onGroupCreated={onGroupCreated} />
    </div>
  );
};

export default SubSidebar;
