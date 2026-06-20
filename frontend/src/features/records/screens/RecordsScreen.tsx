import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Camera, ChevronLeft, ImagePlus, PenLine, Save, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { colors } from "@/shared/constants/colors";

type RecordsScreenProps = BottomTabScreenProps<MainTabParamList, "Records">;

type Story = {
  title: string;
  text: string;
  image: string;
  summary: string[];
};

const calendarDays = Array.from({ length: 30 }, (_, index) => index + 1);
const screenWidth = Dimensions.get("window").width;
const screenHeight = Dimensions.get("window").height;
const todayDate = 20;
const storyDurationMs = 5200;
const samplePhoto = "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop";

const initialStories: Record<number, Story> = {
  5: {
    title: "처음으로 길게 웃은 날",
    text: "아침 수유 후 눈을 맞추며 오래 웃었어요. 웃는 시간이 길어져 가족 모두가 좋아했어요.",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop",
    summary: ["웃음", "수유", "가족"]
  },
  10: {
    title: "햇볕 아래 미소가 많았던 날",
    text: "방긋 웃는 시간이 길어졌고, 눈맞춤도 더 자연스러워졌어요.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["미소", "산책", "기록"]
  },
  18: {
    title: "낮잠 리듬을 찾은 날",
    text: "오전 낮잠과 오후 낮잠 간격이 안정적으로 이어졌어요.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["낮잠", "리듬", "컨디션"]
  }
};

function StorySlide({ date, story }: { date: number; story: Story }) {
  return (
    <View style={styles.storySlide}>
      <View style={styles.storyPhotoFrame}>
        <Image source={{ uri: story.image }} resizeMode="contain" style={styles.storyPhoto} />
      </View>
      <View style={styles.fullStoryText}>
        <Text style={styles.fullStoryDate}>6월 {date}일</Text>
        <Text style={styles.fullStoryTitle}>{story.title}</Text>
        <Text style={styles.fullStoryBody}>{story.text}</Text>
      </View>
    </View>
  );
}

