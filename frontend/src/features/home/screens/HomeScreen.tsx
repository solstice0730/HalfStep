import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Camera, ChevronDown, ChevronRight, Flashlight, Send, User, X, Zap } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
  View,
  type ImageSourcePropType
} from "react-native";
import {
  PanGestureHandler,
  State,
  type PanGestureHandlerGestureEvent,
  type PanGestureHandlerStateChangeEvent
} from "react-native-gesture-handler";
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { BabyProfileSheet } from "@/features/baby/components/BabyProfileSheet";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { QuickLogMenu } from "@/features/home/components/QuickLogMenu";
import { TodaySummary, type TodayCounts } from "@/features/home/components/TodaySummary";
import { MyPageScreen } from "@/features/mypage/screens/MyPageScreen";
import { calculateBabyAge, type BabyProfile } from "@/features/home/services/babyProfileService";
import { DEFAULT_CURATION, getDashboard, type HomeCuration } from "@/features/home/services/homeService";
import { FeedingRecordModal } from "@/features/records/components/FeedingRecordModal";
import { SleepRecordModal } from "@/features/records/components/SleepRecordModal";
import { StoolRecordModal } from "@/features/records/components/StoolRecordModal";
import type { TimeValue } from "@/features/records/components/TimePickerField";
import { UrineRecordModal } from "@/features/records/components/UrineRecordModal";
import { addFeedingRecord, addSleepRecord, addStoolRecord, addUrineRecord, getTodayRecords } from "@/features/records/services/recordsService";
import type { DiaperAmount, FeedingType, StoolColor, StoolForm, UrineColor } from "@/features/records/types/records";
import { ApiRequestError } from "@/services/api/apiClient";
import { uploadImage, type LocalImage } from "@/services/api/uploadApi";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { Toast, useToast } from "@/shared/components/Toast";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { todayLocalIsoDate } from "@/shared/utils/date";

const todayDisplayDate = () =>
  new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

const pad2 = (value: string) => (value || "0").padStart(2, "0");
const buildIsoDateTime = (date: string, time: TimeValue) => `${date}T${pad2(time.hour)}:${pad2(time.minute)}:00`;

type HomeScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Home">,
  NativeStackScreenProps<AppStackParamList>
>;
type QuickSheetType = "medicine" | null;
type RecordModalType = "feeding" | "sleep" | "urine" | "stool" | null;

const RECORD_TILES: { type: Exclude<RecordModalType, null>; label: string; icon: ImageSourcePropType }[] = [
  { type: "feeding", label: "수유", icon: require("../../../../assets/images/quick-feed.png") },
  { type: "sleep", label: "수면", icon: require("../../../../assets/images/quick-sleep.png") },
  { type: "urine", label: "소변", icon: require("../../../../assets/images/quick-diaper.png") },
  { type: "stool", label: "대변", icon: require("../../../../assets/images/quick-diaper.png") }
];

const SAVED_TOAST: Record<Exclude<RecordModalType, null>, string> = {
  feeding: "수유 기록이 저장되고 오늘 통계에 반영됐어요",
  sleep: "수면 기록이 저장되고 오늘 통계에 반영됐어요",
  urine: "소변 기록이 저장되고 오늘 통계에 반영됐어요",
  stool: "대변 기록이 저장되고 오늘 통계에 반영됐어요"
};

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
        Animated.timing(bob, { duration: 1100, toValue: 1, useNativeDriver: true }),
        Animated.timing(bob, { duration: 1100, toValue: 0, useNativeDriver: true })
      ])
    );

    loop.start();
    return () => loop.stop();
  }, [bob]);

  const translateY = bob.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  const rotate = bob.interpolate({ inputRange: [0, 1], outputRange: ["-2deg", "2deg"] });

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

