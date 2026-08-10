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

  // Live reactive user object — includes employeeId once /auth/me resolves it.
  // Seeded from localStorage so the value is available instantly on first render,
  // then replaced with the fresh server response as soon as it arrives.
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null") || {};
    } catch {
      return {};
    }
  });

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
          // Update reactive state so any component reading currentUser re-renders
          // automatically once employeeId (or any other field) is resolved.
          setCurrentUser(data.user);
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

    // RoleProvider mounts once per app load, so without this, a permission change
    // an admin makes in Masters (e.g. granting MANAGE_PAYROLL) never reaches an
    // already-open tab — the user appears "still blocked" until they hard-refresh
    // or log out/in, even though the backend already resolves the new permission
    // correctly on every request. Refetch whenever the tab regains focus/visibility
    // so a granted permission takes effect without requiring a manual reload.
    //
    // "focus" firing at all already means this tab is the one being looked at, so it
    // doesn't need a visibilityState check (tested: visibilityState can report "hidden"
    // in some embedded/automated browser contexts even while focus is genuine - gating
    // on it there made the refresh silently never fire). visibilitychange is the one
    // that needs the check, since it also fires on the way OUT (tab backgrounded),
    // and refetching then would just be a wasted request.
    const handleFocus = () => fetchCurrentUser();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") fetchCurrentUser();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
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
      mustChangePassword, clearMustChangePassword,
      currentUser
    }}>
      {children}
    </RoleContext.Provider>
  );
};
