// File: client/src/socket.js
import { io } from "socket.io-client";

// Inisialisasi socket satu kali saja di sini
const socket = io("https://203.194.115.16.nip.io", {
  withCredentials: true,
  transports: ["websocket", "polling"], // Tambahkan polling jaga-jaga
});
export default socket;
