// File: client/src/components/video/VideoCall.jsx
// (FINAL FIX: CORRECT CONTACT FETCHING + SORTING)

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import axios from "axios";
import { useAuth } from "../../context/AuthContext";
import "./VideoCall.css";

// URL Backend (Sesuaikan jika beda)
const SERVER_URL = "https://203.194.115.16.nip.io";

const Video = ({ peer }) => {
  const ref = useRef();
  useEffect(() => {
    peer.on("stream", (stream) => {
      if (ref.current) ref.current.srcObject = stream;
    });
  }, [peer]);
  return (
    <div className="video-card">
      <video playsInline autoPlay ref={ref} />
    </div>
  );
};

const VideoCall = () => {
  const [peers, setPeers] = useState([]);
  const socketRef = useRef();
  const userVideo = useRef();
  const userStream = useRef();
  const peersRef = useRef([]);
  const { user } = useAuth(); // Data user yang login

  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");

  // STATE FITUR BARU
  const [isOperator, setIsOperator] = useState(false);
  const [shareRequest, setShareRequest] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  // STATE INVITE KONTAK
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [invitation, setInvitation] = useState(null); // Jika ada undangan masuk

  useEffect(() => {
    socketRef.current = io.connect(SERVER_URL);

    // 0. Lapor ke server bahwa saya Online (untuk fitur invite)
    if (user?.username) {
      socketRef.current.emit("newUser", user.username);
    }

    // LISTENER INVITE DARI ORANG LAIN
    socketRef.current.on("getInvitation", (data) => {
      setInvitation(data); // Tampilkan popup terima/tolak
    });

    // Listener Role & Operator (Kode Lama)
    socketRef.current.on("your role", (data) => setIsOperator(data.isOperator));
    socketRef.current.on("kicked", () => {
      alert("Anda dikeluarkan.");
      window.location.reload();
    });
    socketRef.current.on("muted by operator", () => {
      alert("Di-mute oleh Operator.");
      if (userStream.current) userStream.current.getAudioTracks().forEach((t) => (t.enabled = false));
    });
    socketRef.current.on("screen share request", (data) => setShareRequest(data));
    socketRef.current.on("screen share allowed", () => startScreenShare());

    return () => {
      socketRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, [user]);

  // --- FUNGSI AMBIL KONTAK (DIPERBAIKI) ---
  const fetchContacts = async () => {
    try {
      // 1. Ambil token
      const token = localStorage.getItem("token");

      // 2. Request ke endpoint /api/users dengan header x-auth-token
      const res = await axios.get(`${SERVER_URL}/api/users`, {
        headers: { "x-auth-token": token },
      });

      // 3. Urutkan User (Owner -> HRD -> Staf -> Admin)
      const rolePriority = { owner: 1, hrd: 2, staf: 3, admin: 4 };
      const sortedUsers = res.data.sort((a, b) => {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;
        return priorityA - priorityB;
      });

      console.log("Kontak berhasil diambil:", sortedUsers);
      setContacts(sortedUsers);
      setShowInviteModal(true);
    } catch (err) {
      console.error("Gagal ambil kontak:", err);
      alert("Gagal memuat kontak. Pastikan Anda sudah login.");

      // Data dummy darurat
      setContacts([{ user_id: 99, username: "Gagal Memuat Kontak" }]);
      setShowInviteModal(true);
    }
  };

  // --- FUNGSI KIRIM UNDANGAN ---
  const sendInviteTo = (contactUsername) => {
    socketRef.current.emit("sendInvitation", {
      senderName: user.username,
      receiverName: contactUsername,
      roomId: roomId, // ID Room saat ini
    });
    alert(`Undangan dikirim ke ${contactUsername}`);
  };

  // --- FUNGSI TERIMA UNDANGAN ---
  const acceptInvitation = () => {
    setRoomId(invitation.roomId);
    setInvitation(null);
    // Otomatis join room setelah setRoomId (perlu user klik gabung lagi atau otomatis)
    // Untuk safety, kita isi kolom input saja
  };

  const joinRoom = () => {
    if (!roomId) return alert("Masukkan Nama Ruang Rapat!");
    setJoined(true);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userStream.current = stream;
        if (userVideo.current) userVideo.current.srcObject = stream;

        socketRef.current.emit("join room", {
          roomID: roomId,
          userData: { username: user.username, role: user.role },
        });

        socketRef.current.on("all users", (usersData) => {
          const peersArr = [];
          usersData.forEach((u) => {
            const peer = createPeer(u.userID, socketRef.current.id, stream);
            peersRef.current.push({ peerID: u.userID, peer });
            peersArr.push({ peerID: u.userID, peer, username: u.userInfo?.username });
          });
          setPeers(peersArr);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({ peerID: payload.callerID, peer });
          setPeers((users) => [...users, { peerID: payload.callerID, peer, username: payload.callerInfo?.username }]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });
      })
      .catch((err) => {
        console.error(err);
        alert("Gagal akses kamera.");
        setJoined(false);
      });
  };

  // --- GOOGLE STUN SERVER (FIX BLACK SCREEN) ---
  const stunConfig = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
  };

  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({ initiator: true, trickle: false, stream, config: stunConfig });
    peer.on("signal", (signal) => socketRef.current.emit("sending signal", { userToSignal, callerID, signal }));
    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({ initiator: false, trickle: false, stream, config: stunConfig });
    peer.on("signal", (signal) => socketRef.current.emit("returning signal", { signal, callerID }));
    peer.signal(incomingSignal);
    return peer;
  }

  // --- LOGIKA OPERATOR & SHARE SCREEN (SAMA SEPERTI SEBELUMNYA) ---
  const kickUser = (peerID) => {
    if (window.confirm("Keluarkan?")) socketRef.current.emit("kick user", peerID);
  };
  const muteUser = (peerID) => {
    socketRef.current.emit("mute user", peerID);
  };
  const approveShare = () => {
    if (shareRequest) {
      socketRef.current.emit("allow share screen", shareRequest.requesterId);
      setShareRequest(null);
    }
  };
  const requestShareScreen = () => {
    if (isOperator) startScreenShare();
    else {
      socketRef.current.emit("request share screen", roomId);
      alert("Menunggu izin Operator...");
    }
  };
  const startScreenShare = () => {
    navigator.mediaDevices
      .getDisplayMedia({ cursor: true })
      .then((screenStream) => {
        setIsScreenSharing(true);
        const screenTrack = screenStream.getVideoTracks()[0];
        peersRef.current.forEach((p) => {
          const sender = p.peer._pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) sender.replaceTrack(screenTrack);
        });
        if (userVideo.current) userVideo.current.srcObject = screenStream;
        screenTrack.onended = () => stopScreenShare();
      })
      .catch((err) => console.log(err));
  };
  const stopScreenShare = () => {
    setIsScreenSharing(false);
    const videoTrack = userStream.current.getVideoTracks()[0];
    peersRef.current.forEach((p) => {
      const sender = p.peer._pc.getSenders().find((s) => s.track.kind === "video");
      if (sender) sender.replaceTrack(videoTrack);
    });
    if (userVideo.current) userVideo.current.srcObject = userStream.current;
  };

  // --- RENDER HALAMAN UTAMA (JOIN) ---
  if (!joined) {
    return (
      <div className="join-room-container">
        <h2>📞 Ruang Rapat Video</h2>

        {/* NOTIFIKASI JIKA ADA UNDANGAN */}
        {invitation && (
          <div className="invitation-alert">
            <p>
              🔔 <strong>{invitation.senderName}</strong> mengundang Anda ke rapat: <strong>{invitation.roomId}</strong>
            </p>
            <button onClick={acceptInvitation} className="btn-accept">
              Terima & Isi ID
            </button>
            <button onClick={() => setInvitation(null)} className="btn-reject">
              Abaikan
            </button>
          </div>
        )}

        <div className="join-card">
          <input type="text" placeholder="Nama Ruang (ID)" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="room-input" />
          <button onClick={joinRoom} className="btn-join">
            Gabung Rapat
          </button>
        </div>
      </div>
    );
  }

  // --- RENDER HALAMAN RAPAT (VIDEOS) ---
  return (
    <div className="video-call-container-group">
      {/* MODAL DAFTAR KONTAK (INVITE) */}
      {showInviteModal && (
        <div className="request-overlay">
          <div className="request-modal" style={{ maxHeight: "400px", overflowY: "auto" }}>
            <h4>📧 Undang Teman</h4>
            <div className="contact-list">
              {contacts.map((c) => (
                <div key={c.user_id || c.id} className="contact-item" style={{ display: "flex", justifyContent: "space-between", padding: "10px", borderBottom: "1px solid #eee" }}>
                  <span>
                    {c.username} ({c.role})
                  </span>
                  <button onClick={() => sendInviteTo(c.username)} style={{ background: "#27ae60", color: "white", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer" }}>
                    Undang
                  </button>
                </div>
              ))}
              {contacts.length === 0 && <p>Tidak ada kontak ditemukan.</p>}
            </div>
            <button className="btn-reject" style={{ marginTop: "15px", width: "100%" }} onClick={() => setShowInviteModal(false)}>
              Tutup
            </button>
          </div>
        </div>
      )}

      {/* MODAL APPROVAL SHARE SCREEN */}
      {isOperator && shareRequest && (
        <div className="request-overlay">
          <div className="request-modal">
            <h4>Permintaan Share Screen</h4>
            <p>
              <strong>{shareRequest.username}</strong> ingin share screen.
            </p>
            <div className="request-actions">
              <button className="btn-approve" onClick={approveShare}>
                Izinkan
              </button>
              <button className="btn-reject" onClick={() => setShareRequest(null)}>
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="video-grid-group">
        <div className="video-card my-video">
          <video muted ref={userVideo} autoPlay playsInline />
          <span className="video-label">Anda {isOperator ? "(Operator)" : ""}</span>
        </div>
        {peers.map((peerObj, index) => (
          <div className="video-card-wrapper" key={index}>
            <Video peer={peerObj.peer} />
            <span className="video-label">
              {peerObj.username}
              {isOperator && (
                <span className="op-controls">
                  <button onClick={() => muteUser(peerObj.peerID)}>🎤🚫</button>
                  <button onClick={() => kickUser(peerObj.peerID)}>❌</button>
                </span>
              )}
            </span>
          </div>
        ))}
      </div>

      <div className="controls-bar">
        <p>
          ID: <strong>{roomId}</strong>
        </p>
        <div className="control-buttons">
          {/* TOMBOL UNDANG BARU */}
          <button className="btn-invite" style={{ background: "#8e44ad" }} onClick={fetchContacts}>
            <i className="bi bi-person-plus-fill"></i> Undang
          </button>

          <button className={`btn-share ${isScreenSharing ? "sharing" : ""}`} onClick={isScreenSharing ? stopScreenShare : requestShareScreen}>
            {isScreenSharing ? "Stop Share" : "Share Screen"}
          </button>
          <button className="btn-hangup" onClick={() => window.location.reload()}>
            Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
