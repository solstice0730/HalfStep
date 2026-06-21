import { CameraView, useCameraPermissions } from "expo-camera";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  Camera,
  ChevronDown,
  Flashlight,
  Send,
  Sparkles,
  X,
  Zap
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
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
import { colors } from "@/shared/constants/colors";

const screenWidth = Dimensions.get("window").width;
const babyDay = 45;

const curation = {
  title: `생후 ${babyDay}일 맞춤 큐레이션`,
  text: "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. 오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요.",
  chips: ["수유 신호", "낮잠 루틴", "배변 체크"]
};

type HomeScreenProps = BottomTabScreenProps<MainTabParamList, "Home">;
type QuickSheetType = "feed" | "medicine" | null;

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

export function HomeScreen({ navigation }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const pagerRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);
  const cameraTranslateX = useRef(new Animated.Value(-screenWidth)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSheet, setQuickSheet] = useState<QuickSheetType>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [sleepStartedAt, setSleepStartedAt] = useState<Date | null>(null);
  const [diaperCount, setDiaperCount] = useState(0);
  const [lastQuickRecord, setLastQuickRecord] = useState("최근 기록 없음");
  const [feedType, setFeedType] = useState("분유");
  const [feedAmount, setFeedAmount] = useState("");
  const [medicineName, setMedicineName] = useState("");
  const [medicineDose, setMedicineDose] = useState("");

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

  const recordDiaper = () => {
    const now = new Date();
    setDiaperCount((count) => count + 1);
    setLastQuickRecord(`배변 1회 · ${formatRecordTime(now)}`);
    closeQuickLog();
  };

  const toggleSleep = () => {
    const now = new Date();
    setSleepStartedAt((startedAt) => {
      setLastQuickRecord(`${startedAt ? "수면 종료" : "수면 시작"} · ${formatRecordTime(now)}`);
      return startedAt ? null : now;
    });
    closeQuickLog();
  };

  const openQuickSheet = (type: QuickSheetType) => {
    setQuickSheet(type);
    closeQuickLog();
  };

  const saveQuickSheet = () => {
    const now = new Date();
    if (quickSheet === "feed") {
      setLastQuickRecord(`${feedType} ${feedAmount || "기록"} · ${formatRecordTime(now)}`);
    }
    if (quickSheet === "medicine") {
      setLastQuickRecord(`${medicineName || "약"} ${medicineDose || "복용"} · ${formatRecordTime(now)}`);
    }
    setQuickSheet(null);
    setFeedAmount("");
    setMedicineName("");
    setMedicineDose("");
  };

  const homeSwipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) => gesture.dx > 12 && Math.abs(gesture.dy) < 28,
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
    [cameraTranslateX]
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
    <View style={styles.page} {...handlers}>
      <View style={styles.homeRoot}>
        {quickOpen && <Pressable style={styles.quickDismissLayer} onPress={closeQuickLog} />}
        <View style={styles.header}>
          <Pressable style={styles.statusPill}>
            <Text style={styles.statusText}>함께 자라는 중</Text>
            <ChevronDown color={colors.textMuted} size={18} />
          </Pressable>
          <View style={styles.headerActions}>
            <View style={styles.quickHeaderWrap}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="빠른 기록 열기"
                style={[styles.quickLogMain, quickOpen && styles.quickLogMainActive]}
                onPress={() => setQuickOpen((open) => !open)}
              >
                {quickOpen ? (
                  <X color="#FFFFFF" size={20} />
                ) : (
                  <Image source={require("../../../../assets/images/quick-plus.png")} resizeMode="contain" style={styles.quickLogMainImage} />
                )}
              </Pressable>
              {quickOpen && (
                <View style={styles.quickLogMenu}>
                  <Pressable style={styles.quickLogItem} onPress={() => openQuickSheet("feed")}>
                    <Image source={require("../../../../assets/images/quick-feed.png")} resizeMode="contain" style={styles.quickLogIcon} />
                    <Text style={styles.quickLogText}>수유</Text>
                  </Pressable>
                  <Pressable style={styles.quickLogItem} onPress={toggleSleep}>
                    <Image source={require("../../../../assets/images/quick-sleep.png")} resizeMode="contain" style={styles.quickLogIcon} />
                    <Text style={styles.quickLogText}>{sleepStartedAt ? "기상" : "수면"}</Text>
                  </Pressable>
                  <Pressable style={styles.quickLogItem} onPress={recordDiaper}>
                    <Image source={require("../../../../assets/images/quick-diaper.png")} resizeMode="contain" style={styles.quickLogIcon} />
                    <Text style={styles.quickLogText}>배변</Text>
                  </Pressable>
                  <Pressable style={styles.quickLogItem} onPress={() => openQuickSheet("medicine")}>
                    <Image source={require("../../../../assets/images/quick-medicine.png")} resizeMode="contain" style={styles.quickLogIcon} />
                    <Text style={styles.quickLogText}>약</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.mascotPanel}>
          <BabyMascot />
        </View>

        <View style={styles.dayBlock}>
          <Text style={styles.babyName}>리몽이와 만난 지</Text>
          <Text style={styles.dayText}>{babyDay}일째</Text>
          <Text style={styles.quickStatusText}>
            배변 {diaperCount}회 · {sleepStartedAt ? "수면 중" : "깨어 있음"}
          </Text>
          <Text style={styles.quickStatusText}>{lastQuickRecord}</Text>
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
        <View style={styles.page} />
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
                  <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} />
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
                  <Pressable style={styles.flashButton} onPress={() => setFlashOn((value) => !value)}>
                    {flashOn ? <Zap color="#F5C842" size={22} /> : <Flashlight color="#FFFFFF" size={21} />}
                  </Pressable>
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

      {currentPage === 1 && (
        <Pressable style={styles.chatFloat} onPress={() => setChatOpen(true)}>
          <Image source={require("../../../../assets/images/chatbot-home.png")} resizeMode="contain" style={styles.chatFloatImage} />
        </Pressable>
      )}

      <Modal visible={quickSheet !== null} transparent animationType="slide" onRequestClose={() => setQuickSheet(null)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{quickSheet === "feed" ? "수유 기록" : "약 기록"}</Text>
              <Pressable onPress={() => setQuickSheet(null)}>
                <X color={colors.primaryDark} size={22} />
              </Pressable>
            </View>
            {quickSheet === "feed" ? (
              <>
                <View style={styles.segmentInputRow}>
                  {["분유", "모유"].map((type) => (
                    <Pressable
                      key={type}
                      style={[styles.segmentInput, feedType === type && styles.segmentInputActive]}
                      onPress={() => setFeedType(type)}
                    >
                      <Text style={[styles.segmentInputText, feedType === type && styles.segmentInputTextActive]}>{type}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  keyboardType="number-pad"
                  placeholder="수유량 또는 시간"
                  placeholderTextColor={colors.textMuted}
                  style={styles.sheetInput}
                  value={feedAmount}
                  onChangeText={setFeedAmount}
                />
              </>
            ) : (
              <>
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
              </>
            )}
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
            <Text style={styles.chatBubble}>예: 요즘 낮잠이 짧아졌는데 괜찮을까요?</Text>
            <Text style={styles.subscriptionNote}>구독하면 기록 기반 개인화 답변과 주간 리포트를 받을 수 있어요.</Text>
          </View>
        </View>
      </Modal>
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
    flex: 1,
    width: screenWidth
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
  statusText: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "900"
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
  quickHeaderWrap: {
    alignItems: "center",
    gap: 8,
    position: "relative",
    zIndex: 30
  },
  quickLogMenu: {
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: 0,
    top: 54,
    width: 92
  },
  quickLogItem: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 3,
    height: 44,
    justifyContent: "center",
    width: 64
  },
  quickLogIcon: {
    height: 24,
    width: 26
  },
  quickLogText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900"
  },
  quickLogMain: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 3,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  quickLogMainActive: {
    backgroundColor: colors.primary
  },
  quickLogMainImage: {
    height: 28,
    width: 28
  },
  dayBlock: {
    marginTop: -2
  },
  babyName: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  dayText: {
    color: colors.primaryDark,
    fontSize: 46,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 52
  },
  quickStatusText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2
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
  segmentInputRow: {
    flexDirection: "row",
    gap: 8
  },
  segmentInput: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flex: 1,
    minHeight: 44,
    justifyContent: "center"
  },
  segmentInputActive: {
    backgroundColor: colors.primary
  },
  segmentInputText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "900"
  },
  segmentInputTextActive: {
    color: "#FFFFFF"
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
    color: colors.textMuted,
    fontSize: 14,
    padding: 14,
    width: "100%"
  },
  subscriptionNote: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center"
  }
});
