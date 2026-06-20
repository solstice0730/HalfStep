import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { Camera, ChevronLeft, ImagePlus, PenLine, Save, X } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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

import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { colors } from "@/shared/constants/colors";
import { StoryCarousel } from "@/features/records/components/DiaryCarousel";

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
const samplePhoto = "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop";

// 30일 전체에 고유한 한국어 더미 데이터 및 Unsplash 이미지 배치
const initialStories: Record<number, Story> = {
  1: {
    title: "첫 만남의 설렘",
    text: "처음 눈을 마주치고 조심스럽게 안아보았던 순간. 세상에서 가장 작고 소중한 천사를 만난 날이다.",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop",
    summary: ["아기", "첫만남", "감동"]
  },
  2: {
    title: "새근새근 곤히 자는 모습",
    text: "작은 숨소리를 내며 깊이 잠든 아기의 모습이 천사 같다. 하루 종일 보고 있어도 질리지 않는 풍경.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["낮잠", "천사", "평온"]
  },
  3: {
    title: "조심스러운 손길",
    text: "엄지손가락을 꼭 쥐는 작은 아기 손. 이 조그만 손이 앞으로 맞이할 큰 세상이 기대된다.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["아기손", "약속", "사랑"]
  },
  4: {
    title: "목욕하며 시원해하는 아침",
    text: "처음엔 물을 무서워하더니, 따뜻한 물이 닿자 이내 기분 좋게 발을 휘저으며 웃어주었다.",
    image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop",
    summary: ["목욕", "개운", "아침"]
  },
  5: {
    title: "처음으로 길게 웃은 날",
    text: "아침 수유 후 눈을 맞추며 오래 웃었어요. 웃는 시간이 길어져 가족 모두가 행복에 젖은 날.",
    image: "https://images.unsplash.com/photo-1442458370899-ae20e367c5d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["웃음", "수유", "가족"]
  },
  6: {
    title: "오후의 나른한 독서 시간",
    text: "그림책을 읽어주니 옹알이를 하며 반응한다. 눈동자가 이리저리 바쁘게 움직이는 것이 신기하다.",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop",
    summary: ["그림책", "옹알이", "오후"]
  },
  7: {
    title: "초록빛 가득한 창가 옆",
    text: "햇살이 쏟아지는 창가에 누워 모빌을 바라본다. 반짝이는 바람과 초록 나무를 꽤 오랫동안 감상했다.",
    image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["창가", "햇살", "모빌"]
  },
  8: {
    title: "기분 좋은 옹알이 잔치",
    text: "오늘따라 목소리가 우렁차고 옹알이가 많다. 무슨 말을 하고 싶은 걸까? 매 순간 귀 기울여 듣게 된다.",
    image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1200&auto=format&fit=crop",
    summary: ["옹알이", "대화", "행복"]
  },
  9: {
    title: "유모차 타고 동네 첫 산책",
    text: "유모차에 흔들려 기분 좋게 밖을 구경하다가 이내 조용히 잠이 들었다. 시원한 바람이 불어 상쾌했던 오후.",
    image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
    summary: ["산책", "유모차", "바람"]
  },
  10: {
    title: "햇볕 아래 미소가 많았던 날",
    text: "방긋 웃는 시간이 길어졌고, 눈맞춤도 더 자연스러워졌어요. 햇살처럼 따뜻하고 투명한 미소.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["미소", "햇살", "성장"]
  },
  11: {
    title: "엄마의 노래 선물",
    text: "자장가를 조용히 불러주니 가만히 눈을 감고 듣는다. 음악을 사랑하는 평화로운 아기로 자라나길.",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop",
    summary: ["자장가", "노래", "평화"]
  },
  12: {
    title: "아빠와 함께 뒹굴뒹굴",
    text: "퇴근한 아빠 배 위에서 한참을 편안하게 안겨 놀았다. 아빠를 알아보는 듯 다정하게 웃어주는 아기.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["아빠랑", "교감", "저녁"]
  },
  13: {
    title: "발가락 힘주기 놀이",
    text: "자기 발가락을 꼼지락거리며 만지는 것이 재미있는지 집중해서 쳐다본다. 신체 인지 능력이 자라나고 있다.",
    image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop",
    summary: ["발가락", "놀이", "신체"]
  },
  14: {
    title: "터미타임 기적의 순간",
    text: "고개를 영차 들고 꽤 오랫동안 버텼다! 힘을 모아 으쌰 으쌰 노력하는 모습이 기특하고 대견했다.",
    image: "https://images.unsplash.com/photo-1442458370899-ae20e367c5d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["터미타임", "기적", "응원"]
  },
  15: {
    title: "알록달록 모빌의 매력",
    text: "천천히 돌아가는 컬러 모빌을 잡으려 손을 뻗어본다. 매일 조금씩 세상을 인지해 나간다.",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop",
    summary: ["모빌", "호기심", "색깔"]
  },
  16: {
    title: "시원한 비 내리는 날의 실내 놀이",
    text: "창밖에 떨어지는 빗소리를 함께 들으며 집 안에서 조용히 클래식을 들었다. 빗소리마저 흥미로워한다.",
    image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["빗소리", "음악", "안정"]
  },
  17: {
    title: "예쁜 꽃무늬 새 옷 입은 날",
    text: "선물 받은 예쁜 우주복을 입혔는데 어쩜 이렇게 찰떡인지! 사랑스러운 인형처럼 너무 예뻤다.",
    image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1200&auto=format&fit=crop",
    summary: ["새옷", "선물", "인형"]
  },
  18: {
    title: "낮잠 리듬을 찾은 날",
    text: "오전 낮잠과 오후 낮잠 간격이 안정적으로 이어졌어요. 보채지 않고 스스로 누워 잠드는 모습이 신통방통.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["낮잠", "리듬", "컨디션"]
  },
  19: {
    title: "오랜만에 기분 좋은 꿀잠",
    text: "깨지 않고 푹 자서 그런지 눈 뜨자마자 활기찬 목소리로 온 집안에 신호를 보낸다. 아침 컨디션 최고!",
    image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
    summary: ["꿀잠", "굿모닝", "최고"]
  },
  20: {
    title: "발장구치기 1등 아기",
    text: "침대에 누워 하늘로 다리를 들어 폭풍 발장구를 쳤다. 씩씩하게 자라는 다리 근육이 기특하다.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["발장구", "튼튼", "운동"]
  },
  21: {
    title: "오후의 노을과 눈빛",
    text: "붉게 물드는 창밖 노을을 품에 안겨 가만히 쳐다보았다. 작은 눈동자에 붉은빛이 맑게 비친 시간.",
    image: "https://images.unsplash.com/photo-1522771930-78848d9293e8?q=80&w=1200&auto=format&fit=crop",
    summary: ["노을", "동화", "저녁"]
  },
  22: {
    title: "엄마 품속이 최고에요",
    text: "안기자마자 얼굴을 비비며 찡긋 웃는다. 따뜻한 품을 알아보고 신뢰를 보여줄 때 큰 보람을 느낀다.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["교감", "신뢰", "품속"]
  },
  23: {
    title: "작은 재채기 에취!",
    text: "아기가 재채기를 작게 '에취' 하고 나선 놀랐는지 눈을 동그랗게 떴다. 그 모습조차 너무 귀여웠다.",
    image: "https://images.unsplash.com/photo-1519689680058-324335c77eba?q=80&w=1200&auto=format&fit=crop",
    summary: ["재채기", "깜짝", "큐트"]
  },
  24: {
    title: "성장 발달 검사 날",
    text: "정기검진에서 무럭무럭 건강하게 잘 크고 있다는 선생님 말씀을 들었다. 지금처럼 건강하고 밝게 커주렴.",
    image: "https://images.unsplash.com/photo-1442458370899-ae20e367c5d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["소아과", "건강", "기특"]
  },
  25: {
    title: "주말 아침 온가족 모임",
    text: "할머니, 할아버지가 놀러 오셔서 아기 미소를 보려고 온갖 노력을 하셨다. 미소 한 번에 집안이 웃음바다.",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?q=80&w=1200&auto=format&fit=crop",
    summary: ["주말", "조부모님", "행복"]
  },
  26: {
    title: "알록달록 풍선과 시선",
    text: "하늘 높이 매달아 둔 풍선을 향해 한참 동안 집중해서 시선을 떼지 않았다. 색다른 자극이 즐거운 듯하다.",
    image: "https://images.unsplash.com/photo-1473448912268-2022ce9509d8?q=80&w=1200&auto=format&fit=crop",
    summary: ["풍선", "호기심", "자극"]
  },
  27: {
    title: "거울 속 내 모습 확인하기",
    text: "거울 앞에 데려가 주니 낯설어하다가 이내 활짝 미소를 짓는다. 거울 속 친구가 아주 마음에 드나 보다.",
    image: "https://images.unsplash.com/photo-1503919545889-aef636e10ad4?q=80&w=1200&auto=format&fit=crop",
    summary: ["거울", "놀이", "친구"]
  },
  28: {
    title: "뽀송뽀송 파우더 향 가득",
    text: "목욕 후 뽀송하게 말리고 옷을 갈아입었다. 방 전체에 향긋한 아기 냄새가 은은하게 퍼진다.",
    image: "https://images.unsplash.com/photo-1546015720-b8b30df5aa27?q=80&w=1200&auto=format&fit=crop",
    summary: ["뽀송", "목욕", "천사"]
  },
  29: {
    title: "새벽녘 창문 밖 구경",
    text: "새벽에 일찍 잠에서 깨 아기띠를 매고 푸르스름한 동네를 보았다. 고요하게 시작하는 시원한 새벽 공기.",
    image: "https://images.unsplash.com/photo-1470240731273-7821a6eeb6bd?q=80&w=1200&auto=format&fit=crop",
    summary: ["새벽", "아기띠", "고요"]
  },
  30: {
    title: "첫 한 달 동안의 눈부신 성장",
    text: "처음 태어났을 때보다 몸무게도 늘고, 눈빛도 또렷해졌다. 매일 쉬지 않고 기특하게 성장 중인 나의 보물.",
    image: "https://images.unsplash.com/photo-1561640361-79ec50cf0cd3?q=80&w=1200&auto=format&fit=crop",
    summary: ["성장기록", "한달", "소중함"]
  }
};

