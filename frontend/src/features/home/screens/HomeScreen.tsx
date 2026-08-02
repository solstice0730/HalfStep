import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  BookOpen,
  CalendarDays,
  Camera,
  ChevronDown,
  Flashlight,
  Send,
  Sparkles,
  User,
  X,
  Zap
} from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View
} from "react-native";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent
} from "react-native-gesture-handler";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BabyProfileSheet } from "@/features/baby/components/BabyProfileSheet";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { QuickLogMenu } from "@/features/home/components/QuickLogMenu";
import { TodaySummary } from "@/features/home/components/TodaySummary";
import { MyPageScreen } from "@/features/mypage/screens/MyPageScreen";
import { calculateBabyAge, type BabyProfile } from "@/features/home/services/babyProfileService";
import { getDiaryByDate } from "@/features/diary/services/diaryService";
import { getTodayRecords } from "@/features/records/services/recordsService";
import type { TodayRecords } from "@/features/records/types/records";
import { askAiQuestion, fetchDailySummary, type AskResult, type DailySummaryResult } from "@/services/api/aiApi";
import { colors } from "@/shared/constants/colors";

const todayIsoDate = () => new Date().toISOString().slice(0, 10);
const todayDisplayDate = () =>
  new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

const curation = {
  title: "오늘의 맞춤 큐레이션",
  text: "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. 오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요.",
  chips: ["수유 신호", "낮잠 루틴", "배변 체크"]
};

type HomeScreenProps = BottomTabScreenProps<MainTabParamList, "Home">;
type QuickSheetType = "medicine" | null;

const formatRecordTime = (date: Date) =>
  date.toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit"
  });

function BabyMascot() {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, {
          duration: 1100,
          toValue: 1,
          useNativeDriver: true
        }),
        Animated.timing(bob, {
          duration: 1100,
          toValue: 0,
          useNativeDriver: true
        })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10]
  });

  const rotate = bob.interpolate({
    inputRange: [0, 1],
    outputRange: ["-2deg", "2deg"]
  });

  return (
    <View style={styles.mascotWrap}>
      <Animated.Image
        source={require("../../../../assets/images/baby-character.png")}
        resizeMode="contain"
        style={[styles.mascotImage, { transform: [{ translateY }, { rotate }] }]}
      />
    </View>
  );
}

