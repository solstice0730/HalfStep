export interface BabyProfile {
  id: string;
  name: string;
  birthDate: string; // YYYY-MM-DD
  ageDays?: number;
  ageMonths?: number;
  profileImageUrl?: string | null;
}

// ponytail: module-level mock, same rationale as recordsService — no baby-profile API
// (Epic B) yet. Swap the return value for a real API call here when it exists.
const DEMO_PROFILE: BabyProfile = {
  id: "demo-baby-1",
  name: "리몽이",
  birthDate: "2026-06-01",
  profileImageUrl: null
};

export async function getBabyProfile(): Promise<BabyProfile | null> {
  return DEMO_PROFILE;
}

export interface BabyAge {
  ageDays: number;
  ageMonths: number;
}

// birthDate 기준 계산. 미래 날짜/파싱 불가 값은 null로 처리해 호출부가 안내 UI를 보여줄 수 있게 한다.
export function calculateBabyAge(birthDate: string, today: Date = new Date()): BabyAge | null {
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime()) || birth.getTime() > today.getTime()) {
    return null;
  }

  const ageDays = Math.floor((today.getTime() - birth.getTime()) / 86400000);

  let ageMonths = (today.getFullYear() - birth.getFullYear()) * 12 + (today.getMonth() - birth.getMonth());
  if (today.getDate() < birth.getDate()) {
    ageMonths -= 1;
  }

  return { ageDays, ageMonths: Math.max(0, ageMonths) };
}
