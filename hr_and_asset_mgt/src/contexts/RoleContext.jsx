import { createContext, useContext, useState, useEffect } from "react";
import api from "../api/apiClient";

const RoleContext = createContext();

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within a RoleProvider");
  }
  return context;
};

export const RoleProvider = ({ children }) => {
  const [role, setRole] = useState(localStorage.getItem("userRole") || "Admin");
  const [permissions, setPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userPermissions")) || [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);
  const [mustChangePassword, setMustChangePassword] = useState(
    localStorage.getItem("mustChangePassword") === "true"
  );

  useEffect(() => {
    const syncFromStorage = () => {
      try {
        setRole(localStorage.getItem("userRole") || "Employee");
        setPermissions(JSON.parse(localStorage.getItem("userPermissions")) || []);
      } catch {
        setPermissions([]);
      }
      setMustChangePassword(localStorage.getItem("mustChangePassword") === "true");
    };

    window.addEventListener("storage", syncFromStorage);
    return () => window.removeEventListener("storage", syncFromStorage);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    let isMounted = true;

    const fetchCurrentUser = async () => {
      try {
        setLoading(true);
        const { data } = await api.get("/auth/me");
        if (!isMounted) return;

        const nextRole = data?.role || "Employee";
        const nextPermissions = data?.permissions || [];
        const nextMustChangePassword = Boolean(data?.mustChangePassword);

        localStorage.setItem("userRole", nextRole);
        localStorage.setItem("userPermissions", JSON.stringify(nextPermissions));
        localStorage.setItem("mustChangePassword", String(nextMustChangePassword));
        if (data?.user) {
          localStorage.setItem("user", JSON.stringify(data.user));
        }

        setRole(nextRole);
        setPermissions(nextPermissions);
        setMustChangePassword(nextMustChangePassword);
      } catch (error) {
        // Keep existing local storage values if sync fails
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  const hasPermission = (requiredPermission) => {
    if (role === 'Admin' || permissions.includes("ALL")) return true;
    return permissions.includes(requiredPermission);
  };

  const clearMustChangePassword = () => {
    localStorage.setItem("mustChangePassword", "false");
    setMustChangePassword(false);
  };

  return (
    <RoleContext.Provider value={{
      role, setRole, permissions, setPermissions, hasPermission, loading,
      mustChangePassword, clearMustChangePassword
    }}>
      {children}
    </RoleContext.Provider>
  );
};
