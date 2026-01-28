
// const API_URL = "http://localhost:5000/api/auth";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5000"; // e.g. https://your-backend.onrender.com
const API_URL = `${API_BASE}/api/auth`;

export const registerUser = async (data) => {
  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Registration failed");
  }

  return result;
};

export const loginUser = async (data) => {
  const res = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    credentials: "include", // Important for receiving httpOnly cookies
  });

  const result = await res.json();

  if (!res.ok) {
    throw new Error(result.message || "Login failed");
  }

  return result;
};

export const logoutUser = async () => {
  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // Important for sending httpOnly cookies
    });
  } catch (error) {
    console.error("Logout API call failed", error);
  }
};
