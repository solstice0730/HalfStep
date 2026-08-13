import { ArrowLeft, Check, Crown, Sparkles } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PlanComparisonRow } from "@/features/subscription/types/subscription";
import { colors } from "@/shared/constants/colors";

interface SubscriptionScreenProps {
  onClose: () => void;
}

// 2026-08-02 확정 BM: 7일 체험 후 월 8,900원 전면 유료, 무료 티어 없음.
// 결제 연동은 MVP 제외 범위(#16)이며, 가격 표시는 이슈 요구사항에 따라 "가설·검토 중"으로 노출한다.
const HYPOTHETICAL_PRICE = "월 8,900원";

// 현재 구현된 기능만 표시한다. 가족방, 사진 픽셀 기반 자동 분석, 성장 패턴 리포트는 미구현이라 제외.
const comparisonRows: PlanComparisonRow[] = [
  { feature: "기록 (수유·수면·배변·이유식·체온·키/몸무게, 캘린더 조회)" },
  { feature: "육아 커뮤니티 (정보 공유, 질문·답변 게시판)" },
  { feature: "AI 하루 요약", quotaPending: true },
  { feature: "AI 육아일기 초안 (사진 설명 + 기록 기반)", quotaPending: true },
  { feature: "AI 질문", quotaPending: true }
];

export function SubscriptionScreen({ onClose }: SubscriptionScreenProps) {
  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
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
          <Text style={styles.heroTitle}>HalfStep 구독</Text>
          <Text style={styles.heroSubtitle}>7일 체험 후 월 8,900원 구독으로 계속 이용해요</Text>
        </View>

        <View style={styles.priceCard}>
          <View style={styles.priceRow}>
            <Text style={styles.priceValue}>{HYPOTHETICAL_PRICE}</Text>
            <View style={styles.priceBadge}>
              <Text style={styles.priceBadgeText}>가격 가설 · 검토 중</Text>
            </View>
          </View>
          <Text style={styles.priceHint}>
            체험 7일이 끝나면 구독 결제 없이는 계속 이용할 수 없어요. 별도로 무료로 쓸 수 있는 단계는 없습니다.
            이 화면은 BM 검증용이라 실제로 청구되지 않아요.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>7일 체험 · 구독 후 비교</Text>
        <View style={styles.tableCard}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.tableHeaderCell, styles.featureColumn]}>기능</Text>
            <Text style={[styles.tableHeaderCell, styles.tierHeaderCell]}>7일 체험</Text>
            <Text style={[styles.tableHeaderCell, styles.tierHeaderCell, styles.premiumHeaderText]}>구독 후</Text>
          </View>

          {comparisonRows.map((row, index) => (
            <View key={row.feature} style={[styles.tableRow, index === comparisonRows.length - 1 && styles.tableRowLast]}>
              <View style={styles.featureColumn}>
                <Text style={styles.featureText}>
                  {row.feature}
                  {row.quotaPending ? <Text style={styles.quotaMarker}> *</Text> : null}
                </Text>
              </View>
              <View style={styles.tierColumn}>
                <Check color={colors.textMuted} size={18} />
              </View>
              <View style={styles.tierColumn}>
                <Check color={colors.primary} size={18} />
              </View>
            </View>
          ))}
        </View>
        <Text style={styles.quotaFootnote}>* AI 기능의 월 사용량·과금 정책은 아직 확정되지 않았어요.</Text>

        <View style={styles.valueCard}>
          <View style={styles.valueHeader}>
            <Sparkles color={colors.primary} size={16} />
            <Text style={styles.valueTitle}>구독으로 계속 이용하는 것</Text>
          </View>
          <Text style={styles.valueText}>
            사진 설명과 기록을 바탕으로 AI가 하루 요약과 육아일기 초안을 만들어 드려요. 육아가 궁금할 땐 AI에게 물어볼 수
            있고, 다른 부모들과 커뮤니티에서 정보를 나눌 수 있어요. 이 기능들은 7일 체험 후에는 구독을 통해서만 계속
            이용할 수 있어요.
          </Text>
        </View>

        <Pressable disabled style={styles.upgradeButton}>
          <Text style={styles.upgradeButtonText}>구독 시작하기</Text>
          <View style={styles.upgradeBadge}>
            <Text style={styles.upgradeBadgeText}>준비 중</Text>
          </View>
        </Pressable>
        <Text style={styles.disclaimer}>실제 결제는 아직 지원하지 않아요. 가격은 검토 중이며 바뀔 수 있습니다.</Text>
      </ScrollView>
    </SafeAreaView>
  );
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
    paddingBottom: 8,
    paddingTop: 8
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
  quotaMarker: {
    color: colors.textMuted,
    fontWeight: "700"
  },
  tierColumn: {
    alignItems: "center",
    flex: 1,
    gap: 3
  },
  quotaFootnote: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
    marginTop: -6
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
