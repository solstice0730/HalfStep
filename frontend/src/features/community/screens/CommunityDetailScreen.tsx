import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getPostById } from "@/features/community/services/communityService";
import { CATEGORY_LABELS, type CommunityPostDetail } from "@/features/community/types/community";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { colors } from "@/shared/constants/colors";

type Props = NativeStackScreenProps<AppStackParamList, "CommunityDetail">;

type Status = "loading" | "found" | "not_found" | "error";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function CommunityDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { accessToken, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [post, setPost] = useState<CommunityPostDetail | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setStatus("loading");
    try {
      const result = await getPostById(accessToken, postId);
      setPost(result);
      setStatus("found");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        if (error.kind === "auth") {
          await signOut();
          return;
        }
        if (error.kind === "notFound") {
          setStatus("not_found");
          return;
        }
      }
      setStatus("error");
    }
  }, [accessToken, postId, signOut]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>게시글</Text>
        <View style={styles.headerSpacer} />
      </View>

      {status === "loading" && <ActivityIndicator color={colors.primary} style={styles.centerSpinner} />}

      {status === "not_found" && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>게시글을 찾을 수 없습니다.</Text>
        </View>
      )}

      {status === "error" && (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>게시글을 불러오지 못했어요.</Text>
          <Pressable onPress={load}>
            <Text style={styles.retryText}>다시 시도</Text>
          </Pressable>
        </View>
      )}

      {status === "found" && post && (
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.metaRow}>
            <Text style={styles.categoryPill}>{CATEGORY_LABELS[post.category]}</Text>
            <Text style={styles.metaText}>{post.babyAgeMonths != null ? `${post.babyAgeMonths}개월` : "월령 무관"}</Text>
          </View>
          <Text style={styles.title}>{post.title}</Text>
          <View style={styles.authorRow}>
            <UserRound color={colors.textMuted} size={14} />
            <Text style={styles.metaText}>{post.author.isAnonymous ? "익명" : post.author.nickname}</Text>
            <Text style={styles.metaText}>· {formatDateTime(post.createdAt)}</Text>
          </View>
          <Text style={styles.content}>{post.content}</Text>

          {post.imageUrls.length > 0 && (
            <View style={styles.imageList}>
              {post.imageUrls.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.image} />
              ))}
            </View>
          )}
        </ScrollView>
      )}
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
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  headerSpacer: {
    width: 40
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  centerSpinner: {
    marginTop: 40
  },
  centerBox: {
    alignItems: "center",
    gap: 6,
    marginTop: 40
  },
  errorText: {
    color: colors.danger,
    fontSize: 14
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  body: {
    gap: 12,
    paddingBottom: 32,
    paddingHorizontal: 20
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  categoryPill: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  title: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 28
  },
  authorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  content: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 24
  },
  imageList: {
    gap: 10
  },
  image: {
    borderRadius: 16,
    height: 220,
    width: "100%"
  }
});
