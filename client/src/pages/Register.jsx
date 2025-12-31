// File: client/src/pages/Register.jsx
// (FINAL: DENGAN SHOW/HIDE PASSWORD)

import React, { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "../components/auth/Auth.css";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // State untuk toggle mata (terpisah untuk masing-masing kolom)
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");

  const { username, email, password, confirmPassword } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      return setError("Password dan Konfirmasi Password tidak cocok.");
    }

    try {
      await axios.post("https://203.194.115.16.nip.io/api/auth/register", {
        username,
        email,
        password,
      });

      alert("Registrasi Berhasil! Mohon tunggu persetujuan Admin untuk login.");
      navigate("/login");
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Registrasi gagal.");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Daftar Akun</h2>
        <p>Bergabung dengan tim kolaborasi.</p>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={onSubmit} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input type="text" name="username" value={username} onChange={onChange} required placeholder="johndoe" />
          </div>

          <div className="form-group">
            <label>Email</label>
            <input type="email" name="email" value={email} onChange={onChange} required placeholder="nama@email.com" />
          </div>

          {/* INPUT PASSWORD */}
          <div className="form-group">
            <label>Password</label>
            <div className="password-input-wrapper">
              <input type={showPassword ? "text" : "password"} name="password" value={password} onChange={onChange} required placeholder="******" />
              <span className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
              </span>
            </div>
          </div>

          {/* INPUT KONFIRMASI PASSWORD */}
          <div className="form-group">
            <label>Konfirmasi Password</label>
            <div className="password-input-wrapper">
              <input type={showConfirmPassword ? "text" : "password"} name="confirmPassword" value={confirmPassword} onChange={onChange} required placeholder="******" />
              <span className="password-toggle-icon" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                {showConfirmPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
              </span>
            </div>
          </div>

          <button type="submit" className="btn-auth">
            Daftar Sekarang
          </button>
        </form>

        <div className="auth-footer">
          Sudah punya akun?{" "}
          <Link to="/login" className="auth-link">
            Login di sini
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
