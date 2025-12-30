// File: client/src/App.js
// (FINAL: ROUTING LENGKAP & BERSIH)

import React from "react";
import { Routes, Route } from "react-router-dom";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";

// Layout & Components
import MainLayout from "./components/layout/MainLayout";
import ProtectedRoute from "./components/routing/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import "./App.css";

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* --- Rute Publik --- */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Rute Reset Password (dengan parameter token) */}
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* --- Rute Terproteksi (Butuh Login) --- */}
        <Route element={<ProtectedRoute />}>
          {/* MainLayout menangani semua rute internal */}
          <Route path="/*" element={<MainLayout />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
