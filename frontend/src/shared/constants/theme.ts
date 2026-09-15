import { colors } from "@/shared/constants/colors";
import { spacing } from "@/shared/constants/spacing";
import { typography } from "@/shared/constants/typography";

export const theme = {
  colors,
  spacing,
  typography,
  // HIG 컨티뉴어스 코너에 가까운 큰 반경을 기본으로 사용 (카드 lg/xl, 시트 xxl, pill 999).
  radius: {
    xs: 8,
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
    xxl: 28,
    pill: 999
  },
  blur: {
    subtle: 30,
    regular: 55,
    strong: 85
  }
} as const;
