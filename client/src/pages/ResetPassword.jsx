// File: client/src/pages/ResetPassword.jsx
// (FINAL: DENGAN SHOW/HIDE PASSWORD)

import React, { useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import "../components/auth/Auth.css";

const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // State mata

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { token } = useParams();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      return setError("Password tidak cocok.");
    }

    setLoading(true);
    try {
      const res = await axios.post("https://203.194.115.16.nip.io/api/auth/reset-password", {
        token,
        newPassword,
      });

      setMessage(res.data.message);
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Gagal mereset password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Reset Password</h2>
        <p>Masukkan password baru Anda.</p>

        {error && <div className="error-msg">{error}</div>}
        {message && (
          <div className="success-msg" style={{ color: "green", marginBottom: "15px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
            {message}
          </div>
        )}

        {!message && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Password Baru</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="******" />
                <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Konfirmasi Password</label>
              <div className="password-input-wrapper">
                <input type={showPassword ? "text" : "password"} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required placeholder="******" />
                {/* Kita pakai toggle yang sama untuk kedua field */}
              </div>
            </div>

            <button type="submit" className="btn-auth" disabled={loading}>
              {loading ? "Memproses..." : "Simpan Password Baru"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
