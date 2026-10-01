import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ArrowLeft, ArrowUp, RotateCcw } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
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

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { addDiaryMaterial, formatChatMaterial, listDiaryMaterials } from "@/features/diary/services/diaryMaterialsService";
import { getDashboard } from "@/features/home/services/homeService";
import { getTodayRecords } from "@/features/records/services/recordsService";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { askAiQuestion, type AskResult } from "@/services/api/aiApi";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { todayLocalIsoDate } from "@/shared/utils/date";
import { withEge, withUi } from "@/shared/utils/koreanParticle";

type Props = NativeStackScreenProps<AppStackParamList, "AiChat">;


const SUGGESTED_QUESTIONS = ["오늘 수유량 괜찮아?", "낮잠 리듬 어때?", "배변 횟수 괜찮아?"];
const WELCOME_TEXT = "궁금한 점을 물어보세요. 오늘 기록과 최근 변화를 함께 살펴볼게요.";
const SAFETY_SHORT = "의료 진단이 아닌 기록 기반 참고 정보예요.";

type MaterialSummary = { label: string; value: string }[];

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "assistant";
      text: string;
      evidence?: string[];
      question?: string;
      /** "오늘 일기에 추가" 제안 카드 상태 */
      diaryLink?: "pending" | "accepted" | "dismissed";
      materials?: MaterialSummary;
    };

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours && mins) return `${hours}시간 ${mins}분`;
  if (hours) return `${hours}시간`;
  return `${mins}분`;
};

let messageSeq = 0;
const nextId = () => `msg-${Date.now()}-${messageSeq++}`;

