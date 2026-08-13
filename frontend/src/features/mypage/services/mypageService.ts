import { apiRequest } from "@/services/api/apiClient";
import type { MyPageBaby, MyPageProfile } from "@/features/mypage/types/mypage";

interface BabyResponseDto {
  id: number;
  name: string;
  birthDate: string;
  gender: MyPageBaby["gender"];
  ageInDays: number;
  isActive: boolean;
}

interface UserMeResponseDto {
  id: number;
  nickname: string | null;
  email: string | null;
  provider: string;
  babies: BabyResponseDto[];
  createdAt: string;
}

export async function getMyProfile(accessToken: string): Promise<MyPageProfile> {
  const { data } = await apiRequest<UserMeResponseDto>("/users/me", { accessToken });
  return {
    id: String(data.id),
    nickname: data.nickname,
    email: data.email,
    provider: data.provider,
    createdAt: data.createdAt,
    babies: data.babies.map((baby) => ({
      id: String(baby.id),
      name: baby.name,
      birthDate: baby.birthDate,
      gender: baby.gender,
      ageInDays: baby.ageInDays,
      isActive: baby.isActive
    }))
  };
}

export async function updateBabyName(accessToken: string, babyId: string, name: string): Promise<void> {
  await apiRequest<unknown>(`/babies/${babyId}`, {
    method: "PATCH",
    accessToken,
    body: { name }
  });
}
