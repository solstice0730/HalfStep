import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { socialLogin, socialLoginWithCode, logout as requestLogout } from "@/services/api/authApi";
import {
  clearStoredAuthSession,
  getStoredAuthSession,
  storeAuthSession
} from "@/services/storage/authStorage";
import type { AuthSession, AuthUser, OAuthProvider } from "@/features/auth/types/auth";

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
