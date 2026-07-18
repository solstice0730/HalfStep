import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Sparkles, X } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { FeedingRecordModal } from "@/features/records/components/FeedingRecordModal";
import { PhotoPicker, type RecordPhoto } from "@/features/records/components/PhotoPicker";
import { SleepRecordModal } from "@/features/records/components/SleepRecordModal";
import { StoolRecordModal } from "@/features/records/components/StoolRecordModal";
import type { TimeValue } from "@/features/records/components/TimePickerField";
import { TodayRecordsList } from "@/features/records/components/TodayRecordsList";
import { UrineRecordModal } from "@/features/records/components/UrineRecordModal";
import { addFeedingRecord, addSleepRecord, addStoolRecord, addUrineRecord, getTodayRecords } from "@/features/records/services/recordsService";
import {
  DIAPER_AMOUNT_LABELS,
  FEEDING_TYPE_LABELS,
  STOOL_FORM_LABELS,
  type BabyInfo,
  type BreastSide,
  type DiaperAmount,
  type DiaryGenerationRequest,
  type FeedingType,
  type StoolColor,
  type StoolForm,
  type TodayRecords,
  type UrineColor
} from "@/features/records/types/records";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { AiRequestError, generateDiary } from "@/services/api/aiApi";
import { ErrorState } from "@/shared/components/ErrorState";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/constants/colors";

type RecordsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Records">,
  NativeStackScreenProps<AppStackParamList>
>;

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const todayDisplayDate = () =>
  new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
// Baby 프로필 API(#7)가 붙기 전까지 쓰는 임시 아기 정보. HomeScreen의 demo baby와 짝을 맞춘다.
const DEMO_BABY: BabyInfo = { name: "리몽이", ageMonths: 1 };

const pad2 = (value: string) => (value || "0").padStart(2, "0");
const buildIsoDateTime = (date: string, time: TimeValue) => `${date}T${pad2(time.hour)}:${pad2(time.minute)}:00`;

type ActiveModal = "feeding" | "sleep" | "urine" | "stool" | null;
type AsyncStatus = "idle" | "loading" | "error";

