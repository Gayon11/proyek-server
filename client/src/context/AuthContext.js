// File: client/src/context/AuthContext.js

import React, { createContext, useState, useEffect, useContext } from "react";

// 1. Buat Context
const AuthContext = createContext();

// 2. Buat "Penyedia" (Provider)
// Provider ini akan membungkus aplikasi kita
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Saat aplikasi dimuat, cek localStorage
    const token = localStorage.getItem("token");
    if (token) {
      try {
        // Decode token untuk dapat data user (id dan role)
        const payload = JSON.parse(atob(token.split(".")[1]));
        setUser(payload.user); // payload.user berisi { id, role }
      } catch (e) {
        console.error("Token tidak valid saat memuat:", e);
        localStorage.removeItem("token"); // Hapus token rusak
      }
    }
    setLoading(false);
  }, []); // [] = hanya jalan sekali saat app load

  // Nilai yang akan dibagikan ke semua komponen
  const value = {
    user, // Data user (misal: { id: 1, role: 'staf' })
    isAuth: !!user, // boolean (true jika user ada)
    loading, // status loading
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

// 3. Buat "Hook" kustom untuk mempermudah penggunaan
// Komponen lain tinggal panggil 'useAuth()'
export const useAuth = () => {
  return useContext(AuthContext);
};
