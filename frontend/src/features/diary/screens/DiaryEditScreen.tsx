import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { deleteDiary, updateDiary } from "@/features/diary/services/diaryService";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { confirmAsync } from "@/shared/utils/confirm";

type Props = NativeStackScreenProps<AppStackParamList, "DiaryEdit">;

const displayDate = (iso: string) => {
  const value = new Date(`${iso}T00:00:00`);
  return `${value.getMonth() + 1}월 ${value.getDate()}일`;
};

// 캘린더에서 들어오는 저장된 일기 수정·삭제 화면.
export function DiaryEditScreen({ route, navigation }: Props) {
  const { diary } = route.params;
  const { accessToken, signOut } = useAuth();
  const [title, setTitle] = useState(diary.title);
  const [content, setContent] = useState(diary.content);
  const [imageUrls, setImageUrls] = useState(diary.imageUrls);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const titleInvalid = title.trim().length === 0;
  const contentInvalid = content.trim().length === 0;
  const changed = title !== diary.title || content !== diary.content || imageUrls.length !== diary.imageUrls.length;
  const canSave = !titleInvalid && !contentInvalid && changed && !saving;

  const handleSave = async () => {
    if (!canSave || !accessToken) return;
    setSaving(true);
    setError(null);
    try {
      await updateDiary(accessToken, diary.id, { title: title.trim(), content: content.trim(), imageUrls });
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiRequestError && err.kind === "auth") {
        await signOut();
        return;
      }
      setError("일기를 저장하지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!accessToken || saving) return;
    const confirmed = await confirmAsync("이 날의 일기를 지울까요?", "지운 일기는 되돌릴 수 없어요. 기록은 그대로 남아요.", {
      confirmText: "지우기",
      destructive: true
    });
    if (!confirmed) return;
    setSaving(true);
    try {
      await deleteDiary(accessToken, diary.id);
      navigation.goBack();
    } catch (err) {
      if (err instanceof ApiRequestError && err.kind === "auth") {
        await signOut();
        return;
      }
      setError("일기를 지우지 못했어요. 잠시 후 다시 시도해 주세요.");
      setSaving(false);
    }
  };

  return (
    <View style={styles.rootWrap}>
      <GradientBackdrop />
      <SafeAreaView style={styles.root}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
          <View style={styles.header}>
            <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()}>
              <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
                <ArrowLeft color={colors.primaryDark} size={22} />
              </GlassSurface>
            </Pressable>
            <View style={styles.headerTitles}>
              <Text style={styles.eyebrow}>{displayDate(diary.date)}</Text>
              <Text style={styles.headerTitle}>일기 고쳐 쓰기</Text>
            </View>
            <Pressable accessibilityLabel="일기 지우기" hitSlop={12} onPress={() => void handleDelete()}>
              <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
                <Trash2 color={colors.danger} size={18} />
              </GlassSurface>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {imageUrls.length > 0 && (
              <View style={styles.photoRow}>
                {imageUrls.map((uri) => (
                  <View key={uri} style={styles.photoWrap}>
                    <Image resizeMode="cover" source={{ uri }} style={styles.photo} />
                    <Pressable
                      accessibilityLabel="사진 빼기"
                      style={styles.photoRemove}
                      onPress={() => setImageUrls((current) => current.filter((item) => item !== uri))}
                    >
                      <Text style={styles.photoRemoveText}>빼기</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            <Text style={styles.label}>제목</Text>
            <TextInput onChangeText={setTitle} placeholderTextColor={colors.textMuted} style={styles.titleInput} value={title} />
            {titleInvalid && <Text style={styles.fieldError}>제목을 입력해 주세요.</Text>}

            <Text style={styles.label}>본문</Text>
            <TextInput multiline onChangeText={setContent} placeholderTextColor={colors.textMuted} style={styles.contentInput} textAlignVertical="top" value={content} />
            {contentInvalid && <Text style={styles.fieldError}>본문을 입력해 주세요.</Text>}

            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable disabled={!canSave} style={!canSave && styles.saveDisabled} onPress={() => void handleSave()}>
              <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
                {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>이대로 저장</Text>}
              </LinearGradient>
            </Pressable>
          </View>
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
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  headerTitles: {
    flex: 1
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  headerTitle: {
    color: colors.primaryDark,
    ...typography.title3
  },
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  body: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  photoRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  photoWrap: {
    position: "relative"
  },
  photo: {
    borderRadius: 14,
    height: 96,
    width: 96
  },
  photoRemove: {
    backgroundColor: "rgba(32,26,23,0.6)",
    borderRadius: 999,
    bottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    position: "absolute",
    right: 6
  },
  photoRemoveText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800"
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  titleInput: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 14,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  contentInput: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 24,
    minHeight: 200,
    padding: 12
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    textAlign: "center"
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    padding: 16
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 14
  },
  saveDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  }
});
