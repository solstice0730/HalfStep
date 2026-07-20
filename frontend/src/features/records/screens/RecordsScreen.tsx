import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import * as ImagePicker from "expo-image-picker";
import { Camera, ImagePlus, PenLine, RefreshCw, Save, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

import { StoryCarousel } from "../components/DiaryCarousel";
import { env } from "@/config/env";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { recordsApi } from "@/services/api/recordsApi";
import { colors } from "@/shared/constants/colors";
import type { CareRecord } from "../types/records";
import { describeRecord, formatRecordDate, formatRecordTime, recordTypeLabels } from "../utils/recordPresentation";

type RecordsScreenProps = BottomTabScreenProps<MainTabParamList, "Records">;

export type Story = {
  title: string;
  text: string;
  image: string;
  summary: string[];
};

const currentDate = new Date();
const calendarYear = currentDate.getFullYear();
const calendarMonthIndex = currentDate.getMonth();
const calendarDays = Array.from(
  { length: new Date(calendarYear, calendarMonthIndex + 1, 0).getDate() },
  (_, index) => index + 1
);
const screenWidth = Dimensions.get("window").width;
const todayDate = currentDate.getDate();
const samplePhoto = "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop";

const initialStories: Record<number, Story> = {
  5: {
    title: "처음 길게 웃어준 날",
    text: "아침 수유 후 눈을 맞추자 오래 웃어줬어요. 짧은 순간이었지만 하루 종일 마음에 남는 장면이었어요.",
    image: "https://images.unsplash.com/photo-1442458370899-ae20e367c5d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["웃음", "수유", "가족"]
  },
  10: {
    title: "햇살 아래 낮잠",
    text: "창가에 들어온 햇살을 받으며 편안하게 잠들었어요. 방 안이 조용하고 따뜻해서 사진으로 꼭 남기고 싶었어요.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["낮잠", "햇살", "평온"]
  },
  15: {
    title: "목욕하고 뽀송한 저녁",
    text: "목욕 뒤 보송한 옷을 입고 한참을 바라보았어요. 매일 조금씩 표정이 선명해지는 게 느껴져요.",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop",
    summary: ["목욕", "저녁", "성장"]
  },
  20: {
    title: "발장구 1일차 기록",
    text: "기저귀를 갈아주는데 발을 통통 움직이며 웃었어요. 작지만 확실한 움직임이 너무 귀여운 날이었어요.",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop",
    summary: ["발장구", "움직임", "오늘"]
  },
  25: {
    title: "가족에게 미소 선물",
    text: "할머니와 영상 통화를 하다가 환하게 웃었어요. 화면 너머에서도 모두가 같이 웃게 된 따뜻한 순간이에요.",
    image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
    summary: ["가족", "미소", "공유"]
  }
};

export function RecordsScreen({ route }: RecordsScreenProps) {
  const { accessToken } = useAuth();
  const [stories, setStories] = useState<Record<number, Story>>(initialStories);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [storyOpen, setStoryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftImageUri, setDraftImageUri] = useState<string | undefined>();
  const processedCameraUri = useRef<string | undefined>(undefined);
  const previewTranslateX = useRef(new Animated.Value(0)).current;
  const recordsRequestId = useRef(0);
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [recordsError, setRecordsError] = useState<string | null>(null);

  const selectedStory = stories[selectedDate];
  const storyDates = useMemo(() => calendarDays.filter((date) => stories[date]), [stories]);
  const selectedDateQuery = formatRecordDate(calendarYear, calendarMonthIndex, selectedDate);

  const loadRecords = useCallback(async () => {
    const requestId = ++recordsRequestId.current;
    if (!accessToken) {
      setRecords([]);
      setRecordsLoading(false);
      setRecordsError("로그인이 필요합니다.");
      return;
    }
    setRecordsLoading(true);
    setRecordsError(null);
    try {
      const result = await recordsApi.list(accessToken, {
        babyId: env.demoBabyId,
        date: selectedDateQuery,
        limit: 50
      });
      if (requestId === recordsRequestId.current) setRecords(result.records);
    } catch (error) {
      if (requestId === recordsRequestId.current) {
        setRecords([]);
        setRecordsError(error instanceof Error ? error.message : "기록을 불러오지 못했습니다.");
      }
    } finally {
      if (requestId === recordsRequestId.current) setRecordsLoading(false);
    }
  }, [accessToken, selectedDateQuery]);

  useFocusEffect(
    useCallback(() => {
      void loadRecords();
      return () => {
        recordsRequestId.current += 1;
      };
    }, [loadRecords])
  );

  useEffect(() => {
    const uri = route.params?.draftImageUri;
    if (uri && processedCameraUri.current !== uri) {
      processedCameraUri.current = uri;
      setSelectedDate(todayDate);
      setDraftImageUri(uri);
      setDraftTitle("오늘의 사진 일기");
      setDraftText("");
      setEditorOpen(true);
    }
  }, [route.params?.draftImageUri]);

  useEffect(() => {
    Object.values(stories).forEach((story) => {
      Image.prefetch(story.image);
    });
  }, [stories]);

  const openStory = (date: number) => {
    if (!stories[date]) return;
    setSelectedDate(date);
    setStoryOpen(true);
  };

  const openEditor = (imageUri?: string) => {
    setDraftImageUri(imageUri);
    setDraftTitle("");
    setDraftText("");
    setEditorOpen(true);
  };

  const snapPreviewToDate = (direction: -1 | 1) => {
    if (storyDates.length <= 1) {
      Animated.spring(previewTranslateX, {
        friction: 9,
        tension: 80,
        toValue: 0,
        useNativeDriver: true
      }).start();
      return;
    }

    const currentIndex = storyDates.includes(selectedDate)
      ? storyDates.indexOf(selectedDate)
      : storyDates.findIndex((date) => date > selectedDate);
    const safeIndex = currentIndex === -1 ? storyDates.length - 1 : currentIndex;
    const nextIndex = Math.max(0, Math.min(storyDates.length - 1, safeIndex + direction));

    if (nextIndex === safeIndex) {
      Animated.spring(previewTranslateX, {
        friction: 9,
        tension: 80,
        toValue: 0,
        useNativeDriver: true
      }).start();
      return;
    }

    Animated.timing(previewTranslateX, {
      duration: 140,
      toValue: -direction * screenWidth,
      useNativeDriver: true
    }).start(() => {
      setSelectedDate(storyDates[nextIndex]);
      previewTranslateX.setValue(direction * screenWidth);
      Animated.spring(previewTranslateX, {
        friction: 9,
        tension: 74,
        toValue: 0,
        useNativeDriver: true
      }).start();
    });
  };

  const previewPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderGrant: () => {
          previewTranslateX.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          previewTranslateX.setValue(gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          const threshold = screenWidth * 0.18;
          if (Math.abs(gesture.dx) > threshold || Math.abs(gesture.vx) > 0.55) {
            snapPreviewToDate(gesture.dx < 0 ? 1 : -1);
            return;
          }

          Animated.spring(previewTranslateX, {
            friction: 9,
            tension: 80,
            toValue: 0,
            useNativeDriver: true
          }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(previewTranslateX, {
            friction: 9,
            tension: 80,
            toValue: 0,
            useNativeDriver: true
          }).start();
        }
      }),
    [previewTranslateX, selectedDate, storyDates]
  );

  const closeEditor = () => {
    Keyboard.dismiss();
    setEditorOpen(false);
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.9
    });

    if (!result.canceled) {
      setDraftImageUri(result.assets[0]?.uri);
    }
  };

  const saveDiary = () => {
    const image = draftImageUri ?? samplePhoto;
    const title = draftTitle.trim() || "오늘의 성장 일기";
    const text = draftText.trim() || "사진과 함께 남긴 오늘의 짧은 기록이에요.";

    setStories((current) => ({
      ...current,
      [selectedDate]: {
        title,
        text,
        image,
        summary: ["일기", "사진", "오늘"]
      }
    }));
    setEditorOpen(false);
    setDraftTitle("");
    setDraftText("");
    setDraftImageUri(undefined);
  };

  return (
    <View style={styles.root}>
      {!editorOpen && (
        <SafeAreaView edges={["top"]} style={styles.fixedArea}>
          <View style={styles.topNav}>
            <View style={styles.titleBlock}>
              <Text style={styles.navEyebrow}>{calendarYear}년 {calendarMonthIndex + 1}월</Text>
              <Text style={styles.navTitle}>성장 기록</Text>
            </View>
            <Pressable style={styles.diaryButton} onPress={() => openEditor()}>
              <PenLine color="#FFFFFF" size={15} />
              <Text style={styles.diaryButtonText}>일기 쓰기</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.fixedContent} showsVerticalScrollIndicator={false}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthTitle}>{calendarMonthIndex + 1}월 기록 캘린더</Text>
                <View style={styles.photoBadge}>
                  <Camera color={colors.primary} size={14} />
                  <Text style={styles.photoBadgeText}>사진 일기</Text>
                </View>
              </View>

              <View style={styles.weekRow}>
                {["일", "월", "화", "수", "목", "금", "토"].map((day) => (
                  <Text key={day} style={styles.weekText}>{day}</Text>
                ))}
              </View>

              <View style={styles.dateGrid}>
                {calendarDays.map((date) => {
                  const story = stories[date];
                  const selected = selectedDate === date;

                  return (
                    <Pressable
                      key={date}
                      style={[styles.dateCell, selected && styles.dateCellActive]}
                      onPress={() => {
                        setSelectedDate(date);
                        if (story) openStory(date);
                      }}
                    >
                      {story ? (
                        <ImageBackground
                          fadeDuration={0}
                          imageStyle={styles.dateThumbnailImage}
                          source={{ uri: story.image }}
                          style={styles.dateThumbnail}
                        >
                          <View style={[styles.dateOverlay, selected && styles.dateOverlayActive]}>
                            <Text style={styles.thumbnailDateText}>{date}</Text>
                          </View>
                        </ImageBackground>
                      ) : (
                        <Text style={[styles.dateText, selected && styles.dateTextActive]}>{date}</Text>
                      )}
                    </Pressable>
                  );
                })}
                {Array.from({ length: 5 }).map((_, index) => (
                  <View key={`dummy-${index}`} style={[styles.dateCell, styles.dummyCell]} />
                ))}
              </View>
            </View>

            <View style={styles.recordsPanel}>
              <View style={styles.recordsHeader}>
                <View>
                  <Text style={styles.recordsTitle}>{calendarMonthIndex + 1}월 {selectedDate}일 육아 기록</Text>
                  <Text style={styles.recordsCount}>{records.length}개 저장됨</Text>
                </View>
                <Pressable accessibilityLabel="기록 새로고침" disabled={recordsLoading} style={styles.refreshButton} onPress={loadRecords}>
                  <RefreshCw color={colors.primary} size={17} />
                </Pressable>
              </View>
              {recordsLoading ? (
                <View style={styles.recordsState}>
                  <ActivityIndicator color={colors.primary} />
                  <Text style={styles.recordsStateText}>저장된 기록을 불러오는 중</Text>
                </View>
              ) : recordsError ? (
                <View style={styles.recordsState}>
                  <Text style={styles.recordsStateText}>{recordsError}</Text>
                  <Pressable style={styles.retryButton} onPress={loadRecords}>
                    <Text style={styles.retryButtonText}>다시 시도</Text>
                  </Pressable>
                </View>
              ) : records.length === 0 ? (
                <View style={styles.recordsState}>
                  <Text style={styles.recordsStateText}>이 날짜에 저장된 육아 기록이 없습니다.</Text>
                </View>
              ) : (
                records.map((record) => (
                  <View key={record.id} style={styles.recordRow}>
                    <Text style={styles.recordTime}>{formatRecordTime(record.occurredAt)}</Text>
                    <View style={styles.recordBody}>
                      <Text style={styles.recordType}>{recordTypeLabels[record.type]}</Text>
                      <Text style={styles.recordDescription}>{describeRecord(record)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            <Animated.View
              style={[styles.previewSwipeWrap, { transform: [{ translateX: previewTranslateX }] }]}
              {...previewPanResponder.panHandlers}
            >
              <Pressable style={styles.previewCard} onPress={() => selectedStory ? openStory(selectedDate) : openEditor()}>
                {selectedStory ? (
                  <ImageBackground imageStyle={styles.previewImage} source={{ uri: selectedStory.image }} style={styles.previewImageBox}>
                    <View style={styles.previewOverlay}>
                      <Text style={styles.previewDate}>{calendarMonthIndex + 1}월 {selectedDate}일</Text>
                      <Text style={styles.previewTitle}>{selectedStory.title}</Text>
                      <Text numberOfLines={2} style={styles.previewText}>{selectedStory.text}</Text>
                    </View>
                  </ImageBackground>
                ) : (
                  <View style={styles.emptyStory}>
                    <ImagePlus color={colors.primary} size={34} />
                    <Text style={styles.emptyTitle}>이 날짜에 일기를 남겨보세요</Text>
                    <Text style={styles.emptyText}>사진을 추가하면 캘린더 썸네일과 스토리에 바로 보여요.</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          </ScrollView>
        </SafeAreaView>
      )}

      {editorOpen && (
        <SafeAreaView style={styles.fixedArea}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.editorFlex}>
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={styles.editorFlex}>
                <View style={styles.editorHeader}>
                  <Pressable hitSlop={12} style={styles.iconButton} onPress={closeEditor}>
                    <X color={colors.primaryDark} size={24} />
                  </Pressable>
                  <Text style={styles.editorTitle}>일기 쓰기</Text>
                  <Pressable style={styles.saveButton} onPress={saveDiary}>
                    <Save color="#FFFFFF" size={15} />
                    <Text style={styles.saveButtonText}>저장</Text>
                  </Pressable>
                </View>

                <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.editorBody}>
                  <Pressable style={styles.photoPicker} onPress={pickPhoto}>
                    {draftImageUri ? (
                      <Image source={{ uri: draftImageUri }} resizeMode="cover" style={styles.draftPhoto} />
                    ) : (
                      <View style={styles.photoEmpty}>
                        <ImagePlus color={colors.primary} size={34} />
                        <Text style={styles.photoEmptyText}>사진 추가하기</Text>
                        <Text style={styles.photoEmptySubText}>내 갤러리에서 사진을 선택해요</Text>
                      </View>
                    )}
                  </Pressable>
                  <TextInput
                    value={draftTitle}
                    onBlur={Keyboard.dismiss}
                    onChangeText={setDraftTitle}
                    placeholder="일기 제목"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    style={styles.titleInput}
                  />
                  <TextInput
                    multiline
                    blurOnSubmit
                    onBlur={Keyboard.dismiss}
                    onChangeText={setDraftText}
                    placeholder="오늘의 순간을 적어보세요"
                    placeholderTextColor={colors.textMuted}
                    returnKeyType="done"
                    style={styles.bodyInput}
                    textAlignVertical="top"
                    value={draftText}
                  />
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </SafeAreaView>
      )}

      <Modal animationType="fade" onRequestClose={() => setStoryOpen(false)} transparent visible={storyOpen}>
        <StoryCarousel
          dates={calendarDays.filter((date) => stories[date])}
          initialDate={selectedDate}
          onClose={() => setStoryOpen(false)}
          stories={stories}
        />
      </Modal>
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
  topNav: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8
  },
  titleBlock: {
    gap: 3
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
  diaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  diaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800"
  },
  fixedContent: {
    flexGrow: 1,
    gap: 14,
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  recordsPanel: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 14
  },
  recordsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  recordsTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  recordsCount: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 3
  },
  refreshButton: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  recordsState: {
    alignItems: "center",
    gap: 8,
    minHeight: 72,
    justifyContent: "center",
    paddingVertical: 14
  },
  recordsStateText: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center"
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 7
  },
  retryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  recordRow: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingVertical: 11
  },
  recordTime: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    width: 38
  },
  recordBody: {
    flex: 1
  },
  recordType: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  recordDescription: {
    color: colors.text,
    fontSize: 14,
    marginTop: 2
  },
  calendarCard: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#7A563B",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 20
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  monthTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "800"
  },
  photoBadge: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  photoBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  weekRow: {
    flexDirection: "row",
    marginBottom: 6
  },
  weekText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center"
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  dateCell: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 14,
    justifyContent: "center",
    margin: "0.75%",
    overflow: "hidden",
    width: "12.78%"
  },
  dateCellActive: {
    backgroundColor: colors.blueSoft
  },
  dateText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  dateTextActive: {
    color: colors.primary,
    fontWeight: "900"
  },
  dateThumbnail: {
    flex: 1,
    width: "100%"
  },
  dateThumbnailImage: {
    borderRadius: 14
  },
  dateOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.16)",
    flex: 1,
    justifyContent: "center"
  },
  dateOverlayActive: {
    borderColor: colors.accent,
    borderRadius: 14,
    borderWidth: 2
  },
  thumbnailDateText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  dummyCell: {
    backgroundColor: "transparent"
  },
  previewCard: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flex: 1,
    minHeight: 190,
    overflow: "hidden"
  },
  previewSwipeWrap: {
    flex: 1,
    minHeight: 190
  },
  previewImageBox: {
    flex: 1
  },
  previewImage: {
    borderRadius: 28
  },
  previewOverlay: {
    backgroundColor: "rgba(0,0,0,0.28)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 18
  },
  previewDate: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 13,
    fontWeight: "700"
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
  },
  previewText: {
    color: "rgba(255,255,255,0.86)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6
  },
  emptyStory: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 12
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    textAlign: "center"
  },
  editorFlex: {
    flex: 1
  },
  editorHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  editorTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  editorBody: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 8
  },
  photoPicker: {
    aspectRatio: 9 / 12,
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 28,
    borderStyle: "dashed",
    borderWidth: 1,
    overflow: "hidden"
  },
  draftPhoto: {
    height: "100%",
    width: "100%"
  },
  photoEmpty: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  photoEmptyText: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 10
  },
  photoEmptySubText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 4
  },
  titleInput: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  bodyInput: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 150,
    padding: 16
  }
});
