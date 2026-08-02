import { ArrowLeft, Check, Crown, Minus, Sparkles } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";

import type { PlanComparisonRow, TierMark } from "@/features/subscription/types/subscription";
import { colors } from "@/shared/constants/colors";

interface SubscriptionScreenProps {
  onClose: () => void;
}

// 가격/비교표는 전부 BM 가설이며 실제 결제와 연결되어 있지 않다 (MVP 제외 범위: 결제, 영수증 검증, 인앱결제).
const HYPOTHETICAL_PRICE = "월 8,900원";

const comparisonRows: PlanComparisonRow[] = [
  {
    feature: "기록 (수유·수면·배변·이유식·체온·키/몸무게, 캘린더, 가족방, 기록 조회)",
    freeMark: "full",
    freeNote: "전부 무료",
    premiumNote: "동일 (기록은 절대 유료화하지 않음)"
  },
  {
    feature: "AI 하루 요약",
    freeMark: "partial",
    freeNote: "월 5회 (맛보기)",
    premiumNote: "무제한"
  },
  {
    feature: "AI 육아일기 / 사진→일기 자동생성",
    freeMark: "none",
    freeNote: null,
    premiumNote: "무제한 제공"
  },
  {
    feature: "성장 패턴 분석 / 주간·월간 리포트",
    freeMark: "none",
    freeNote: null,
    premiumNote: "제공"
  },
  {
    feature: "AI 질문",
    freeMark: "none",
    freeNote: null,
    premiumNote: "무제한"
  }
];

export function SubscriptionScreen({ onClose }: SubscriptionScreenProps) {
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="닫기" accessibilityRole="button" hitSlop={12} onPress={onClose} style={styles.headerButton}>
          <ArrowLeft color={colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>구독</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Crown color={colors.primary} size={28} />
          </View>
          <Text style={styles.heroTitle}>HalfStep 프리미엄</Text>
          <Text style={styles.heroSubtitle}>AI 육아일기와 성장 분석을 제한 없이 이용하세요</Text>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{HYPOTHETICAL_PRICE}</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>가격 가설 · 검토 중</Text>
            </View>
          </View>
          <Text style={styles.priceHint}>정식 출시 전 BM 검증용 화면이에요. 실제로 청구되지 않습니다.</Text>
        </View>

        <Text style={styles.sectionLabel}>플랜 비교</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.featureColumn]}>기능</Text>
            <Text style={[styles.tableHeaderCell, styles.tierHeaderCell]}>Free</Text>
            <Text style={[styles.tableHeaderCell, styles.tierHeaderCell, styles.premiumHeaderText]}>Premium</Text>
          </View>

          {comparisonRows.map((row, index) => (
            <View key={row.feature} style={[styles.tableRow, index === comparisonRows.length - 1 && styles.tableRowLast]}>
              <View style={styles.featureColumn}>
                <Text style={styles.featureText}>{row.feature}</Text>
              </View>
              <View style={styles.tierColumn}>
                <TierMarkIcon mark={row.freeMark} />
                {row.freeNote ? <Text style={styles.tierNote}>{row.freeNote}</Text> : null}
              </View>
              <View style={styles.tierColumn}>
                <TierMarkIcon mark="full" premium />
                <Text style={[styles.tierNote, styles.premiumNote]}>{row.premiumNote}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <Sparkles color={colors.primary} size={16} />
            <Text style={styles.valueTitle}>프리미엄으로 얻는 것</Text>
          </View>
          <Text style={styles.valueText}>
            사진만 올리면 AI가 하루 육아일기를 자동으로 써주고, 우리 아이의 성장 패턴을 주간·월간 리포트로 확인할 수 있어요.
            궁금한 걸 AI에게 무제한으로 물어볼 수 있고요. 기록·캘린더·가족방 같은 핵심 기능은 앞으로도 계속 무료입니다.
          </Text>
        </View>

        <Pressable disabled style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>프리미엄으로 업그레이드</Text>
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>준비 중</Text>
          </View>
        </Pressable>
        <Text style={styles.disclaimer}>실제 결제는 아직 지원하지 않아요. 가격과 혜택은 검토 중이며 바뀔 수 있습니다.</Text>
      </ScrollView>
    </View>
  );
}

function TierMarkIcon({ mark, premium = false }: { mark: TierMark; premium?: boolean }) {
  const color = premium ? colors.primary : colors.textMuted;
  if (mark === "full") return <Check color={color} size={18} />;
  if (mark === "partial") return <Check color={colors.warning} size={18} />;
  return <Minus color={colors.border} size={18} />;
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 54,
    paddingBottom: 8
  },
  headerButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    gap: 14,
    paddingBottom: 40,
    paddingHorizontal: 18
  },
  hero: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 10
  },
  heroIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    marginBottom: 4,
    width: 56
  },
  heroTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900"
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center"
  },
  priceCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  priceRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  priceValue: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900"
  },
  priceBadge: {
    backgroundColor: colors.peachSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  priceBadgeText: {
    color: colors.secondary,
    fontSize: 11,
    fontWeight: "800"
  },
  priceHint: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
  },
  tableCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden"
  },
  tableHeaderRow: {
    backgroundColor: colors.surfaceSoft,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  tableHeaderCell: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  tierHeaderCell: {
    flex: 1,
    textAlign: "center"
  },
  premiumHeaderText: {
    color: colors.primary
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  tableRowLast: {
    borderBottomWidth: 0
  },
  featureColumn: {
    flex: 2.2,
    paddingRight: 6
  },
  featureText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 17
  },
  tierColumn: {
    alignItems: "center",
    flex: 1,
    gap: 3
  },
  tierNote: {
    color: colors.textMuted,
    fontSize: 10,
    textAlign: "center"
  },
  premiumNote: {
    color: colors.primary,
    fontWeight: "700"
  },
  valueCard: {
    backgroundColor: colors.blueSoft,
    borderRadius: 18,
    gap: 8,
    padding: 16
  },
  valueHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  valueTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  valueText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 19
  },
  upgradeButton: {
    alignItems: "center",
    backgroundColor: colors.secondary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 8,
    opacity: 0.55,
    paddingVertical: 15
  },
  upgradeButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800"
  },
  upgradeBadge: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3
  },
  upgradeBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800"
  },
  disclaimer: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center"
  }
});
