// File: client/src/components/layout/ChatWindow.jsx
// (FINAL: MENAMPILKAN ROLE DI BUBBLE CHAT)

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import socket from "../../socket";
import { format } from "date-fns";
import "./ChatWindow.css";
import { useAuth } from "../../context/AuthContext";
import ChatHeader from "./ChatHeader";

const ChatWindow = ({ channelId, onClearSelection, onGroupDeleted }) => {
  const [messages, setMessages] = useState([]);
  const [memberReadTimes, setMemberReadTimes] = useState([]);
  const [channelName, setChannelName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const { user } = useAuth();

  const chatMessagesRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- FETCH DATA ---
  useEffect(() => {
    if (!channelId) return;
    setMessages([]);
    setMemberReadTimes([]);
    setChannelName("");
    setIsPrivate(false);

    const fetchMessagesAndChannel = async () => {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("token");
      try {
        const [dataRes, channelsRes] = await Promise.all([
          axios.get(`https://203.194.115.16.nip.io/api/messages/${channelId}`, {
            headers: { "x-auth-token": token },
          }),
          axios.get("https://203.194.115.16.nip.io/api/channels", {
            headers: { "x-auth-token": token },
          }),
        ]);

        setMessages(dataRes.data.messages.filter((msg) => msg.status !== "unsent"));
        setMemberReadTimes(dataRes.data.memberReadTimes || []);

        const currentChannel = channelsRes.data.find((c) => c.channel_id === channelId);
        if (currentChannel) {
          setChannelName(currentChannel.name);
          setIsPrivate(currentChannel.is_private);
        }

        if (user) {
          socket.emit("readMessages", { channelId, userId: user.id });
        }
      } catch (err) {
        console.error("Gagal:", err);
        setError("Gagal memuat data");
      } finally {
        setLoading(false);
      }
    };
    fetchMessagesAndChannel();
  }, [channelId, user]);

  // --- SOCKET LISTENERS ---
  useEffect(() => {
    socket.on("receiveMessage", (incomingMessage) => {
      if (incomingMessage.channel_id === channelId) {
        setMessages((prev) => {
          const exists = prev.find((m) => m.message_id === incomingMessage.message_id);
          if (exists) return prev;
          return [...prev, incomingMessage];
        });

        if (user && incomingMessage.user_id !== user.id) {
          socket.emit("readMessages", { channelId, userId: user.id });
        }
      }
    });

    socket.on("messageUnsent", (data) => {
      if (data.channelId === channelId) {
        setMessages((prev) => prev.filter((msg) => msg.message_id !== data.messageId));
      }
    });

    socket.on("readUpdate", (data) => {
      if (data.channelId === channelId) {
        setMemberReadTimes((prev) => {
          const filtered = prev.filter((m) => String(m.user_id) !== String(data.userId));
          return [...filtered, { user_id: data.userId, last_read_timestamp: data.readAt }];
        });
      }
    });

    return () => {
      socket.off("receiveMessage");
      socket.off("messageUnsent");
      socket.off("readUpdate");
    };
  }, [channelId, user]);

  // Auto-scroll
  useEffect(() => {
    if (chatMessagesRef.current) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight;
    }
  }, [messages, memberReadTimes]);

  const getReadStatus = (msg) => {
    const otherMembers = memberReadTimes.filter((m) => String(m.user_id) !== String(user.id));
    if (otherMembers.length === 0) return <span className="tick">✓</span>;
    const msgTime = new Date(msg.created_at).getTime();
    const isRead = otherMembers.some((m) => new Date(m.last_read_timestamp).getTime() >= msgTime);
    return isRead ? <span className="tick read">✓✓</span> : <span className="tick">✓</span>;
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (newMessage.trim() === "" || !user || !channelId) return;

    const tempMsg = {
      message_id: Date.now(),
      channel_id: channelId,
      user_id: user.id,
      sender_username: user.username,
      content: newMessage,
      created_at: new Date().toISOString(),
      file_url: null,
      file_type: null,
      status: "sent",
      sender_avatar: user.avatar_url,
      sender_role: user.role, // Optimistic Role
    };
    setMessages((prev) => [...prev, tempMsg]);

    socket.emit("sendMessage", {
      channelId: channelId,
      userId: user.id,
      content: newMessage,
      fileUrl: null,
      fileType: null,
    });
    setNewMessage("");
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("https://203.194.115.16.nip.io/api/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { fileUrl, fileType, originalName } = res.data;

      const tempMsg = {
        message_id: Date.now(),
        channel_id: channelId,
        user_id: user.id,
        sender_username: user.username,
        content: originalName,
        created_at: new Date().toISOString(),
        file_url: fileUrl,
        file_type: fileType,
        status: "sent",
        sender_avatar: user.avatar_url,
        sender_role: user.role,
      };
      setMessages((prev) => [...prev, tempMsg]);

      socket.emit("sendMessage", {
        channelId: channelId,
        userId: user.id,
        content: originalName,
        fileUrl: fileUrl,
        fileType: fileType,
      });
    } catch (err) {
      alert("Gagal mengupload file.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleUnsend = async (messageId) => {
    if (!window.confirm("Tarik pesan ini?")) return;
    setMessages((prev) => prev.filter((msg) => msg.message_id !== messageId));
    socket.emit("unsendMessage", { messageId, userId: user.id });
  };

  if (loading) return <div className="chat-window-loading">Memuat...</div>;
  if (error) return <div className="chat-window-loading">Error: {error}</div>;

  return (
    <div className="chat-window">
      <div className="chat-header-mobile">
        <button onClick={onClearSelection}>&larr; Kembali</button>
        <h4 className="mobile-channel-name">{channelName}</h4>
      </div>

      <ChatHeader channelName={channelName} channelId={channelId} onGroupDeleted={onGroupDeleted} isPrivate={isPrivate} />

      <div className="chat-messages" ref={chatMessagesRef}>
        {messages.map((msg) => {
          const isMine = msg.user_id === user.id;

          const avatarSrc = msg.sender_avatar ? `https://203.194.115.16.nip.io${msg.sender_avatar}` : null;
          const initial = msg.sender_username ? msg.sender_username.charAt(0).toUpperCase() : "?";

          return (
            <div key={msg.message_id} className={`message-item-wrapper ${isMine ? "mine" : "other"}`}>
              {/* AVATAR (Hanya untuk Grup) */}
              {!isMine && !isPrivate && <div className="chat-msg-avatar">{avatarSrc ? <img src={avatarSrc} alt="ava" /> : <div className="chat-msg-initial">{initial}</div>}</div>}

              <div className="message-stack">
                <div className="message-timestamp-top">
                  {/* NAMA + ROLE (Hanya untuk Grup) */}
                  {!isMine && !isPrivate && (
                    <span style={{ fontWeight: "bold", marginRight: "5px", color: "#3f0e40" }}>
                      {msg.sender_username} <small style={{ fontWeight: "normal", color: "#666", fontSize: "0.75rem" }}>({msg.sender_role})</small> •
                    </span>
                  )}
                  {format(new Date(msg.created_at), "HH:mm")}
                </div>

                <div className="message-content">
                  {msg.content && !msg.file_url && <span className="message-text">{msg.content}</span>}

                  {msg.file_url && msg.file_type === "image" && (
                    <div className="message-image">
                      <img src={`https://203.194.115.16.nip.io${msg.file_url}`} alt="Attachment" onClick={() => window.open(`https://203.194.115.16.nip.io${msg.file_url}`, "_blank")} />
                      <div style={{ fontSize: "0.8rem", marginTop: "5px", opacity: 0.8 }}>{msg.content}</div>
                    </div>
                  )}

                  {msg.file_url && msg.file_type === "file" && (
                    <div className="message-file" style={{ marginTop: "5px" }}>
                      <a href={`https://203.194.115.16.nip.io${msg.file_url}`} target="_blank" rel="noopener noreferrer" style={{ color: isMine ? "#fff" : "#3f0e40", fontWeight: "bold", display: "flex", alignItems: "center", gap: "5px" }}>
                        <i className="bi bi-file-earmark-text" style={{ fontSize: "1.2rem" }}></i> {msg.content || "Lihat Lampiran"}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {isMine && (
                <div className="message-status-area">
                  {getReadStatus(msg)}
                  <button className="unsend-btn" onClick={() => handleUnsend(msg.message_id)}>
                    &times;
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <form className="chat-input-area" onSubmit={handleSendMessage}>
        <input type="file" style={{ display: "none" }} ref={fileInputRef} onChange={handleFileSelect} />
        <button type="button" className="btn-attach" onClick={() => fileInputRef.current.click()} title="Kirim File/Gambar">
          <i className="bi bi-paperclip"></i>
        </button>
        <input type="text" placeholder="Ketik pesan..." value={newMessage} onChange={(e) => setNewMessage(e.target.value)} />
        <button type="submit">Kirim</button>
      </form>
    </div>
  );
};

export default ChatWindow;