type AsyncStatus = "idle" | "loading" | "success" | "error";

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { accessToken } = useAuth();
  const { activeBaby, error: babyError, isLoading: isBabyLoading, refresh: refreshBabies } = useBaby();
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);
  const cameraTranslateX = useRef(new Animated.Value(-screenWidth)).current;
  const myPageTranslateY = useRef(new Animated.Value(-screenHeight)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [quickOpen, setQuickOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [quickSheet, setQuickSheet] = useState<QuickSheetType>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [babyMenuOpen, setBabyMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [medicineName, setMedicineName] = useState("");
  const [medicineDose, setMedicineDose] = useState("");
  const [lastQuickRecord, setLastQuickRecord] = useState<string | null>(null);
  const [summaryStatus, setSummaryStatus] = useState<AsyncStatus>("idle");
  const [dailySummary, setDailySummary] = useState<DailySummaryResult | null>(null);
  const [questionInput, setQuestionInput] = useState("");
  const [askStatus, setAskStatus] = useState<AsyncStatus>("idle");
  const [askResult, setAskResult] = useState<AskResult | null>(null);
  const [todayRecords, setTodayRecords] = useState<TodayRecords>({ feeding: [], sleep: [], urine: [], stool: [] });
  const [diarySaved, setDiarySaved] = useState(false);

  const babyProfile = useMemo<BabyProfile | null>(() => activeBaby ? ({
    id: activeBaby.id,
    name: activeBaby.name,
    birthDate: activeBaby.birthDate,
    ageDays: activeBaby.ageInDays
  }) : null, [activeBaby]);
  const profileStatus: AsyncStatus = isBabyLoading ? "loading" : babyError ? "error" : "success";

  const loadTodaySummary = useCallback(async () => {
    if (!accessToken || !activeBaby) return;
    try {
      const [records, diary] = await Promise.all([
        getTodayRecords(accessToken, activeBaby.id, todayIsoDate()),
        getDiaryByDate(accessToken, activeBaby.id, todayIsoDate())
      ]);
      setTodayRecords(records);
      setDiarySaved(diary !== null);
    } catch {
      // 홈 요약은 부가 정보이므로 실패해도 화면은 계속 사용 가능해야 한다.
    }
  }, [accessToken, activeBaby]);

  useFocusEffect(
    useCallback(() => {
      void loadTodaySummary();
    }, [loadTodaySummary])
  );

  const babyAge = babyProfile ? calculateBabyAge(babyProfile.birthDate) : null;

  const loadDailySummary = async () => {
    if (!accessToken || !activeBaby) return;
    setSummaryStatus("loading");
    try {
      const result = await fetchDailySummary(accessToken, activeBaby.id, todayIsoDate());
      setDailySummary(result);
      setSummaryStatus("success");
    } catch {
      setSummaryStatus("error");
    }
  };

  useEffect(() => {
    if (chatOpen) {
      void loadDailySummary();
    }
  }, [chatOpen]);

  // contentOffset only applies on the ScrollView's very first layout pass, which can race
  // ahead of a late/large initial measurement (e.g. tablets) and leave the pager showing the
  // blank left page. Force it explicitly whenever the measured width is known or changes.
  useEffect(() => {
    pagerRef.current?.scrollTo({ x: screenWidth, y: 0, animated: false });
  }, [screenWidth]);

  const handleAskQuestion = async () => {
    const question = questionInput.trim();
    if (!accessToken || !activeBaby || !question) return;
    setAskStatus("loading");
    try {
      const result = await askAiQuestion(accessToken, activeBaby.id, todayIsoDate(), question);
      setAskResult(result);
      setAskStatus("success");
    } catch {
      setAskStatus("error");
    }
  };

  const openCamera = () => {
    setCameraOpen(true);
    cameraTranslateX.setValue(-screenWidth);
    requestAnimationFrame(() => {
      Animated.timing(cameraTranslateX, {
        duration: 220,
        toValue: 0,
        useNativeDriver: true
      }).start();
    });
  };

  const closeCamera = () => {
    Animated.timing(cameraTranslateX, {
      duration: 190,
      toValue: -screenWidth,
      useNativeDriver: true
    }).start(() => {
      setLastShot(null);
      setCameraOpen(false);
    });
  };

  const openMyPage = () => {
    setMyPageOpen(true);
    myPageTranslateY.setValue(-screenHeight);
    requestAnimationFrame(() => {
      Animated.timing(myPageTranslateY, {
        duration: 260,
        toValue: 0,
        useNativeDriver: true
      }).start();
    });
  };

  const closeMyPage = () => {
    Animated.timing(myPageTranslateY, {
      duration: 220,
      toValue: -screenHeight,
      useNativeDriver: true
    }).start(() => {
      setMyPageOpen(false);
    });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextPage = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
    setCurrentPage(nextPage);
  };

  const takePhoto = async () => {
    const photo = await cameraRef.current?.takePictureAsync({ quality: 0.8 });
    if (photo?.uri) {
      setLastShot(photo.uri);
    }
  };

  const addShotToRecord = () => {
    if (lastShot) {
      navigation.navigate("Records", { draftImageUri: lastShot });
    }
    setLastShot(null);
    closeCamera();
  };

  const closeQuickLog = () => {
    setQuickOpen(false);
  };

  const openQuickRecord = (type: "feeding" | "sleep" | "urine" | "stool") => {
    closeQuickLog();
    navigation.navigate("Records", { openRecordModal: type });
  };

  // 배변은 실제 API가 소변/대변을 구분해서 저장하므로, 홈에서는 어느 쪽인지 단정하지 않고
  // 기록 화면으로만 이동시켜 사용자가 직접 고르게 한다.
  const openDiaperRecords = () => {
    closeQuickLog();
    navigation.navigate("Records");
  };

  const openQuickSheet = (type: QuickSheetType) => {
    setQuickSheet(type);
    closeQuickLog();
  };

  const saveQuickSheet = () => {
    const now = new Date();
    if (quickSheet === "medicine") {
      setLastQuickRecord(`${medicineName || "약"} ${medicineDose || "복용"} · ${formatRecordTime(now)}`);
    }
    setQuickSheet(null);
    setMedicineName("");
    setMedicineDose("");
  };

  const homeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (evt, gesture) =>
          gesture.dx > 12 && Math.abs(gesture.dy) < 28 && evt.nativeEvent.pageX < screenWidth - 48,
        onPanResponderGrant: () => {
          cameraTranslateX.setValue(-screenWidth);
          setCameraOpen(true);
        },
        onPanResponderMove: (_, gesture) => {
          if (gesture.dx > 0) {
            cameraTranslateX.setValue(Math.min(0, -screenWidth + gesture.dx));
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > screenWidth * 0.28 && Math.abs(gesture.dy) < 56) {
            Animated.timing(cameraTranslateX, {
              duration: 150,
              toValue: 0,
              useNativeDriver: true
            }).start();
            return;
          }

          Animated.timing(cameraTranslateX, {
            duration: 160,
            toValue: -screenWidth,
            useNativeDriver: true
          }).start(() => setCameraOpen(false));
        },
        onPanResponderTerminate: () => {
          Animated.timing(cameraTranslateX, {
            duration: 160,
            toValue: -screenWidth,
            useNativeDriver: true
          }).start(() => setCameraOpen(false));
        }
      }),
    [cameraTranslateX, screenWidth]
  );

  const handleCameraGesture = (event: PanGestureHandlerGestureEvent) => {
    const { translationX } = event.nativeEvent;
    if (translationX < 0) {
      cameraTranslateX.setValue(Math.max(-screenWidth, translationX));
    }
  };

  const handleCameraGestureState = (event: PanGestureHandlerStateChangeEvent) => {
    const { oldState, translationX, velocityX } = event.nativeEvent;
    if (oldState !== State.ACTIVE) return;

    if (translationX < -screenWidth * 0.16 || velocityX < -650) {
      closeCamera();
      return;
    }

    Animated.spring(cameraTranslateX, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 80
    }).start();
  };

  const renderHomeContent = (handlers?: ReturnType<typeof PanResponder.create>["panHandlers"]) => (
    <View style={[styles.page, { width: screenWidth }]} {...handlers}>
      <View style={styles.homeRoot}>
        {quickOpen && <Pressable style={styles.quickDismissLayer} onPress={closeQuickLog} />}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="아기 프로필 변경" style={styles.statusPill} onPress={() => setBabyMenuOpen(true)}>
            <Text numberOfLines={1} style={styles.activeBabyName}>{activeBaby?.name ?? "아기"}</Text>
            <ChevronDown color={colors.textMuted} size={18} />
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="마이페이지 열기" accessibilityRole="button" onPress={openMyPage} style={styles.myPageButton}>
              <User color={colors.primaryDark} size={19} />
            </Pressable>
            <QuickLogMenu
              open={quickOpen}
              onToggle={() => setQuickOpen((open) => !open)}
              onFeeding={() => openQuickRecord("feeding")}
              onSleep={() => openQuickRecord("sleep")}
              onDiaper={openDiaperRecords}
              onMedicine={() => openQuickSheet("medicine")}
            />
          </View>
        </View>

        <View style={styles.mascotPanel}>
          <BabyMascot />
        </View>

        <TodaySummary
          todayDate={todayDisplayDate()}
          profileStatus={profileStatus}
          babyProfile={babyProfile}
          babyAge={babyAge}
          onRetryProfile={() => void refreshBabies()}
          todayRecords={todayRecords}
          diarySaved={diarySaved}
          lastQuickRecord={lastQuickRecord}
        />

        <View style={styles.entryRow}>
          <Pressable style={styles.entryButton} onPress={() => navigation.navigate("Records")}>
            <BookOpen color={colors.primary} size={18} />
            <Text style={styles.entryButtonText}>기록</Text>
          </Pressable>
          <Pressable style={styles.entryButton} onPress={() => navigation.navigate("Records")}>
            <Sparkles color={colors.primary} size={18} />
            <Text style={styles.entryButtonText}>AI 일기</Text>
          </Pressable>
          <Pressable style={styles.entryButton} onPress={() => navigation.navigate("Calendar")}>
            <CalendarDays color={colors.primary} size={18} />
            <Text style={styles.entryButtonText}>캘린더</Text>
          </Pressable>
        </View>

        <Pressable style={styles.questionBox} onPress={() => setChatOpen(true)}>
          <Text style={styles.questionText}>아기가 전해줬으면 하는 말이 있나요?</Text>
          <View style={styles.sendButton}>
            <Send color="#FFFFFF" size={18} />
          </View>
        </Pressable>

        <View style={styles.curationCard}>
          <View style={styles.curationHeader}>
            <Text style={styles.curationTitle}>{curation.title}</Text>
            <Sparkles color={colors.accent} size={18} />
          </View>
          <Text style={styles.curationText}>{curation.text}</Text>
          <View style={styles.chipRow}>
            {curation.chips.map((chip) => (
              <Text key={chip} numberOfLines={1} style={styles.chip}>#{chip}</Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.safeArea}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        contentOffset={{ x: screenWidth, y: 0 }}
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
      >
        <View style={[styles.page, { width: screenWidth }]} />
        {renderHomeContent(homeSwipeResponder.panHandlers)}
      </ScrollView>

      <Modal visible={cameraOpen} animationType="none" transparent onRequestClose={closeCamera}>
        <PanGestureHandler
          activeOffsetX={[-8, 8]}
          failOffsetY={[-42, 42]}
          onGestureEvent={handleCameraGesture}
          onHandlerStateChange={handleCameraGestureState}
        >
          <Animated.View style={[styles.cameraRoot, { transform: [{ translateX: cameraTranslateX }] }]}>
            <View style={[styles.cameraTopOverlay, { paddingTop: insets.top + 12 }]}>
              <Pressable style={styles.cameraControl} onPress={closeCamera}>
                <X color="#FFFFFF" size={25} />
              </Pressable>
              <Text style={styles.cameraTitle}>오늘 사진 기록</Text>
              <View style={styles.cameraHeaderSpacer} />
            </View>

            <View style={styles.cameraStage}>
              {permission?.granted ? (
                lastShot ? (
                  <Image source={{ uri: lastShot }} resizeMode="cover" style={styles.cameraView} />
                ) : (
                  <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} enableTorch={facing === "back" && flashOn} />
                )
              ) : (
                <View style={styles.permissionBox}>
                  <Camera color="#FFFFFF" size={52} />
                  <Text style={styles.permissionTitle}>카메라 권한이 필요해요</Text>
                  <Text style={styles.permissionText}>오늘의 순간을 사진으로 바로 기록할 수 있어요.</Text>
                  <Pressable style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>권한 허용하기</Text>
                  </Pressable>
                </View>
              )}
              {!lastShot && permission?.granted && (
                <View style={styles.cameraBottomDock}>
                  {facing === "back" ? (
                    <Pressable style={styles.flashButton} onPress={() => setFlashOn((value) => !value)}>
                      {flashOn ? <Zap color="#F5C842" size={22} /> : <Flashlight color="#FFFFFF" size={21} />}
                    </Pressable>
                  ) : (
                    <View style={styles.flashButtonSpacer} />
                  )}
                  <Pressable style={styles.shutterButton} onPress={takePhoto}>
                    <View style={styles.shutterInner} />
                  </Pressable>
                  <Pressable style={styles.flipButton} onPress={() => setFacing((value) => (value === "back" ? "front" : "back"))}>
                    <Camera color="#FFFFFF" size={23} />
                  </Pressable>
                </View>
              )}
              {lastShot && (
                <View style={styles.recordPrompt}>
                  <Text style={styles.recordPromptTitle}>이 사진을 일기에 올릴까요?</Text>
                  <Text style={styles.recordPromptText}>일기 작성 화면에 사진이 자동으로 추가돼요.</Text>
                  <View style={styles.recordPromptActions}>
                    <Pressable style={styles.retakeButton} onPress={() => setLastShot(null)}>
                      <Text style={styles.retakeButtonText}>다시 찍기</Text>
                    </Pressable>
                    <Pressable style={styles.addRecordButton} onPress={addShotToRecord}>
                      <Text style={styles.addRecordButtonText}>일기 쓰기</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Modal>

      <Modal animationType="none" onRequestClose={closeMyPage} transparent visible={myPageOpen}>
        <Animated.View style={[styles.myPageRoot, { transform: [{ translateY: myPageTranslateY }] }]}>
          <MyPageScreen onClose={closeMyPage} />
        </Animated.View>
      </Modal>

      {currentPage === 1 && (
        <Pressable style={styles.chatFloat} onPress={() => setChatOpen(true)}>
          <Image source={require("../../../../assets/images/chatbot-home.png")} resizeMode="contain" style={styles.chatFloatImage} />
        </Pressable>
      )}

      <Modal visible={quickSheet !== null} transparent animationType="slide" onRequestClose={() => setQuickSheet(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>약 기록</Text>
              <Pressable onPress={() => setQuickSheet(null)}>
                <X color={colors.primaryDark} size={22} />
              </Pressable>
            </View>
            <TextInput
              placeholder="약 종류"
              placeholderTextColor={colors.textMuted}
              style={styles.sheetInput}
              value={medicineName}
              onChangeText={setMedicineName}
            />
            <TextInput
              placeholder="복용량"
              placeholderTextColor={colors.textMuted}
              style={styles.sheetInput}
              value={medicineDose}
              onChangeText={setMedicineDose}
            />
            <Pressable style={styles.writeDiaryButton} onPress={saveQuickSheet}>
              <Text style={styles.writeDiaryButtonText}>저장하기</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <Modal visible={chatOpen} transparent animationType="fade" onRequestClose={() => setChatOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.chatModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>AI 육아 코치</Text>
              <Pressable onPress={() => setChatOpen(false)}>
                <X color={colors.primaryDark} size={22} />
              </Pressable>
            </View>
            <View style={styles.chatBotFace}>
              <Image source={require("../../../../assets/images/chatbot-home.png")} resizeMode="contain" style={styles.chatBotImage} />
            </View>
            <Text style={styles.chatQuestion}>리몽이의 기록을 바탕으로 무엇을 알려드릴까요?</Text>

            {summaryStatus === "loading" && <ActivityIndicator color={colors.primary} />}
            {summaryStatus === "error" && (
              <View style={styles.chatErrorBox}>
                <Text style={styles.chatErrorText}>오늘 요약을 불러오지 못했어요.</Text>
                <Pressable onPress={loadDailySummary}>
                  <Text style={styles.chatRetryText}>다시 시도</Text>
                </Pressable>
              </View>
            )}
            {summaryStatus === "success" && dailySummary && (
              <View style={[styles.chatBubble, dailySummary.recordCount === 0 && styles.chatBubbleMuted]}>
                <Text style={styles.chatBubbleText}>{dailySummary.summary}</Text>
                {dailySummary.highlights.length > 0 && (
                  <Text style={styles.chatHighlights}>{dailySummary.highlights.join(" · ")}</Text>
                )}
              </View>
            )}

            <View style={styles.chatInputRow}>
              <TextInput
                placeholder="예: 요즘 낮잠이 짧아졌는데 괜찮을까요?"
                placeholderTextColor={colors.textMuted}
                style={styles.chatInput}
                value={questionInput}
                onChangeText={setQuestionInput}
                onSubmitEditing={handleAskQuestion}
              />
              <Pressable
                style={styles.chatSendButton}
                onPress={handleAskQuestion}
                disabled={askStatus === "loading" || questionInput.trim().length === 0}
              >
                <Send color="#FFFFFF" size={16} />
              </Pressable>
            </View>

            {askStatus === "loading" && <ActivityIndicator color={colors.primary} />}
            {askStatus === "error" && (
              <View style={styles.chatErrorBox}>
                <Text style={styles.chatErrorText}>답변을 가져오지 못했어요.</Text>
                <Pressable onPress={handleAskQuestion}>
                  <Text style={styles.chatRetryText}>다시 시도</Text>
                </Pressable>
              </View>
            )}
            {askStatus === "success" && askResult && (
              <View style={[styles.chatBubble, askResult.source === "no_data" && styles.chatBubbleMuted]}>
                <Text style={styles.chatBubbleText}>{askResult.answer}</Text>
                <Text style={styles.chatSafetyText}>{askResult.safetyNotice}</Text>
              </View>
            )}

            <Text style={styles.subscriptionNote}>구독하면 기록 기반 개인화 답변과 주간 리포트를 받을 수 있어요.</Text>
          </View>
        </View>
      </Modal>
      <BabyProfileSheet visible={babyMenuOpen} onClose={() => setBabyMenuOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  pager: {
    flex: 1
  },
  page: {
    flex: 1
  },
  homeRoot: {
    flex: 1,
    gap: 13,
    paddingBottom: 18,
    paddingHorizontal: 18,
    paddingTop: 14
  },
  quickDismissLayer: {
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    zIndex: 20
  },
  statusPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  activeBabyName: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  myPageButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  mascotPanel: {
    flex: 1.15,
    justifyContent: "center",
    minHeight: 270,
    position: "relative"
  },
  mascotWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 228,
    justifyContent: "center",
    width: 174
  },
  mascotImage: {
    height: 228,
    width: 174
  },
  entryRow: {
    flexDirection: "row",
    gap: 8
  },
  entryButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 10
  },
  entryButtonText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  questionBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 13
  },
  questionText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 15,
    fontWeight: "700"
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  curationCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderLeftColor: colors.accent,
    borderLeftWidth: 4,
    borderRadius: 22,
    borderWidth: 1,
    padding: 13
  },
  curationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  curationTitle: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 15,
    fontWeight: "900"
  },
  curationText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 7
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 9
  },
  chip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    height: 30,
    lineHeight: 18,
    maxWidth: "100%",
    minWidth: 66,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    textAlign: "center"
  },
  chatFloat: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
    bottom: 18,
    height: 58,
    justifyContent: "center",
    position: "absolute",
    right: 20,
    width: 58
  },
  chatFloatImage: {
    height: 56,
    width: 56
  },
  cameraRoot: {
    backgroundColor: colors.background,
    flex: 1,
    paddingBottom: 16,
    paddingHorizontal: 12,
    paddingTop: 10
  },
  myPageRoot: {
    flex: 1
  },
  cameraTopOverlay: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 12,
    paddingHorizontal: 14,
    position: "absolute",
    right: 12,
    top: 0,
    zIndex: 10
  },
  cameraTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  cameraHeaderSpacer: {
    width: 42
  },
  cameraControl: {
    alignItems: "center",
    backgroundColor: "rgba(45,37,32,0.38)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  cameraStage: {
    backgroundColor: "#111111",
    borderRadius: 34,
    flex: 1,
    marginTop: 52,
    overflow: "hidden",
    position: "relative"
  },
  cameraView: {
    flex: 1
  },
  permissionBox: {
    alignItems: "center",
    backgroundColor: "#111111",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  permissionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 14
  },
  permissionText: {
    color: "rgba(255,255,255,0.76)",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 8,
    textAlign: "center"
  },
  permissionButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 999,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  permissionButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  shutterButton: {
    alignItems: "center",
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 5,
    height: 82,
    justifyContent: "center",
    width: 82
  },
  shutterInner: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 62,
    width: 62
  },
  flashButton: {
    alignItems: "center",
    backgroundColor: "rgba(45,37,32,0.68)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  flashButtonSpacer: {
    height: 58,
    width: 58
  },
  flipButton: {
    alignItems: "center",
    backgroundColor: "rgba(45,37,32,0.68)",
    borderColor: "rgba(255,255,255,0.24)",
    borderRadius: 999,
    borderWidth: 1,
    height: 58,
    justifyContent: "center",
    width: 58
  },
  cameraBottomDock: {
    alignItems: "center",
    bottom: 34,
    flexDirection: "row",
    justifyContent: "space-between",
    left: 34,
    position: "absolute",
    right: 34,
    zIndex: 5
  },
  recordPrompt: {
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 24,
    bottom: 28,
    left: 18,
    padding: 16,
    position: "absolute",
    right: 18,
    zIndex: 5
  },
  recordPromptTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900",
    textAlign: "center"
  },
  recordPromptText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center"
  },
  recordPromptActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  retakeButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12
  },
  retakeButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900"
  },
  addRecordButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12
  },
  addRecordButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  modalBackdrop: {
    backgroundColor: "rgba(45,37,32,0.36)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: 28,
    gap: 14,
    padding: 18
  },
  modalHeader: {
    alignItems: "center",
    alignSelf: "stretch",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  modalTitle: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: "900"
  },
  modalText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  sheetInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14
  },
  writeDiaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    padding: 14
  },
  writeDiaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  },
  chatModal: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 28,
    gap: 14,
    padding: 20
  },
  chatBotFace: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    height: 112,
    justifyContent: "center",
    width: 112
  },
  chatBotImage: {
    height: 112,
    width: 112
  },
  chatQuestion: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 25,
    textAlign: "center"
  },
  chatBubble: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    gap: 6,
    padding: 14,
    width: "100%"
  },
  chatBubbleMuted: {
    backgroundColor: colors.surfaceSoft
  },
  chatBubbleText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20
  },
  chatHighlights: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  chatSafetyText: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16
  },
  chatInputRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    width: "100%"
  },
  chatInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.primaryDark,
    flex: 1,
    fontSize: 14,
    minHeight: 44,
    paddingHorizontal: 14
  },
  chatSendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  chatErrorBox: {
    alignItems: "center",
    gap: 4,
    width: "100%"
  },
  chatErrorText: {
    color: colors.danger,
    fontSize: 13
  },
  chatRetryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  subscriptionNote: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  }
});
