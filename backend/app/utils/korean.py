"""한국어 호칭 보조. 프론트 shared/utils/koreanParticle.ts와 같은 규칙을 쓴다."""

HANGUL_START = 0xAC00
HANGUL_END = 0xD7A3
JONGSEONG_COUNT = 28


def ends_with_jongseong(name: str) -> bool:
    if not name:
        return False
    code = ord(name[-1])
    return HANGUL_START <= code <= HANGUL_END and (code - HANGUL_START) % JONGSEONG_COUNT != 0


def with_i(name: str) -> str:
    """받침 있는 이름에 호칭 '이'를 붙인다. 하린 → 하린이, 하루 → 하루."""
    stripped = name.strip()
    return f"{stripped}이" if ends_with_jongseong(stripped) else stripped
