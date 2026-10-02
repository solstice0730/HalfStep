import { useFocusEffect } from "@react-navigation/native";
import type { CompositeScreenProps } from "@react-navigation/native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CheckCircle2, MessageCircleMore, PenLine, Trash2 } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
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
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { listDiaryMaterials, removeDiaryMaterial, upsertMemoMaterial, type DiaryMaterial } from "@/features/diary/services/diaryMaterialsService";
import type { DiaryPhotoDraft } from "@/features/diary/types/diary";
import { FeedingRecordModal } from "@/features/records/components/FeedingRecordModal";
import { PhotoPicker } from "@/features/records/components/PhotoPicker";
import { SleepRecordModal } from "@/features/records/components/SleepRecordModal";
import { StoolRecordModal } from "@/features/records/components/StoolRecordModal";
import type { TimeValue } from "@/features/records/components/TimePickerField";
import { UrineRecordModal } from "@/features/records/components/UrineRecordModal";
import { addFeedingRecord, addSleepRecord, addStoolRecord, addUrineRecord, getTodayRecords } from "@/features/records/services/recordsService";
import {
  DIAPER_AMOUNT_LABELS,
  FEEDING_TYPE_LABELS,
  STOOL_FORM_LABELS,
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
import { analyzePhotos } from "@/services/api/aiApi";
import { ApiRequestError } from "@/services/api/apiClient";
import { uploadImage, type LocalImage } from "@/services/api/uploadApi";
import { ErrorState } from "@/shared/components/ErrorState";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { todayLocalIsoDate } from "@/shared/utils/date";

type RecordsScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Records">,
  NativeStackScreenProps<AppStackParamList>
>;

const displayDate = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
const nowLabel = () => new Date().toTimeString().slice(0, 5);

const pad2 = (value: string) => (value || "0").padStart(2, "0");
const buildIsoDateTime = (date: string, time: TimeValue) => `${date}T${pad2(time.hour)}:${pad2(time.minute)}:00`;

const sleepMinutes = (records: TodayRecords) =>
  records.sleep.reduce((total, record) => {
    const minutes = (new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / 60000;
    return total + Math.max(0, Math.round(minutes));
  }, 0);

const formatHm = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}h ${mins}m`;
  if (hours) return `${hours}h`;
  return `${mins}m`;
};

type ActiveModal = "feeding" | "sleep" | "urine" | "stool" | null;
type AsyncStatus = "idle" | "loading" | "error";

export function RecordsScreen({ route, navigation }: RecordsScreenProps) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const processedCameraUri = useRef<string | undefined>(undefined);
  const tabBarHeight = useBottomTabBarHeight();

  const selectedDate = route.params?.selectedDate ?? todayLocalIsoDate();
  const [recordsStatus, setRecordsStatus] = useState<AsyncStatus>("loading");
  const [todayRecords, setTodayRecords] = useState<TodayRecords>({ feeding: [], sleep: [], urine: [], stool: [] });
  const [activeRecordModal, setActiveRecordModal] = useState<ActiveModal>(null);
  const [photos, setPhotos] = useState<DiaryPhotoDraft[]>([]);
  const [memo, setMemo] = useState("");
  const memoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const memoLoadedFor = useRef<string | null>(null);
  const [materials, setMaterials] = useState<DiaryMaterial[]>([]);
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadTodayRecords = useCallback(async () => {
    if (!accessToken || !activeBaby) return;
    setRecordsStatus("loading");
    try {
      const [records, materialList] = await Promise.all([
        getTodayRecords(accessToken, activeBaby.id, selectedDate),
        listDiaryMaterials(accessToken, activeBaby.id, selectedDate).catch(() => ({ items: [], counts: { chat: 0, memo: 0 } }))
      ]);
      setTodayRecords(records);
      setMaterials(materialList.items.filter((item) => item.source === "CHAT"));
      // 보호자 메모는 서버에 저장해 두므로(날짜당 1개) 탭을 옮겨도 유지된다. 처음 한 번만 채운다.
      if (memoLoadedFor.current !== selectedDate) {
        memoLoadedFor.current = selectedDate;
        setMemo(materialList.items.find((item) => item.source === "MEMO")?.content ?? "");
      }
      setRecordsStatus("idle");
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setRecordsStatus("error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, activeBaby, selectedDate, signOut]);

  useFocusEffect(
    useCallback(() => {
      void loadTodayRecords();
    }, [loadTodayRecords])
  );

  // 영상 04: 사진은 추가 즉시 업로드하고 장면 캡션을 받아 "AI 분석 준비 완료"로 표시한다.
  const addPhoto = useCallback(
    (uri: string) => {
      setPhotos((current) => {
        if (current.some((photo) => photo.uri === uri) || current.length >= 3) return current;
        return [...current, { uri, url: null, caption: null, description: "", addedAt: nowLabel(), status: "uploading" }];
      });
      if (!accessToken) return;
      void (async () => {
        const patch = (changes: Partial<DiaryPhotoDraft>) =>
          setPhotos((current) => current.map((photo) => (photo.uri === uri ? { ...photo, ...changes } : photo)));
        let url: string;
        try {
          url = await uploadImage(accessToken, { uri });
          patch({ url, status: "analyzing" });
        } catch {
          patch({ status: "error" });
          return;
        }
        try {
          const [item] = await analyzePhotos(accessToken, [url]);
          patch({ caption: item?.caption ?? null, status: item?.caption ? "ready" : "error" });
        } catch {
          patch({ status: "error" });
        }
      })();
    },
    [accessToken]
  );

  useEffect(() => {
    const uri = route.params?.draftImageUri;
    if (uri && processedCameraUri.current !== uri) {
      processedCameraUri.current = uri;
      addPhoto(uri);
    }
  }, [route.params?.draftImageUri, addPhoto]);

  useEffect(() => {
    const modalType = route.params?.openRecordModal;
    if (modalType) {
      setActiveRecordModal(modalType);
      navigation.setParams({ openRecordModal: undefined });
    }
  }, [route.params?.openRecordModal, navigation]);

  const handleSaveFeeding = async (record: { time: TimeValue; feedingType: FeedingType; amountMl?: number; durationMinutes?: number }) => {
    if (!accessToken || !activeBaby || saveStatus === "loading") return false;
    return saveRecord(() => addFeedingRecord(accessToken, activeBaby.id, {
      occurredAt: buildIsoDateTime(selectedDate, record.time),
      feedingType: record.feedingType,
      amountMl: record.amountMl,
      durationMinutes: record.durationMinutes
    }));
  };

  const handleSaveSleep = async (record: { start: TimeValue; end: TimeValue }) => {
    if (!accessToken || !activeBaby || saveStatus === "loading") return false;
    return saveRecord(() => addSleepRecord(accessToken, activeBaby.id, {
      startedAt: buildIsoDateTime(selectedDate, record.start),
      endedAt: buildIsoDateTime(selectedDate, record.end)
    }));
  };

  const handleSaveUrine = async (record: { time: TimeValue; amount: DiaperAmount; color: UrineColor }) => {
    if (!accessToken || !activeBaby || saveStatus === "loading") return false;
    return saveRecord(() => addUrineRecord(accessToken, activeBaby.id, {
      occurredAt: buildIsoDateTime(selectedDate, record.time),
      amount: record.amount,
      color: record.color
    }));
  };

  const handleSaveStool = async (record: { time: TimeValue; amount: DiaperAmount; color: StoolColor; form: StoolForm; photo?: LocalImage }) => {
    if (!accessToken || !activeBaby || saveStatus === "loading") return false;
    return saveRecord(async () => {
      const photoUrl = record.photo ? await uploadImage(accessToken, record.photo) : undefined;
      return addStoolRecord(accessToken, activeBaby.id, {
        occurredAt: buildIsoDateTime(selectedDate, record.time),
        amount: record.amount,
        color: record.color,
        form: record.form,
        photoUrl
      });
    });
  };

  const saveRecord = async (request: () => Promise<unknown>): Promise<boolean> => {
    setSaveStatus("loading");
    setSaveError(null);
    try {
      await request();
      await loadTodayRecords();
      setSaveStatus("idle");
      setActiveRecordModal(null);
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return false;
      }
      setSaveStatus("error");
      setSaveError(error instanceof ApiRequestError ? error.message : "기록을 저장하지 못했어요. 다시 시도해 주세요.");
      return false;
    }
  };

  // 입력이 멈추면 0.8초 뒤 서버에 저장한다. 실패해도 화면 값은 유지되고 생성 요청에는 화면 값이 쓰인다.
  const handleMemoChange = (text: string) => {
    setMemo(text);
    if (!accessToken || !activeBaby) return;
    if (memoSaveTimer.current) clearTimeout(memoSaveTimer.current);
    const babyId = activeBaby.id;
    memoSaveTimer.current = setTimeout(() => {
      void upsertMemoMaterial(accessToken, { babyId, date: selectedDate, content: text }).catch(() => undefined);
    }, 800);
  };

  useEffect(() => () => {
    if (memoSaveTimer.current) clearTimeout(memoSaveTimer.current);
  }, []);

  const removeMaterial = async (material: DiaryMaterial) => {
    if (!accessToken) return;
    setMaterials((current) => current.filter((item) => item.id !== material.id));
    try {
      await removeDiaryMaterial(accessToken, material.id);
    } catch {
      setMaterials((current) => [...current, material]);
    }
  };

  const recordCount = todayRecords.feeding.length + todayRecords.sleep.length + todayRecords.urine.length + todayRecords.stool.length;
  const feedingTotalMl = todayRecords.feeding.reduce((total, record) => total + (record.amountMl ?? 0), 0);
  const diaperCount = todayRecords.urine.length + todayRecords.stool.length;
  const hasMemo = memo.trim().length > 0;
  const hasPhotoContext = photos.some((photo) => photo.description.trim().length > 0 || photo.caption);
  const photosBusy = photos.some((photo) => photo.status === "uploading" || photo.status === "analyzing");
  const canGenerate = (recordCount > 0 || hasMemo || hasPhotoContext || materials.length > 0) && !photosBusy;

  const handleGenerateDiary = () => {
    if (!canGenerate || !activeBaby) return;

    const request: DiaryGenerationRequest = {
      baby: { name: activeBaby.name, ageMonths: Math.max(0, Math.floor(activeBaby.ageInDays / 30)) },
      date: selectedDate,
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
      photoDescriptions: photos.map((photo) => photo.description.trim() || photo.caption || "").filter(Boolean),
      memo: memo.trim() || undefined,
      conversations: materials.map((material) => material.content)
    };

    navigation.navigate("DiaryResult", {
      date: selectedDate,
      request,
      photos,
      memo: memo.trim() || undefined,
      materialCounts: { records: recordCount, photos: photos.length, chats: materials.length }
    });
  };

  return (
    <View style={styles.root}>
      <GradientBackdrop />
      <SafeAreaView style={styles.fixedArea}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorFlex}>
          <TouchableWithoutFeedback onPress={Platform.OS === "web" ? undefined : Keyboard.dismiss} accessible={false}>
            <View style={styles.editorFlex}>
              <View style={styles.header}>
                <View style={styles.headerTitles}>
                  <Text style={styles.navEyebrow}>{displayDate(selectedDate)}</Text>
                  <Text style={styles.navTitle}>{selectedDate === todayLocalIsoDate() ? "오늘의 일기 재료" : "선택한 날짜의 일기 재료"}</Text>
                </View>
                <CheckCircle2 color={recordCount > 0 ? colors.primary : colors.textMuted} size={24} />
              </View>

              <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.editorBody, { paddingBottom: 32 + tabBarHeight }]}>
                <Text style={styles.sectionLabel}>하루의 데이터가 자동으로 모였어요</Text>
                {recordsStatus === "loading" && <LoadingState />}
                {recordsStatus === "error" && <ErrorState message="오늘 기록을 불러오지 못했어요." onRetry={loadTodayRecords} />}
                {recordsStatus === "idle" && (
                  <View style={styles.statRow}>
                    <StatTile value={`${todayRecords.feeding.length}회`} label={feedingTotalMl ? `수유 ${feedingTotalMl}ml` : "수유"} />
                    <StatTile value={formatHm(sleepMinutes(todayRecords))} label="수면" />
                    <StatTile value={`${diaperCount}회`} label="배변·소변" />
                  </View>
                )}

                <View style={styles.categoryRow}>
                  <CategoryButton label="+ 수유" onPress={() => setActiveRecordModal("feeding")} />
                  <CategoryButton label="+ 수면" onPress={() => setActiveRecordModal("sleep")} />
                  <CategoryButton label="+ 소변" onPress={() => setActiveRecordModal("urine")} />
                  <CategoryButton label="+ 대변" onPress={() => setActiveRecordModal("stool")} />
                </View>

                {saveError && <ErrorState message={saveError} />}

                <PhotoPicker
                  onAdd={addPhoto}
                  onDescriptionChange={(uri, description) =>
                    setPhotos((current) => current.map((photo) => (photo.uri === uri ? { ...photo, description } : photo)))
                  }
                  onRemove={(uri) => setPhotos((current) => current.filter((photo) => photo.uri !== uri))}
                  photos={photos}
                />

                <Text style={styles.sectionLabel}>보호자 메모</Text>
                <TextInput
                  maxLength={500}
                  multiline
                  onBlur={Keyboard.dismiss}
                  onChangeText={handleMemoChange}
                  placeholder="오늘 있었던 일을 자유롭게 적어보세요"
                  placeholderTextColor={colors.textMuted}
                  style={styles.memoInput}
                  textAlignVertical="top"
                  value={memo}
                />

                <View style={styles.materialHeader}>
                  <Text style={styles.sectionLabel}>코치와 나눈 이야기 {materials.length}건</Text>
                  <Pressable onPress={() => navigation.navigate("AiChat")}>
                    <Text style={styles.materialLink}>물어보기</Text>
                  </Pressable>
                </View>
                {materials.length === 0 ? (
                  <Text style={styles.materialEmpty}>대화에서 "오늘 일기에 추가"를 누르면 여기에 모여요.</Text>
                ) : (
                  <View style={styles.materialList}>
                    {materials.map((material) => (
                      <View key={material.id} style={styles.materialRow}>
                        <MessageCircleMore color={colors.primary} size={16} />
                        <Text numberOfLines={2} style={styles.materialText}>{material.content.replace(/^Q: /, "").split("\n")[0]}</Text>
                        <Pressable accessibilityLabel="대화 재료 삭제" hitSlop={8} onPress={() => void removeMaterial(material)}>
                          <Trash2 color={colors.textMuted} size={16} />
                        </Pressable>
                      </View>
                    ))}
                  </View>
                )}

                {!canGenerate && !photosBusy && <Text style={styles.hintText}>육아일기를 만들 기록, 사진, 메모, 대화 중 하나를 먼저 추가해 주세요.</Text>}

                <Pressable disabled={!canGenerate} style={!canGenerate && styles.generateButtonDisabled} onPress={handleGenerateDiary}>
                  <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.generateButton}>
                    <PenLine color="#FFFFFF" size={16} />
                    <Text style={styles.generateButtonText}>{photosBusy ? "사진 정리 중…" : "오늘 일기 쓰기"}</Text>
                  </LinearGradient>
                </Pressable>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {activeRecordModal === "feeding" && (
        <FeedingRecordModal isSaving={saveStatus === "loading"} onClose={() => setActiveRecordModal(null)} onSave={handleSaveFeeding} visible />
      )}
      {activeRecordModal === "sleep" && (
        <SleepRecordModal isSaving={saveStatus === "loading"} onClose={() => setActiveRecordModal(null)} onSave={handleSaveSleep} visible />
      )}
      {activeRecordModal === "urine" && (
        <UrineRecordModal isSaving={saveStatus === "loading"} onClose={() => setActiveRecordModal(null)} onSave={handleSaveUrine} visible />
      )}
      {activeRecordModal === "stool" && (
        <StoolRecordModal isSaving={saveStatus === "loading"} onClose={() => setActiveRecordModal(null)} onSave={handleSaveStool} visible />
      )}
    </View>
  );
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <GlassSurface radius={theme.radius.lg} intensity={28} noShadow style={styles.statFlex} contentStyle={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </GlassSurface>
  );
}

function CategoryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable style={styles.categoryButtonFlex} onPress={onPress}>
      {({ pressed }) => (
        <GlassSurface radius={theme.radius.md} intensity={24} noShadow style={pressed && styles.pressed} contentStyle={styles.categoryButton}>
          <Text style={styles.categoryButtonText}>{label}</Text>
        </GlassSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  fixedArea: {
    flex: 1
  },
  editorFlex: {
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8
  },
  headerTitles: {
    gap: 3
  },
  navEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  navTitle: {
    color: colors.primaryDark,
    ...typography.title1
  },
  editorBody: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  statRow: {
    flexDirection: "row",
    gap: 8
  },
  statFlex: {
    flex: 1
  },
  statTile: {
    alignItems: "center",
    gap: 2,
    paddingVertical: 12
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  categoryButtonFlex: {
    flexGrow: 1,
    minWidth: "22%"
  },
  pressed: {
    opacity: 0.72
  },
  categoryButton: {
    alignItems: "center",
    paddingVertical: 10
  },
  categoryButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  memoInput: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 96,
    padding: 16
  },
  materialHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  materialLink: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  materialEmpty: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  materialList: {
    gap: 8
  },
  materialRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10
  },
  materialText: {
    color: colors.text,
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  },
  hintText: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: "700"
  },
  generateButton: {
    alignItems: "center",
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
