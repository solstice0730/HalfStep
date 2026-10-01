import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { refreshSession, socialLogin, socialLoginWithCode, logout as requestLogout } from "@/services/api/authApi";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession
} from "@/services/storage/authStorage";
import type { AuthSession, AuthUser, OAuthProvider } from "@/features/auth/types/auth";
import { setAuthFailureHandler, setTokenRefreshHandler } from "@/services/api/apiClient";

type AuthContextValue = {
  accessToken: string | null;
  isBootstrapping: boolean;
  isAuthenticated: boolean;
  isSigningOut: boolean;
  signInWithProviderToken: (provider: OAuthProvider, providerAccessToken: string) => Promise<void>;
  signInWithProviderCode: (
    provider: OAuthProvider,
    code: string,
    redirectUri: string,
    codeVerifier?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState(true);
  const [isSigningOut, setIsSigningOut] = useState(false);
  // apiClient의 갱신 핸들러는 렌더와 무관하게 최신 세션을 읽어야 하므로 ref로 미러링한다.
  const sessionRef = useRef<AuthSession | null>(null);
  sessionRef.current = session;

  useEffect(() => {
    let mounted = true;

    getStoredAuthSession()
      .then((storedSession) => {
        if (mounted) setSession(storedSession);
      })
      .finally(() => {
        if (mounted) setIsBootstrapping(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const persistSession = useCallback(async (nextSession: AuthSession) => {
    setSession(nextSession);
    try {
      await storeAuthSession(nextSession);
    } catch {
      // In-memory auth still lets the current session continue if web storage is unavailable.
    }
  }, []);

  const expireSession = useCallback(async () => {
    await clearStoredAuthSession();
    setSession(null);
  }, []);

  useEffect(() => {
    setAuthFailureHandler(expireSession);
    return () => setAuthFailureHandler(null);
  }, [expireSession]);

  // access token(30분)이 만료되면 refresh token으로 조용히 갱신한다. 실패하면 세션을 정리한다.
  useEffect(() => {
    setTokenRefreshHandler(async (staleAccessToken) => {
      const current = sessionRef.current;
      if (!current?.refreshToken) return null;
      if (current.accessToken !== staleAccessToken) return current.accessToken;
      try {
        const nextSession = await refreshSession(current.refreshToken);
        await persistSession(nextSession);
        return nextSession.accessToken;
      } catch {
        await expireSession();
        return null;
      }
    });
    return () => setTokenRefreshHandler(null);
  }, [expireSession, persistSession]);

  const signInWithProviderToken = useCallback(
    async (provider: OAuthProvider, providerAccessToken: string) => {
      const nextSession = await socialLogin(provider, providerAccessToken);
      await persistSession(nextSession);
    },
    [persistSession]
  );

  const signInWithProviderCode = useCallback(
    async (provider: OAuthProvider, code: string, redirectUri: string, codeVerifier?: string) => {
      const nextSession = await socialLoginWithCode(provider, code, redirectUri, codeVerifier);
      await persistSession(nextSession);
    },
    [persistSession]
  );

  const signOut = useCallback(async () => {
    if (!session) return;

    setIsSigningOut(true);
    try {
      await requestLogout(session.accessToken, session.refreshToken);
    } finally {
      await clearStoredAuthSession();
      setSession(null);
      setIsSigningOut(false);
    }
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken: session?.accessToken ?? null,
      isBootstrapping,
      isAuthenticated: Boolean(session?.accessToken),
      isSigningOut,
      signInWithProviderCode,
      signInWithProviderToken,
      signOut,
      user: session?.user ?? null
    }),
    [isBootstrapping, isSigningOut, session, signInWithProviderCode, signInWithProviderToken, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return value;
}
