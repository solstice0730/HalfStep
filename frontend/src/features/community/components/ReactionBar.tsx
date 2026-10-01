import { Bookmark, Heart } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/constants/colors";

interface ReactionBarProps {
  likeCount: number;
  isLiked: boolean;
  isBookmarked: boolean;
  commentCount: number;
  onToggleLike: () => void;
  onToggleBookmark: () => void;
}

// 영상 06 카드 하단: "♡ 공감 24 · 댓글 7 · 저장". 공감·저장은 탭하면 바로 토글된다.
export function ReactionBar({ likeCount, isLiked, isBookmarked, commentCount, onToggleLike, onToggleBookmark }: ReactionBarProps) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityLabel={isLiked ? "공감 취소" : "공감"} hitSlop={8} style={styles.item} onPress={onToggleLike}>
        <Heart color={isLiked ? "#E06A86" : colors.textMuted} fill={isLiked ? "#E06A86" : "transparent"} size={14} />
        <Text style={[styles.text, isLiked && styles.textActive]}>공감 {likeCount}</Text>
      </Pressable>
      <Text style={styles.dot}>·</Text>
      <Text style={styles.text}>댓글 {commentCount}</Text>
      <Text style={styles.dot}>·</Text>
      <Pressable accessibilityLabel={isBookmarked ? "저장 취소" : "저장"} hitSlop={8} style={styles.item} onPress={onToggleBookmark}>
        <Bookmark color={isBookmarked ? colors.primary : colors.textMuted} fill={isBookmarked ? colors.primary : "transparent"} size={14} />
        <Text style={[styles.text, isBookmarked && styles.textActive]}>{isBookmarked ? "저장됨" : "저장"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  item: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  text: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  textActive: {
    color: "#E06A86"
  },
  dot: {
    color: colors.textMuted,
    fontSize: 11
  }
});
