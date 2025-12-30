// File: client/src/components/layout/MainLayout.jsx
// (FINAL FIX: FORCE CLEAN BADGE ON REFRESH & NOTIFICATIONS)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../../socket";
import { useAuth } from "../../context/AuthContext";
import Sidebar from "./Sidebar";
import SubSidebar from "./SubSidebar";
import ContentArea from "./ContentArea";
import DocList from "../docs/DocList";
import DocEditor from "../docs/DocEditor";
import VideoCall from "../video/VideoCall";
import FileList from "../files/FileList";
import CalendarPage from "../calendar/CalendarPage";
import ContactList from "../contacts/ContactList";
import AdminDashboard from "../admin/AdminDashboard";
import "./MainLayout.css";
import useWindowSize from "../../hooks/useWindowSize";

const MainLayout = () => {
  const [activeTab, setActiveTab] = useState("messenger");
  const { width } = useWindowSize();
  const isMobile = width < 768;
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  // Refs for Listener Access
  const userRef = useRef(user);
  const selectedChannelIdRef = useRef(null);
  const channelsRef = useRef([]);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // State
  const [channels, setChannels] = useState([]);

  // Sync channels ref
  useEffect(() => {
    channelsRef.current = channels;
  }, [channels]);

  const [loadingChannels, setLoadingChannels] = useState(true);
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docsRefreshTrigger, setDocsRefreshTrigger] = useState(0);
  const [incomingCall, setIncomingCall] = useState(null);
  const [callDataToPass, setCallDataToPass] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    selectedChannelIdRef.current = selectedChannelId;
  }, [selectedChannelId]);

  // 1. REQUEST NOTIFICATION PERMISSION
  useEffect(() => {
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission();
    }
  }, []);

  // Socket Online Status
  useEffect(() => {
    if (user) socket.emit("addUser", user.id);
    socket.on("getOnlineUsers", (users) => setOnlineUsers(users));
    return () => socket.off("getOnlineUsers");
  }, [user]);

  // --- FETCH CHANNELS ---
  useEffect(() => {
    const fetchChannels = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setLoadingChannels(false);
        return;
      }
      try {
        const res = await axios.get("http://203.194.115.16:5000/api/channels", { headers: { "x-auth-token": token } });
        setChannels(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingChannels(false);
      }
    };

    if (activeTab === "messenger" || activeTab === "files") {
      fetchChannels();
    }
  }, [activeTab]);

  // Socket Listeners
  useEffect(() => {
    // --- CHAT NOTIFICATION LOGIC ---
    const handleReceiveMessage = (incomingMessage) => {
      const currentUser = userRef.current;
      const currentChannelId = selectedChannelIdRef.current;
      const currentChannels = channelsRef.current;

      if (!currentUser) return;

      // 1. Cek Pengirim: Jangan update badge jika pesan dari diri sendiri
      if (String(incomingMessage.user_id) === String(currentUser.id)) return;

      // 2. Update Badge & Notifikasi jika chat TIDAK sedang dibuka
      if (incomingMessage.channel_id !== currentChannelId) {
        setChannels((prev) => prev.map((c) => (c.channel_id === incomingMessage.channel_id ? { ...c, unread_count: (Number(c.unread_count) || 0) + 1 } : c)));

        // Browser Notification
        if ("Notification" in window && Notification.permission === "granted") {
          const channel = currentChannels.find((c) => c.channel_id === incomingMessage.channel_id);
          let title = "Pesan Baru";
          let body = incomingMessage.content || "Mengirim sebuah file";

          if (channel) {
            if (channel.is_private) {
              title = `Pesan dari ${incomingMessage.sender_username}`;
            } else {
              title = `${channel.name}`;
              body = `${incomingMessage.sender_username}: ${body}`;
            }
          } else {
            title = `Pesan dari ${incomingMessage.sender_username}`;
          }

          try {
            new Notification(title, {
              body: body,
              icon: "/logo192.png",
              tag: "chat-msg",
            });
          } catch (e) {
            console.error("Notification error:", e);
          }
        }
      }
    };

    const handleMessageUnsent = () => {};
    const handleDocUpdate = (u) => {
      setDocsRefreshTrigger((p) => p + 1);
      if (selectedDoc && selectedDoc.doc_id === u.docId) setSelectedDoc((prev) => ({ ...prev, title: u.title, content: u.content }));
    };
    const handleDocCreated = () => setDocsRefreshTrigger((p) => p + 1);
    const handleDocDeleted = (d) => {
      setDocsRefreshTrigger((p) => p + 1);
      if (selectedDoc && selectedDoc.doc_id === d.docId) {
        setSelectedDoc(null);
        alert("Dokumen dihapus user lain.");
      }
    };

    // --- FIX UTAMA DISINI (handleDmCreated) ---
    const handleDmCreated = (data) => {
      const currentUser = userRef.current;
      // Jika saya termasuk anggota grup/dm yang baru update ini
      if (currentUser && data.members.includes(currentUser.id)) {
        const token = localStorage.getItem("token");
        if (token) {
          axios.get("http://203.194.115.16:5000/api/channels", { headers: { "x-auth-token": token } }).then((res) => {
            // AMBIL DATA TERBARU
            const freshChannels = res.data;
            const currentOpenId = selectedChannelIdRef.current;

            // BERSIHKAN BADGE UNTUK CHAT YANG SEDANG DIBUKA
            // Ini mencegah badge muncul di pengirim saat list refresh
            const sanitizedChannels = freshChannels.map((c) => {
              if (c.channel_id === currentOpenId) {
                return { ...c, unread_count: 0 };
              }
              return c;
            });

            setChannels(sanitizedChannels);
          });
        }
      }
    };

    // --- VIDEO CALL NOTIFICATION ---
    const handleCallUser = (data) => {
      const currentUser = userRef.current;
      if (currentUser && String(data.userToCall) === String(currentUser.id)) {
        setIncomingCall({ signal: data.signal, from: data.from, name: data.name });

        if ("Notification" in window && Notification.permission === "granted") {
          const notif = new Notification("📞 Panggilan Masuk", {
            body: `${data.name} ingin melakukan rapat video...`,
            icon: "/logo192.png",
            tag: "video-call",
            requireInteraction: true,
          });
          notif.onclick = function () {
            window.focus();
            notif.close();
          };
        }
      }
    };

    const handleCallEnded = () => setIncomingCall(null);

    // Attach Listeners
    socket.on("receiveMessage", handleReceiveMessage);
    socket.on("messageUnsent", handleMessageUnsent);
    socket.on("docUpdateReceived", handleDocUpdate);
    socket.on("docCreated", handleDocCreated);
    socket.on("docDeleted", handleDocDeleted);
    socket.on("dmCreated", handleDmCreated);
    socket.on("callUser", handleCallUser);
    socket.on("callEnded", handleCallEnded);

    // Cleanup
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      socket.off("messageUnsent", handleMessageUnsent);
      socket.off("docUpdateReceived", handleDocUpdate);
      socket.off("docCreated", handleDocCreated);
      socket.off("docDeleted", handleDocDeleted);
      socket.off("dmCreated", handleDmCreated);
      socket.off("callUser", handleCallUser);
      socket.off("callEnded", handleCallEnded);
    };
  }, [selectedDoc, selectedChannelId]);

  // Handlers
  const handleAnswerCall = () => {
    setCallDataToPass(incomingCall);
    setIncomingCall(null);
    setActiveTab("rapat");
  };
  const handleRejectCall = () => setIncomingCall(null);

  const handleChannelSelect = async (id) => {
    if (selectedChannelId !== id) {
      setSelectedChannelId(id);
      // Reset lokal visual agar instan
      setChannels((prev) => prev.map((c) => (c.channel_id === id ? { ...c, unread_count: 0 } : c)));
      try {
        const t = localStorage.getItem("token");
        await axios.put(`http://203.194.115.16:5000/api/channels/${id}/read`, null, { headers: { "x-auth-token": t } });
      } catch (e) {}
    }
  };

  const handleClearSelection = () => setSelectedChannelId(null);
  const handleGroupCreated = (nG) => setChannels((p) => [...p, { ...nG, unread_count: 0 }]);
  const handleGroupDeleted = (id) => {
    setChannels((p) => p.filter((c) => c.channel_id !== id));
    setSelectedChannelId(null);
  };

  const handleDocSelect = (d) => setSelectedDoc(d);
  const handleDocCreate = () => setSelectedDoc(null);
  const handleDocSaved = () => setDocsRefreshTrigger((p) => p + 1);

  const handleStartDm = async (targetUserId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.post("http://203.194.115.16:5000/api/channels/dm", { targetUserId }, { headers: { "x-auth-token": token } });
      const dmChannelId = res.data.channel_id;
      socket.emit("dmCreated", { members: [user.id, targetUserId] });
      setActiveTab("messenger");

      // Manual fetch karena tidak bisa panggil useEffect
      const resChannels = await axios.get("http://203.194.115.16:5000/api/channels", { headers: { "x-auth-token": token } });
      setChannels(resChannels.data);

      setSelectedChannelId(dmChannelId);
    } catch (err) {
      console.error("Gagal DM:", err);
      alert("Gagal memulai obrolan.");
    }
  };

  return (
    <div className="main-layout">
      {incomingCall && (
        <div className="global-call-notification">
          <div className="call-content">
            <h3>📞 Panggilan Masuk</h3>
            <p>
              <strong>{incomingCall.name}</strong> ingin melakukan rapat video.
            </p>
            <div className="call-btn-group">
              <button className="btn-accept" onClick={handleAnswerCall}>
                Terima
              </button>
              <button className="btn-reject" onClick={handleRejectCall}>
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedChannelId(null);
          setSelectedDoc(null);
          setSearchQuery("");
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {(activeTab === "messenger" || activeTab === "files") && (
        <>
          {isMobile && selectedChannelId ? (
            <ContentArea selectedChannelId={selectedChannelId} onClearSelection={handleClearSelection} onGroupDeleted={handleGroupDeleted} />
          ) : isMobile && !selectedChannelId ? (
            <SubSidebar channels={channels} loading={loadingChannels} onChannelSelect={handleChannelSelect} selectedChannelId={selectedChannelId} onGroupCreated={handleGroupCreated} searchQuery={searchQuery} />
          ) : (
            <>
              <SubSidebar channels={channels} loading={loadingChannels} onChannelSelect={handleChannelSelect} selectedChannelId={selectedChannelId} onGroupCreated={handleGroupCreated} searchQuery={searchQuery} />
              {activeTab === "messenger" ? (
                <ContentArea selectedChannelId={selectedChannelId} onClearSelection={handleClearSelection} onGroupDeleted={handleGroupDeleted} />
              ) : (
                <div className="content-area" style={{ display: "block" }}>
                  <FileList channelId={selectedChannelId} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === "docs" && (
        <>
          <DocList key={docsRefreshTrigger} onSelectDoc={handleDocSelect} onCreateDoc={handleDocCreate} selectedDocId={selectedDoc?.doc_id} refreshTrigger={docsRefreshTrigger} searchQuery={searchQuery} />
          <div className="content-area">
            <DocEditor
              selectedDoc={selectedDoc}
              onDocSaved={handleDocSaved}
              onDocDeleted={() => {
                setSelectedDoc(null);
                setDocsRefreshTrigger((p) => p + 1);
              }}
            />
          </div>
        </>
      )}

      {activeTab === "rapat" && (
        <div className="content-area" style={{ padding: 0, overflow: "hidden" }}>
          <VideoCall incomingCallData={callDataToPass} />
        </div>
      )}

      {activeTab === "kalender" && (
        <div className="content-area" style={{ display: "block" }}>
          <CalendarPage />
        </div>
      )}

      {activeTab === "kontak" && (
        <>
          <div className="sub-sidebar" style={{ display: "block", padding: 0 }}>
            <ContactList onStartDm={handleStartDm} onlineUsers={onlineUsers} searchQuery={searchQuery} />
          </div>
          <div className="content-area">
            <div className="chat-placeholder">
              <span role="img" aria-label="chat" style={{ fontSize: "50px" }}>
                💬
              </span>
              <h3>Pilih kontak untuk mulai mengobrol</h3>
            </div>
          </div>
        </>
      )}

      {activeTab === "admin" && (
        <div className="content-area" style={{ display: "block", padding: 0 }}>
          <AdminDashboard />
        </div>
      )}
    </div>
  );
};

export default MainLayout;
