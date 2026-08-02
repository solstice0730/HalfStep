export type BabyGender = "MALE" | "FEMALE" | "UNKNOWN";

export interface MyPageBaby {
  id: string;
  name: string;
  birthDate: string;
  gender: BabyGender;
  ageInDays: number;
  isActive: boolean;
}

export interface MyPageProfile {
  id: string;
  nickname: string | null;
  email: string | null;
  provider: string;
  babies: MyPageBaby[];
  createdAt: string;
}
