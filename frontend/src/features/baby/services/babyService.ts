import type { Baby, BabyCreateInput, BabyUpdateInput } from "@/features/baby/types/baby";
import { apiRequest } from "@/services/api/apiClient";

type MyProfile = {
  id: number;
  nickname: string | null;
  email: string | null;
  provider: string;
  babies: Baby[];
  createdAt: string;
};

export async function getMyProfile(accessToken: string): Promise<MyProfile> {
  const { data } = await apiRequest<MyProfile>("/users/me", { accessToken });
  return data;
}

export async function createBaby(accessToken: string, input: BabyCreateInput): Promise<Baby> {
  const { data } = await apiRequest<Baby>("/babies", { method: "POST", accessToken, body: input });
  return data;
}

export async function updateBaby(accessToken: string, babyId: number, input: BabyUpdateInput): Promise<void> {
  await apiRequest(`/babies/${babyId}`, { method: "PATCH", accessToken, body: input });
}

export async function activateBaby(accessToken: string, babyId: number): Promise<void> {
  await apiRequest(`/babies/${babyId}/activate`, { method: "PATCH", accessToken });
}

export async function deleteBaby(accessToken: string, babyId: number): Promise<void> {
  await apiRequest(`/babies/${babyId}`, { method: "DELETE", accessToken });
}
