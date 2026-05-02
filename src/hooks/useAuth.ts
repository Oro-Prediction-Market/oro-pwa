import { useState, useEffect } from "react";
import { isTokenValid, clearToken } from "@shared/api/client";

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => isTokenValid());

  useEffect(() => {
    // If token is already expired on mount, clear it
    if (!isTokenValid()) {
      clearToken();
      setIsAuthenticated(false);
    }

    // Backend rejected the token (expired or tampered)
    const onUnauthorized = () => setIsAuthenticated(false);

    // Token changed in another tab (login or logout)
    const onStorage = () => setIsAuthenticated(isTokenValid());

    window.addEventListener("oro:unauthorized", onUnauthorized);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("oro:unauthorized", onUnauthorized);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return { isAuthenticated, setIsAuthenticated };
}