function RecordTile({ icon, label, onPress }: { icon: ImageSourcePropType; label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} 기록`} style={styles.tileFlex} onPress={onPress}>
      {({ pressed }) => (
        <GlassSurface radius={theme.radius.lg} intensity={26} noShadow style={pressed && styles.pressed} contentStyle={styles.tileContent}>
          <Image source={icon} resizeMode="contain" style={styles.tileIcon} />
          <Text style={styles.tileText}>{label}</Text>
        </GlassSurface>
      )}
    </Pressable>
  );
}

type AsyncStatus = "idle" | "loading" | "success" | "error";

export function HomeScreen({ navigation }: HomeScreenProps) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby, error: babyError, isLoading: isBabyLoading, refresh: refreshBabies } = useBaby();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const pagerRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);
  const cameraTranslateX = useRef(new Animated.Value(-screenWidth)).current;
  const myPageTranslateY = useRef(new Animated.Value(-screenHeight)).current;
  const [permission, requestPermission] = useCameraPermissions();
  const [quickOpen, setQuickOpen] = useState(false);
  const [myPageOpen, setMyPageOpen] = useState(false);
  const [quickSheet, setQuickSheet] = useState<QuickSheetType>(null);
  const [babyMenuOpen, setBabyMenuOpen] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);
  const [medicineName, setMedicineName] = useState("");
  const [medicineDose, setMedicineDose] = useState("");
  const [lastQuickRecord, setLastQuickRecord] = useState<string | null>(null);
  const [counts, setCounts] = useState<TodayCounts>({ feeding: 0, sleep: 0, diaper: 0, photos: 0 });
  const [curation, setCuration] = useState<HomeCuration>(DEFAULT_CURATION);
  const [activeRecordModal, setActiveRecordModal] = useState<RecordModalType>(null);
  const [saveStatus, setSaveStatus] = useState<AsyncStatus>("idle");
  const { message: toastMessage, showToast } = useToast();

  const babyProfile = useMemo<BabyProfile | null>(() => activeBaby ? ({
    id: activeBaby.id,
    name: activeBaby.name,
    birthDate: activeBaby.birthDate,
    ageDays: activeBaby.ageInDays
  }) : null, [activeBaby]);
  const profileStatus: AsyncStatus = isBabyLoading ? "loading" : babyError ? "error" : "success";

  // 대시보드가 오늘 요약 + 큐레이션을 함께 준다. 실패하면 기록 목록으로 요약만이라도 채운다.
  const loadDashboard = useCallback(async () => {
    if (!accessToken || !activeBaby) return;
    try {
      const dashboard = await getDashboard(accessToken, activeBaby.id);
      const summary = dashboard.todaySummary;
      setCounts({
        feeding: summary.feedingCount,
        sleep: summary.sleepCount,
        diaper: summary.urineCount + summary.stoolCount,
        photos: summary.photoCount
      });
      setCuration(dashboard.curation ?? DEFAULT_CURATION);
    } catch {
      try {
        const records = await getTodayRecords(accessToken, activeBaby.id, todayLocalIsoDate());
        setCounts({
          feeding: records.feeding.length,
          sleep: records.sleep.length,
          diaper: records.urine.length + records.stool.length,
          photos: 0
        });
      } catch {
        // 홈 요약은 부가 정보이므로 실패해도 화면은 계속 사용 가능해야 한다.
      }
    }
  }, [accessToken, activeBaby]);

  const refreshHome = loadDashboard;

  useFocusEffect(
    useCallback(() => {
      void refreshHome();
    }, [refreshHome])
  );

  const babyAge = babyProfile ? calculateBabyAge(babyProfile.birthDate) : null;

  // contentOffset only applies on the ScrollView's very first layout pass, which can race
  // ahead of a late/large initial measurement (e.g. tablets) and leave the pager showing the
  // blank left page. Force it explicitly whenever the measured width is known or changes.
  useEffect(() => {
    pagerRef.current?.scrollTo({ x: screenWidth, y: 0, animated: false });
  }, [screenWidth]);

  // --- 빠른 기록 저장 (영상 02): 홈 위에서 시트로 저장하고 즉시 요약·큐레이션을 갱신한다. ---
  const saveRecord = async (type: Exclude<RecordModalType, null>, request: () => Promise<unknown>): Promise<boolean> => {
    if (saveStatus === "loading") return false;
    setSaveStatus("loading");
    try {
      await request();
      setSaveStatus("success");
      setActiveRecordModal(null);
      showToast(SAVED_TOAST[type]);
      await refreshHome();
      return true;
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return false;
      }
      setSaveStatus("error");
      showToast(error instanceof ApiRequestError ? error.message : "기록을 저장하지 못했어요. 다시 시도해 주세요.");
      return false;
    }
  };

  const handleSaveFeeding = async (record: { time: TimeValue; feedingType: FeedingType; amountMl?: number; durationMinutes?: number }) => {
    if (!accessToken || !activeBaby) return false;
    return saveRecord("feeding", () => addFeedingRecord(accessToken, activeBaby.id, {
      occurredAt: buildIsoDateTime(todayLocalIsoDate(), record.time),
      feedingType: record.feedingType,
      amountMl: record.amountMl,
      durationMinutes: record.durationMinutes
    }));
  };

  const handleSaveSleep = async (record: { start: TimeValue; end: TimeValue }) => {
    if (!accessToken || !activeBaby) return false;
    return saveRecord("sleep", () => addSleepRecord(accessToken, activeBaby.id, {
      startedAt: buildIsoDateTime(todayLocalIsoDate(), record.start),
      endedAt: buildIsoDateTime(todayLocalIsoDate(), record.end)
    }));
  };

  const handleSaveUrine = async (record: { time: TimeValue; amount: DiaperAmount; color: UrineColor }) => {
    if (!accessToken || !activeBaby) return false;
    return saveRecord("urine", () => addUrineRecord(accessToken, activeBaby.id, {
      occurredAt: buildIsoDateTime(todayLocalIsoDate(), record.time),
      amount: record.amount,
      color: record.color
    }));
  };

  const handleSaveStool = async (record: { time: TimeValue; amount: DiaperAmount; color: StoolColor; form: StoolForm; photo?: LocalImage }) => {
    if (!accessToken || !activeBaby) return false;
    return saveRecord("stool", async () => {
      const photoUrl = record.photo ? await uploadImage(accessToken, record.photo) : undefined;
      return addStoolRecord(accessToken, activeBaby.id, {
        occurredAt: buildIsoDateTime(todayLocalIsoDate(), record.time),
        amount: record.amount,
        color: record.color,
        form: record.form,
        photoUrl
      });
    });
  };

  const openCamera = () => {
    setCameraOpen(true);
    cameraTranslateX.setValue(-screenWidth);
    requestAnimationFrame(() => {
      Animated.timing(cameraTranslateX, { duration: 220, toValue: 0, useNativeDriver: true }).start();
    });
  };

  const closeCamera = () => {
    Animated.timing(cameraTranslateX, { duration: 190, toValue: -screenWidth, useNativeDriver: true }).start(() => {
      setLastShot(null);
      setCameraOpen(false);
    });
  };

  const openMyPage = () => {
    setMyPageOpen(true);
    myPageTranslateY.setValue(-screenHeight);
    requestAnimationFrame(() => {
      Animated.timing(myPageTranslateY, { duration: 260, toValue: 0, useNativeDriver: true }).start();
    });
  };

  const closeMyPage = () => {
    Animated.timing(myPageTranslateY, { duration: 220, toValue: -screenHeight, useNativeDriver: true }).start(() => {
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

  const openRecordModal = (type: Exclude<RecordModalType, null>) => {
    closeQuickLog();
    setSaveStatus("idle");
    setActiveRecordModal(type);
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
            Animated.timing(cameraTranslateX, { duration: 150, toValue: 0, useNativeDriver: true }).start();
            return;
          }

          Animated.timing(cameraTranslateX, { duration: 160, toValue: -screenWidth, useNativeDriver: true }).start(() =>
            setCameraOpen(false)
          );
        },
        onPanResponderTerminate: () => {
          Animated.timing(cameraTranslateX, { duration: 160, toValue: -screenWidth, useNativeDriver: true }).start(() =>
            setCameraOpen(false)
          );
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

    Animated.spring(cameraTranslateX, { toValue: 0, useNativeDriver: true, friction: 9, tension: 80 }).start();
  };

  const renderHomeContent = (handlers?: ReturnType<typeof PanResponder.create>["panHandlers"]) => (
    <View style={[styles.page, { width: screenWidth }]} {...handlers}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.homeRoot}>
        {quickOpen && <Pressable style={styles.quickDismissLayer} onPress={closeQuickLog} />}
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="아기 프로필 변경" onPress={() => setBabyMenuOpen(true)}>
            <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.statusPill}>
              <Text numberOfLines={1} style={styles.activeBabyName}>{activeBaby?.name ?? "아기"}</Text>
              <ChevronDown color={colors.textMuted} size={18} />
            </GlassSurface>
          </Pressable>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="마이페이지 열기" accessibilityRole="button" onPress={openMyPage}>
              <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.myPageButton}>
                <User color={colors.primaryDark} size={19} />
              </GlassSurface>
            </Pressable>
            <QuickLogMenu
              open={quickOpen}
              onToggle={() => setQuickOpen((open) => !open)}
              onFeeding={() => openRecordModal("feeding")}
              onSleep={() => openRecordModal("sleep")}
              onDiaper={() => openRecordModal("stool")}
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
          counts={counts}
          lastQuickRecord={lastQuickRecord}
        />

        <View style={styles.tileRow}>
          {RECORD_TILES.map((tile) => (
            <RecordTile key={tile.type} icon={tile.icon} label={tile.label} onPress={() => openRecordModal(tile.type)} />
          ))}
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="육아코치에게 물어보기" onPress={() => navigation.navigate("AiChat")}>
          <GlassSurface radius={theme.radius.xxl} intensity={30} contentStyle={styles.questionBox}>
            <Text style={styles.questionText}>아기가 전해줬으면 하는 말이 있나요?</Text>
            <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.sendButton}>
              <Send color="#FFFFFF" size={18} />
            </LinearGradient>
          </GlassSurface>
        </Pressable>

        <Pressable accessibilityRole="button" accessibilityLabel="주간 리포트 열기" onPress={() => navigation.navigate("WeeklyReport")}>
          {({ pressed }) => (
            <GlassSurface radius={theme.radius.xl} intensity={32} style={pressed && styles.pressed} contentStyle={styles.curationCard}>
              <View style={styles.curationHeader}>
                <Text style={styles.curationTitle}>{curation.headline}</Text>
              </View>
              <Text style={styles.curationText}>{curation.text}</Text>
              <View style={styles.chipRow}>
                {curation.chips.map((chip) => (
                  <Text key={chip} numberOfLines={1} style={styles.chip}>#{chip}</Text>
                ))}
              </View>
              <View style={styles.curationFooter}>
                <Text style={styles.curationFooterText}>주간 리포트 보기</Text>
                <ChevronRight color={colors.primary} size={14} />
              </View>
            </GlassSurface>
          )}
        </Pressable>

        {/* 탭바와 플로팅 챗봇 버튼이 큐레이션 카드를 가리지 않도록 여유를 둔다. */}
        <View style={{ height: tabBarHeight + 72 }} />
      </ScrollView>
    </View>
  );

  return (
    <View style={styles.root}>
      <GradientBackdrop />
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
              <Pressable onPress={closeCamera}>
                <GlassSurface radius={theme.radius.pill} intensity={30} onDark noShadow contentStyle={styles.cameraControl}>
                  <X color="#FFFFFF" size={25} />
                </GlassSurface>
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
                  <Pressable onPress={requestPermission}>
                    <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.permissionButton}>
                      <Text style={styles.permissionButtonText}>권한 허용하기</Text>
                    </LinearGradient>
                  </Pressable>
                </View>
              )}
              {!lastShot && permission?.granted && (
                <View style={styles.cameraBottomDock}>
                  {facing === "back" ? (
                    <Pressable onPress={() => setFlashOn((value) => !value)}>
                      <GlassSurface radius={theme.radius.pill} intensity={30} onDark noShadow contentStyle={styles.flashButton}>
                        {flashOn ? <Zap color="#F5C842" size={22} /> : <Flashlight color="#FFFFFF" size={21} />}
                      </GlassSurface>
                    </Pressable>
                  ) : (
                    <View style={styles.flashButtonSpacer} />
                  )}
                  <Pressable style={styles.shutterButton} onPress={takePhoto}>
                    <View style={styles.shutterInner} />
                  </Pressable>
                  <Pressable onPress={() => setFacing((value) => (value === "back" ? "front" : "back"))}>
                    <GlassSurface radius={theme.radius.pill} intensity={30} onDark noShadow contentStyle={styles.flipButton}>
                      <Camera color="#FFFFFF" size={23} />
                    </GlassSurface>
                  </Pressable>
                </View>
              )}
              {lastShot && (
                <GlassSurface radius={theme.radius.xxl} intensity={50} style={styles.recordPromptShell} contentStyle={styles.recordPrompt}>
                  <Text style={styles.recordPromptTitle}>이 사진을 일기에 올릴까요?</Text>
                  <Text style={styles.recordPromptText}>일기 재료 화면에 사진이 자동으로 추가돼요.</Text>
                  <View style={styles.recordPromptActions}>
                    <Pressable style={styles.retakeButton} onPress={() => setLastShot(null)}>
                      <Text style={styles.retakeButtonText}>다시 찍기</Text>
                    </Pressable>
                    <Pressable style={styles.addRecordButtonWrap} onPress={addShotToRecord}>
                      <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.addRecordButton}>
                        <Text style={styles.addRecordButtonText}>일기 쓰기</Text>
                      </LinearGradient>
                    </Pressable>
                  </View>
                </GlassSurface>
              )}
            </View>
          </Animated.View>
        </PanGestureHandler>
      </Modal>

      <Modal animationType="none" onRequestClose={closeMyPage} transparent visible={myPageOpen}>
        <SafeAreaProvider>
          <Animated.View style={[styles.myPageRoot, { transform: [{ translateY: myPageTranslateY }] }]}>
            <MyPageScreen onClose={closeMyPage} />
          </Animated.View>
        </SafeAreaProvider>
      </Modal>

      {currentPage === 1 && (
        <Pressable
          accessibilityLabel="육아코치 열기"
          style={[styles.chatFloat, { bottom: tabBarHeight + 14 }]}
          onPress={() => navigation.navigate("AiChat")}
        >
          <Image source={require("../../../../assets/images/chatbot-home.png")} resizeMode="contain" style={styles.chatFloatImage} />
        </Pressable>
      )}

      <Modal visible={quickSheet !== null} transparent animationType="slide" onRequestClose={() => setQuickSheet(null)}>
        <View style={styles.modalBackdrop}>
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
          <GlassSurface radius={theme.radius.xxl} intensity={55} style={styles.sheetShell} contentStyle={styles.sheet}>
            <View style={styles.sheetGrabber} />
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
            <Pressable onPress={saveQuickSheet}>
              <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.writeDiaryButton}>
                <Text style={styles.writeDiaryButtonText}>저장하기</Text>
              </LinearGradient>
            </Pressable>
          </GlassSurface>
        </View>
      </Modal>

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

      <BabyProfileSheet visible={babyMenuOpen} onClose={() => setBabyMenuOpen(false)} />
      <Toast message={toastMessage} bottom={tabBarHeight + 16} />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safeArea: {
    flex: 1
  },
  pager: {
    flex: 1
  },
  page: {
    flex: 1
  },
  homeRoot: {
    flexGrow: 1,
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
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  activeBabyName: {
    color: colors.primaryDark,
    ...typography.subheadEmphasized
  },
  myPageButton: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    width: 46
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  mascotPanel: {
    justifyContent: "center",
    minHeight: 250,
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
  tileRow: {
    flexDirection: "row",
    gap: 8
  },
  tileFlex: {
    flex: 1
  },
  pressed: {
    opacity: 0.72
  },
  tileContent: {
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    paddingVertical: 12
  },
  tileIcon: {
    height: 26,
    width: 28
  },
  tileText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800"
  },
  questionBox: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 13
  },
  questionText: {
    color: colors.textMuted,
    flex: 1,
    ...typography.subheadEmphasized
  },
  sendButton: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  curationCard: {
    padding: 14
  },
  curationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  curationTitle: {
    color: colors.primaryDark,
    flex: 1,
    ...typography.subheadEmphasized
  },
  curationText: {
    color: colors.textMuted,
    ...typography.caption1,
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
    borderRadius: theme.radius.pill,
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
  curationFooter: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    justifyContent: "flex-end",
    marginTop: 10
  },
  curationFooterText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  chatFloat: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderColor: "transparent",
    borderRadius: 999,
    borderWidth: 0,
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
    alignItems: "center",
    borderRadius: theme.radius.pill,
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 12
  },
  permissionButtonText: {
    color: "#FFFFFF",
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
  recordPromptShell: {
    bottom: 28,
    left: 18,
    position: "absolute",
    right: 18,
    zIndex: 5
  },
  recordPrompt: {
    padding: 18
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
  addRecordButtonWrap: {
    flex: 1
  },
  addRecordButton: {
    alignItems: "center",
    borderRadius: theme.radius.pill,
    paddingVertical: 12
  },
  addRecordButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 16
  },
  sheetShell: {},
  sheetGrabber: {
    alignSelf: "center",
    backgroundColor: "rgba(47,41,38,0.22)",
    borderRadius: theme.radius.pill,
    height: 4,
    marginBottom: 4,
    width: 36
  },
  sheet: {
    gap: 14,
    padding: 20
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
  sheetInput: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14
  },
  writeDiaryButton: {
    alignItems: "center",
    borderRadius: theme.radius.lg,
    padding: 14
  },
  writeDiaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  }
});
