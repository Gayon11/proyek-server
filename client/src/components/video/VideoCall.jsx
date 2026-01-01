// File: client/src/components/video/VideoCall.jsx
// (FINAL: OPERATOR UI + SCREEN SHARE + GOOGLE STUN SERVER FIX)

import React, { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import Peer from "simple-peer";
import { useAuth } from "../../context/AuthContext";
import "./VideoCall.css";

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
  const userStream = useRef(); // PENTING: Simpan stream asli untuk switch back
  const peersRef = useRef([]);
  const { user } = useAuth();

  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");

  // --- STATE BARU UNTUK OPERATOR & SHARE SCREEN ---
  const [isOperator, setIsOperator] = useState(false);
  const [shareRequest, setShareRequest] = useState(null); // Data request {id, name}
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  useEffect(() => {
    // Pastikan URL ini sesuai dengan Backend HTTPS kamu
    socketRef.current = io.connect("https://203.194.115.16.nip.io");

    // 1. Cek Role Saat Join
    socketRef.current.on("your role", (data) => {
      setIsOperator(data.isOperator);
      if (data.isOperator) alert("Anda adalah OPERATOR rapat ini.");
    });

    // 2. Listener: Jika dikeluarkan Operator
    socketRef.current.on("kicked", () => {
      alert("Anda telah dikeluarkan oleh Operator.");
      window.location.reload();
    });

    // 3. Listener: Jika di-mute Operator
    socketRef.current.on("muted by operator", () => {
      alert("Mikrofon Anda dimatikan oleh Operator.");
      if (userStream.current) {
        // Matikan track audio lokal
        userStream.current.getAudioTracks().forEach((track) => (track.enabled = false));
      }
    });

    // 4. Listener (Hanya Operator): Ada member minta izin share screen
    socketRef.current.on("screen share request", (data) => {
      setShareRequest(data); // Tampilkan modal
    });

    // 5. Listener (Member): Izin share screen diterima
    socketRef.current.on("screen share allowed", () => {
      startScreenShare(); // Jalankan fungsi share screen
    });

    return () => {
      socketRef.current.disconnect();
      if (joined) window.location.reload();
    };
    // eslint-disable-next-line
  }, []);

  const joinRoom = () => {
    if (!roomId) return alert("Masukkan Nama Ruang Rapat!");
    setJoined(true);

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        userStream.current = stream; // Simpan referensi stream
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
            peersArr.push({ peerID: u.userID, peer, username: u.userInfo?.username, role: u.userInfo?.role });
          });
          setPeers(peersArr);
        });

        socketRef.current.on("user joined", (payload) => {
          const peer = addPeer(payload.signal, payload.callerID, stream);
          peersRef.current.push({ peerID: payload.callerID, peer });
          setPeers((users) => [
            ...users,
            {
              peerID: payload.callerID,
              peer,
              username: payload.callerInfo?.username,
              role: payload.callerInfo?.role,
            },
          ]);
        });

        socketRef.current.on("receiving returned signal", (payload) => {
          const item = peersRef.current.find((p) => p.peerID === payload.id);
          item.peer.signal(payload.signal);
        });
      })
      .catch((err) => {
        console.error(err);
        alert("Gagal akses kamera/mic.");
        setJoined(false);
      });
  };

  // --- PERBAIKAN DI SINI: MENAMBAHKAN CONFIG STUN SERVER ---
  function createPeer(userToSignal, callerID, stream) {
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
      },
    });

    peer.on("signal", (signal) => socketRef.current.emit("sending signal", { userToSignal, callerID, signal }));
    return peer;
  }

  function addPeer(incomingSignal, callerID, stream) {
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream,
      config: {
        iceServers: [{ urls: "stun:stun.l.google.com:19302" }, { urls: "stun:global.stun.twilio.com:3478" }],
      },
    });

    peer.on("signal", (signal) => socketRef.current.emit("returning signal", { signal, callerID }));
    peer.signal(incomingSignal);
    return peer;
  }

  // --- LOGIKA OPERATOR ---
  const kickUser = (peerID) => {
    if (window.confirm("Keluarkan user ini dari rapat?")) {
      socketRef.current.emit("kick user", peerID);
    }
  };

  const muteUser = (peerID) => {
    socketRef.current.emit("mute user", peerID);
    alert("Perintah mute dikirim.");
  };

  const approveShare = () => {
    if (shareRequest) {
      socketRef.current.emit("allow share screen", shareRequest.requesterId);
      setShareRequest(null); // Tutup modal
    }
  };

  // --- LOGIKA SHARE SCREEN (REPLACE TRACK) ---
  const requestShareScreen = () => {
    if (isOperator) {
      // Operator tidak perlu izin
      startScreenShare();
    } else {
      // Member harus minta izin
      socketRef.current.emit("request share screen", roomId);
      alert("Permintaan dikirim ke Operator. Mohon tunggu...");
    }
  };

  const startScreenShare = () => {
    navigator.mediaDevices
      .getDisplayMedia({ cursor: true })
      .then((screenStream) => {
        setIsScreenSharing(true);
        const screenTrack = screenStream.getVideoTracks()[0];

        // Ganti track video di semua koneksi peer
        peersRef.current.forEach((p) => {
          // Cari sender video di dalam koneksi peer
          const sender = p.peer._pc.getSenders().find((s) => s.track.kind === "video");
          if (sender) {
            sender.replaceTrack(screenTrack);
          }
        });

        // Tampilkan layar sendiri di preview lokal
        if (userVideo.current) userVideo.current.srcObject = screenStream;

        // Jika user stop sharing lewat browser UI
        screenTrack.onended = () => {
          stopScreenShare();
        };
      })
      .catch((err) => console.log("Share screen cancelled", err));
  };

  const stopScreenShare = () => {
    setIsScreenSharing(false);
    // Ambil kembali track video dari kamera asli
    const videoTrack = userStream.current.getVideoTracks()[0];

    peersRef.current.forEach((p) => {
      const sender = p.peer._pc.getSenders().find((s) => s.track.kind === "video");
      if (sender) {
        sender.replaceTrack(videoTrack);
      }
    });

    // Kembalikan preview lokal ke kamera
    if (userVideo.current) userVideo.current.srcObject = userStream.current;
  };

  if (!joined) {
    return (
      <div className="join-room-container">
        <h2>📞 Ruang Rapat Video</h2>
        <div className="join-card">
          <input type="text" placeholder="Nama Ruang (ID)" value={roomId} onChange={(e) => setRoomId(e.target.value)} className="room-input" />
          <button onClick={joinRoom} className="btn-join">
            Gabung Rapat
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="video-call-container-group">
      {/* MODAL APPROVAL UNTUK OPERATOR */}
      {isOperator && shareRequest && (
        <div className="request-overlay">
          <div className="request-modal">
            <h4>Permintaan Share Screen</h4>
            <p>
              <strong>{shareRequest.username}</strong> ingin membagikan layar.
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
        {/* Video Saya */}
        <div className="video-card my-video">
          <video muted ref={userVideo} autoPlay playsInline />
          <span className="video-label">Anda {isOperator ? "(Operator)" : ""}</span>
        </div>

        {/* Video Peserta Lain */}
        {peers.map((peerObj, index) => {
          return (
            <div className="video-card-wrapper" key={index}>
              <Video peer={peerObj.peer} />
              <span className="video-label">
                {peerObj.username}
                {/* TOMBOL KHUSUS OPERATOR */}
                {isOperator && (
                  <span className="op-controls">
                    <button onClick={() => muteUser(peerObj.peerID)} title="Mute Mic">
                      🎤🚫
                    </button>
                    <button onClick={() => kickUser(peerObj.peerID)} title="Keluarkan">
                      ❌
                    </button>
                  </span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <div className="controls-bar">
        <p>
          ID: <strong>{roomId}</strong> {isOperator && <span style={{ color: "#f1c40f" }}>(Operator)</span>}
        </p>
        <div className="control-buttons">
          <button
            // Gunakan conditional class 'sharing' jika sedang share screen
            className={`btn-share ${isScreenSharing ? "sharing" : ""}`}
            onClick={isScreenSharing ? stopScreenShare : requestShareScreen}
          >
            {/* Ubah Ikon dan Teks berdasarkan status */}
            {isScreenSharing ? (
              <>
                <i className="bi bi-stop-circle-fill"></i> Stop Share
              </>
            ) : (
              <>
                <i className="bi bi-display"></i> Share Screen
              </>
            )}
          </button>
          <button className="btn-hangup" onClick={() => window.location.reload()}>
            <i className="bi bi-telephone-x-fill"></i> Keluar
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoCall;
