const HANGUL_SYLLABLE_START = 0xac00;
const HANGUL_SYLLABLE_END = 0xd7a3;
const JONGSEONG_COUNT = 28;

export function withWaGwa(value: string): string {
  const name = value.trim();
  if (!name) return name;

  const lastCodePoint = name.codePointAt(name.length - 1);
  const hasJongseong =
    lastCodePoint !== undefined &&
    lastCodePoint >= HANGUL_SYLLABLE_START &&
    lastCodePoint <= HANGUL_SYLLABLE_END &&
    (lastCodePoint - HANGUL_SYLLABLE_START) % JONGSEONG_COUNT !== 0;

  return `${name}${hasJongseong ? "과" : "와"}`;
}
