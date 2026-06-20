import { CameraView, useCameraPermissions } from "expo-camera";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import {
  Camera,
  ChevronDown,
  Flashlight,
  PenLine,
  RotateCcw,
  Send,
  Sparkles,
  X,
  Zap
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { colors } from "@/shared/constants/colors";

const screenWidth = Dimensions.get("window").width;
const babyDay = 45;

const curation = {
  title: `생후 ${babyDay}일 맞춤 큐레이션`,
  text: "이 시기에는 수유 텀과 낮잠 리듬이 조금씩 달라져요. 오늘은 수유 간격, 낮잠 길이, 배변 변화를 같이 확인해보세요.",
  chips: ["수유 신호", "낮잠 루틴", "배변 체크"]
};

const chatbotHomeImage = require("../../../../assets/images/chatbot-home.png");

type HomeScreenProps = BottomTabScreenProps<MainTabParamList, "Home">;

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
  const pagerRef = useRef<ScrollView>(null);
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [quickOpen, setQuickOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [facing, setFacing] = useState<"front" | "back">("back");
  const [flashOn, setFlashOn] = useState(false);
  const [lastShot, setLastShot] = useState<string | null>(null);

  const openCamera = () => {
    pagerRef.current?.scrollTo({ x: 0, animated: true });
  };

  const closeCamera = () => {
    pagerRef.current?.scrollTo({ x: screenWidth, animated: true });
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setCurrentPage(Math.round(event.nativeEvent.contentOffset.x / screenWidth));
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        ref={pagerRef}
        horizontal
        pagingEnabled
        bounces={false}
        contentOffset={{ x: screenWidth, y: 0 }}
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onMomentumScrollEnd={handleMomentumEnd}
        style={styles.pager}
      >
        <View style={styles.page}>
          <View style={styles.cameraRoot}>
            <View style={styles.cameraTopOverlay}>
              <Pressable style={styles.cameraControl} onPress={closeCamera}>
                <X color="#FFFFFF" size={25} />
              </Pressable>
              <Text style={styles.cameraTitle}>오늘 사진 기록</Text>
              <View style={styles.cameraTopActions}>
                <Pressable style={styles.cameraControl} onPress={() => setFlashOn((value) => !value)}>
                  {flashOn ? <Zap color="#F5C842" size={22} /> : <Flashlight color="#FFFFFF" size={21} />}
                </Pressable>
                <Pressable style={styles.cameraControl} onPress={() => setFacing((value) => (value === "back" ? "front" : "back"))}>
                  <RotateCcw color="#FFFFFF" size={22} />
                </Pressable>
              </View>
            </View>

            <View style={styles.cameraStage}>
              {permission?.granted ? (
                <CameraView ref={cameraRef} style={styles.cameraView} facing={facing} />
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
            </View>

            <View style={styles.cameraBottom}>
              {lastShot ? (
                <View style={styles.recordPrompt}>
                  <Image source={{ uri: lastShot }} style={styles.shotPreview} />
                  <Text style={styles.recordPromptTitle}>방금 찍은 사진으로 일기를 쓸까요?</Text>
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
              ) : (
                <View style={styles.capturePanel}>
                  <Pressable style={styles.shutterButton} onPress={takePhoto}>
                    <View style={styles.shutterInner} />
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.page}>
          <View style={styles.homeRoot}>
            <View style={styles.header}>
              <Pressable style={styles.statusPill}>
                <Text style={styles.statusText}>함께 자라는 중</Text>
                <ChevronDown color={colors.textMuted} size={18} />
              </Pressable>
              <View style={styles.headerActions}>
                <Pressable style={styles.quickButton} onPress={() => setQuickOpen(true)}>
                  <PenLine color="#FFFFFF" size={18} />
                </Pressable>
                <Pressable style={styles.cameraButton} onPress={openCamera}>
                  <Camera color={colors.primaryDark} size={18} />
                </Pressable>
              </View>
            </View>

            <View style={styles.mascotPanel}>
              <BabyMascot />
            </View>

            <View style={styles.dayBlock}>
              <Text style={styles.babyName}>리몽이와 만난 지</Text>
              <Text style={styles.dayText}>{babyDay}일째</Text>
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
                  <Text key={chip} style={styles.chip}>#{chip}</Text>
                ))}
              </View>
            </View>

          </View>
        </View>
      </ScrollView>

      {currentPage === 1 && (
        <View style={styles.pageDots}>
          <View style={[styles.pageDot, styles.pageDotActive]} />
          <View style={styles.pageDot} />
        </View>
      )}

      {currentPage === 1 && (
        <Pressable style={styles.chatFloat} onPress={() => setChatOpen(true)}>
          <Image source={chatbotHomeImage} resizeMode="contain" style={styles.chatFloatImage} />
        </Pressable>
      )}

      <Modal visible={quickOpen} transparent animationType="slide" onRequestClose={() => setQuickOpen(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>빠른 기록하기</Text>
              <Pressable onPress={() => setQuickOpen(false)}>
                <X color={colors.primaryDark} size={22} />
              </Pressable>
            </View>
            <Text style={styles.modalText}>오늘의 순간을 일기로 남겨보세요. 기록 탭에서 사진과 함께 작성할 수 있어요.</Text>
            <Pressable style={styles.writeDiaryButton} onPress={() => {
              setQuickOpen(false);
              navigation.navigate("Records", undefined);
            }}>
              <Text style={styles.writeDiaryButtonText}>일기 쓰러가기</Text>
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
              <Image source={chatbotHomeImage} resizeMode="contain" style={styles.chatBotImage} />
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
    gap: 16,
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 16
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  statusPill: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  statusText: {
    color: colors.primaryDark,
    fontSize: 24,
    fontWeight: "600",
    lineHeight: 32
  },
  headerActions: {
    flexDirection: "row",
    gap: 8
  },
  quickButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  cameraButton: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  mascotPanel: {
    flex: 1.15,
    justifyContent: "center",
    minHeight: 304
  },
  mascotWrap: {
    alignItems: "center",
    alignSelf: "center",
    height: 300,
    justifyContent: "center",
    width: 228
  },
  mascotImage: {
    height: 300,
    width: 228
  },
  mascotBody: {
    alignItems: "center",
    backgroundColor: "#F9BE9F",
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 58,
    borderWidth: 4,
    height: 132,
    justifyContent: "flex-start",
    marginTop: 36,
    width: 116
  },
  mascotHead: {
    alignItems: "center",
    backgroundColor: "#F7B891",
    borderRadius: 64,
    height: 118,
    justifyContent: "center",
    marginTop: -62,
    width: 118
  },
  hairCurl: {
    borderColor: colors.primaryDark,
    borderLeftWidth: 0,
    borderRadius: 18,
    borderTopWidth: 3,
    height: 22,
    position: "absolute",
    top: -6,
    transform: [{ rotate: "-18deg" }],
    width: 28
  },
  ear: {
    backgroundColor: "#F2A783",
    borderRadius: 999,
    height: 24,
    position: "absolute",
    top: 48,
    width: 18
  },
  leftEar: {
    left: -7
  },
  rightEar: {
    right: -7
  },
  cheek: {
    backgroundColor: "rgba(255,159,142,0.5)",
    borderRadius: 999,
    height: 14,
    position: "absolute",
    top: 68,
    width: 18
  },
  leftCheek: {
    left: 22
  },
  rightCheek: {
    right: 22
  },
  eye: {
    backgroundColor: colors.primaryDark,
    borderRadius: 999,
    height: 7,
    position: "absolute",
    top: 54,
    width: 7
  },
  leftEye: {
    left: 38
  },
  rightEye: {
    right: 38
  },
  mouth: {
    borderBottomColor: colors.primaryDark,
    borderBottomWidth: 3,
    borderRadius: 999,
    height: 18,
    position: "absolute",
    top: 62,
    width: 28
  },
  bow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 2,
    position: "absolute",
    right: 10,
    top: 12,
    transform: [{ rotate: "20deg" }]
  },
  bowWing: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    height: 16,
    width: 18
  },
  bowCenter: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 10,
    width: 10
  },
  diaper: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    bottom: 16,
    height: 36,
    position: "absolute",
    width: 70
  },
  arm: {
    backgroundColor: "#F7B891",
    borderRadius: 999,
    height: 22,
    position: "absolute",
    top: 28,
    width: 48
  },
  leftArm: {
    left: -28,
    transform: [{ rotate: "-28deg" }]
  },
  rightArm: {
    right: -30,
    transform: [{ rotate: "24deg" }]
  },
  leg: {
    backgroundColor: "#F2A783",
    borderRadius: 999,
    bottom: -8,
    height: 26,
    position: "absolute",
    width: 34
  },
  leftLeg: {
    left: 22,
    transform: [{ rotate: "16deg" }]
  },
  rightLeg: {
    right: 22,
    transform: [{ rotate: "-16deg" }]
  },
  dayBlock: {
    marginTop: -2
  },
  babyName: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24
  },
  dayText: {
    color: colors.primaryDark,
    fontSize: 42,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 52
  },
  questionBox: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 28,
    flexDirection: "row",
    gap: 12,
    minHeight: 52,
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  questionText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 22
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
    borderLeftWidth: 3,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16
  },
  curationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  curationTitle: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24
  },
  curationText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  chip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    paddingHorizontal: 10,
    paddingVertical: 7
  },
  pageDots: {
    alignItems: "center",
    bottom: 8,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0
  },
  pageDot: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 5,
    width: 5
  },
  pageDotActive: {
    backgroundColor: colors.primary,
    width: 16
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
    flex: 1
  },
  cameraTopOverlay: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    left: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: 10
  },
  cameraTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24
  },
  cameraTopActions: {
    flexDirection: "row",
    gap: 10
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
    borderRadius: 24,
    flex: 1,
    margin: 20,
    marginTop: 66,
    overflow: "hidden"
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
    fontWeight: "600",
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
    minHeight: 44,
    paddingHorizontal: 20,
    paddingVertical: 12
  },
  permissionButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "600"
  },
  cameraBottom: {
    backgroundColor: colors.background,
    paddingBottom: 26,
    paddingHorizontal: 20,
    paddingTop: 18
  },
  capturePanel: {
    alignItems: "center",
    justifyContent: "center"
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
  recordPrompt: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16
  },
  shotPreview: {
    alignSelf: "center",
    borderRadius: 18,
    height: 92,
    marginBottom: 12,
    width: 72
  },
  recordPromptTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
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
    minHeight: 44,
    paddingVertical: 12
  },
  retakeButtonText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600"
  },
  addRecordButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 999,
    flex: 1,
    minHeight: 44,
    paddingVertical: 12
  },
  addRecordButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600"
  },
  modalBackdrop: {
    backgroundColor: "rgba(45,37,32,0.36)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 20
  },
  sheet: {
    backgroundColor: colors.background,
    borderRadius: 24,
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
    fontWeight: "600",
    lineHeight: 26
  },
  modalText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22
  },
  writeDiaryButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 16,
    minHeight: 48,
    padding: 14
  },
  writeDiaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  chatModal: {
    alignItems: "center",
    backgroundColor: colors.background,
    borderRadius: 24,
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
    fontWeight: "600",
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
    fontWeight: "600",
    textAlign: "center"
  }
});
