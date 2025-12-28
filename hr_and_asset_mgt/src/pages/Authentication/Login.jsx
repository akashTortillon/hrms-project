import { useState } from "react";
import { loginUser } from "../../api/authService";
import { Link } from "react-router-dom";
import employeeImage from "../../assets/images/employee_onboard.webp";
import "../../style/loginAuth.css";


export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

      // Store token (later move to httpOnly cookie)
      localStorage.setItem("token", data.token);

      alert("Login successful");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
        <div className="login-container">

            <div className="login-image">
                    <img src={employeeImage} alt="login Banner" />  
            </div>

            <div className="login-form-wrapper">
                <div className="login-card">
            <h2>Login</h2>

      {error && <div className="error">{error}</div>}

      <form onSubmit={handleSubmit}>
        <input
          name="email"
          placeholder="Email"
          onChange={handleChange}
        />
        <input
          type="password"
          name="password"
          placeholder="Password"
          onChange={handleChange}
        />

        <button disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      <div className="login-footer">
        Don’t have an account? <Link to="/register">Register</Link>
      </div>
        
      
    </div>
    </div>
    </div>
    </div>

  );
}
