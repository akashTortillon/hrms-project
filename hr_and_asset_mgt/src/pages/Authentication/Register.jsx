import { useState } from "react";
import { registerUser } from "../../api/authService";
import { Link, useNavigate } from "react-router-dom";
import "../../style/registerAuth.css";
import employeeImage from "../../assets/images/employee_onboard.webp";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --------------------
  // Handle Input Change
  // --------------------
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  // --------------------
  // Validation Logic
  // --------------------
  const validate = () => {
    // Name: only alphabets, min 3 chars
    if (!form.name.trim()) return "Full name is required";
    if (!/^[A-Za-z ]+$/.test(form.name))
      return "Name must contain only alphabets";
    if (form.name.trim().length < 3)
      return "Name must be at least 3 characters";

    // Email: gmail format, not only numbers
    if (!form.email.trim()) return "Email is required";
    if (!/^[a-zA-Z0-9._%+-]+@gmail\.com$/.test(form.email))
      return "Email must be a valid @gmail.com address";

    // Password: min 6 chars, letters + numbers
    if (form.password.length < 6)
      return "Password must be at least 6 characters";
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password))
      return "Password must contain letters and numbers";

    // Confirm password
    if (form.password !== form.confirmPassword)
      return "Passwords do not match";

    return null;
  };

  // --------------------
  // Submit Handler
  // --------------------
  const handleSubmit = async (e) => {
    e.preventDefault(); // 🔒 prevent default submission

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        confirmPassword: form.confirmPassword
      });
      navigate("/login");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page" >

        <div className="auth-container">
      {/* Left Image Section */}
      <div className="auth-image">
        <img src={employeeImage} alt="Auth Banner" />  
      </div>

      {/* Right Form Section */}
      <div className="auth-form-wrapper">
        <div className="auth-card">
          <h2>Create Account</h2>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <input
              name="name"
              placeholder="Full Name"
              value={form.name}
              onChange={handleChange}
            />

            <input
              name="email"
              placeholder="Email"
              value={form.email}
              onChange={handleChange}
            />

            <input
              type="password"
              name="password"
              placeholder="Password"
              value={form.password}
              onChange={handleChange}
            />

            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={form.confirmPassword}
              onChange={handleChange}
            />

            <button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            Already have an account? <Link to="/login">Login here</Link>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}
