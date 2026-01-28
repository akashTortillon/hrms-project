import { useState } from "react";
import { loginUser } from "../../api/authService";
import { Link, useNavigate } from "react-router-dom";
import employeeImage from "../../assets/images/employee_onboard.webp";
import "../../style/loginAuth.css";
import { toast } from "react-toastify";


export default function Login() {
  const navigate = useNavigate();

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

      console.log("Login response:", data); // ✅ Add this

      if (!data || !data.token) {
        console.error("No token in response:", data); // ✅ Add this
        throw new Error("Invalid response from server");
      }

      // Store token
      localStorage.setItem("token", data.token);
      // Also store user info if available
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("userRole", data.role || "Employee");
        // Store Permissions from Backend
        localStorage.setItem("userPermissions", JSON.stringify(data.permissions || []));
      } else if (data.role) {
        localStorage.setItem("userRole", data.role);
        localStorage.setItem("userPermissions", JSON.stringify(data.permissions || []));
      }

      toast.success("Login successful 🎉");

      console.log("Token stored. Navigating to dashboard...");

      // Navigate to the absolute path
      navigate("/app/dashboard", { replace: true });


    } catch (err) {
      console.error("Login error:", err); // ✅ Add this
      toast.error(err.message || "Login failed ❌");
      setError(err.message || "Login failed. Please check your credentials.");
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

            {/* <div className="login-footer">
              Don’t have an account? <Link to="/register">Register</Link>
            </div> */}


          </div>
        </div>
      </div>
    </div>

  );
}
