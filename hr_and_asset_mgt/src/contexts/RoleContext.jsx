import { createContext, useContext, useState, useEffect } from "react";
import { roleService } from "../services/masterService";

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
  // Initialize from LocalStorage (Optimized)
  const [permissions, setPermissions] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("userPermissions")) || [];
    } catch {
      return [];
    }
  });

  const [loading, setLoading] = useState(false);

  // We no longer need to fetch on mount, as login provides it.
  // But we can listen for role changes if necessary (though usually requires re-login)
  useEffect(() => {
    // Sync state if localStorage changes (optional, mostly for multi-tab)
  }, [role]);

  // Helper check function
  const hasPermission = (requiredPermission) => {
    if (role === 'Admin' || permissions.includes("ALL")) return true;
    return permissions.includes(requiredPermission);
  };

  return (
    <RoleContext.Provider value={{ role, setRole, permissions, hasPermission, loading }}>
      {children}
    </RoleContext.Provider>
  );
};