export function RecordsScreen({ route }: RecordsScreenProps) {
  const [stories, setStories] = useState<Record<number, Story>>(initialStories);
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [storyOpen, setStoryOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftText, setDraftText] = useState("");
  const [draftImageUri, setDraftImageUri] = useState<string | undefined>();

  const processedCameraUri = useRef<string | undefined>(undefined);

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

  const openStory = (date: number) => {
    if (!stories[date]) return;
    setSelectedDate(date);
    setStoryOpen(true);
  };

  const closeStory = () => {
    setStoryOpen(false);
  };

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

  return (
    <View style={styles.root}>
      {!editorOpen && (
        <SafeAreaView edges={["top"]} style={styles.fixedArea}>
          <View style={styles.topNav}>
            <Pressable style={styles.iconButton}>
              <ChevronLeft color={colors.primaryDark} size={24} />
            </Pressable>
            <Text style={styles.navTitle}>성장 기록</Text>
            <Pressable style={styles.diaryButton} onPress={() => openEditor()}>
              <PenLine color="#FFFFFF" size={14} />
              <Text style={styles.diaryButtonText}>일기 쓰기</Text>
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
                {/* 7열을 채우기 위해 30일 뒤에 5개의 더미 투명 셀을 배치 */}
                {Array.from({ length: 5 }).map((_, index) => (
                  <View key={`dummy-${index}`} style={[styles.dateCell, { backgroundColor: "transparent" }]} />
                ))}
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

      {editorOpen && (
        <SafeAreaView style={styles.fixedArea}>
          <View style={styles.editorHeader}>
            <Pressable style={styles.iconButton} onPress={() => setEditorOpen(false)}>
              <X color={colors.primaryDark} size={24} />
            </Pressable>
            <Text style={styles.navTitle}>일기 작성</Text>
            <Pressable style={styles.saveButton} onPress={saveDiary}>
              <Save color="#FFFFFF" size={14} />
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.editorBody}>
            <View style={styles.photoPicker}>
              <Image source={{ uri: draftImageUri ?? samplePhoto }} resizeMode="cover" style={styles.draftPhoto} />
            </View>
            <TextInput
              value={draftTitle}
              onChangeText={setDraftTitle}
              placeholder="일기 제목"
              placeholderTextColor={colors.textMuted}
              style={styles.titleInput}
            />
            <TextInput
              value={draftText}
              multiline
              onChangeText={setDraftText}
              placeholder="오늘의 순간을 적어보세요."
              placeholderTextColor={colors.textMuted}
              style={styles.bodyInput}
              textAlignVertical="top"
            />
          </ScrollView>
        </SafeAreaView>
      )}

      <Modal visible={storyOpen} transparent animationType="fade" onRequestClose={closeStory}>
        <StoryCarousel
          stories={stories}
          dates={calendarDays}
          initialDate={selectedDate}
          onClose={closeStory}
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
    fontWeight: "600"
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18
  },
  weekText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    width: "13%"
  },
  dateGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 10,
    rowGap: 8
  },
  dateCell: {
    alignItems: "center",
    aspectRatio: 1,
    backgroundColor: colors.surfaceSoft,
    borderRadius: 10,
    width: "13%",
    justifyContent: "center",
    overflow: "hidden"
  },
  dateCellActive: {
    backgroundColor: colors.primary
  },
  dateText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "500"
  },
  dateTextActive: {
    color: "#FFFFFF",
    fontWeight: "700"
  },
  dateThumbnail: {
    height: "100%",
    width: "100%"
  },
  dateThumbnailImage: {
    borderRadius: 10
  },
  dateOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.18)",
    flex: 1,
    justifyContent: "center"
  },
  dateOverlayActive: {
    backgroundColor: "rgba(236,165,175,0.6)"
  },
  thumbnailDateText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700"
  },
  previewCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
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
    backgroundColor: "rgba(0,0,0,0.3)",
    gap: 4,
    padding: 16
  },
  previewDate: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 13,
    fontWeight: "600"
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700"
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
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center"
  },
  editorBody: {
    gap: 16,
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
    fontSize: 15,
    minHeight: 180,
    padding: 14
  }
});
