import { BookOpen, ChevronLeft, Heart, MessageCircle, Search, ShoppingBag, Sparkles, Stethoscope } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

const tags = ["#수면퇴행기", "#생후6주", "#성장급등기", "#스와들"];

const posts = [
  {
    category: "수면",
    title: "3개월 차 원더윅스 수면 퇴행기 주요 증상과 극복 팁",
    body: "생후 40~50일 전후로 많은 부모가 갑작스러운 수면 패턴 변화를 경험합니다. 아기의 뇌에서 실제로 무슨 일이 일어나는지 알아보세요.",
    tags: ["#수면퇴행기", "#원더윅스", "#3개월"],
    author: "👩‍⚕️ 김유나 의사",
    likes: 42,
    comments: 15,
    time: "2시간 전",
    color: colors.blueSoft
  },
  {
    category: "수유",
    title: "갑자기 찾아오는 성장 급등기 대처법",
    body: "성장 급등기에는 더 자주 수유하려 할 수 있어요. 신호를 알아보고 자신감 있게 대응하는 방법을 알아보세요.",
    tags: ["#성장급등기", "#수유", "#생후6주"],
    author: "🤝 육아 커뮤니티",
    likes: 38,
    comments: 9,
    time: "5시간 전",
    color: colors.peachSoft
  },
  {
    category: "환경",
    title: "통잠을 부르는 최적의 방 안 온도와 습도",
    body: "20~22도가 핵심이에요. 습도, 조명, 백색 소음이 어떻게 함께 작용하는지 알아보세요.",
    tags: ["#통잠", "#실내온도", "#수면환경"],
    author: "🔬 수면 연구소",
    likes: 61,
    comments: 22,
    time: "1일 전",
    color: colors.greenSoft
  }
];

export function CommunityScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.topNav}>
        <View style={styles.backButton}>
          <ChevronLeft color={colors.primaryDark} size={20} />
        </View>
        <Text style={styles.navTitle}>커뮤니티</Text>
        <View style={styles.placeholder} />
      </View>
      <Screen>
        <View style={styles.segment}>
          <View style={[styles.segmentItem, styles.segmentActive]}>
            <BookOpen color={colors.primary} size={14} />
            <Text style={styles.segmentActiveText}>정보</Text>
          </View>
          <View style={styles.segmentItem}>
            <Stethoscope color={colors.textMuted} size={14} />
            <Text style={styles.segmentText}>상담</Text>
          </View>
          <View style={styles.segmentItem}>
            <ShoppingBag color={colors.textMuted} size={14} />
            <Text style={styles.segmentText}>상품</Text>
          </View>
        </View>

        <View>
          <View style={styles.searchBox}>
            <Search color={colors.textMuted} size={16} />
            <Text style={styles.searchText}>육아 팁을 검색하거나 AI 챗봇에게 물어보세요</Text>
            <View style={styles.aiPill}>
              <Sparkles color={colors.primary} size={11} />
              <Text style={styles.aiPillText}>AI</Text>
            </View>
          </View>
          <View style={styles.tagStrip}>
            <Text style={styles.popularText}>⌁ 인기:</Text>
            {tags.map((tag) => (
              <Text key={tag} style={styles.tagPill}>{tag}</Text>
            ))}
          </View>
        </View>

        <View style={styles.postList}>
          {posts.map((post) => (
            <View key={post.title} style={[styles.postCard, { backgroundColor: post.color }]}>
              <View style={styles.postTop}>
                <Text style={styles.categoryPill}>{post.category}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postBody}>{post.body}</Text>
              <View style={styles.postTags}>
                {post.tags.map((tag) => (
                  <Text key={tag} style={styles.postTag}>{tag}</Text>
                ))}
              </View>
              <View style={styles.postFooter}>
                <Text style={styles.author}>{post.author}</Text>
                <View style={styles.metrics}>
                  <View style={styles.metric}>
                    <Heart color={colors.textMuted} size={15} />
                    <Text style={styles.metricText}>{post.likes}</Text>
                  </View>
                  <View style={styles.metric}>
                    <MessageCircle color={colors.textMuted} size={15} />
                    <Text style={styles.metricText}>{post.comments}</Text>
                  </View>
                  <Text style={styles.moreText}>더보기 ›</Text>
                </View>
              </View>
            </View>
          ))}
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
  segment: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flexDirection: "row",
    gap: 4,
    padding: 4
  },
  segmentItem: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10
  },
  segmentActive: {
    backgroundColor: colors.surface
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  segmentActiveText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  searchText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 13
  },
  aiPill: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4
  },
  aiPillText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "900"
  },
  tagStrip: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10
  },
  popularText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  tagPill: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  postList: {
    gap: 12
  },
  postCard: {
    borderRadius: 24,
    padding: 16
  },
  postTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  categoryPill: {
    backgroundColor: "rgba(255,255,255,0.75)",
    borderRadius: 999,
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "900",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  postTime: {
    color: colors.textMuted,
    fontSize: 11
  },
  postTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 22,
    marginTop: 10
  },
  postBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8
  },
  postTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  postTag: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  postFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  author: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  metrics: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  metric: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  metricText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  moreText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
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
