import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RefreshCw, X } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AiRequestError, generateDiary } from "@/services/api/aiApi";
import type { DiaryGenerationResponse } from "@/features/records/types/records";
import { saveDiary } from "@/features/diary/services/diaryService";
import { colors } from "@/shared/constants/colors";

type DiaryResultScreenProps = NativeStackScreenProps<AppStackParamList, "DiaryResult">;

type AsyncStatus = "idle" | "loading" | "success" | "error";

export function DiaryResultScreen({ route, navigation }: DiaryResultScreenProps) {
  const { date, request, photoUris, memo } = route.params;
  const { accessToken, signOut } = useAuth();

  const [response, setResponse] = useState<DiaryGenerationResponse>(route.params.response);
  const [title, setTitle] = useState(response.title);
  const [content, setContent] = useState(response.content);
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [regenerateStatus, setRegenerateStatus] = useState<AsyncStatus>("idle");
  const [regenerateError, setRegenerateError] = useState<string | null>(null);

  const isEdited = title !== response.title || content !== response.content;
  const titleInvalid = title.trim().length === 0;
  const contentInvalid = content.trim().length === 0;

  const runRegenerate = async () => {
    if (!accessToken || regenerateStatus === "loading") return;
    setRegenerateStatus("loading");
    setRegenerateError(null);
    try {
      const result = await generateDiary(accessToken, request);
      setResponse(result);
      setTitle(result.title);
      setContent(result.content);
      setRegenerateStatus("idle");
    } catch (error) {
      if (error instanceof AiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setRegenerateStatus("error");
      setRegenerateError(
        error instanceof AiRequestError ? error.message : "육아일기를 다시 생성하지 못했습니다.\n잠시 후 다시 시도해 주세요."
      );
    }
  };

  const handleRegenerate = () => {
    if (isEdited) {
      Alert.alert("다시 생성할까요?", "수정한 제목과 본문이 사라지고 새로운 내용으로 바뀌어요.", [
        { text: "취소", style: "cancel" },
        { text: "다시 생성", style: "destructive", onPress: () => void runRegenerate() }
      ]);
      return;
    }
    void runRegenerate();
  };

  const handleSave = async () => {
    if (titleInvalid || contentInvalid || saveStatus === "loading") return;
    setSaveStatus("loading");
    setSaveError(null);
    try {
      await saveDiary({
        date,
        title: title.trim(),
        content: content.trim(),
        highlights: response.highlights,
        photoUris,
        generatedByAi: response.generatedByAi,
        savedAt: new Date().toISOString()
      });
      setSaveStatus("success");
      navigation.goBack();
    } catch {
      setSaveStatus("error");
      setSaveError("일기를 저장하지 못했습니다.\n잠시 후 다시 시도해 주세요.");
    }
  };

  const handleCancel = () => {
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.header}>
        <Pressable hitSlop={12} style={styles.iconButton} onPress={handleCancel}>
          <X color={colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>AI 육아일지</Text>
        <Pressable
          disabled={regenerateStatus === "loading"}
          hitSlop={12}
          style={styles.iconButton}
          onPress={handleRegenerate}
        >
          {regenerateStatus === "loading" ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <RefreshCw color={colors.primaryDark} size={20} />
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        {photoUris.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photoRow}>
            {photoUris.map((uri) => (
              <Image key={uri} resizeMode="cover" source={{ uri }} style={styles.photo} />
            ))}
          </ScrollView>
        ) : (
          <View style={styles.photoEmpty}>
            <Text style={styles.photoEmptyText}>오늘 등록된 사진이 없어요</Text>
          </View>
        )}

        {regenerateStatus === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{regenerateError}</Text>
            <Pressable onPress={handleRegenerate}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        )}

        <Text style={styles.label}>제목</Text>
        <TextInput
          onChangeText={setTitle}
          placeholder="일지 제목을 입력해 주세요"
          placeholderTextColor={colors.textMuted}
          style={styles.titleInput}
          value={title}
        />
        {titleInvalid && <Text style={styles.fieldError}>제목을 입력해 주세요.</Text>}

        <Text style={styles.label}>본문</Text>
        <TextInput
          multiline
          onChangeText={setContent}
          placeholder="일지 본문을 입력해 주세요"
          placeholderTextColor={colors.textMuted}
          style={styles.contentInput}
          textAlignVertical="top"
          value={content}
        />
        {contentInvalid && <Text style={styles.fieldError}>본문을 입력해 주세요.</Text>}

        {response.highlights.length > 0 && (
          <View style={styles.highlightRow}>
            {response.highlights.map((highlight) => (
              <View key={highlight} style={styles.highlightChip}>
                <Text style={styles.highlightText}>{highlight}</Text>
              </View>
            ))}
          </View>
        )}

        <Text style={styles.notice}>{response.notice}</Text>
        {memo ? <Text style={styles.memoEcho}>보호자 메모: {memo}</Text> : null}

        {saveStatus === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>취소</Text>
        </Pressable>
        <Pressable
          disabled={titleInvalid || contentInvalid || saveStatus === "loading"}
          style={[
            styles.saveButton,
            (titleInvalid || contentInvalid || saveStatus === "loading") && styles.saveButtonDisabled
          ]}
          onPress={handleSave}
        >
          {saveStatus === "loading" ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.saveButtonText}>{saveStatus === "error" ? "다시 저장" : "저장"}</Text>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 18,
    paddingTop: 56,
    paddingBottom: 10
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  body: {
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  photoRow: {
    flexGrow: 0
  },
  photo: {
    borderRadius: 20,
    height: 160,
    marginRight: 10,
    width: 160
  },
  photoEmpty: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 20,
    justifyContent: "center",
    paddingVertical: 28
  },
  photoEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  contentInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 160,
    padding: 14
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -6
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  highlightChip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  highlightText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  notice: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  memoEcho: {
    color: colors.textMuted,
    fontSize: 12,
    fontStyle: "italic"
  },
  errorBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    gap: 6,
    padding: 12
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 16
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    flex: 1,
    paddingVertical: 14
  },
  cancelButtonText: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 18,
    flex: 2,
    paddingVertical: 14
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
