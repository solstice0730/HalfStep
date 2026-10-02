import type { CompositeScreenProps } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ImageIcon, Plus, Search, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { ReactionBar } from "@/features/community/components/ReactionBar";
import { getPosts, setPostReaction } from "@/features/community/services/communityService";
import {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  ageGroupForMonths,
  type AgeGroup,
  type CommunityCategoryCode,
  type CommunityPostListItem
} from "@/features/community/types/community";
import { calculateBabyAge } from "@/features/home/services/babyProfileService";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorState } from "@/shared/components/ErrorState";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { LoadingState } from "@/shared/components/LoadingState";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";

type CommunityScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Community">,
  NativeStackScreenProps<AppStackParamList>
>;

type Status = "loading" | "idle" | "error";

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });

export function CommunityScreen({ navigation }: CommunityScreenProps) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const [category, setCategory] = useState<CommunityCategoryCode | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [ageGroupInitialized, setAgeGroupInitialized] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);
  const tabBarHeight = useBottomTabBarHeight();

  // 영상 06: 아기 월령에 맞는 그룹(3~5개월 등)을 처음 한 번 자동 선택한다.
  useEffect(() => {
    if (ageGroupInitialized || !activeBaby) return;
    const age = calculateBabyAge(activeBaby.birthDate);
    setAgeGroup(age ? ageGroupForMonths(age.ageMonths) : null);
    setAgeGroupInitialized(true);
  }, [activeBaby, ageGroupInitialized]);

  const loadFirstPage = useCallback(async () => {
    if (!accessToken || (activeBaby && !ageGroupInitialized)) return;
    const currentRequest = ++requestId.current;
    setStatus("loading");
    try {
      const result = await getPosts(accessToken, { category: category ?? undefined, ageGroup: ageGroup ?? undefined, query: searchQuery });
      if (requestId.current !== currentRequest) return;
      setPosts(result.items);
      setNextCursor(result.nextCursor);
      setStatus("idle");
    } catch (error) {
      if (requestId.current !== currentRequest) return;
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setStatus("error");
    }
  }, [accessToken, activeBaby, ageGroupInitialized, category, ageGroup, searchQuery, signOut]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage])
  );

  const loadMore = async () => {
    if (!nextCursor || loadingMore || !accessToken) return;
    setLoadingMore(true);
    try {
      const result = await getPosts(accessToken, { category: category ?? undefined, ageGroup: ageGroup ?? undefined, query: searchQuery, cursor: nextCursor });
      setPosts((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch {
      // 더 보기 실패는 기존 목록을 유지하고 조용히 무시한다. 재시도는 버튼을 다시 누르면 된다.
    } finally {
      setLoadingMore(false);
    }
  };

  // 낙관적 토글: 먼저 화면을 바꾸고 서버 응답으로 확정한다. 실패하면 되돌린다.
  const toggleReaction = async (post: CommunityPostListItem, reaction: "like" | "bookmark") => {
    if (!accessToken) return;
    const active = reaction === "like" ? !post.isLiked : !post.isBookmarked;
    const optimistic: CommunityPostListItem =
      reaction === "like"
        ? { ...post, isLiked: active, likeCount: Math.max(0, post.likeCount + (active ? 1 : -1)) }
        : { ...post, isBookmarked: active };
    setPosts((current) => current.map((item) => (item.id === post.id ? optimistic : item)));
    try {
      const state = await setPostReaction(accessToken, post.id, reaction, active);
      setPosts((current) => current.map((item) => (item.id === post.id ? { ...item, ...state } : item)));
    } catch {
      setPosts((current) => current.map((item) => (item.id === post.id ? post : item)));
    }
  };

  return (
    <View style={styles.root}>
      <GradientBackdrop />
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>함께 나누는 육아</Text>
          <Text style={styles.navTitle}>커뮤니티</Text>
        </View>

        <ScrollView contentContainerStyle={[styles.body, { paddingBottom: tabBarHeight + 96 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.searchRow}>
            <Search color={colors.textMuted} size={19} accessibilityElementsHidden />
            <TextInput
              accessibilityLabel="커뮤니티 게시글 검색"
              onChangeText={setSearchInput}
              onSubmitEditing={() => setSearchQuery(searchInput.trim())}
              placeholder="제목·내용 검색"
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
              style={styles.searchInput}
              value={searchInput}
            />
            {searchInput ? (
              <Pressable accessibilityLabel="검색어 지우기" accessibilityRole="button" onPress={() => { setSearchInput(""); setSearchQuery(""); }} style={styles.searchAction}>
                <X color={colors.textMuted} size={18} />
              </Pressable>
            ) : null}
            <Pressable accessibilityLabel="검색" accessibilityRole="button" onPress={() => setSearchQuery(searchInput.trim())} style={styles.searchAction}>
              <Text style={styles.searchActionText}>검색</Text>
            </Pressable>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Chip active={category === null} label="전체" onPress={() => setCategory(null)} />
            {CATEGORY_OPTIONS.map((option) => (
              <Chip
                key={option}
                active={category === option}
                label={CATEGORY_LABELS[option]}
                onPress={() => setCategory(category === option ? null : option)}
              />
            ))}
          </ScrollView>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            <Chip active={ageGroup === null} label="월령 전체" onPress={() => setAgeGroup(null)} />
            {AGE_GROUP_OPTIONS.map((option) => (
              <Chip
                key={option}
                active={ageGroup === option}
                label={AGE_GROUP_LABELS[option]}
                onPress={() => setAgeGroup(ageGroup === option ? null : option)}
              />
            ))}
          </ScrollView>

          {status === "loading" && <LoadingState />}

          {status === "error" && <ErrorState message="게시글을 불러오지 못했어요." onRetry={loadFirstPage} />}

          {status === "idle" && posts.length === 0 && (
            <EmptyState
              title={searchQuery ? "검색 결과가 없어요" : "아직 게시글이 없어요"}
              description={searchQuery ? "검색어를 바꾸거나 카테고리·월령 필터를 해제해 보세요." : "비슷한 시기의 부모와 첫 이야기를 남겨보세요."}
            />
          )}

          {status === "idle" && posts.length > 0 && (
            <View style={styles.list}>
              {posts.map((post) => (
                <Pressable key={post.id} onPress={() => navigation.navigate("CommunityDetail", { postId: post.id })}>
                  {({ pressed }) => (
                    <GlassSurface radius={theme.radius.xl} intensity={30} style={pressed && styles.pressed} contentStyle={styles.postCard}>
                      <View style={styles.postTop}>
                        <Text style={styles.categoryPill}>{CATEGORY_LABELS[post.category]}</Text>
                        <Text style={styles.metaText}>
                          {post.babyAgeMonths != null ? `생후 ${post.babyAgeMonths}개월` : "월령 무관"}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={styles.postTitle}>{post.title}</Text>
                      <Text numberOfLines={2} style={styles.postBody}>{post.preview}</Text>
                      <View style={styles.postBottom}>
                        <ReactionBar
                          commentCount={post.commentCount}
                          isBookmarked={post.isBookmarked}
                          isLiked={post.isLiked}
                          likeCount={post.likeCount}
                          onToggleBookmark={() => void toggleReaction(post, "bookmark")}
                          onToggleLike={() => void toggleReaction(post, "like")}
                        />
                        <View style={styles.postMetaRight}>
                          {post.imageCount > 0 && <ImageIcon color={colors.textMuted} size={13} />}
                          <Text style={styles.metaText}>
                            {post.author.isAnonymous ? "익명" : post.author.nickname} · {formatDate(post.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </GlassSurface>
                  )}
                </Pressable>
              ))}

              {nextCursor && (
                <Pressable disabled={loadingMore} onPress={loadMore} style={styles.moreButton}>
                  {loadingMore ? <ActivityIndicator color={colors.primary} size="small" /> : <Text style={styles.moreButtonText}>더 보기</Text>}
                </Pressable>
              )}
            </View>
          )}
        </ScrollView>

        <Pressable
          accessibilityLabel="글쓰기"
          accessibilityRole="button"
          style={[styles.fab, { bottom: tabBarHeight + 18 }]}
          onPress={() => navigation.navigate("CommunityWrite")}
        >
          <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fabInner}>
            <Plus color="#FFFFFF" size={26} strokeWidth={2.5} />
          </LinearGradient>
        </Pressable>
      </SafeAreaView>
    </View>
  );
}

function Chip({ active, label, onPress }: { active: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.chip, active && styles.chipActive]} onPress={onPress}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  pressed: {
    opacity: 0.75
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  navTitle: {
    color: colors.primaryDark,
    ...typography.title1
  },
  body: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    minHeight: 48,
    paddingLeft: 14,
    paddingRight: 6
  },
  searchInput: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 10
  },
  searchAction: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 44,
    minWidth: 44
  },
  searchActionText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  filterRow: {
    gap: 8,
    paddingBottom: 2
  },
  chip: {
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    backgroundColor: colors.primary
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  list: {
    gap: 12
  },
  postCard: {
    padding: 16
  },
  postTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between"
  },
  categoryPill: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  postTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900",
    marginTop: 10
  },
  postBody: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6
  },
  postBottom: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between",
    marginTop: 12
  },
  postMetaRight: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    paddingVertical: 12
  },
  moreButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  fab: {
    borderRadius: 999,
    position: "absolute",
    right: 22,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6
  },
  fabInner: {
    alignItems: "center",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    borderWidth: 3,
    height: 58,
    justifyContent: "center",
    width: 58
  }
});