export function RecordsScreen({ route, navigation }: RecordsScreenProps) {
  const { accessToken, signOut } = useAuth();
  const processedCameraUri = useRef<string | undefined>(undefined);

  const todayIso = todayIsoDate();
  const [recordsStatus, setRecordsStatus] = useState<AsyncStatus>("loading");
  const [todayRecords, setTodayRecords] = useState<TodayRecords>({ feeding: [], sleep: [], urine: [], stool: [] });
  const [activeRecordModal, setActiveRecordModal] = useState<ActiveModal>(null);
  const [photos, setPhotos] = useState<RecordPhoto[]>([]);
  const [memo, setMemo] = useState("");
  const [aiStatus, setAiStatus] = useState<AsyncStatus>("idle");
  const [aiError, setAiError] = useState<string | null>(null);

  const loadTodayRecords = useCallback(async () => {
    if (!accessToken) return;
    setRecordsStatus("loading");
    try {
      const records = await getTodayRecords(accessToken, todayIso);
      setTodayRecords(records);
      setRecordsStatus("idle");
    } catch (error) {
      if (error instanceof AiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setRecordsStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, todayIso]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayRecords();
    }, [loadTodayRecords])
  );

  useEffect(() => {
    const uri = route.params?.draftImageUri;
    if (uri && processedCameraUri.current !== uri) {
      processedCameraUri.current = uri;
      setPhotos((current) => (current.some((photo) => photo.uri === uri) || current.length >= 3 ? current : [...current, { uri, description: "" }]));
    }
  }, [route.params?.draftImageUri]);

  useEffect(() => {
    const modalType = route.params?.openRecordModal;
    if (modalType) {
      setActiveRecordModal(modalType);
      navigation.setParams({ openRecordModal: undefined });
    }
  }, [route.params?.openRecordModal, navigation]);

  const handleSaveFeeding = async (record: { time: TimeValue; feedingType: FeedingType; amountMl?: number; durationMinutes?: number }) => {
    if (!accessToken) return;
    await addFeedingRecord(accessToken, {
      occurredAt: buildIsoDateTime(todayIso, record.time),
      feedingType: record.feedingType,
      amountMl: record.amountMl,
      durationMinutes: record.durationMinutes
    });
    await loadTodayRecords();
    setActiveRecordModal(null);
  };

  const handleSaveSleep = async (record: { start: TimeValue; end: TimeValue }) => {
    if (!accessToken) return;
    await addSleepRecord(accessToken, {
      startedAt: buildIsoDateTime(todayIso, record.start),
      endedAt: buildIsoDateTime(todayIso, record.end)
    });
    await loadTodayRecords();
    setActiveRecordModal(null);
  };

  const handleSaveUrine = async (record: { time: TimeValue; amount: DiaperAmount; color: UrineColor }) => {
    if (!accessToken) return;
    await addUrineRecord(accessToken, {
      occurredAt: buildIsoDateTime(todayIso, record.time),
      amount: record.amount,
      color: record.color
    });
    await loadTodayRecords();
    setActiveRecordModal(null);
  };

  const handleSaveStool = async (record: { time: TimeValue; amount: DiaperAmount; color: StoolColor; form: StoolForm }) => {
    if (!accessToken) return;
    await addStoolRecord(accessToken, {
      occurredAt: buildIsoDateTime(todayIso, record.time),
      amount: record.amount,
      color: record.color,
      form: record.form
    });
    await loadTodayRecords();
    setActiveRecordModal(null);
  };

  const hasRecords =
    todayRecords.feeding.length > 0 ||
    todayRecords.sleep.length > 0 ||
    todayRecords.urine.length > 0 ||
    todayRecords.stool.length > 0;
  const hasMemo = memo.trim().length > 0;
  const hasPhotoDescription = photos.some((photo) => photo.description.trim().length > 0);
  const canGenerate = hasRecords || hasMemo || hasPhotoDescription;

  const handleGenerateDiary = async () => {
    if (!canGenerate || !accessToken || aiStatus === "loading") return;

    const request: DiaryGenerationRequest = {
      baby: DEMO_BABY,
      date: todayIso,
      records: {
        feeding: todayRecords.feeding.map((record) => ({
          recordedAt: record.recordedAt,
          feedingType: FEEDING_TYPE_LABELS[record.feedingType],
          amountMl: record.amountMl
        })),
        sleep: todayRecords.sleep.map(({ startedAt, endedAt }) => ({ startedAt, endedAt })),
        diaper: [
          ...todayRecords.urine.map((record) => ({
            recordedAt: record.recordedAt,
            type: `소변${record.amount ? ` ${DIAPER_AMOUNT_LABELS[record.amount]}` : ""}`
          })),
          ...todayRecords.stool.map((record) => ({
            recordedAt: record.recordedAt,
            type: `대변${record.form ? ` ${STOOL_FORM_LABELS[record.form]}` : ""}`
          }))
        ]
      },
      photoDescriptions: photos.map((photo) => photo.description.trim()).filter(Boolean),
      memo: memo.trim() || undefined
    };

    setAiStatus("loading");
    setAiError(null);
    try {
      const response = await generateDiary(accessToken, request);
      const photoUris = photos.map((photo) => photo.uri);
      const memoValue = memo.trim() || undefined;
      navigation.navigate("DiaryResult", { date: todayIso, request, response, photoUris, memo: memoValue });
    } catch (error) {
      if (error instanceof AiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setAiStatus("error");
      setAiError(
        error instanceof AiRequestError ? error.message : "육아일기를 생성하지 못했습니다.\n잠시 후 다시 시도해 주세요."
      );
    }
  };

  return (
    <View style={styles.root}>
      <SafeAreaView style={styles.fixedArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorFlex}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <View style={styles.editorFlex}>
              <View style={styles.header}>
                <Text style={styles.navEyebrow}>{todayDisplayDate()}</Text>
                <Text style={styles.navTitle}>오늘의 기록</Text>
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorBody}>
                <View style={styles.categoryRow}>
                  <Pressable style={styles.categoryButton} onPress={() => setActiveRecordModal("feeding")}>
                    <Text style={styles.categoryButtonText}>+ 수유</Text>
                  </Pressable>
                  <Pressable style={styles.categoryButton} onPress={() => setActiveRecordModal("sleep")}>
                    <Text style={styles.categoryButtonText}>+ 수면</Text>
                  </Pressable>
                  <Pressable style={styles.categoryButton} onPress={() => setActiveRecordModal("urine")}>
                    <Text style={styles.categoryButtonText}>+ 소변</Text>
                  </Pressable>
                  <Pressable style={styles.categoryButton} onPress={() => setActiveRecordModal("stool")}>
                    <Text style={styles.categoryButtonText}>+ 대변</Text>
                  </Pressable>
                </View>

                {recordsStatus === "loading" && <LoadingState />}
                {recordsStatus === "error" && <ErrorState message="오늘 기록을 불러오지 못했어요." onRetry={loadTodayRecords} />}
                {recordsStatus === "idle" && <TodayRecordsList records={todayRecords} />}

                <PhotoPicker
                  onAdd={(uri) => setPhotos((current) => [...current, { uri, description: "" }])}
                  onDescriptionChange={(uri, description) =>
                    setPhotos((current) => current.map((photo) => (photo.uri === uri ? { ...photo, description } : photo)))
                  }
                  onRemove={(uri) => setPhotos((current) => current.filter((photo) => photo.uri !== uri))}
                  photos={photos}
                />

                <Text style={styles.label}>보호자 메모</Text>
                <TextInput
                  maxLength={500}
                  multiline
                  onBlur={Keyboard.dismiss}
                  onChangeText={setMemo}
                  placeholder="오늘 있었던 일을 자유롭게 적어보세요"
                  placeholderTextColor={colors.textMuted}
                  style={styles.memoInput}
                  textAlignVertical="top"
                  value={memo}
                />

                {!canGenerate && <Text style={styles.hintText}>육아일기를 만들 기록이나 메모를 먼저 추가해 주세요.</Text>}

                {aiStatus === "error" && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{aiError}</Text>
                  </View>
                )}

                <Pressable
                  disabled={!canGenerate || aiStatus === "loading"}
                  style={[styles.generateButton, (!canGenerate || aiStatus === "loading") && styles.generateButtonDisabled]}
                  onPress={handleGenerateDiary}
                >
                  {aiStatus === "loading" ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <>
                      <Sparkles color="#FFFFFF" size={16} />
                      <Text style={styles.generateButtonText}>{aiStatus === "error" ? "다시 시도" : "AI 육아일기 만들기"}</Text>
                    </>
                  )}
                </Pressable>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {activeRecordModal === "feeding" && (
        <FeedingRecordModal onClose={() => setActiveRecordModal(null)} onSave={handleSaveFeeding} visible />
      )}
      {activeRecordModal === "sleep" && (
        <SleepRecordModal onClose={() => setActiveRecordModal(null)} onSave={handleSaveSleep} visible />
      )}
      {activeRecordModal === "urine" && (
        <UrineRecordModal onClose={() => setActiveRecordModal(null)} onSave={handleSaveUrine} visible />
      )}
      {activeRecordModal === "stool" && (
        <StoolRecordModal onClose={() => setActiveRecordModal(null)} onSave={handleSaveStool} visible />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  fixedArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  editorFlex: {
    flex: 1
  },
  header: {
    gap: 3,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  navEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800"
  },
  editorBody: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  categoryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexGrow: 1,
    minWidth: "22%",
    paddingVertical: 12
  },
  categoryButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  memoInput: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 100,
    padding: 16
  },
  hintText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700"
  },
  errorBox: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    gap: 4,
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
  generateButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 16
  },
  generateButtonDisabled: {
    opacity: 0.5
  },
  generateButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
