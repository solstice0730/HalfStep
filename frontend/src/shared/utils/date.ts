const pad2 = (value: number) => String(value).padStart(2, "0");

/** 기기 로컬 기준 YYYY-MM-DD. `toISOString()`은 UTC라 한국에서 새벽 0~9시에 전날이 되므로 쓰지 않는다. */
export function toLocalIsoDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export const todayLocalIsoDate = () => toLocalIsoDate(new Date());
