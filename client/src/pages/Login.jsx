// File: client/src/pages/Login.jsx
// (FINAL: DENGAN SHOW/HIDE PASSWORD)

import React, { useState } from "react";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import "../components/auth/Auth.css";

const Login = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    otp: "",
  });
  const [showPassword, setShowPassword] = useState(false); // <-- State baru
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);
  const navigate = useNavigate();

  const { email, password, otp } = formData;

  const onChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const onLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMsg(null);

    try {
      const res = await axios.post("http://203.194.115.16:5000/api/auth/login", {
        email,
        password,
      });

      if (res.data.requireOtp) {
        setStep(2);
        setMsg(res.data.message);
      }
    } catch (err) {
      const errorMessage = err.response ? err.response.data.message : "Login gagal.";
      setError(errorMessage);
    }
  };

  const onOtpSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await axios.post("http://203.194.115.16:5000/api/auth/verify-otp", {
        email,
        otp,
      });

      localStorage.setItem("token", res.data.token);
      navigate("/");
      window.location.reload();
    } catch (err) {
      const errorMessage = err.response ? err.response.data.message : "Verifikasi gagal.";
      setError(errorMessage);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{step === 1 ? "Login" : "Verifikasi OTP"}</h2>
        <p>{step === 1 ? "Selamat datang kembali!" : `Masukkan kode yang dikirim ke ${email}`}</p>

        {error && <div className="error-msg">{error}</div>}
        {msg && (
          <div className="success-msg" style={{ color: "green", marginBottom: "15px", padding: "10px", backgroundColor: "#e8f5e9", borderRadius: "4px" }}>
            {msg}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={onLoginSubmit} className="auth-form">
            <div className="form-group">
              <label>Email</label>
              <input type="email" name="email" value={email} onChange={onChange} required placeholder="nama@email.com" />
            </div>

            <div className="form-group">
              <label>Password</label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"} // Toggle tipe
                  name="password"
                  value={password}
                  onChange={onChange}
                  required
                  placeholder="******"
                />
                <span className="password-toggle-icon" onClick={togglePasswordVisibility}>
                  {showPassword ? <i className="bi bi-eye-slash"></i> : <i className="bi bi-eye"></i>}
                </span>
              </div>
            </div>

            <button type="submit" className="btn-auth">
              Lanjut
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={onOtpSubmit} className="auth-form">
            <div className="form-group">
              <label>Kode OTP</label>
              <input type="text" name="otp" value={otp} onChange={onChange} required placeholder="123456" maxLength="6" style={{ letterSpacing: "5px", textAlign: "center", fontSize: "1.2rem" }} />
            </div>

            <button type="submit" className="btn-auth">
              Verifikasi & Masuk
            </button>

            <button
              type="button"
              className="btn-link"
              style={{ background: "none", border: "none", color: "#888", marginTop: "10px", cursor: "pointer", textDecoration: "underline" }}
              onClick={() => {
                setStep(1);
                setError(null);
                setMsg(null);
              }}
            >
              Kembali
            </button>
          </form>
        )}

        {step === 1 && (
          <div className="auth-footer">
            Belum punya akun?{" "}
            <Link to="/register" className="auth-link">
              Daftar di sini
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default Login;
