const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

function endsWithJongseong(name: string): boolean {
  const lastCodePoint = name.codePointAt(name.length - 1);
  return (
    lastCodePoint !== undefined &&
    lastCodePoint >= HANGUL_SYLLABLE_START &&
    lastCodePoint <= HANGUL_SYLLABLE_END &&
    (lastCodePoint - HANGUL_SYLLABLE_START) % JONGSEONG_COUNT !== 0
  );
}

export function withWaGwa(value: string): string {
  const name = value.trim();
  if (!name) return name;
  return `${name}${endsWithJongseong(name) ? "과" : "와"}`;
}

/** 받침 있는 이름에 접미사 "이"를 붙인 호칭. 하린 → 하린이, 하루 → 하루 */
export function withI(value: string): string {
  const name = value.trim();
  if (!name) return name;
  return endsWithJongseong(name) ? `${name}이` : name;
}

/** 하린 → 하린이에게, 하루 → 하루에게 */
export function withEge(value: string): string {
  const name = withI(value);
  return name ? `${name}에게` : name;
}

/** 하린 → 하린이의, 하루 → 하루의 */
export function withUi(value: string): string {
  const name = withI(value);
  return name ? `${name}의` : name;
}
