// File: client/src/socket.js
import { io } from "socket.io-client";

// Inisialisasi socket satu kali saja di sini
const socket = io("http://203.194.115.16:5000", {
  withCredentials: true,
  transports: ["websocket", "polling"], // Tambahkan polling jaga-jaga
});
export default socket;
