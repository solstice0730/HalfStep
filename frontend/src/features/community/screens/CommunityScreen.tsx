import type { CompositeScreenProps } from "@react-navigation/native";
import { useFocusEffect } from "@react-navigation/native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ImageIcon, PenLine } from "lucide-react-native";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getPosts } from "@/features/community/services/communityService";
import {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  type AgeGroup,
  type CommunityCategoryCode,
  type CommunityPostListItem
} from "@/features/community/types/community";
import { EmptyState } from "@/shared/components/EmptyState";
import { ErrorState } from "@/shared/components/ErrorState";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { LoadingState } from "@/shared/components/LoadingState";
import { Screen } from "@/shared/components/Screen";
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
  const [category, setCategory] = useState<CommunityCategoryCode | null>(null);
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null);
  const [posts, setPosts] = useState<CommunityPostListItem[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const requestId = useRef(0);
  const tabBarHeight = useBottomTabBarHeight();

  const loadFirstPage = useCallback(async () => {
    if (!accessToken) return;
    const currentRequest = ++requestId.current;
    setStatus("loading");
    try {
      const result = await getPosts(accessToken, { category: category ?? undefined, ageGroup: ageGroup ?? undefined });
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
  }, [accessToken, category, ageGroup, signOut]);

  useFocusEffect(
    useCallback(() => {
      void loadFirstPage();
    }, [loadFirstPage])
  );

  const loadMore = async () => {
    if (!nextCursor || loadingMore || !accessToken) return;
    setLoadingMore(true);
    try {
      const result = await getPosts(accessToken, { category: category ?? undefined, ageGroup: ageGroup ?? undefined, cursor: nextCursor });
      setPosts((current) => [...current, ...result.items]);
      setNextCursor(result.nextCursor);
    } catch {
      // 더 보기 실패는 기존 목록을 유지하고 조용히 무시한다. 재시도는 버튼을 다시 누르면 된다.
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
        <View style={styles.topNav}>
          <Text style={styles.navTitle}>커뮤니티</Text>
          <Pressable onPress={() => navigation.navigate("CommunityWrite")}>
            <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.writeButton}>
              <PenLine color="#FFFFFF" size={14} />
              <Text style={styles.writeButtonText}>글쓰기</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
      <Screen edges={["left", "right", "bottom"]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.chip, category === null && styles.chipActive]} onPress={() => setCategory(null)}>
            <Text style={[styles.chipText, category === null && styles.chipTextActive]}>전체</Text>
          </Pressable>
          {CATEGORY_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.chip, category === option && styles.chipActive]}
              onPress={() => setCategory(category === option ? null : option)}
            >
              <Text style={[styles.chipText, category === option && styles.chipTextActive]}>{CATEGORY_LABELS[option]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
          <Pressable style={[styles.chip, ageGroup === null && styles.chipActive]} onPress={() => setAgeGroup(null)}>
            <Text style={[styles.chipText, ageGroup === null && styles.chipTextActive]}>월령 전체</Text>
          </Pressable>
          {AGE_GROUP_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.chip, ageGroup === option && styles.chipActive]}
              onPress={() => setAgeGroup(ageGroup === option ? null : option)}
            >
              <Text style={[styles.chipText, ageGroup === option && styles.chipTextActive]}>{AGE_GROUP_LABELS[option]}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {status === "loading" && <LoadingState />}

        {status === "error" && <ErrorState message="게시글을 불러오지 못했어요." onRetry={loadFirstPage} />}

        {status === "idle" && posts.length === 0 && (
          <EmptyState title="아직 게시글이 없어요" description="첫 글을 남겨보세요." />
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
                        {post.babyAgeMonths != null ? `${post.babyAgeMonths}개월` : "월령 무관"}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={styles.postTitle}>{post.title}</Text>
                    <Text numberOfLines={2} style={styles.postBody}>{post.preview}</Text>
                    <View style={styles.postBottom}>
                      <Text style={styles.metaText}>
                        {post.author.isAnonymous ? "익명" : post.author.nickname} · {formatDate(post.createdAt)}
                      </Text>
                      {post.imageCount > 0 && <ImageIcon color={colors.textMuted} size={14} />}
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
        <View style={{ height: tabBarHeight }} />
      </Screen>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  topSafeArea: {
    backgroundColor: colors.backgroundTop
  },
  pressed: {
    opacity: 0.75
  },
  topNav: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  navTitle: {
    color: colors.primaryDark,
    ...typography.headline
  },
  writeButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  writeButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
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
    gap: 8,
    justifyContent: "space-between",
    marginTop: 12
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
  }
});