export function AiChatScreen({ navigation }: Props) {
  const { accessToken } = useAuth();
  const { activeBaby } = useBaby();
  const scrollRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const babyName = activeBaby?.name ?? "아기";

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, asking]);

  const ask = async (questionText: string) => {
    const question = questionText.trim();
    if (!question || !accessToken || !activeBaby || asking) return;
    setInput("");
    setError(null);
    setMessages((current) => [...current, { id: nextId(), role: "user", text: question }]);
    setAsking(true);
    try {
      const result: AskResult = await askAiQuestion(accessToken, activeBaby.id, todayLocalIsoDate(), question);
      setMessages((current) => [
        ...current,
        {
          id: nextId(),
          role: "assistant",
          text: result.answer,
          evidence: result.evidence,
          question,
          diaryLink: result.suggestDiaryLink ? "pending" : undefined
        }
      ]);
    } catch {
      setError("답변을 가져오지 못했어요. 다시 시도해 주세요.");
    } finally {
      setAsking(false);
    }
  };

  // 영상 03: 대화를 일기 재료로 저장하고, 모은 재료를 요약 카드로 보여준다.
  const linkToDiary = async (message: Extract<ChatMessage, { role: "assistant" }>) => {
    if (!accessToken || !activeBaby || linking || !message.question) return;
    setLinking(true);
    try {
      const date = todayLocalIsoDate();
      await addDiaryMaterial(accessToken, {
        babyId: activeBaby.id,
        date,
        source: "CHAT",
        content: formatChatMaterial(message.question, message.text)
      });
      const [dashboard, records, materials] = await Promise.all([
        getDashboard(accessToken, activeBaby.id),
        getTodayRecords(accessToken, activeBaby.id, date),
        listDiaryMaterials(accessToken, activeBaby.id, date)
      ]);
      const summary = dashboard.todaySummary;
      const materialsSummary: MaterialSummary = [
        { label: "수유", value: `${summary.feedingCount}회${summary.feedingTotalMl ? ` · ${summary.feedingTotalMl}ml` : ""}` },
        { label: "수면", value: records.sleep.length ? formatMinutes(summary.sleepTotalMinutes) : "0회" },
        { label: "배변·소변", value: `${summary.urineCount + summary.stoolCount}회` },
        { label: "사진", value: `${summary.photoCount}장` },
        { label: "보호자 메모", value: `${materials.counts.memo}건` },
        { label: "대화", value: `${materials.counts.chat}건` }
      ];
      setMessages((current) => [
        ...current.map((item) => (item.id === message.id ? { ...item, diaryLink: "accepted" as const } : item)),
        { id: nextId(), role: "user", text: "네, 오늘 일기에 추가해 주세요." },
        { id: nextId(), role: "assistant", text: "일기 재료를 모두 모았어요.", materials: materialsSummary }
      ]);
    } catch {
      setError("일기 재료로 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setLinking(false);
    }
  };

  const dismissLink = (id: string) => {
    setMessages((current) => current.map((item) => (item.id === id ? { ...item, diaryLink: "dismissed" as const } : item)));
  };

  const goToMaterials = () => {
    navigation.navigate("Tabs", { screen: "Records" });
  };

  return (
    <View style={styles.rootWrap}>
      <GradientBackdrop />
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Pressable accessibilityLabel="뒤로가기" hitSlop={12} onPress={() => navigation.goBack()}>
            <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
              <ArrowLeft color={colors.primaryDark} size={22} />
            </GlassSurface>
          </Pressable>
          <View style={styles.headerTitles}>
            <Text style={styles.eyebrow}>육아코치</Text>
            <Text style={styles.title}>{withEge(babyName)} 물어보기</Text>
          </View>
          <Pressable accessibilityLabel="대화 새로 시작" hitSlop={12} onPress={() => setMessages([])}>
            <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
              <RotateCcw color={colors.primaryDark} size={18} />
            </GlassSurface>
          </Pressable>
        </View>

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
          <ScrollView ref={scrollRef} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            <View style={styles.introCard}>
              <Image source={require("../../../../assets/images/chatbot-home.png")} resizeMode="contain" style={styles.introAvatar} />
              <View style={styles.flex}>
                <Text style={styles.introTitle}>기록을 알고 있는 육아코치</Text>
                <Text style={styles.introText}>{withUi(babyName)} 월령과 최근 기록을 바탕으로 답해요.</Text>
              </View>
            </View>

            <Text style={styles.welcome}>{WELCOME_TEXT}</Text>

            {messages.length === 0 && (
              <View style={styles.suggestionRow}>
                {SUGGESTED_QUESTIONS.map((question) => (
                  <Pressable key={question} style={styles.suggestionChip} onPress={() => void ask(question)}>
                    <Text style={styles.suggestionText}>{question}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {messages.map((message) =>
              message.role === "user" ? (
                <View key={message.id} style={styles.userBubble}>
                  <Text style={styles.userText}>{message.text}</Text>
                </View>
              ) : (
                <View key={message.id} style={styles.assistantGroup}>
                  <View style={styles.assistantCard}>
                    {message.materials ? (
                      <>
                        <Text style={styles.assistantLead}>{message.text}</Text>
                        <View style={styles.materialGrid}>
                          {message.materials.map((item) => (
                            <View key={item.label} style={styles.materialCell}>
                              <Text style={styles.materialLabel}>{item.label}</Text>
                              <Text style={styles.materialValue}>{item.value}</Text>
                            </View>
                          ))}
                        </View>
                        <Text style={styles.assistantFoot}>사진 속 순간도 함께 담아 오늘의 일기를 만들어요.</Text>
                        <Pressable style={styles.materialsButton} onPress={goToMaterials}>
                          <Text style={styles.materialsButtonText}>일기 재료 보러 가기</Text>
                        </Pressable>
                      </>
                    ) : (
                      <>
                        <Text style={styles.assistantLead}>{withUi(babyName)} 오늘 기록을 확인했어요.</Text>
                        <Text style={styles.assistantText}>{stripLead(message.text, babyName)}</Text>
                        {message.evidence && message.evidence.length > 0 && (
                          <Text style={styles.assistantFoot}>근거 · {message.evidence.join(" · ")}</Text>
                        )}
                        <Text style={styles.assistantFoot}>{SAFETY_SHORT}</Text>
                      </>
                    )}
                  </View>

                  {message.diaryLink === "pending" && (
                    <View style={styles.linkCard}>
                      <Text style={styles.linkTitle}>이 대화도 오늘의 일기에 추가해드릴까요?</Text>
                      <Text style={styles.linkText}>방금 확인한 흐름을 사진·수면·배변 기록과 함께 일기 초안에 반영할 수 있어요.</Text>
                      <View style={styles.linkActions}>
                        <Pressable disabled={linking} style={styles.linkPrimaryWrap} onPress={() => void linkToDiary(message)}>
                          <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.linkPrimary}>
                            {linking ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.linkPrimaryText}>오늘 일기에 추가</Text>}
                          </LinearGradient>
                        </Pressable>
                        <Pressable style={styles.linkSecondary} onPress={() => dismissLink(message.id)}>
                          <Text style={styles.linkSecondaryText}>나중에</Text>
                        </Pressable>
                      </View>
                    </View>
                  )}
                </View>
              )
            )}

            {asking && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
            {error && <Text style={styles.errorText}>{error}</Text>}
          </ScrollView>

          <View style={styles.inputBar}>
            <TextInput
              editable={!asking}
              onChangeText={setInput}
              onSubmitEditing={() => void ask(input)}
              placeholder="메시지를 입력하세요"
              placeholderTextColor={colors.textMuted}
              returnKeyType="send"
              style={styles.input}
              value={input}
            />
            <Pressable
              accessibilityLabel="보내기"
              disabled={asking || input.trim().length === 0}
              style={[styles.sendButton, (asking || input.trim().length === 0) && styles.sendDisabled]}
              onPress={() => void ask(input)}
            >
              <ArrowUp color="#FFFFFF" size={18} strokeWidth={3} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

/** 백엔드 답변이 "하린이의 오늘 기록을 확인했어요."로 시작하면 카드 리드와 중복되므로 본문에서 제거한다. */
function stripLead(text: string, babyName: string): string {
  const lead = `${withUi(babyName)} 오늘 기록을 확인했어요.`;
  return text.startsWith(lead) ? text.slice(lead.length).trim() : text;
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
  iconButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  eyebrow: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  title: {
    color: colors.primaryDark,
    ...typography.title2
  },
  body: {
    gap: 12,
    paddingBottom: 16,
    paddingHorizontal: 18,
    paddingTop: 6
  },
  introCard: {
    alignItems: "center",
    backgroundColor: "rgba(246,215,220,0.75)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14
  },
  introAvatar: {
    height: 44,
    width: 44
  },
  introTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  introText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    marginTop: 2
  },
  welcome: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  suggestionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  suggestionChip: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  suggestionText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: colors.primary,
    borderBottomRightRadius: 6,
    borderRadius: 18,
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  userText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19
  },
  assistantGroup: {
    gap: 10
  },
  assistantCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderTopLeftRadius: 8,
    borderWidth: 1,
    gap: 8,
    padding: 16
  },
  assistantLead: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  assistantText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  assistantFoot: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16
  },
  materialGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  materialCell: {
    backgroundColor: "rgba(255,241,236,0.9)",
    borderRadius: 12,
    flexBasis: "47%",
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 9
  },
  materialLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  materialValue: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    marginTop: 2
  },
  materialsButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    marginTop: 4,
    paddingVertical: 11
  },
  materialsButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  linkCard: {
    backgroundColor: "rgba(255,241,236,0.85)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  linkTitle: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  linkText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  linkActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6
  },
  linkPrimaryWrap: {
    flex: 2
  },
  linkPrimary: {
    alignItems: "center",
    borderRadius: 999,
    paddingVertical: 11
  },
  linkPrimaryText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  linkSecondary: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 999,
    flex: 1,
    justifyContent: "center",
    paddingVertical: 11
  },
  linkSecondaryText: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  spinner: {
    alignSelf: "flex-start",
    marginLeft: 8
  },
  errorText: {
    color: colors.danger,
    fontSize: 12
  },
  inputBar: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingBottom: 10,
    paddingHorizontal: 16,
    paddingTop: 6
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 999,
    borderWidth: 1,
    color: colors.primaryDark,
    flex: 1,
    fontSize: 14,
    minHeight: 46,
    paddingHorizontal: 18
  },
  sendButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  sendDisabled: {
    opacity: 0.45
  }
});
