// File: client/src/components/layout/Sidebar.jsx
// (FINAL: FOOTER MENAMPILKAN "PROFILE")

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import ProfileModal from "../modals/ProfileModal";
import "./Sidebar.css";

// Terima prop 'searchQuery' dan 'setSearchQuery'
const Sidebar = ({ activeTab, onTabChange, searchQuery, setSearchQuery }) => {
  const navigate = useNavigate();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    window.location.reload();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>My Platform</h3>
      </div>

      <div className="sidebar-search">
        <input type="text" placeholder="Cari (Ctrl+K)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <nav className="sidebar-nav">
        <ul>
          <li className={activeTab === "messenger" ? "active" : ""} onClick={() => onTabChange("messenger")}>
            Messenger
          </li>
          <li className={activeTab === "rapat" ? "active" : ""} onClick={() => onTabChange("rapat")}>
            Rapat
          </li>
          <li className={activeTab === "docs" ? "active" : ""} onClick={() => onTabChange("docs")}>
            Docs
          </li>
          <li className={activeTab === "files" ? "active" : ""} onClick={() => onTabChange("files")}>
            File
          </li>
          <li className={activeTab === "kalender" ? "active" : ""} onClick={() => onTabChange("kalender")}>
            Kalender
          </li>
          <li className={activeTab === "kontak" ? "active" : ""} onClick={() => onTabChange("kontak")}>
            Kontak
          </li>

          {/* Menu Khusus Admin */}
          {user && user.role === "admin" && (
            <li
              className={activeTab === "admin" ? "active" : ""}
              onClick={() => onTabChange("admin")}
              style={{
                marginTop: "15px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                paddingTop: "15px",
                color: "#ffcc00",
                fontWeight: "bold",
              }}
            >
              🛡️ Admin Panel
            </li>
          )}
        </ul>
      </nav>

      {/* --- FOOTER DIPERBAIKI --- */}
      <div className="sidebar-footer">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }}>
          {/* Ubah di sini: Hanya tampilkan ikon user dan teks "Profile" (atau Nama User) */}
          <span onClick={() => setIsProfileOpen(true)} style={{ fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Jika user punya avatar, bisa ditampilkan di sini nanti. Sekarang pakai ikon default */}
            <div style={{ width: "30px", height: "30px", borderRadius: "50%", backgroundColor: "#ffffff33", display: "flex", alignItems: "center", justifyContent: "center" }}>👤</div>
            {/* Tampilkan Nama User, atau sekadar teks "Profile" sesuai request */}
            <span>{user?.username || "Profile"}</span>
          </span>

          <div className="logout-btn" onClick={handleLogout} title="Keluar / Logout">
            ⏻
          </div>
        </div>
      </div>
      {/* ------------------------- */}

      <ProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </div>
  );
};

export default Sidebar;
