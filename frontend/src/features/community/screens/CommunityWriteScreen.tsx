import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as ImagePicker from "expo-image-picker";
import { ArrowLeft, ImagePlus, X } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { createPost, updatePost } from "@/features/community/services/communityService";
import {
  AGE_GROUP_LABELS,
  AGE_GROUP_OPTIONS,
  AGE_GROUP_REPRESENTATIVE_MONTHS,
  ageGroupForMonths,
  CATEGORY_LABELS,
  CATEGORY_OPTIONS,
  MAX_POST_IMAGES,
  type AgeGroup,
  type CommunityCategoryCode
} from "@/features/community/types/community";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { uploadImage, type LocalImage } from "@/services/api/uploadApi";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";

type Props = NativeStackScreenProps<AppStackParamList, "CommunityWrite">;

function toBabyAgeMonths(ageGroup: AgeGroup): number | null {
  if (ageGroup === "ALL_AGES") return null;
  return AGE_GROUP_REPRESENTATIVE_MONTHS[ageGroup];
}

// 이미 올라간 사진(http URL)은 그대로 쓰고, 새로 고른 사진만 업로드한다.
type PostImage = LocalImage;
const isRemote = (uri: string) => uri.startsWith("http://") || uri.startsWith("https://");

export function CommunityWriteScreen({ navigation, route }: Props) {
  const { accessToken, signOut } = useAuth();
  const editing = route.params?.post ?? null;
  const [category, setCategory] = useState<CommunityCategoryCode>(editing?.category ?? CATEGORY_OPTIONS[0]);
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    editing?.babyAgeMonths != null ? (ageGroupForMonths(editing.babyAgeMonths) ?? "ALL_AGES") : "ALL_AGES"
  );
  const [title, setTitle] = useState(editing?.title ?? "");
  const [content, setContent] = useState(editing?.content ?? "");
  const [isAnonymous, setIsAnonymous] = useState(editing?.author.isAnonymous ?? false);
  const [images, setImages] = useState<PostImage[]>(editing ? editing.imageUrls.map((uri) => ({ uri })) : []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleValid = title.trim().length >= 2;
  const contentValid = content.trim().length >= 2;
  const canSubmit = titleValid && contentValid && !submitting;

  const pickImages = async () => {
    if (images.length >= MAX_POST_IMAGES) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError("사진을 추가하려면 사진 보관함 접근 권한이 필요합니다.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_POST_IMAGES - images.length,
      quality: 0.9
    });
    if (!result.canceled) {
      setImages((current) => {
        const known = new Set(current.map((image) => image.uri));
        return [...current, ...result.assets.filter((image) => !known.has(image.uri))].slice(0, MAX_POST_IMAGES);
      });
      setError(null);
    }
  };

  const removeImage = (uri: string) => {
    setImages((current) => current.filter((item) => item.uri !== uri));
  };

  const handleSubmit = async () => {
    if (!canSubmit || !accessToken) return;
    setSubmitting(true);
    setError(null);
    try {
      const imageUrls = await Promise.all(images.map((image) => (isRemote(image.uri) ? image.uri : uploadImage(accessToken, image))));
      const babyAgeMonths = toBabyAgeMonths(ageGroup);
      if (editing) {
        await updatePost(accessToken, editing.id, {
          category,
          title: title.trim(),
          content: content.trim(),
          imageUrls,
          babyAgeMonths: babyAgeMonths ?? undefined,
          clearBabyAge: babyAgeMonths === null,
          isAnonymous
        });
        navigation.goBack();
        return;
      }
      const result = await createPost(accessToken, {
        category,
        title: title.trim(),
        content: content.trim(),
        imageUrls,
        babyAgeMonths,
        isAnonymous
      });
      navigation.replace("CommunityDetail", { postId: result.id });
    } catch (err) {
      if (err instanceof ApiRequestError && err.kind === "auth") {
        await signOut();
        return;
      }
      setError(editing ? "게시글을 수정하지 못했습니다.\n잠시 후 다시 시도해 주세요." : "게시글을 작성하지 못했습니다.\n잠시 후 다시 시도해 주세요.");
      setSubmitting(false);
    }
  };

  return (
    <View style={styles.rootWrap}>
      <GradientBackdrop />
      <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()}>
          <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.backButton}>
            <ArrowLeft color={colors.primaryDark} size={22} />
          </GlassSurface>
        </Pressable>
        <Text style={styles.headerTitle}>{editing ? "글 수정" : "글쓰기"}</Text>
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

        <Text style={styles.label}>사진 ({images.length}/{MAX_POST_IMAGES})</Text>
        <View style={styles.imageGrid}>
          {images.map((image) => (
            <View key={image.uri} style={styles.imagePreviewWrap}>
              <Image resizeMode="cover" source={{ uri: image.uri }} style={styles.imagePreview} />
              <Pressable accessibilityLabel="사진 삭제" hitSlop={8} onPress={() => removeImage(image.uri)} style={styles.imageRemoveButton}>
                <X color="#FFFFFF" size={14} />
              </Pressable>
            </View>
          ))}
          {images.length < MAX_POST_IMAGES && (
            <Pressable accessibilityLabel="사진 추가" onPress={() => void pickImages()} style={styles.imagePickerButton}>
              <ImagePlus color={colors.primary} size={24} />
              <Text style={styles.imagePickerText}>사진 추가</Text>
            </Pressable>
          )}
        </View>

        {error && <Text style={styles.errorText}>{error}</Text>}

        <Pressable disabled={!canSubmit} onPress={handleSubmit} style={!canSubmit && styles.submitButtonDisabled}>
          <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submitButton}>
            {submitting ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.submitButtonText}>{editing ? "수정 완료" : "게시하기"}</Text>}
          </LinearGradient>
        </Pressable>
      </ScrollView>
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
    backgroundColor: "rgba(255,255,255,0.55)",
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
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14
  },
  textArea: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
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
  imageGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  imagePreviewWrap: {
    height: 92,
    position: "relative",
    width: 92
  },
  imagePreview: {
    borderRadius: 14,
    height: 92,
    width: 92
  },
  imageRemoveButton: {
    alignItems: "center",
    backgroundColor: "rgba(45,37,32,0.7)",
    borderRadius: 999,
    height: 24,
    justifyContent: "center",
    position: "absolute",
    right: 4,
    top: 4,
    width: 24
  },
  imagePickerButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderStyle: "dashed",
    borderWidth: 1,
    gap: 5,
    height: 92,
    justifyContent: "center",
    width: 92
  },
  imagePickerText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  submitButton: {
    alignItems: "center",
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
