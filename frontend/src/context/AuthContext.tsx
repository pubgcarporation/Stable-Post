import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAccount, useSignMessage } from "wagmi";
import { apiErrorMessage, apiJson, authHeaders } from "../lib/api";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "../lib/authStorage";
import type { PublicUser, SessionUser } from "../types/api";
import { toast } from "./ToastContext";

type AuthContextValue = {
  sessionReady: boolean;
  token: string | null;
  user: SessionUser | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<boolean>;
  refreshMe: () => Promise<void>;
  completeOnboarding: (username: string) => Promise<boolean>;
  provisionCustodialWallet: () => Promise<boolean>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [sessionReady, setSessionReady] = useState(false);
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wasConnected = useRef(false);

  const refreshMe = useCallback(async () => {
    const t = getStoredToken();
    if (!t) {
      setUser(null);
      setToken(null);
      return;
    }
    setToken(t);
    try {
      const me = await apiJson<SessionUser>("/auth/me", {
        headers: authHeaders(t),
      });
      setUser(me);
    } catch {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await refreshMe();
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshMe]);

  useEffect(() => {
    if (wasConnected.current && !isConnected) {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
    wasConnected.current = isConnected;
  }, [isConnected]);

  useEffect(() => {
    if (!address || !user?.walletAddress) return;
    if (user.walletAddress.toLowerCase() !== address.toLowerCase()) {
      clearStoredToken();
      setToken(null);
      setUser(null);
    }
  }, [address, user?.walletAddress]);

  const login = useCallback(async (): Promise<boolean> => {
    if (!address) {
      setError("Connect a wallet first.");
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      const challenge = await apiJson<{ nonce: string; message: string }>(
        "/auth/challenge",
        {
          method: "POST",
          body: JSON.stringify({ walletAddress: address }),
        }
      );
      const signature = await signMessageAsync({ message: challenge.message });
      const out = await apiJson<{ token: string; user: PublicUser }>(
        "/auth/verify",
        {
          method: "POST",
          body: JSON.stringify({
            walletAddress: address,
            signature,
            nonce: challenge.nonce,
          }),
        }
      );
      setStoredToken(out.token);
      setToken(out.token);
      setUser({ ...out.user });
      await refreshMe();
      toast("Signed in", "success");
      return true;
    } catch (e) {
      setError(apiErrorMessage(e, "Sign-in failed"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [address, refreshMe, signMessageAsync]);

  const completeOnboarding = useCallback(
    async (username: string): Promise<boolean> => {
      const t = getStoredToken();
      if (!t) {
        setError("Not signed in");
        return false;
      }
      setError(null);
      setLoading(true);
      try {
        await apiJson<{ user: PublicUser }>("/auth/onboarding", {
          method: "POST",
          headers: {
            ...authHeaders(t),
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        });
        await refreshMe();
        toast("Welcome aboard", "success");
        return true;
      } catch (e) {
        setError(apiErrorMessage(e, "Onboarding failed"));
        return false;
      } finally {
        setLoading(false);
      }
    },
    [refreshMe]
  );

  const provisionCustodialWallet = useCallback(async (): Promise<boolean> => {
    const t = getStoredToken();
    if (!t) {
      setError("Not signed in");
      return false;
    }
    setError(null);
    setLoading(true);
    try {
      await apiJson<{ user: PublicUser }>("/wallet/circle/provision", {
        method: "POST",
        headers: authHeaders(t),
      });
      await refreshMe();
      toast("Custodial wallet ready", "success");
      return true;
    } catch (e) {
      setError(apiErrorMessage(e, "Wallet provisioning failed"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [refreshMe]);

  const clearError = useCallback(() => setError(null), []);

  const value = useMemo<AuthContextValue>(
    () => ({
      sessionReady,
      token,
      user,
      loading,
      error,
      login,
      refreshMe,
      completeOnboarding,
      provisionCustodialWallet,
      clearError,
    }),
    [
      sessionReady,
      token,
      user,
      loading,
      error,
      login,
      refreshMe,
      completeOnboarding,
      provisionCustodialWallet,
      clearError,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
