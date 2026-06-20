import { BookOpen, ChevronLeft, Heart, Search, ShoppingBag, Stethoscope } from "lucide-react-native";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

type TabKey = "info" | "consult" | "product";

const infoPosts = [
  {
    category: "수면",
    title: "3개월 차 원더윅스 수면 퇴행기 주요 증상과 극복 팁",
    body: "생후 40~50일 전후로 많은 부모가 갑작스러운 수면 패턴 변화를 경험합니다.",
    tags: ["수면퇴행기", "원더윅스", "3개월"],
    likes: 42,
    color: colors.blueSoft
  },
  {
    category: "수유",
    title: "갑자기 찾아오는 성장 급등기 대처법",
    body: "더 자주 수유하려는 신호를 읽고 부담 없이 대응하는 방법을 정리했어요.",
    tags: ["성장급등기", "수유", "생후6주"],
    likes: 38,
    color: colors.peachSoft
  },
  {
    category: "환경",
    title: "통잠을 부르는 최적의 방 안 온도와 습도",
    body: "20~22도, 적정 습도, 조명과 백색 소음의 조합을 확인해보세요.",
    tags: ["통잠", "실내온도", "수면환경"],
    likes: 61,
    color: colors.greenSoft
  }
];

const qnaItems = [
  {
    question: "45일 아기가 낮잠을 30분만 자도 괜찮나요?",
    answer: "짧은 낮잠은 흔합니다. 하루 총 수면량과 컨디션을 같이 확인해보세요.",
    cost: 15
  },
  {
    question: "수유 후 바로 게워내면 병원에 가야 하나요?",
    answer: "소량 역류는 흔하지만 반복 구토, 체중 증가 부진, 처짐이 있으면 진료가 필요합니다.",
    cost: 20
  }
];

export function CommunityScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("info");
  const [likedPosts, setLikedPosts] = useState<string[]>([]);
  const [points, setPoints] = useState(120);

  const toggleLike = (title: string) => {
    setLikedPosts((current) =>
      current.includes(title) ? current.filter((item) => item !== title) : [...current, title]
    );
  };

  const askQuestion = (cost: number) => {
    setPoints((current) => Math.max(0, current - cost));
  };

  return (
    <View style={styles.root}>
      <View style={styles.topNav}>
        <View style={styles.backButton}>
          <ChevronLeft color={colors.primaryDark} size={20} />
        </View>
        <Text style={styles.navTitle}>커뮤니티</Text>
        <View style={styles.pointBadge}>
          <Text style={styles.pointText}>{points}P</Text>
        </View>
      </View>
      <Screen>
        <View style={styles.segment}>
          <Pressable
            style={[styles.segmentItem, activeTab === "info" && styles.segmentActive]}
            onPress={() => setActiveTab("info")}
          >
            <BookOpen color={activeTab === "info" ? colors.primary : colors.textMuted} size={14} />
            <Text style={[styles.segmentText, activeTab === "info" && styles.segmentActiveText]}>정보</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, activeTab === "consult" && styles.segmentActive]}
            onPress={() => setActiveTab("consult")}
          >
            <Stethoscope color={activeTab === "consult" ? colors.primary : colors.textMuted} size={14} />
            <Text style={[styles.segmentText, activeTab === "consult" && styles.segmentActiveText]}>상담</Text>
          </Pressable>
          <Pressable
            style={[styles.segmentItem, activeTab === "product" && styles.segmentActive]}
            onPress={() => setActiveTab("product")}
          >
            <ShoppingBag color={activeTab === "product" ? colors.primary : colors.textMuted} size={14} />
            <Text style={[styles.segmentText, activeTab === "product" && styles.segmentActiveText]}>상품</Text>
          </Pressable>
        </View>

        <View style={styles.searchBox}>
          <Search color={colors.textMuted} size={16} />
          <Text style={styles.searchText}>육아 팁, 상담 질문, 상품을 검색해보세요</Text>
        </View>

        {activeTab === "info" && (
          <View style={styles.list}>
            {infoPosts.map((post) => {
              const liked = likedPosts.includes(post.title);
              return (
                <View key={post.title} style={[styles.postCard, { backgroundColor: post.color }]}>
                  <View style={styles.postTop}>
                    <Text style={styles.categoryPill}>{post.category}</Text>
                    <Pressable style={styles.likeButton} onPress={() => toggleLike(post.title)}>
                      <Heart color={liked ? colors.accent : colors.textMuted} fill={liked ? colors.accent : "transparent"} size={17} />
                      <Text style={styles.likeText}>{post.likes + (liked ? 1 : 0)}</Text>
                    </Pressable>
                  </View>
                  <Text style={styles.postTitle}>{post.title}</Text>
                  <Text style={styles.postBody}>{post.body}</Text>
                  <View style={styles.tagRow}>
                    {post.tags.map((tag) => (
                      <Text key={tag} style={styles.tag}>#{tag}</Text>
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {activeTab === "consult" && (
          <View style={styles.list}>
            <View style={styles.askCard}>
              <Text style={styles.askTitle}>Q&A 상담</Text>
              <Text style={styles.askText}>질문을 등록하면 포인트가 차감되고 답변 대기 상태로 전환됩니다.</Text>
              <Pressable style={styles.askButton} onPress={() => askQuestion(10)}>
                <Text style={styles.askButtonText}>질문하기 · 10P</Text>
              </Pressable>
            </View>
            {qnaItems.map((item) => (
              <View key={item.question} style={styles.qnaCard}>
                <Text style={styles.question}>Q. {item.question}</Text>
                <Text style={styles.answer}>A. {item.answer}</Text>
                <Pressable style={styles.pointButton} onPress={() => askQuestion(item.cost)}>
                  <Text style={styles.pointButtonText}>비슷한 질문하기 · {item.cost}P</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {activeTab === "product" && (
          <View style={styles.productCard}>
            <ShoppingBag color={colors.primary} size={32} />
            <Text style={styles.productTitle}>추천 상품 준비 중</Text>
            <Text style={styles.productText}>아기 일수와 기록 패턴에 맞춘 상품 큐레이션을 연결할 예정입니다.</Text>
          </View>
        )}
      </Screen>
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
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24
  },
  pointBadge: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  pointText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18
  },
  segment: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
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
    minHeight: 44,
    paddingVertical: 10
  },
  segmentActive: {
    backgroundColor: colors.surfaceSoft
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  segmentActiveText: {
    color: colors.primary,
    fontWeight: "600"
  },
  searchBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 13
  },
  searchText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
    lineHeight: 20
  },
  list: {
    gap: 12
  },
  postCard: {
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  likeButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5
  },
  likeText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "600"
  },
  postTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 23,
    marginTop: 12
  },
  postBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.62)",
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 8,
    paddingVertical: 5
  },
  askCard: {
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    padding: 18
  },
  askTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28
  },
  askText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8
  },
  askButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    marginTop: 14,
    minHeight: 48,
    paddingVertical: 12
  },
  askButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600"
  },
  qnaCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16
  },
  question: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  },
  answer: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8
  },
  pointButton: {
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    marginTop: 12,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  pointButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600"
  },
  productCard: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: 16,
    minHeight: 220,
    justifyContent: "center",
    padding: 24
  },
  productTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "600",
    marginTop: 12
  },
  productText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
    textAlign: "center"
  }
});
