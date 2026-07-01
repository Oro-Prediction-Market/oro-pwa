import { useState, useEffect, useCallback } from "react";
import {
  loginWithTelegram,
  getMe,
  clearToken,
  getToken,
  refreshAuth,
  AuthUser,
} from "@shared/api/client";

const PENDING_REFERRAL_KEY = "oro_pending_referral";

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
      // Browser (non-Telegram) referral capture: a shared web link looks like
      // https://oro.fun/?ref=<telegramId> (or ?startapp=ref_<id>). Telegram's
      // start_param is absent here, so read the code off the URL and persist it
      // for the DK Bank / BhutanApp login handlers, which read this same key.
      const urlParams = new URLSearchParams(window.location.search);
      const urlRefRaw = urlParams.get("ref") ?? urlParams.get("startapp");
      if (urlRefRaw) {
        const urlRef = urlRefRaw.startsWith("ref_")
          ? urlRefRaw
          : `ref_${urlRefRaw}`;
        // Don't clobber an existing pending referral captured earlier this session.
        if (!sessionStorage.getItem(PENDING_REFERRAL_KEY)) {
          sessionStorage.setItem(PENDING_REFERRAL_KEY, urlRef);
        }
      }

      const telegramInitData = (window as any).Telegram?.WebApp?.initData;
      const startParam: string | undefined = (window as any).Telegram?.WebApp
        ?.initDataUnsafe?.start_param;
      const referralCode = startParam?.startsWith("ref_")
        ? startParam
        : undefined;

      // 1. If we already have an in-memory token (e.g. auth happened earlier this session), validate it.
      // 2. Otherwise try to silently restore via the httpOnly cookie (page reload case).
      if (!getToken() && !referralCode) {
        const refreshed = await refreshAuth();
        if (refreshed) {
          setState({ user: refreshed.user, token: refreshed.token, loading: false, error: null });
          return;
        }
      }

      if (getToken() && !referralCode) {
        try {
          const user = await getMe();
          setState({ user, token: getToken(), loading: false, error: null });
          return;
        } catch {
          clearToken();
        }
      }

      if (telegramInitData) {
        const result = await loginWithTelegram(
          telegramInitData,
          referralCode,
        ) as any;
        if (result.requiresKYC) {
          // New user — PWA has no registration form. Clear the useless preKycToken
          // that loginWithTelegram stored, and persist the referral code so DK Bank
          // / BhutanApp registration can pick it up.
          clearToken();
          const code = referralCode ?? result.referralCode;
          if (code) sessionStorage.setItem(PENDING_REFERRAL_KEY, code);
          setState({ user: null, token: null, loading: false, error: null });
          return;
        }
        setState({ user: result.user, token: result.token, loading: false, error: null });
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
