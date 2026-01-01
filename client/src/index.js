// File: client/src/index.js
// (FINAL FIX: REMOVE STRICT MODE + ADD AUTH PROVIDER + POLYFILLS)

// 1. SEMUA IMPORT HARUS DI PALING ATAS
import * as process from "process";
import { Buffer } from "buffer";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App";
import Modal from "react-modal";

// PENTING: Import AuthProvider agar login jalan
import { AuthProvider } from "./context/AuthContext";

// 2. BARU JALANKAN POLYFILL SETELAH IMPORT
if (typeof window !== "undefined") {
  window.global = window;
  window.process = process;
  window.Buffer = Buffer;
}

// 3. KONFIGURASI APP
Modal.setAppElement("#root");

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  // StrictMode SUDAH DIMATIKAN (agar Video Call stabil)
  <BrowserRouter>
    <AuthProvider>
      {" "}
      {/* <--- INI WAJIB ADA */}
      <App />
    </AuthProvider>
  </BrowserRouter>
);
