// File: client/src/components/layout/ChatHeader.jsx
// (FINAL: HEADER DINAMIS - MENGGUNAKAN CLASS CSS YANG BENAR)

import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import axios from "axios";
import "./ChatHeader.css";
import ManageMembersModal from "../modals/ManageMembersModal";

const ChatHeader = ({ channelId, channelName, onGroupDeleted, isPrivate }) => {
  const { user } = useAuth();

  // Gunakan satu state objek untuk menyimpan data tampilan
  const [displayData, setDisplayData] = useState({
    name: channelName || "Loading...",
    avatar: null,
    isDm: isPrivate,
  });

  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Cek hak akses edit (Grup saja)
  const canEditGroup = user && !isPrivate && ["owner", "hrd", "admin"].includes(user.role?.toLowerCase());

  // 1. FETCH DATA CHANNEL
  useEffect(() => {
    if (!channelId || !user) return;

    const fetchHeaderInfo = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get("http://203.194.115.16:5000/api/channels", {
          headers: { "x-auth-token": token },
        });

        const current = res.data.find((c) => c.channel_id === channelId);

        if (current) {
          if (current.is_private) {
            // LOGIKA DM
            const otherMember = current.members?.find((m) => String(m.user_id) !== String(user.id));
            if (otherMember) {
              setDisplayData({
                name: `${otherMember.username} (${otherMember.role})`,
                avatar: otherMember.avatar_url ? `http://203.194.115.16:5000${otherMember.avatar_url}` : null,
                isDm: true,
              });
            } else {
              setDisplayData({ name: "Chat Pribadi", avatar: null, isDm: true });
            }
          } else {
            // LOGIKA GRUP
            setDisplayData({
              name: current.name,
              avatar: current.avatar_url ? `http://203.194.115.16:5000${current.avatar_url}` : null,
              isDm: false,
            });
          }
        }
      } catch (err) {
        console.error("Gagal fetch header:", err);
      }
    };

    fetchHeaderInfo();
  }, [channelId, user, isPrivate]);

  // --- HANDLERS ---

  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!window.confirm("Ganti foto profil grup ini?")) {
      e.target.value = null;
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("avatar", file);

    try {
      const token = localStorage.getItem("token");
      const res = await axios.put(`http://203.194.115.16:5000/api/channels/${channelId}/avatar`, formData, {
        headers: { "x-auth-token": token, "Content-Type": "multipart/form-data" },
      });

      setDisplayData((prev) => ({
        ...prev,
        avatar: `http://203.194.115.16:5000${res.data.avatar_url}`,
      }));

      alert("Foto berhasil diganti!");
    } catch (err) {
      console.error(err);
      alert("Gagal ganti foto.");
    } finally {
      setUploading(false);
      e.target.value = null;
    }
  };

  const handleDeleteChat = async () => {
    if (!window.confirm("Hapus obrolan ini dari daftar Anda?")) return;
    try {
      const token = localStorage.getItem("token");
      const res = await axios.delete(`http://203.194.115.16:5000/api/channels/${channelId}/leave`, { headers: { "x-auth-token": token } });
      if (onGroupDeleted) onGroupDeleted(res.data.deletedChannelId);
    } catch (err) {
      alert("Gagal menghapus.");
    }
  };

  const handleDeleteGroup = async () => {
    if (!window.confirm("Hapus grup permanen?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`http://203.194.115.16:5000/api/channels/${channelId}`, { headers: { "x-auth-token": token } });
      if (onGroupDeleted) onGroupDeleted(channelId);
    } catch (err) {
      alert("Gagal menghapus grup.");
    }
  };

  return (
    <div className="chat-header">
      <div className="chat-header-info">
        {/* AVATAR */}
        <div className={`header-avatar ${displayData.isDm ? "dm-icon" : "group-avatar"} ${canEditGroup ? "editable" : ""}`} onClick={() => canEditGroup && fileInputRef.current.click()} title={canEditGroup ? "Ganti Foto Grup" : ""}>
          {uploading ? (
            <div className="spinner-border text-light spinner-border-sm" role="status"></div>
          ) : displayData.avatar ? (
            <img src={displayData.avatar} alt="icon" />
          ) : (
            <i className={`bi ${displayData.isDm ? "bi-person-fill" : "bi-people-fill"}`}></i>
          )}

          {/* Input File & Overlay */}
          {canEditGroup && (
            <>
              <input type="file" ref={fileInputRef} style={{ display: "none" }} onChange={handleAvatarChange} accept="image/*" />
              {!uploading && (
                <div className="avatar-overlay">
                  <i className="bi bi-camera-fill"></i>
                </div>
              )}
            </>
          )}
        </div>

        {/* NAMA */}
        <h3>{displayData.name}</h3>
      </div>

      <div className="header-right">
        {/* TOMBOL HAPUS CHAT (DM) - MENGGUNAKAN CLASS CSS BARU */}
        {isPrivate && (
          <button className="header-delete-btn" onClick={handleDeleteChat} title="Hapus Obrolan">
            <i className="bi bi-trash3-fill"></i>
          </button>
        )}

        {/* TOMBOL GRUP */}
        {!isPrivate && canEditGroup && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="manage-members-btn" onClick={() => setIsModalOpen(true)}>
              Atur Anggota
            </button>

            {/* TOMBOL HAPUS GRUP - MENGGUNAKAN CLASS CSS BARU */}
            <button className="header-delete-btn" onClick={handleDeleteGroup} title="Hapus Grup">
              <i className="bi bi-trash-fill"></i>
            </button>
          </div>
        )}
      </div>

      {channelId && <ManageMembersModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} channelId={channelId} onGroupDeleted={onGroupDeleted} />}
    </div>
  );
};

export default ChatHeader;
