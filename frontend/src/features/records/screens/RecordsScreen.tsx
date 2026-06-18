import { ChevronLeft, MessageCircle, Sparkles } from "lucide-react-native";
import { ImageBackground, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

const days = [
  { weekday: "일", date: "31" },
  { weekday: "월", date: "1" },
  { weekday: "화", date: "2" },
  { weekday: "수", date: "3" },
  { weekday: "목", date: "4" },
  { weekday: "금", date: "5" }
];

const timeline = [
  { emoji: "🍼", title: "모유 수유", time: "오전 07:30", detail: "120ml (왼쪽 15분, 오른쪽 15분)", color: colors.peachSoft },
  { emoji: "👶", title: "배변", time: "오전 09:00", detail: "소변 (물세척 완료)", color: colors.greenSoft },
  { emoji: "🌙", title: "낮잠", time: "오후 04:00", detail: "45분 (얕은 잠)", color: colors.blueSoft },
  { emoji: "🍼", title: "모유 수유", time: "오후 06:15", detail: "130ml (왼쪽 20분)", color: colors.peachSoft }
];

export function RecordsScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.topNav}>
        <View style={styles.backButton}>
          <ChevronLeft color={colors.primaryDark} size={20} />
        </View>
        <Text style={styles.navTitle}>기록</Text>
        <View style={styles.placeholder} />
      </View>
      <Screen>
        <View>
          <Text style={styles.month}>6월 2026</Text>
          <View style={styles.dayRow}>
            {days.map((day) => (
              <View key={`${day.weekday}-${day.date}`} style={styles.dayItem}>
                <Text style={styles.weekday}>{day.weekday}</Text>
                <View style={styles.dateCircle}>
                  <Text style={styles.dateText}>{day.date}</Text>
                </View>
                <View style={styles.dayDot} />
              </View>
            ))}
          </View>
        </View>

        <ImageBackground
          source={{ uri: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop" }}
          imageStyle={styles.diaryImage}
          style={styles.diaryCard}
        >
          <View style={styles.diaryTop}>
            <View style={styles.diaryBadge}>
              <Text style={styles.diaryBadgeText}>생후 45일 · 6월 10일</Text>
            </View>
            <View style={styles.aiBadge}>
              <Sparkles color={colors.primary} size={13} />
              <Text style={styles.aiBadgeText}>AI 요약</Text>
            </View>
          </View>
        </ImageBackground>
        <View style={styles.diarySummary}>
          <Text style={styles.quote}>"오늘 새벽이는 잠도 잘 자고 방긋방긋 자주 웃었어요! 엄마 아빠와 눈맞춤이 늘어난 날. 🌸"</Text>
          <View style={styles.summaryChips}>
            {["🍼 수유 3회", "🌙 수면 5.5시간", "👶 배변 2회"].map((chip) => (
              <Text key={chip} style={styles.summaryChip}>{chip}</Text>
            ))}
          </View>
          <View style={styles.tagRow}>
            {["#통잠성공", "#황금변", "#미소천사", "#눈맞춤증가"].map((tag) => (
              <Text key={tag} style={styles.tagChip}>{tag}</Text>
            ))}
          </View>
        </View>

        <View>
          <Text style={styles.sectionTitle}>오늘 타임라인</Text>
          <View style={styles.timeline}>
            {timeline.map((item) => (
              <View key={`${item.title}-${item.time}`} style={styles.timelineRow}>
                <View style={[styles.timelineDot, { backgroundColor: item.color === colors.blueSoft ? colors.primary : item.color === colors.greenSoft ? colors.success : colors.accent }]} />
                <View style={[styles.timelineCard, { backgroundColor: item.color }]}>
                  <View style={styles.timelineEmojiBox}>
                    <Text style={styles.timelineEmoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.timelineText}>
                    <View style={styles.timelineHeader}>
                      <Text style={styles.timelineTitle}>{item.title}</Text>
                      <Text style={styles.timelineTime}>{item.time}</Text>
                    </View>
                    <Text style={styles.timelineDetail}>{item.detail}</Text>
                  </View>
                </View>
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
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  placeholder: {
    width: 36
  },
  month: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  dayRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14
  },
  dayItem: {
    alignItems: "center",
    gap: 6
  },
  weekday: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  dateCircle: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 52,
    justifyContent: "center",
    width: 52
  },
  dateText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  dayDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    width: 5
  },
  diaryCard: {
    height: 180,
    justifyContent: "flex-start"
  },
  diaryImage: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  diaryTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14
  },
  diaryBadge: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  diaryBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  aiBadge: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  aiBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  diarySummary: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    borderColor: colors.border,
    borderTopWidth: 0,
    borderWidth: 1,
    marginTop: -20,
    padding: 16
  },
  quote: {
    color: colors.primaryDark,
    fontSize: 15,
    lineHeight: 24
  },
  summaryChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
  },
  summaryChip: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  tagChip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  timeline: {
    gap: 16,
    marginTop: 14
  },
  timelineRow: {
    flexDirection: "row",
    gap: 16
  },
  timelineDot: {
    borderRadius: 999,
    height: 12,
    marginLeft: 14,
    marginTop: 20,
    width: 12
  },
  timelineCard: {
    alignItems: "center",
    borderRadius: 20,
    flex: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16
  },
  timelineEmojiBox: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  timelineEmoji: {
    fontSize: 22
  },
  timelineText: {
    flex: 1
  },
  timelineHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  timelineTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  timelineTime: {
    color: colors.textMuted,
    fontSize: 11
  },
  timelineDetail: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
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
