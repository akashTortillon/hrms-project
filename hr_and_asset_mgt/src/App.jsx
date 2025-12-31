import { useState, useEffect } from "react";
import Layout from "./components/LayOut.jsx";
import Login from "./pages/Authentication/Login.jsx";
import Register from "./pages/Authentication/Register.jsx";
import { Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
      path="/app/*"
      element={
        localStorage.getItem("token") ? <Layout /> : <Navigate to="/login" />
      }
    />

      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  );
}
