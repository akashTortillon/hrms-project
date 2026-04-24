import { useState } from "react";
import { loginUser } from "../../api/authService";
import { useNavigate } from "react-router-dom";
import "../../style/loginAuth.css";
import { toast } from "react-toastify";
import ibillLogo from "../../assets/images/ibill-hrm-logo.jpeg";

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Email and password are required");
      return;
    }
    try {
      setLoading(true);
      const data = await loginUser(form);
      if (!data || !data.token) {
        throw new Error("Invalid response from server");
      }
      localStorage.setItem("token", data.token);
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userRole", data.role || "Employee");
        localStorage.setItem("userPermissions", JSON.stringify(data.permissions || []));
      } else if (data.role) {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userPermissions", JSON.stringify(data.permissions || []));
      }
      toast.success("Login successful 🎉");
      navigate("/app/dashboard", { replace: true });
    } catch (err) {
      toast.error(err.message || "Login failed ❌");
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        {/* LEFT BRAND PANEL */}
        <div className="login-brand-panel">
          <div className="login-brand-content">
            <div className="kayzan-logo-wrap">
              <img src={ibillLogo} alt="iBill HRM" style={{ width: "160px", height: "auto", objectFit: "contain" }} />
            </div>
            <div className="kayzan-wordmark">
              <span className="kayzan-name">iBill HRM</span>
              <span className="kayzan-group">IBILL SOFTWARE FZ-LLC</span>
            </div>
            <p className="login-brand-tagline">Human Resource &amp; Asset Management</p>

            <div className="login-brand-features">
              <div className="feature-pill">
                <span className="feature-dot"></span>
                Employee Lifecycle
              </div>
              <div className="feature-pill">
                <span className="feature-dot"></span>
                Payroll &amp; Compliance
              </div>
              <div className="feature-pill">
                <span className="feature-dot"></span>
                Asset Tracking
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT FORM PANEL */}
        <div className="login-form-wrapper">
          <div className="login-card">
            <div className="login-card-header">
              <h2>Welcome Back</h2>
              <p className="login-subtitle">Sign in to your HRMS portal</p>
            </div>

            {error && (
              <div className="error" role="alert">
                <span className="error-icon">⚠</span> {error}
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-group">
                <label htmlFor="email">Email Address</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                      <polyline points="22,6 12,13 2,6"/>
                    </svg>
                  </span>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@ibill.com"
                    value={form.email}
                    onChange={handleChange}
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-wrap">
                  <span className="input-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.44 18.44 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                        <line x1="1" y1="1" x2="23" y2="23"/>
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                        <circle cx="12" cy="12" r="3"/>
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <button id="login-submit-btn" type="submit" className="login-btn" disabled={loading}>
                {loading ? (
                  <span className="login-spinner">
                    <span className="spinner-ring"></span>
                    Signing in…
                  </span>
                ) : "Sign In"}
              </button>
            </form>

            <div className="login-card-footer">
              <span>Powered by</span>
              <strong>iBill Software FZ-LLC HRMS</strong>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
