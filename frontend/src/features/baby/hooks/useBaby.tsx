import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/features/auth/hooks/useAuth";
import * as babyApi from "@/features/baby/services/babyService";
import type { Baby, BabyCreateInput, BabyUpdateInput } from "@/features/baby/types/baby";

type BabyContextValue = {
  babies: Baby[];
  activeBaby: Baby | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createBaby: (input: BabyCreateInput) => Promise<void>;
  updateBaby: (babyId: number, input: BabyUpdateInput) => Promise<void>;
  activateBaby: (babyId: number) => Promise<void>;
  deleteBaby: (babyId: number) => Promise<void>;
};

const BabyContext = createContext<BabyContextValue | null>(null);

export function BabyProvider({ children }: PropsWithChildren) {
  const { accessToken, isAuthenticated } = useAuth();
  const [babies, setBabies] = useState<Baby[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setBabies([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const profile = await babyApi.getMyProfile(accessToken);
      setBabies(profile.babies);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "아기 정보를 불러오지 못했습니다.");
      throw requestError;
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    if (!isAuthenticated) {
      setBabies([]);
      setError(null);
      setIsLoading(false);
      return;
    }
    void refresh().catch(() => undefined);
  }, [isAuthenticated, refresh]);

  const createBaby = useCallback(async (input: BabyCreateInput) => {
    if (!accessToken) return;
    await babyApi.createBaby(accessToken, input);
    await refresh();
  }, [accessToken, refresh]);

  const updateBaby = useCallback(async (babyId: number, input: BabyUpdateInput) => {
    if (!accessToken) return;
    await babyApi.updateBaby(accessToken, babyId, input);
    await refresh();
  }, [accessToken, refresh]);

  const activateBaby = useCallback(async (babyId: number) => {
    if (!accessToken) return;
    await babyApi.activateBaby(accessToken, babyId);
    await refresh();
  }, [accessToken, refresh]);

  const deleteBaby = useCallback(async (babyId: number) => {
    if (!accessToken) return;
    await babyApi.deleteBaby(accessToken, babyId);
    await refresh();
  }, [accessToken, refresh]);

  const activeBaby = babies.find((baby) => baby.isActive) ?? babies[0] ?? null;
  const value = useMemo<BabyContextValue>(() => ({
    babies, activeBaby, isLoading, error, refresh, createBaby, updateBaby, activateBaby, deleteBaby
  }), [activeBaby, activateBaby, babies, createBaby, deleteBaby, error, isLoading, refresh, updateBaby]);

  return <BabyContext.Provider value={value}>{children}</BabyContext.Provider>;
}

export function useBaby() {
  const value = useContext(BabyContext);
  if (!value) throw new Error("useBaby must be used inside BabyProvider.");
  return value;
}