export function RecordsScreen({ route }: RecordsScreenProps) {
  const [stories, setStories] = useState<Record<number, Story>>(initialStories);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [storyOpen, setStoryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftImageUri, setDraftImageUri] = useState<string | undefined>();

  const processedCameraUri = useRef<string | undefined>(undefined);
  const progress = useRef(new Animated.Value(0)).current;
  const storyTranslateX = useRef(new Animated.Value(0)).current;
  const storyDragY = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const touchStartedAt = useRef(0);
  const gestureMoved = useRef(false);
  const storyStartX = useRef(0);
  const storyMovingRef = useRef(false);
  const storyClosingRef = useRef(false);

  const storyDates = useMemo(() => Object.keys(stories).map(Number).sort((a, b) => a - b), [stories]);
  const currentIndex = storyDates.indexOf(selectedDate);
  const prevDate = storyDates[currentIndex - 1];
  const nextDate = storyDates[currentIndex + 1];
  const selectedStory = stories[selectedDate];

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

  const stopProgress = () => {
    animationRef.current?.stop();
  };

  const runProgress = () => {
    if (!storyOpen || storyMovingRef.current || storyClosingRef.current) return;
    stopProgress();
    progress.setValue(0);
    animationRef.current = Animated.timing(progress, {
      duration: storyDurationMs,
      toValue: 1,
      useNativeDriver: false
    });
    animationRef.current.start(({ finished }) => {
      if (finished && nextDate) {
        goToStory("next");
      }
    });
  };

  const alignStoryTrack = (date: number) => {
    const index = storyDates.indexOf(date);
    if (index >= 0) {
      storyTranslateX.setValue(-index * screenWidth);
      storyStartX.current = -index * screenWidth;
    }
  };

  const openStory = (date: number) => {
    if (!stories[date]) return;
    stopProgress();
    setSelectedDate(date);
    storyDragY.setValue(0);
    alignStoryTrack(date);
    setStoryOpen(true);
  };

  const closeStory = () => {
    if (storyClosingRef.current) return;
    storyClosingRef.current = true;
    stopProgress();
    Animated.timing(storyDragY, {
      duration: 210,
      toValue: screenHeight,
      useNativeDriver: true
    }).start(() => {
      setStoryOpen(false);
      storyDragY.setValue(0);
      storyClosingRef.current = false;
      storyMovingRef.current = false;
    });
  };

  const goToStory = (direction: "prev" | "next") => {
    const targetDate = direction === "prev" ? prevDate : nextDate;
    if (!targetDate || storyMovingRef.current) {
      Animated.spring(storyTranslateX, {
        toValue: -currentIndex * screenWidth,
        useNativeDriver: true,
        friction: 9,
        tension: 70
      }).start(runProgress);
      return;
    }

    const targetIndex = storyDates.indexOf(targetDate);
    storyMovingRef.current = true;
    stopProgress();
    Animated.spring(storyTranslateX, {
      toValue: -targetIndex * screenWidth,
      useNativeDriver: true,
      friction: 10,
      tension: 58
    }).start(() => {
      setSelectedDate(targetDate);
      storyStartX.current = -targetIndex * screenWidth;
      storyMovingRef.current = false;
      runProgress();
    });
  };

  useEffect(() => {
    if (!storyOpen || currentIndex < 0) {
      stopProgress();
      return;
    }
    alignStoryTrack(selectedDate);
    runProgress();
    return stopProgress;
  }, [storyOpen, selectedDate, storyDates.length]);

  const openEditor = (imageUri?: string) => {
    setDraftImageUri(imageUri);
    setDraftTitle("");
    setDraftText("");
    setEditorOpen(true);
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

  const storyPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 6 || Math.abs(gesture.dy) > 6,
        onPanResponderGrant: () => {
          touchStartedAt.current = Date.now();
          gestureMoved.current = false;
          storyStartX.current = -currentIndex * screenWidth;
          stopProgress();
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4) {
            gestureMoved.current = true;
          }

          if (gesture.dy > 0 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
            storyDragY.setValue(gesture.dy);
            storyTranslateX.setValue(storyStartX.current);
            return;
          }

          storyDragY.setValue(0);
          storyTranslateX.setValue(storyStartX.current + gesture.dx);
        },
        onPanResponderRelease: (_, gesture) => {
          const heldMs = Date.now() - touchStartedAt.current;

          if (gesture.dy > 80 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
            closeStory();
            return;
          }

          if (gesture.dx > 78) {
            goToStory("prev");
            return;
          }

          if (gesture.dx < -78) {
            goToStory("next");
            return;
          }

          if (!gestureMoved.current && heldMs < 240) {
            goToStory(gesture.x0 < screenWidth / 2 ? "prev" : "next");
            return;
          }

          Animated.parallel([
            Animated.spring(storyTranslateX, {
              toValue: storyStartX.current,
              useNativeDriver: true,
              friction: 9,
              tension: 70
            }),
            Animated.spring(storyDragY, { toValue: 0, useNativeDriver: true })
          ]).start(runProgress);
        },
        onPanResponderTerminate: () => {
          Animated.parallel([
            Animated.spring(storyTranslateX, {
              toValue: storyStartX.current,
              useNativeDriver: true,
              friction: 9,
              tension: 70
            }),
            Animated.spring(storyDragY, { toValue: 0, useNativeDriver: true })
          ]).start(runProgress);
        }
      }),
    [currentIndex, prevDate, nextDate, storyDates]
  );

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"]
  });

  const storyOpacity = storyDragY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0.72],
    extrapolate: "clamp"
  });

  const storyScale = storyDragY.interpolate({
    inputRange: [0, 220],
    outputRange: [1, 0.9],
    extrapolate: "clamp"
  });

  return (
    <View style={styles.root}>
      {editorOpen ? (
        <SafeAreaView style={styles.fixedArea}>
          <View style={styles.editorHeader}>
            <Pressable hitSlop={12} style={styles.iconButton} onPress={() => setEditorOpen(false)}>
              <ChevronLeft color={colors.primaryDark} size={21} />
            </Pressable>
            <Text style={styles.navTitle}>일기 쓰기</Text>
            <Pressable hitSlop={12} style={styles.saveButton} onPress={saveDiary}>
              <Save color="#FFFFFF" size={17} />
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>

          <View style={styles.editorBody}>
            <Pressable style={styles.photoPicker} onPress={() => setDraftImageUri(samplePhoto)}>
              {draftImageUri ? (
                <Image source={{ uri: draftImageUri }} resizeMode="cover" style={styles.draftPhoto} />
              ) : (
                <View style={styles.photoEmpty}>
                  <ImagePlus color={colors.primary} size={34} />
                  <Text style={styles.photoEmptyText}>사진 추가하기</Text>
                </View>
              )}
            </Pressable>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="일기 제목"
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
            />
            <TextInput
              value={draftText}
              onChangeText={setDraftText}
              multiline
              placeholder="오늘의 순간을 적어보세요."
              placeholderTextColor={colors.textMuted}
              style={styles.bodyInput}
              textAlignVertical="top"
            />
          </View>
        </SafeAreaView>
      ) : (
        <SafeAreaView style={styles.fixedArea}>
          <View style={styles.topNav}>
            <View style={styles.iconButton}>
              <ChevronLeft color={colors.primaryDark} size={20} />
            </View>
            <Text style={styles.navTitle}>기록</Text>
            <Pressable hitSlop={12} style={styles.diaryButton} onPress={() => openEditor()}>
              <PenLine color="#FFFFFF" size={16} />
              <Text style={styles.diaryButtonText}>일기</Text>
            </Pressable>
          </View>

          <View style={styles.fixedContent}>
            <View style={styles.calendarCard}>
              <View style={styles.calendarHeader}>
                <Text style={styles.monthTitle}>2026년 6월</Text>
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
                          source={{ uri: story.image }}
                          imageStyle={styles.dateThumbnailImage}
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
              </View>
            </View>

            <Pressable style={styles.previewCard} onPress={() => selectedStory ? openStory(selectedDate) : openEditor()}>
              {selectedStory ? (
                <ImageBackground source={{ uri: selectedStory.image }} imageStyle={styles.previewImage} style={styles.previewImageBox}>
                  <View style={styles.previewOverlay}>
                    <Text style={styles.previewDate}>6월 {selectedDate}일</Text>
                    <Text style={styles.previewTitle}>{selectedStory.title}</Text>
                  </View>
                </ImageBackground>
              ) : (
                <View style={styles.emptyStory}>
                  <ImagePlus color={colors.primary} size={34} />
                  <Text style={styles.emptyTitle}>이 날짜에 일기를 남겨보세요</Text>
                  <Text style={styles.emptyText}>사진을 추가하면 캘린더 썸네일과 스토리 화면에 자동으로 보여요.</Text>
                </View>
              )}
            </Pressable>
          </View>
        </SafeAreaView>
      )}

      <Modal visible={storyOpen} transparent animationType="none" onRequestClose={closeStory}>
        <View style={styles.storyModal} {...storyPanResponder.panHandlers}>
          <Animated.View
            style={[
              styles.storySurface,
              {
                opacity: storyOpacity,
                transform: [{ translateY: storyDragY }, { scale: storyScale }]
              }
            ]}
          >
            <Animated.View
              style={[
                styles.storyTrack,
                {
                  width: screenWidth * storyDates.length,
                  transform: [{ translateX: storyTranslateX }]
                }
              ]}
            >
              {storyDates.map((date) => (
                <StorySlide key={date} date={date} story={stories[date]} />
              ))}
            </Animated.View>

            <View style={styles.storyTopChrome}>
              <View style={styles.progressTrack}>
                <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
              </View>
              <Pressable hitSlop={12} style={styles.closeStory} onPress={closeStory}>
                <X color="#FFFFFF" size={24} />
              </Pressable>
            </View>
          </Animated.View>
        </View>
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
  fixedContent: {
    flex: 1,
    gap: 16,
    paddingBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  topNav: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  editorHeader: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  iconButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24
  },
  diaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 74,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  diaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    minHeight: 44,
    minWidth: 74,
    justifyContent: "center",
    paddingHorizontal: 16
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  calendarCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16
  },
  calendarHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  monthTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26
  },
  photoBadge: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  photoBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18
  },
  weekRow: {
    flexDirection: "row",
    marginTop: 12
  },
  weekText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center"
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8
  },
  dateCell: {
    alignItems: "center",
    borderRadius: 15,
    minHeight: 44,
    justifyContent: "center",
    marginVertical: 3,
    overflow: "hidden",
    width: `${100 / 7}%`
  },
  dateCellActive: {
    borderColor: colors.primary,
    borderWidth: 2
  },
  dateText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "500"
  },
  dateTextActive: {
    color: colors.primary
  },
  dateThumbnail: {
    alignItems: "center",
    height: 36,
    justifyContent: "center",
    width: 36
  },
  dateThumbnailImage: {
    borderRadius: 14
  },
  dateOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.22)",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  dateOverlayActive: {
    backgroundColor: "rgba(95,142,168,0.42)"
  },
  thumbnailDateText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  previewCard: {
    flex: 1,
    overflow: "hidden"
  },
  previewImageBox: {
    flex: 1,
    justifyContent: "flex-end"
  },
  previewImage: {
    borderRadius: 16
  },
  previewOverlay: {
    backgroundColor: "rgba(45,37,32,0.38)",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 16
  },
  previewDate: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    marginTop: 5
  },
  emptyStory: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    padding: 20
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
    marginTop: 12
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
    textAlign: "center"
  },
  editorBody: {
    flex: 1,
    gap: 12,
    padding: 20
  },
  photoPicker: {
    backgroundColor: colors.blueSoft,
    borderRadius: 16,
    height: 220,
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
    color: colors.primary,
    fontSize: 15,
    fontWeight: "600",
    marginTop: 10
  },
  titleInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
    minHeight: 52,
    padding: 14
  },
  bodyInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.primaryDark,
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    padding: 14
  },
  storyModal: {
    backgroundColor: "transparent",
    flex: 1,
    overflow: "hidden"
  },
  storySurface: {
    backgroundColor: "#111827",
    flex: 1,
    overflow: "hidden"
  },
  storyTrack: {
    flex: 1,
    flexDirection: "row"
  },
  storyTopChrome: {
    left: 18,
    position: "absolute",
    right: 18,
    top: 52,
    zIndex: 3
  },
  progressTrack: {
    backgroundColor: "rgba(255,255,255,0.34)",
    borderRadius: 999,
    height: 4,
    overflow: "hidden"
  },
  progressFill: {
    backgroundColor: "#FFFFFF",
    height: "100%"
  },
  closeStory: {
    alignItems: "center",
    alignSelf: "flex-end",
    height: 44,
    justifyContent: "center",
    marginTop: 12,
    width: 44
  },
  storySlide: {
    flex: 1,
    justifyContent: "center",
    paddingBottom: 44,
    paddingHorizontal: 20,
    paddingTop: 86,
    width: screenWidth
  },
  storyPhotoFrame: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center"
  },
  storyPhoto: {
    borderRadius: 16,
    height: "100%",
    width: "100%"
  },
  fullStoryText: {
    gap: 6,
    paddingBottom: 20,
    paddingTop: 18
  },
  fullStoryDate: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  fullStoryTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32
  },
  fullStoryBody: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 22
  }
});
