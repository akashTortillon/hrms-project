


import Layout from "./components/LayOut.jsx";
import "bootstrap/dist/css/bootstrap.min.css";

import "./style/layout.css";
import "./style/myRequests.css";

import Login from "./pages/Authentication/Login.jsx";
import Register from "./pages/Authentication/Register.jsx";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

export default function App() {
  const isAuthenticated = !!localStorage.getItem("token");

  return (
    
      <Routes>
        {/* Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected App Routes */}
        <Route
          path="/app/*"
          element={
            isAuthenticated ? <Layout /> : <Navigate to="/login" />
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    
  );
}
