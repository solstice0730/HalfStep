import { MessageCircle } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

const quickRecords = [
  { emoji: "🍼", title: "수유", meta: "최근: 3시간 전", color: colors.peachSoft },
  { emoji: "🌙", title: "수면", meta: "최근: 2시간 전", color: colors.blueSoft },
  { emoji: "👶", title: "배변", meta: "최근: 1시간 전", color: colors.greenSoft },
  { emoji: "🥣", title: "이유식", meta: "시작 전", color: colors.lavenderSoft }
];

const recommendations = [
  { emoji: "📈", category: "성장", title: "갑자기 찾아오는 성장 급등기 대처법", color: colors.blueSoft },
  { emoji: "🌡️", category: "수면", title: "통잠을 부르는 최적의 방 안 온도와 습도", color: colors.peachSoft },
  { emoji: "🍼", category: "수유", title: "신생아의 배고픔 신호 파악하기", color: colors.greenSoft }
];

export function HomeScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.topNav}>
        <Text style={styles.brand}>반걸음</Text>
      </View>
      <Screen>
        <View style={styles.growthCard}>
          <Text style={styles.ageText}>생후 45일 / 180일</Text>
          <Text style={styles.growthTitle}>새벽이가 예쁘게{"\n"}자라는 중이에요! 🌱</Text>
          <Text style={styles.babyIcon}>👶</Text>
          <View style={styles.progressLabels}>
            {["출생", "1개월", "2개월", "3개월", "6개월"].map((label) => (
              <Text key={label} style={styles.progressLabel}>{label}</Text>
            ))}
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressText}>6개월까지 135일 남았어요 🎉</Text>
        </View>

        <View>
          <Text style={styles.sectionTitle}>빠른 기록</Text>
          <View style={styles.quickGrid}>
            {quickRecords.map((item) => (
              <Pressable key={item.title} style={[styles.quickCard, { backgroundColor: item.color }]}>
                <View style={styles.quickTop}>
                  <Text style={styles.quickEmoji}>{item.emoji}</Text>
                  <View style={styles.addButton}>
                    <Text style={styles.addText}>+</Text>
                  </View>
                </View>
                <Text style={styles.quickTitle}>{item.title}</Text>
                <Text style={styles.quickMeta}>{item.meta}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>생후 45일 아기를 위한 추천 정보</Text>
          <Text style={styles.sectionCaption}>새벽이를 위해 맞춤 선별했어요</Text>
          <View style={styles.recommendRow}>
            {recommendations.map((item) => (
              <View key={item.title} style={[styles.recommendCard, { backgroundColor: item.color }]}>
                <View style={styles.recommendHeader}>
                  <Text style={styles.recommendEmoji}>{item.emoji}</Text>
                  <Text style={styles.recommendCategory}>{item.category}</Text>
                </View>
                <Text style={styles.recommendTitle}>{item.title}</Text>
                <Text style={styles.linkText}>자세히 보기 ›</Text>
              </View>
            ))}
          </View>
        </View>
      </Screen>
      <View style={styles.chatButton}>
        <MessageCircle color="#FFFFFF" size={18} />
        <Text style={styles.chatText}>AI 챗봇</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  topNav: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    height: 56,
    justifyContent: "center"
  },
  brand: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900"
  },
  growthCard: {
    backgroundColor: colors.peachSoft,
    borderRadius: 24,
    overflow: "hidden",
    padding: 20
  },
  ageText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "500"
  },
  growthTitle: {
    color: colors.primaryDark,
    fontSize: 21,
    fontWeight: "900",
    lineHeight: 29,
    marginTop: 4
  },
  babyIcon: {
    fontSize: 78,
    marginVertical: 18,
    textAlign: "center"
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between"
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 11
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: 999,
    height: 12,
    marginTop: 10,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: "100%",
    width: "25%"
  },
  progressText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 10,
    textAlign: "center"
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  sectionCaption: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12
  },
  quickCard: {
    borderRadius: 20,
    minHeight: 122,
    padding: 16,
    width: "48%"
  },
  quickTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  quickEmoji: {
    fontSize: 28
  },
  addButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  addText: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900"
  },
  quickTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 12
  },
  quickMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3
  },
  recommendRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12
  },
  recommendCard: {
    borderRadius: 20,
    minHeight: 142,
    padding: 16,
    width: 200
  },
  recommendHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  recommendEmoji: {
    fontSize: 24
  },
  recommendCategory: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  recommendTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 8
  },
  linkText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900",
    marginTop: 12
  },
  chatButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 16
  },
  chatText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  }
});
