import * as SecureStore from "expo-secure-store";

import { demoApiUrlForHost, env, setDemoApiHost } from "@/config/env";

const STORAGE_KEY = "halfstep_demo_server_host";

export function currentDemoServerHost(): string {
  try { return new URL(env.apiBaseUrl).hostname; } catch { return ""; }
}

export async function restoreDemoServerHost(): Promise<void> {
  if (!env.enableDevLogin) return;
  try {
    const host = await SecureStore.getItemAsync(STORAGE_KEY);
    if (host) setDemoApiHost(host);
  } catch {
    // The bundled server remains available if storage cannot be read.
  }
}

export async function saveDemoServerHost(host: string): Promise<void> {
  if (!env.enableDevLogin || !demoApiUrlForHost(host)) {
    throw new Error("사설망 IPv4 주소만 입력해 주세요.");
  }
  await SecureStore.setItemAsync(STORAGE_KEY, host.trim());
  setDemoApiHost(host);
}
