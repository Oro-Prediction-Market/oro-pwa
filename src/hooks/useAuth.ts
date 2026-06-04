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

    window.addEventListener("oro:unauthorized", onUnauthorized);
    return () => {
      window.removeEventListener("oro:unauthorized", onUnauthorized);
    };
  }, []);

  return { isAuthenticated, setIsAuthenticated };
}
