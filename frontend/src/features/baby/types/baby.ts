export type BabyGender = "MALE" | "FEMALE" | "UNKNOWN";

export type Baby = {
  id: number;
  name: string;
  birthDate: string;
  gender: BabyGender;
  ageInDays: number;
  isActive: boolean;
};

export type BabyCreateInput = {
  name: string;
  birthDate: string;
  gender: BabyGender;
};

export type BabyUpdateInput = {
  name?: string;
  gender?: BabyGender;
};

