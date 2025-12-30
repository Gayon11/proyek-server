// File: client/src/components/routing/ProtectedRoute.jsx

import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const ProtectedRoute = () => {
  // Cek apakah token ada di localStorage
  const token = localStorage.getItem("token");

  if (!token) {
    // Jika tidak ada token, paksa (redirect) ke halaman login
    return <Navigate to="/login" replace />;
  }

  // Jika ada token, izinkan akses ke "anak" rute (yaitu MainLayout)
  return <Outlet />;
};

export default ProtectedRoute;
