import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Send, Trash2, UserRound } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { ReactionBar } from "@/features/community/components/ReactionBar";
import { addComment, deleteComment, getComments, getPostById, setPostReaction } from "@/features/community/services/communityService";
import { CATEGORY_LABELS, type CommunityComment, type CommunityPostDetail } from "@/features/community/types/community";
import { confirmAsync } from "@/shared/utils/confirm";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";

type Props = NativeStackScreenProps<AppStackParamList, "CommunityDetail">;

type Status = "loading" | "found" | "not_found" | "error";

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ko-KR", { month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function CommunityDetailScreen({ route, navigation }: Props) {
  const { postId } = route.params;
  const { accessToken, signOut } = useAuth();
  const [status, setStatus] = useState<Status>("loading");
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [comments, setComments] = useState<CommunityComment[]>([]);
  const [commentInput, setCommentInput] = useState("");
  const [commentAnonymous, setCommentAnonymous] = useState(false);
  const [commentSubmitting, setCommentSubmitting] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setStatus("loading");
    try {
      const [result, commentList] = await Promise.all([getPostById(accessToken, postId), getComments(accessToken, postId)]);
      setPost(result);
      setComments(commentList);
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

  // 낙관적 토글 후 서버 응답으로 확정한다. 실패하면 이전 상태로 되돌린다.
  const toggleReaction = async (reaction: "like" | "bookmark") => {
    if (!accessToken || !post) return;
    const previous = post;
    const active = reaction === "like" ? !post.isLiked : !post.isBookmarked;
    setPost(
      reaction === "like"
        ? { ...post, isLiked: active, likeCount: Math.max(0, post.likeCount + (active ? 1 : -1)) }
        : { ...post, isBookmarked: active }
    );
    try {
      const state = await setPostReaction(accessToken, post.id, reaction, active);
      setPost((current) => (current ? { ...current, ...state } : current));
    } catch {
      setPost(previous);
    }
  };

  const submitComment = async () => {
    const content = commentInput.trim();
    if (!accessToken || !post || !content || commentSubmitting) return;
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      const created = await addComment(accessToken, post.id, { content, isAnonymous: commentAnonymous });
      setComments((current) => [...current, created]);
      setPost((current) => (current ? { ...current, commentCount: current.commentCount + 1 } : current));
      setCommentInput("");
    } catch (error) {
      setCommentError(error instanceof ApiRequestError ? error.message : "댓글을 남기지 못했어요. 다시 시도해 주세요.");
    } finally {
      setCommentSubmitting(false);
    }
  };

  const removeComment = async (comment: CommunityComment) => {
    if (!accessToken || !post) return;
    const confirmed = await confirmAsync("댓글을 삭제할까요?", "삭제한 댓글은 되돌릴 수 없어요.", { confirmText: "삭제", destructive: true });
    if (!confirmed) return;
    setComments((current) => current.filter((item) => item.id !== comment.id));
    setPost((current) => (current ? { ...current, commentCount: Math.max(0, current.commentCount - 1) } : current));
    try {
      await deleteComment(accessToken, post.id, comment.id);
    } catch {
      setComments((current) => [...current, comment]);
      setPost((current) => (current ? { ...current, commentCount: current.commentCount + 1 } : current));
    }
  };

  return (
    <View style={styles.rootWrap}>
      <GradientBackdrop />
      <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()}>
          <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.backButton}>
            <ArrowLeft color={colors.primaryDark} size={22} />
          </GlassSurface>
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

          <View style={styles.reactionRow}>
            <ReactionBar
              commentCount={post.commentCount}
              isBookmarked={post.isBookmarked}
              isLiked={post.isLiked}
              likeCount={post.likeCount}
              onToggleBookmark={() => void toggleReaction("bookmark")}
              onToggleLike={() => void toggleReaction("like")}
            />
          </View>

          {post.imageUrls.length > 0 && (
            <View style={styles.imageList}>
              {post.imageUrls.map((uri) => (
                <Image key={uri} source={{ uri }} style={styles.image} />
              ))}
            </View>
          )}

          <Text style={styles.commentHeader}>댓글 {comments.length}</Text>
          {comments.length === 0 ? (
            <Text style={styles.commentEmpty}>첫 댓글을 남겨 보세요.</Text>
          ) : (
            <View style={styles.commentList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentRow}>
                  <View style={styles.commentBody}>
                    <View style={styles.commentMeta}>
                      <Text style={styles.commentAuthor}>{comment.author.nickname}</Text>
                      <Text style={styles.metaText}>{formatDateTime(comment.createdAt)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                  </View>
                  {comment.isMine && (
                    <Pressable accessibilityLabel="댓글 삭제" hitSlop={8} onPress={() => void removeComment(comment)}>
                      <Trash2 color={colors.textMuted} size={16} />
                    </Pressable>
                  )}
                </View>
              ))}
            </View>
          )}
          {commentError && <Text style={styles.errorText}>{commentError}</Text>}
        </ScrollView>
      )}

      {status === "found" && post && (
        <View style={styles.commentComposer}>
          <View style={styles.commentOptions}>
            <Text style={styles.metaText}>익명으로 남기기</Text>
            <Switch value={commentAnonymous} onValueChange={setCommentAnonymous} />
          </View>
          <View style={styles.commentInputRow}>
            <TextInput
              editable={!commentSubmitting}
              maxLength={1000}
              onChangeText={setCommentInput}
              onSubmitEditing={() => void submitComment()}
              placeholder="댓글을 입력하세요"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              style={styles.commentInput}
              value={commentInput}
            />
            <Pressable
              accessibilityLabel="댓글 등록"
              disabled={commentSubmitting || commentInput.trim().length === 0}
              style={[styles.commentSend, (commentSubmitting || commentInput.trim().length === 0) && styles.commentSendDisabled]}
              onPress={() => void submitComment()}
            >
              {commentSubmitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Send color="#FFFFFF" size={16} />}
            </Pressable>
          </View>
        </View>
      )}
      </KeyboardAvoidingView>
    </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  rootWrap: {
    flex: 1
  },
  root: {
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
    height: 40,
    justifyContent: "center",
    width: 40
  },
  headerSpacer: {
    width: 40
  },
  headerTitle: {
    color: colors.primaryDark,
    ...typography.headline
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
  reactionRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 10
  },
  imageList: {
    gap: 10
  },
  commentHeader: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900",
    marginTop: 8
  },
  commentEmpty: {
    color: colors.textMuted,
    fontSize: 13
  },
  commentList: {
    gap: 8
  },
  commentRow: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12
  },
  commentBody: {
    flex: 1,
    gap: 4
  },
  commentMeta: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  commentAuthor: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  commentText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19
  },
  commentComposer: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  commentOptions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end"
  },
  commentInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8
  },
  commentInput: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    borderWidth: 1,
    color: colors.primaryDark,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 16
  },
  commentSend: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  commentSendDisabled: {
    opacity: 0.45
  },
  image: {
    borderRadius: 16,
    height: 220,
    width: "100%"
  }
});
