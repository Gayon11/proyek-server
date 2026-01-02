// File: server/index.js
// (FINAL FULL: OPERATOR ROLE + PERMISSIONS + KICK/MUTE + CHAT FIXES)

const express = require("express");
const cors = require("cors");
require("dotenv").config();
const pool = require("./db");
const path = require("path");

const http = require("http");
const { Server } = require("socket.io");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// === Routes ===
app.get("/", (req, res) => {
  res.send("Halo! Server backend KP kamu sudah berjalan.");
});
app.use("/api/auth", require("./routes/auth"));
app.use("/api/channels", require("./routes/channels"));
app.use("/api/messages", require("./routes/messages"));
app.use("/api/users", require("./routes/users"));
app.use("/api/documents", require("./routes/documents"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/events", require("./routes/events"));
app.use("/api/admin", require("./routes/admin"));

// === VARIABEL GLOBAL UNTUK GROUP CALL ===
const usersInRoom = {}; // Format: { roomID: [socketId, ...] }
const socketToUser = {}; // Format: { socketId: { username, role } }
const roomDetails = {}; // Format: { roomID: { operatorId: socketId } } <-- BARU: Data Operator
let onlineUsers = []; // Format: [{ userId, socketId }]

io.on("connection", (socket) => {
  console.log(`User terhubung: ${socket.id}`);

  // ==========================================
  // 1. LOGIKA MESSENGER (CHAT)
  // ==========================================
  socket.on("sendMessage", async (messageData) => {
    const { channelId, userId, content, fileUrl, fileType } = messageData;
    try {
      const newMessage = await pool.query(
        `INSERT INTO Messages (channel_id, user_id, content, status, file_url, file_type)
         VALUES ($1, $2, $3, 'sent', $4, $5)
         RETURNING message_id, channel_id, user_id, content, created_at, status, file_url, file_type`,
        [channelId, userId, content || "", fileUrl || null, fileType || null]
      );

      await pool.query(`UPDATE Channel_Members SET is_visible = true WHERE channel_id = $1`, [channelId]);

      await pool.query(`UPDATE Channel_Members SET last_read_timestamp = NOW() WHERE user_id = $1 AND channel_id = $2`, [userId, channelId]);

      const membersRes = await pool.query("SELECT user_id FROM Channel_Members WHERE channel_id = $1", [channelId]);
      const memberIds = membersRes.rows.map((r) => r.user_id);

      const savedMessage = newMessage.rows[0];
      const userData = await pool.query("SELECT username FROM Users WHERE user_id = $1", [savedMessage.user_id]);

      const fullMessageData = {
        ...savedMessage,
        sender_username: userData.rows[0].username,
      };

      socket.broadcast.emit("receiveMessage", fullMessageData);
      io.emit("dmCreated", { members: memberIds });

      console.log("Pesan terkirim:", fullMessageData.message_id);
    } catch (err) {
      console.error("Error saat 'sendMessage':", err.message);
    }
  });

  socket.on("readMessages", async ({ channelId, userId }) => {
    try {
      await pool.query(`UPDATE Channel_Members SET last_read_timestamp = NOW() WHERE user_id = $1 AND channel_id = $2`, [userId, channelId]);
      io.emit("readUpdate", { channelId, userId, readAt: new Date().toISOString() });
    } catch (err) {
      console.error("Error readMessages:", err);
    }
  });

  socket.on("unsendMessage", async (data) => {
    const { messageId, userId } = data;
    try {
      const message = await pool.query("SELECT user_id, channel_id FROM Messages WHERE message_id = $1", [messageId]);
      if (message.rows.length === 0) return;
      if (message.rows[0].user_id !== userId) return;
      const updatedMessage = await pool.query(`UPDATE Messages SET status = 'unsent', unsent_at = NOW() WHERE message_id = $1 RETURNING message_id, channel_id`, [messageId]);
      io.emit("messageUnsent", { messageId: updatedMessage.rows[0].message_id, channelId: updatedMessage.rows[0].channel_id });
    } catch (err) {
      console.error(err);
    }
  });

  // ==========================================
  // 2. LOGIKA GROUP VIDEO CALL (OPERATOR & PERMISSION)
  // ==========================================

  // Menerima payload: { roomID, userData: { username, role } }
  socket.on("join room", (payload) => {
    const { roomID, userData } = payload;

    // Simpan info user
    socketToUser[socket.id] = userData;

    // Masukkan ke Room
    if (usersInRoom[roomID]) {
      usersInRoom[roomID].push(socket.id);
    } else {
      usersInRoom[roomID] = [socket.id];
      // Orang PERTAMA yang buat room jadi OPERATOR
      roomDetails[roomID] = { operatorId: socket.id };
    }

    // Ambil user lain
    const otherUsersInRoom = usersInRoom[roomID].filter((id) => id !== socket.id);

    // Siapkan data user lain untuk dikirim
    const usersPayload = otherUsersInRoom.map((id) => ({
      userID: id,
      userInfo: socketToUser[id],
    }));

    // Kirim daftar user lama ke user baru
    socket.emit("all users", usersPayload);

    // Beritahu user baru apakah dia Operator atau bukan
    const isOperator = roomDetails[roomID].operatorId === socket.id;
    socket.emit("your role", { isOperator });
  });

  socket.on("sending signal", (payload) => {
    io.to(payload.userToSignal).emit("user joined", {
      signal: payload.signal,
      callerID: payload.callerID,
      callerInfo: socketToUser[payload.callerID],
    });
  });

  socket.on("returning signal", (payload) => {
    io.to(payload.callerID).emit("receiving returned signal", {
      signal: payload.signal,
      id: socket.id,
    });
  });

  // --- FITUR KHUSUS OPERATOR ---

  // 1. Kick User
  socket.on("kick user", (targetSocketId) => {
    io.to(targetSocketId).emit("kicked"); // Kirim sinyal 'kamu dikeluarkan'
  });

  // 2. Mute User
  socket.on("mute user", (targetSocketId) => {
    io.to(targetSocketId).emit("muted by operator");
  });

  // 3. Request Share Screen
  socket.on("request share screen", (roomID) => {
    const operatorId = roomDetails[roomID]?.operatorId;
    if (operatorId) {
      // Kirim permintaan izin ke Operator
      io.to(operatorId).emit("screen share request", {
        requesterId: socket.id,
        username: socketToUser[socket.id].username,
      });
    }
  });

  // 4. Allow Share Screen
  socket.on("allow share screen", (requesterId) => {
    io.to(requesterId).emit("screen share allowed");
  });

  // ==========================================
  // 3. FITUR LAIN (Docs, Online Status)
  // ==========================================

  socket.on("addUser", (userId) => {
    if (!onlineUsers.some((u) => u.userId === userId)) {
      onlineUsers.push({ userId, socketId: socket.id });
    }
    io.emit("getOnlineUsers", onlineUsers);
  });

  socket.on("dmCreated", (data) => io.emit("dmCreated", data));
  socket.on("docSaved", (data) => socket.broadcast.emit("docUpdateReceived", data));
  socket.on("docCreated", (newDoc) => socket.broadcast.emit("docCreated", newDoc));
  socket.on("docDeleted", (data) => socket.broadcast.emit("docDeleted", data));

  // ==========================================
  // 4. DISCONNECT HANDLING (UPDATED)
  // ==========================================
  socket.on("disconnect", () => {
    console.log(`User terputus: ${socket.id}`);

    delete socketToUser[socket.id];
    onlineUsers = onlineUsers.filter((user) => user.socketId !== socket.id);
    io.emit("getOnlineUsers", onlineUsers);

    const roomID = Object.keys(usersInRoom).find((key) => usersInRoom[key].includes(socket.id));
    if (roomID) {
      usersInRoom[roomID] = usersInRoom[roomID].filter((id) => id !== socket.id);

      // JIKA OPERATOR KELUAR -> PINDAHKAN ROLE KE ORANG BERIKUTNYA
      if (roomDetails[roomID]?.operatorId === socket.id) {
        if (usersInRoom[roomID].length > 0) {
          const newOperator = usersInRoom[roomID][0];
          roomDetails[roomID].operatorId = newOperator;
          // Beritahu orang itu bahwa dia sekarang Operator
          io.to(newOperator).emit("your role", { isOperator: true });
        } else {
          delete roomDetails[roomID];
        }
      }

      if (usersInRoom[roomID].length === 0) {
        delete usersInRoom[roomID];
        delete roomDetails[roomID];
      }
    }
  });
});

server.listen(port, () => {
  console.log(`Server berjalan di http://localhost:${port}`);
});
