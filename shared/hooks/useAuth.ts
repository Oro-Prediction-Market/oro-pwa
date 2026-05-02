import { useState, useEffect, useCallback } from "react";
import {
  loginWithTelegram,
  getMe,
  clearToken,
  getToken,
  AuthUser,
} from "@shared/api/client";

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: getToken(),
    loading: true,
    error: null,
  });

  const initialize = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));

    try {
      if (getToken()) {
        try {
          const user = await getMe();
          setState({ user, token: getToken(), loading: false, error: null });
          return;
        } catch {
          clearToken();
        }
      }

      const telegramInitData = (window as any).Telegram?.WebApp?.initData;
      if (telegramInitData) {
        const startParam: string | undefined = (window as any).Telegram?.WebApp
          ?.initDataUnsafe?.start_param;
        const referralCode = startParam?.startsWith("ref_")
          ? startParam
          : undefined;
        const { user, token } = await loginWithTelegram(telegramInitData, referralCode);
        setState({ user, token, loading: false, error: null });
        return;
      }

      setState({
        user: null,
        token: null,
        loading: false,
        error: "Not authenticated",
      });
    } catch (err: any) {
      setState({
        user: null,
        token: null,
        loading: false,
        error: err.message || "Login failed",
      });
    }
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  const logout = () => {
    clearToken();
    setState({ user: null, token: null, loading: false, error: null });
  };

  return { ...state, logout, retry: initialize };
}
