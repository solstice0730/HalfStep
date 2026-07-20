export interface BabyProfile {
  id: number;
  name: string;
  birthDate: string;
  ageDays?: number;
  ageMonths?: number;
  profileImageUrl?: string | null;
}

export interface BabyAge {
  ageDays: number;
  ageMonths: number;
}

export function calculateBabyAge(birthDate: string, today: Date = new Date()): BabyAge | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > today.getTime()) return null;

  const ageDays = Math.floor((today.getTime() - birth.getTime()) / 86400000);
  let ageMonths = (today.getFullYear() - birth.getFullYear()) * 12 + today.getMonth() - birth.getMonth();
  if (today.getDate() < birth.getDate()) ageMonths -= 1;
  return { ageDays, ageMonths: Math.max(0, ageMonths) };
}
