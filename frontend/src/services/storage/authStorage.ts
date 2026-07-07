import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import type { AuthSession } from "@/features/auth/types/auth";

const AUTH_SESSION_KEY = "halfstep.authSession";

export async function getStoredAuthSession(): Promise<AuthSession | null> {
  const value = await getItem(AUTH_SESSION_KEY);
  if (!value) return null;

  try {
    return JSON.parse(value) as AuthSession;
  } catch {
    await clearStoredAuthSession();
    return null;
  }
}

export async function storeAuthSession(session: AuthSession): Promise<void> {
  await setItem(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function clearStoredAuthSession(): Promise<void> {
  await deleteItem(AUTH_SESSION_KEY);
}

async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return globalThis.localStorage?.getItem(key) ?? null;
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === "web") {
    globalThis.localStorage?.removeItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}
