import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, Check, Pencil } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { AiRequestError, generateDiary } from "@/services/api/aiApi";
import type { DiaryGenerationResponse } from "@/features/records/types/records";
import { getDiaryByDate, saveDiary } from "@/features/diary/services/diaryService";
import { confirmAsync } from "@/shared/utils/confirm";
import { ApiRequestError } from "@/services/api/apiClient";
import { uploadImage } from "@/services/api/uploadApi";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { Toast, useToast } from "@/shared/components/Toast";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { withUi } from "@/shared/utils/koreanParticle";

type DiaryResultScreenProps = NativeStackScreenProps<AppStackParamList, "DiaryResult">;

type Phase = "generating" | "result" | "error";
type AsyncStatus = "idle" | "loading" | "success" | "error";

const STEP_DELAYS_MS = [450, 1250, 2050];
const MIN_GENERATION_MS = 2600;
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const displayDate = (date: string) => {
  const value = new Date(`${date}T00:00:00`);
  return `${value.getMonth() + 1}월 ${value.getDate()}일`;
};

export function DiaryResultScreen({ route, navigation }: DiaryResultScreenProps) {
  const { date, request, photos, memo, materialCounts } = route.params;
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const babyName = activeBaby?.name ?? request.baby.name;

  const [phase, setPhase] = useState<Phase>("generating");
  const [completedSteps, setCompletedSteps] = useState(0);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [response, setResponse] = useState<DiaryGenerationResponse | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const { message: toastMessage, showToast } = useToast(1600);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const steps = [
    { title: `기록 ${materialCounts.records}개`, text: "오늘의 흐름 모으기" },
    { title: `사진 ${materialCounts.photos}장`, text: "순간 담기" },
    { title: `메모·대화 ${materialCounts.chats + (memo ? 1 : 0)}건`, text: "보호자가 남긴 맥락 반영" },
    { title: "오늘의 이야기", text: "한 편의 일기로 엮기" }
  ];

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  // 영상 04: 체크리스트가 순서대로 켜지고, 마지막 단계는 실제 응답이 도착했을 때 켜진다.
  const runGeneration = useCallback(async () => {
    if (!accessToken) return;
    clearTimers();
    setPhase("generating");
    setCompletedSteps(0);
    setGenerateError(null);
    STEP_DELAYS_MS.forEach((delay, index) => {
      timers.current.push(setTimeout(() => setCompletedSteps((current) => Math.max(current, index + 1)), delay));
    });
    const startedAt = Date.now();
    try {
      const result = await generateDiary(accessToken, request);
      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_GENERATION_MS) await wait(MIN_GENERATION_MS - elapsed);
      clearTimers();
      setCompletedSteps(steps.length);
      setResponse(result);
      setTitle(result.title);
      setContent(result.content);
      await wait(350);
      setPhase("result");
    } catch (error) {
      clearTimers();
      if (error instanceof AiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setGenerateError(
        error instanceof AiRequestError
          ? error.kind === "unavailable"
            ? `${error.message}\n조금 뒤 다시 시도 버튼을 눌러 주세요.`
            : error.message
          : "육아일기를 생성하지 못했습니다.\n잠시 후 다시 시도해 주세요."
      );
      setPhase("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, request, signOut]);

  useEffect(() => {
    void runGeneration();
    return clearTimers;
  }, [runGeneration]);

  const titleInvalid = title.trim().length === 0;
  const contentInvalid = content.trim().length === 0;

  const handleSave = async () => {
    if (!response || titleInvalid || contentInvalid || saveStatus === "loading" || !accessToken || !activeBaby) return;
    setSaveStatus("loading");
    setSaveError(null);
    try {
      // 같은 날짜 일기는 서버가 덮어쓰므로 저장 전에 한 번 확인한다.
      const existing = await getDiaryByDate(accessToken, activeBaby.id, date);
      if (existing) {
        const overwrite = await confirmAsync(
          "이미 저장된 일기가 있어요",
          `"${existing.title}" 일기를 이 초안으로 바꿀까요? 기존 내용은 사라져요.`,
          { confirmText: "덮어쓰기", destructive: true }
        );
        if (!overwrite) {
          setSaveStatus("idle");
          return;
        }
      }
      // 재료 화면에서 이미 업로드한 사진은 URL을 재사용하고, 실패했던 사진만 다시 올린다.
      const imageUrls = await Promise.all(photos.map((photo) => photo.url ?? uploadImage(accessToken, { uri: photo.uri })));
      await saveDiary(accessToken, {
        babyId: activeBaby.id,
        date,
        title: title.trim(),
        content: content.trim(),
        highlights: response.highlights,
        imageUrls,
        isAiGenerated: response.generatedByAi,
        notice: response.notice
      });
      setSaveStatus("success");
      setEditing(false);
      showToast("오늘의 육아일기가 저장됐어요");
      timers.current.push(setTimeout(() => navigation.goBack(), 1300));
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setSaveStatus("error");
      setSaveError("일기를 저장하지 못했습니다.\n잠시 후 다시 시도해 주세요.");
    }
  };

  const heroUri = photos[0]?.uri;

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
              <Text style={styles.eyebrow}>오늘의 일기</Text>
              <Text numberOfLines={1} style={styles.headerTitle}>
                {phase === "result" ? title || "오늘의 일기" : `${withUi(babyName)} 오늘`}
              </Text>
            </View>
            {phase === "result" ? (
              <Pressable accessibilityLabel={editing ? "편집 완료" : "고쳐 쓰기"} hitSlop={12} onPress={() => setEditing((value) => !value)}>
                <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
                  {editing ? <Check color={colors.primary} size={20} /> : <Pencil color={colors.primaryDark} size={18} />}
                </GlassSurface>
              </Pressable>
            ) : (
              <View style={styles.iconButton} />
            )}
          </View>

          {phase !== "result" && (
            <View style={styles.generatingBody}>
              {heroUri ? (
                <Image resizeMode="cover" source={{ uri: heroUri }} style={styles.heroPhoto} />
              ) : (
                <Image resizeMode="contain" source={require("../../../../assets/images/baby-character.png")} style={styles.heroMascot} />
              )}
              <Text style={styles.generatingTitle}>{withUi(babyName)} 오늘을 읽고 있어요</Text>
              <Text style={styles.generatingText}>오늘의 기록과 사진을{"\n"}한 편의 이야기로 엮고 있어요.</Text>

              <View style={styles.checklist}>
                {steps.map((step, index) => {
                  const done = index < completedSteps;
                  const active = index === completedSteps && phase === "generating";
                  return (
                    <View key={step.title} style={[styles.checkRow, done && styles.checkRowDone, active && styles.checkRowActive]}>
                      <View style={[styles.checkBox, done && styles.checkBoxDone]}>
                        {done ? <Check color="#FFFFFF" size={12} strokeWidth={3} /> : active ? <ActivityIndicator color={colors.primary} size="small" /> : null}
                      </View>
                      <View style={styles.flex}>
                        <Text style={[styles.checkTitle, !done && !active && styles.checkMuted]}>{step.title}</Text>
                        <Text style={[styles.checkText, !done && !active && styles.checkMuted]}>{step.text}</Text>
                      </View>
                    </View>
                  );
                })}
              </View>

              {phase === "error" && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{generateError}</Text>
                  <Pressable onPress={() => void runGeneration()}>
                    <Text style={styles.retryText}>다시 시도</Text>
                  </Pressable>
                </View>
              )}
            </View>
          )}

          {phase === "result" && response && (
            <>
              <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
                {photos.length > 0 ? (
                  <View style={styles.collage}>
                    <Image resizeMode="cover" source={{ uri: photos[0].uri }} style={[styles.collageMain, photos.length === 1 && styles.collageSingle]} />
                    {photos.length > 1 && (
                      <View style={styles.collageSide}>
                        {photos.slice(1, 3).map((photo) => (
                          <Image key={photo.uri} resizeMode="cover" source={{ uri: photo.uri }} style={styles.collageThumb} />
                        ))}
                      </View>
                    )}
                    <Text style={styles.collageCaption}>{displayDate(date)} · {withUi(babyName)} 오늘</Text>
                  </View>
                ) : (
                  <View style={styles.photoEmpty}>
                    <Text style={styles.photoEmptyText}>오늘 등록된 사진이 없어요</Text>
                  </View>
                )}

                <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.draftCard}>
                  <View style={styles.draftMeta}>
                    <View style={styles.draftChip}>
                      <Text style={styles.draftChipText}>{displayDate(date)}의 이야기</Text>
                    </View>
                    <Text style={styles.draftCounts}>
                      기록 {materialCounts.records} · 사진 {materialCounts.photos} · 대화 {materialCounts.chats}
                    </Text>
                  </View>

                  {editing ? (
                    <>
                      <TextInput
                        onChangeText={setTitle}
                        placeholder="일지 제목을 입력해 주세요"
                        placeholderTextColor={colors.textMuted}
                        style={styles.titleInput}
                        value={title}
                      />
                      {titleInvalid && <Text style={styles.fieldError}>제목을 입력해 주세요.</Text>}
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
                    </>
                  ) : (
                    <>
                      <Text style={styles.draftTitle}>{title}</Text>
                      <Text style={styles.draftContent}>{content}</Text>
                    </>
                  )}

                  {response.highlights.length > 0 && (
                    <View style={styles.highlightRow}>
                      {response.highlights.map((highlight) => (
                        <Text key={highlight} style={styles.highlightChip}>{highlight}</Text>
                      ))}
                      {photos.filter((photo) => photo.caption).slice(0, 1).map((photo) => (
                        <Text key={photo.uri} style={styles.highlightChip}>사진 속 {photo.caption}</Text>
                      ))}
                    </View>
                  )}
                </GlassSurface>

                <Text style={styles.notice}>{response.notice}</Text>
                {memo ? <Text style={styles.memoEcho}>보호자 메모: {memo}</Text> : null}

                {saveStatus === "error" && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{saveError}</Text>
                  </View>
                )}
              </ScrollView>

              <View style={styles.footer}>
                <View style={styles.footerButtons}>
                  <Pressable style={styles.secondaryButton} onPress={() => setEditing((value) => !value)}>
                    <Text style={styles.secondaryButtonText}>{editing ? "다 고쳤어요" : "고쳐 쓰기"}</Text>
                  </Pressable>
                  <Pressable
                    disabled={titleInvalid || contentInvalid || saveStatus === "loading" || saveStatus === "success"}
                    style={[styles.saveButtonFlex, (titleInvalid || contentInvalid || saveStatus === "loading") && styles.saveButtonDisabled]}
                    onPress={handleSave}
                  >
                    <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
                      {saveStatus === "loading" ? (
                        <ActivityIndicator color="#FFFFFF" size="small" />
                      ) : (
                        <Text style={styles.saveButtonText}>{saveStatus === "error" ? "다시 저장" : saveStatus === "success" ? "저장했어요" : "이대로 저장"}</Text>
                      )}
                    </LinearGradient>
                  </Pressable>
                </View>
                <Text style={styles.footerHint}>저장 전 제목과 내용을 자유롭게 수정할 수 있어요.</Text>
              </View>
            </>
          )}
        </KeyboardAvoidingView>
        <Toast message={toastMessage} bottom={110} />
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
  flex: {
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
  generatingBody: {
    alignItems: "center",
    flex: 1,
    gap: 10,
    paddingHorizontal: 24,
    paddingTop: 28
  },
  heroPhoto: {
    borderRadius: 24,
    height: 150,
    width: 190
  },
  heroMascot: {
    height: 150,
    width: 120
  },
  generatingTitle: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900",
    marginTop: 10
  },
  generatingText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  checklist: {
    alignSelf: "stretch",
    gap: 8,
    marginTop: 16
  },
  checkRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  checkRowDone: {
    backgroundColor: "rgba(255,241,236,0.85)"
  },
  checkRowActive: {
    borderColor: colors.primary
  },
  checkBox: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  checkBoxDone: {
    backgroundColor: colors.success,
    borderColor: colors.success
  },
  checkTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  checkText: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 1
  },
  checkMuted: {
    opacity: 0.5
  },
  body: {
    gap: 12,
    paddingBottom: 24,
    paddingHorizontal: 20
  },
  collage: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    position: "relative"
  },
  collageMain: {
    borderRadius: 20,
    flex: 2,
    height: 170
  },
  collageSingle: {
    flex: 1
  },
  collageSide: {
    flex: 1,
    gap: 6
  },
  collageThumb: {
    borderRadius: 16,
    flex: 1,
    width: "100%"
  },
  collageCaption: {
    backgroundColor: "rgba(32,26,23,0.55)",
    borderRadius: 999,
    bottom: 10,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
    left: 10,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 4,
    position: "absolute"
  },
  photoEmpty: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 20,
    justifyContent: "center",
    paddingVertical: 28
  },
  photoEmptyText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700"
  },
  draftCard: {
    gap: 10,
    padding: 16
  },
  draftMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  draftChip: {
    alignItems: "center",
    backgroundColor: "rgba(246,215,220,0.9)",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  draftChipText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "900"
  },
  draftCounts: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  draftTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  draftContent: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22
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
    fontSize: 14,
    lineHeight: 22,
    minHeight: 150,
    padding: 12
  },
  fieldError: {
    color: colors.danger,
    fontSize: 12
  },
  highlightRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  highlightChip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
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
    alignSelf: "stretch",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    gap: 6,
    padding: 12
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
    textAlign: "center"
  },
  footer: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    gap: 8,
    padding: 16
  },
  footerButtons: {
    flexDirection: "row",
    gap: 10
  },
  footerHint: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center"
  },
  secondaryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 18,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 14
  },
  secondaryButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  saveButtonFlex: {
    flex: 2
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 14
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  }
});
