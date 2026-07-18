import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Plus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { createPost } from "@/features/community/services/communityService";
import {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  AGE_GROUP_REPRESENTATIVE_MONTHS,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  MAX_POST_IMAGES,
  type AgeGroup,
  type CommunityCategoryCode
} from "@/features/community/types/community";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { colors } from "@/shared/constants/colors";

type Props = NativeStackScreenProps<AppStackParamList, "CommunityWrite">;

function toBabyAgeMonths(ageGroup: AgeGroup): number | null {
  if (ageGroup === "ALL_AGES") return null;
  return AGE_GROUP_REPRESENTATIVE_MONTHS[ageGroup];
}

export function CommunityWriteScreen({ navigation }: Props) {
  const { accessToken, signOut } = useAuth();
  const [category, setCategory] = useState<CommunityCategoryCode>(CATEGORY_OPTIONS[0]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>("ALL_AGES");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageInput, setImageInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleValid = title.trim().length >= 2;
  const contentValid = content.trim().length >= 2;
  const canSubmit = titleValid && contentValid && !submitting;

  const addImageUrl = () => {
    const url = imageInput.trim();
    if (!url || imageUrls.length >= MAX_POST_IMAGES) return;
    setImageUrls((current) => [...current, url]);
    setImageInput("");
  };

  const removeImageUrl = (url: string) => {
    setImageUrls((current) => current.filter((item) => item !== url));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPost(accessToken, {
        category,
        title: title.trim(),
        content: content.trim(),
        imageUrls,
        babyAgeMonths: toBabyAgeMonths(ageGroup),
        isAnonymous
      });
      navigation.replace("CommunityDetail", { postId: result.id });
    } catch (err) {
      if (err instanceof ApiRequestError && err.kind === "auth") {
        await signOut();
        return;
      }
      setError("게시글을 작성하지 못했습니다.\n잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()} style={styles.backButton}>
          <ArrowLeft color={colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>글쓰기</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>카테고리</Text>
        <View style={styles.chipRow}>
          {CATEGORY_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.chip, category === option && styles.chipActive]}
              onPress={() => setCategory(option)}
            >
              <Text style={[styles.chipText, category === option && styles.chipTextActive]}>{CATEGORY_LABELS[option]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>월령 구간</Text>
        <View style={styles.chipRow}>
          {AGE_GROUP_OPTIONS.map((option) => (
            <Pressable
              key={option}
              style={[styles.chip, ageGroup === option && styles.chipActive]}
              onPress={() => setAgeGroup(option)}
            >
              <Text style={[styles.chipText, ageGroup === option && styles.chipTextActive]}>{AGE_GROUP_LABELS[option]}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>제목</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="제목을 입력해주세요"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={title}
        />

        <Text style={styles.label}>본문</Text>
        <TextInput
          multiline
          onChangeText={setContent}
          placeholder="내용을 입력해주세요"
          placeholderTextColor={colors.textMuted}
          style={styles.textArea}
          textAlignVertical="top"
          value={content}
        />

        <View style={styles.anonymousRow}>
          <Text style={styles.label}>익명으로 작성</Text>
          <Switch
            onValueChange={setIsAnonymous}
            trackColor={{ false: colors.border, true: colors.primary }}
            value={isAnonymous}
          />
        </View>

        <Text style={styles.label}>이미지 URL ({imageUrls.length}/{MAX_POST_IMAGES})</Text>
        {imageUrls.map((url) => (
          <View key={url} style={styles.imageRow}>
            <Text numberOfLines={1} style={styles.imageUrlText}>{url}</Text>
            <Pressable hitSlop={8} onPress={() => removeImageUrl(url)}>
              <X color={colors.textMuted} size={16} />
            </Pressable>
          </View>
        ))}
        {imageUrls.length < MAX_POST_IMAGES && (
          <View style={styles.imageAddRow}>
            <TextInput
              onChangeText={setImageInput}
              placeholder="이미지 URL 추가"
              placeholderTextColor={colors.textMuted}
              style={styles.imageInput}
              value={imageInput}
            />
            <Pressable onPress={addImageUrl} style={styles.imageAddButton}>
              <Plus color="#FFFFFF" size={16} />
            </Pressable>
          </View>
        )}

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable disabled={!canSubmit} onPress={handleSubmit} style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}>
          {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitButtonText}>게시하기</Text>}
        </Pressable>
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
  body: {
    gap: 10,
    paddingBottom: 40,
    paddingHorizontal: 20
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 8
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  chipTextActive: {
    color: "#FFFFFF"
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14
  },
  textArea: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 140,
    padding: 16
  },
  anonymousRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  imageRow: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  imageUrlText: {
    color: colors.text,
    flex: 1,
    fontSize: 12
  },
  imageAddRow: {
    flexDirection: "row",
    gap: 8
  },
  imageInput: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    flex: 1,
    fontSize: 13,
    minHeight: 44,
    paddingHorizontal: 12
  },
  imageAddButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  submitButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    marginTop: 8,
    paddingVertical: 16
  },
  submitButtonDisabled: {
    opacity: 0.5
  },
  submitButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
