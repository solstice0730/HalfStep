import { useFocusEffect, type CompositeScreenProps } from "@react-navigation/native";
import { useBottomTabBarHeight, type BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { ChevronLeft, ChevronRight, Pencil, PenLine, Trash2 } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { getCalendarDay, getCalendarMonth, type CalendarDay, type CalendarDiary, type CalendarTimelineItem } from "@/features/calendar/services/calendarApi";
import { deleteRecord } from "@/features/records/services/recordsService";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { confirmAsync } from "@/shared/utils/confirm";
import { todayLocalIsoDate } from "@/shared/utils/date";
import { withUi } from "@/shared/utils/koreanParticle";

type CalendarScreenProps = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, "Calendar">,
  NativeStackScreenProps<AppStackParamList>
>;

type AsyncStatus = "idle" | "loading" | "error";

const pad2 = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad2(month)}-${pad2(day)}`;
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const firstWeekday = (year: number, month: number) => new Date(year, month - 1, 1).getDay();
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const WEEKDAY_FULL = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];

const storyDate = (iso: string) => {
  const value = new Date(`${iso}T00:00:00`);
  return `${value.getMonth() + 1}월 ${value.getDate()}일 ${WEEKDAY_FULL[value.getDay()]}`;
};

const now = new Date();
const todayIso = todayLocalIsoDate();

const EMPTY_SUMMARY: CalendarDay["daySummary"] = {
  feedingCount: 0,
  sleepTotalMinutes: 0,
  urineCount: 0,
  stoolCount: 0,
  photoCount: 0,
  chatCount: 0
};

// 날짜를 고르면 그날의 사진·일기·흐름이 한 장의 이야기처럼 보이는 캘린더.
export function CalendarScreen({ navigation }: CalendarScreenProps) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [thumbnails, setThumbnails] = useState<Map<string, string>>(new Map());
  const [monthStatus, setMonthStatus] = useState<AsyncStatus>("idle");

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [timeline, setTimeline] = useState<CalendarTimelineItem[]>([]);
  const [dayDiary, setDayDiary] = useState<CalendarDiary | null>(null);
  const [daySummary, setDaySummary] = useState<CalendarDay["daySummary"]>(EMPTY_SUMMARY);
  const [dayStatus, setDayStatus] = useState<AsyncStatus>("idle");

  const babyName = activeBaby?.name ?? "아기";

  const handleAuthError = useCallback(
    async (error: unknown) => {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return true;
      }
      return false;
    },
    [signOut]
  );

  const loadMonth = useCallback(async () => {
    if (!accessToken || !activeBaby) return;
    setMonthStatus("loading");
    try {
      const result = await getCalendarMonth(accessToken, activeBaby.id, year, month);
      setMarkedDates(new Set(result.days.filter((day) => day.recordCount > 0 || day.hasDiary).map((day) => day.date)));
      setThumbnails(new Map(result.days.filter((day) => day.thumbnailUrl).map((day) => [day.date, day.thumbnailUrl as string])));
      setMonthStatus("idle");
    } catch (error) {
      if (await handleAuthError(error)) return;
      setMonthStatus("error");
    }
  }, [accessToken, activeBaby, year, month, handleAuthError]);

  const loadDay = useCallback(
    async (date: string) => {
      if (!accessToken || !activeBaby) return;
      setDayStatus("loading");
      try {
        const day = await getCalendarDay(accessToken, activeBaby.id, date);
        setTimeline(day.timeline);
        setDayDiary(day.diary);
        setDaySummary(day.daySummary);
        setDayStatus("idle");
      } catch (error) {
        if (await handleAuthError(error)) return;
        setDayStatus("error");
      }
    },
    [accessToken, activeBaby, handleAuthError]
  );

  useFocusEffect(
    useCallback(() => {
      void loadMonth();
      void loadDay(selectedDate);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [loadMonth, loadDay])
  );

  const goToMonth = (direction: -1 | 1) => {
    let nextYear = year;
    let nextMonth = month + direction;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    setYear(nextYear);
    setMonth(nextMonth);
  };

  const selectDate = (date: string) => {
    setSelectedDate(date);
    void loadDay(date);
  };

  // 잘못 넣은 기록은 타임라인에서 바로 지운다. 지운 뒤 월 표시(점·썸네일)도 같이 갱신한다.
  const removeRecord = async (item: CalendarTimelineItem) => {
    if (!accessToken) return;
    const confirmed = await confirmAsync("이 기록을 지울까요?", `${item.time.slice(11, 16)} ${item.summary}`, { confirmText: "지우기", destructive: true });
    if (!confirmed) return;
    try {
      await deleteRecord(accessToken, item.id);
      await Promise.all([loadDay(selectedDate), loadMonth()]);
    } catch (error) {
      if (await handleAuthError(error)) return;
    }
  };

  const TimelineRow = ({ item }: { item: CalendarTimelineItem }) => (
    <View style={styles.timelineRow}>
      <Text style={styles.timelineTime}>{item.time.slice(11, 16)}</Text>
      <Text style={styles.timelineSummary}>{item.summary}</Text>
      <Pressable accessibilityLabel="기록 지우기" hitSlop={8} onPress={() => void removeRecord(item)}>
        <Trash2 color={colors.textMuted} size={15} />
      </Pressable>
    </View>
  );

  const gridCells = useMemo(() => {
    const total = daysInMonth(year, month);
    const leadingBlanks = firstWeekday(year, month);
    const cells: (number | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= total; day += 1) {
      cells.push(day);
    }
    return cells;
  }, [year, month]);

  const tabBarHeight = useBottomTabBarHeight();
  const isFuture = selectedDate > todayIso;
  const heroUri = dayDiary?.imageUrls[0];

  return (
    <View style={styles.root}>
    <GradientBackdrop />
    <SafeAreaView edges={["top"]} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerEyebrow}>{withUi(babyName)} 하루하루</Text>
        <Text style={styles.headerTitle}>캘린더</Text>
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: 32 + tabBarHeight }]} showsVerticalScrollIndicator={false}>
        <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.monthCard}>
          <View style={styles.monthHeader}>
            <Pressable accessibilityLabel="이전 달" hitSlop={10} onPress={() => goToMonth(-1)}>
              <ChevronLeft color={colors.primaryDark} size={22} />
            </Pressable>
            <Text style={styles.monthTitle}>{year}년 {month}월</Text>
            <Pressable accessibilityLabel="다음 달" hitSlop={10} onPress={() => goToMonth(1)}>
              <ChevronRight color={colors.primaryDark} size={22} />
            </Pressable>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((day) => (
              <Text key={day} style={styles.weekText}>{day}</Text>
            ))}
          </View>

          {monthStatus === "loading" ? (
            <ActivityIndicator color={colors.primary} style={styles.monthSpinner} />
          ) : monthStatus === "error" ? (
            <View style={styles.monthError}>
              <Text style={styles.monthErrorText}>이번 달 기록을 불러오지 못했어요.</Text>
              <Pressable onPress={loadMonth}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.grid}>
              {gridCells.map((day, index) => {
                if (day === null) {
                  return <View key={`blank-${index}`} style={styles.cell} />;
                }
                const date = dateKey(year, month, day);
                const marked = markedDates.has(date);
                const thumbnail = thumbnails.get(date);
                const isToday = date === todayIso;
                const isSelected = date === selectedDate;

                return (
                  <Pressable
                    key={date}
                    accessibilityLabel={`${month}월 ${day}일${thumbnail ? " 이야기 있음" : marked ? " 기록 있음" : ""}`}
                    style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                    onPress={() => selectDate(date)}
                  >
                    {thumbnail ? (
                      <>
                        <Image source={{ uri: thumbnail }} style={styles.cellPhoto} />
                        <View style={styles.cellPhotoShade} />
                        <Text style={styles.cellPhotoText}>{day}</Text>
                      </>
                    ) : (
                      <>
                        <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{day}</Text>
                        {marked && <View style={[styles.cellDot, isSelected && styles.cellDotSelected]} />}
                      </>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}
        </GlassSurface>

        {dayStatus === "loading" && <ActivityIndicator color={colors.primary} style={styles.daySpinner} />}

        {dayStatus === "error" && (
          <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.monthError}>
            <Text style={styles.monthErrorText}>이 날의 이야기를 불러오지 못했어요.</Text>
            <Pressable onPress={() => loadDay(selectedDate)}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </GlassSurface>
        )}

        {dayStatus === "idle" && dayDiary && (
          <GlassSurface radius={theme.radius.xl} intensity={36} contentStyle={styles.storyCard}>
            {heroUri ? (
              <View style={styles.hero}>
                <Image resizeMode="cover" source={{ uri: heroUri }} style={styles.heroImage} />
                <LinearGradient colors={["rgba(32,26,23,0)", "rgba(32,26,23,0.72)"]} style={styles.heroShade} />
                <View style={styles.heroTexts}>
                  <Text style={styles.heroDate}>{storyDate(selectedDate)}</Text>
                  <Text style={styles.heroTitle}>{dayDiary.title}</Text>
                </View>
                {dayDiary.imageUrls.length > 1 && (
                  <View style={styles.heroThumbs}>
                    {dayDiary.imageUrls.slice(1, 3).map((uri) => (
                      <Image key={uri} source={{ uri }} style={styles.heroThumb} />
                    ))}
                  </View>
                )}
              </View>
            ) : (
              <LinearGradient colors={["#F6D7DC", "#FBE9E4"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroPlain}>
                <Text style={styles.heroPlainDate}>{storyDate(selectedDate)}</Text>
                <Text style={styles.heroPlainTitle}>{dayDiary.title}</Text>
              </LinearGradient>
            )}

            <View style={styles.storyBody}>
              <Text style={styles.storyContent}>{dayDiary.content}</Text>
              {dayDiary.highlights.length > 0 && (
                <View style={styles.chipRow}>
                  {dayDiary.highlights.map((highlight) => (
                    <Text key={highlight} style={styles.chip}>{highlight}</Text>
                  ))}
                </View>
              )}
              <View style={styles.storyFooter}>
                <Text style={styles.storyMeta}>
                  기록 {timeline.length} · 사진 {daySummary.photoCount} · 이야기 {daySummary.chatCount}
                </Text>
                <Pressable accessibilityLabel="일기 고쳐 쓰기" style={styles.storyEdit} onPress={() => navigation.navigate("DiaryEdit", { diary: dayDiary })}>
                  <Pencil color={colors.primary} size={13} />
                  <Text style={styles.storyEditText}>고쳐 쓰기</Text>
                </Pressable>
              </View>
            </View>

            {timeline.length > 0 && (
              <View style={styles.flowSection}>
                <Text style={styles.flowTitle}>그날의 흐름</Text>
                {timeline.map((item) => (
                  <TimelineRow key={item.id} item={item} />
                ))}
              </View>
            )}
          </GlassSurface>
        )}

        {dayStatus === "idle" && !dayDiary && (
          <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.emptyCard}>
            <Text style={styles.emptyDate}>{storyDate(selectedDate)}</Text>
            {timeline.length > 0 ? (
              <>
                <Text style={styles.emptyTitle}>아직 이 날의 이야기는 쓰지 않았어요</Text>
                <View style={styles.flowSectionCompact}>
                  {timeline.map((item) => (
                    <TimelineRow key={item.id} item={item} />
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.emptyTitle}>{isFuture ? "아직 오지 않은 날이에요" : "이 날에는 남긴 기록이 없어요"}</Text>
            )}
            {!isFuture && (
              <Pressable
                accessibilityRole="button"
                style={styles.writeButton}
                onPress={() => navigation.navigate("Records", { selectedDate })}
              >
                <PenLine color={colors.primary} size={15} />
                <Text style={styles.writeButtonText}>{timeline.length > 0 ? "이 날의 일기 쓰기" : "이 날 기록 남기기"}</Text>
              </Pressable>
            )}
          </GlassSurface>
        )}
      </ScrollView>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  headerEyebrow: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  headerTitle: {
    color: colors.primaryDark,
    ...typography.title1
  },
  body: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  monthCard: {
    padding: 14
  },
  monthHeader: {
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
  grid: {
    flexDirection: "row",
    flexWrap: "wrap"
  },
  cell: {
    alignItems: "center",
    aspectRatio: 1,
    borderRadius: 14,
    gap: 2,
    justifyContent: "center",
    margin: "0.75%",
    overflow: "hidden",
    width: "12.78%"
  },
  cellSelected: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.primary,
    borderWidth: 2
  },
  cellToday: {
    borderColor: colors.accent,
    borderWidth: 1.5
  },
  cellText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  cellTextSelected: {
    color: colors.primary,
    fontWeight: "900"
  },
  cellDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 5,
    width: 5
  },
  cellDotSelected: {
    backgroundColor: colors.primary
  },
  cellPhoto: {
    ...StyleSheet.absoluteFill
  },
  cellPhotoShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(32,26,23,0.28)"
  },
  cellPhotoText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900",
    textShadowColor: "rgba(0,0,0,0.4)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2
  },
  monthSpinner: {
    paddingVertical: 20
  },
  daySpinner: {
    paddingVertical: 16
  },
  monthError: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 16
  },
  monthErrorText: {
    color: colors.danger,
    fontSize: 13
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  storyCard: {
    padding: 0
  },
  hero: {
    height: 220,
    position: "relative"
  },
  heroImage: {
    height: 220,
    width: "100%"
  },
  heroShade: {
    ...StyleSheet.absoluteFill
  },
  heroTexts: {
    bottom: 16,
    left: 18,
    position: "absolute",
    right: 18
  },
  heroDate: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "700"
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginTop: 4
  },
  heroThumbs: {
    flexDirection: "row",
    gap: 6,
    position: "absolute",
    right: 12,
    top: 12
  },
  heroThumb: {
    borderColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    borderWidth: 1.5,
    height: 44,
    width: 44
  },
  heroPlain: {
    gap: 4,
    paddingHorizontal: 18,
    paddingVertical: 22
  },
  heroPlainDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  heroPlainTitle: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "900"
  },
  storyBody: {
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 16
  },
  storyContent: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 25
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  chip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  storyMeta: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "700"
  },
  storyFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  storyEdit: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4
  },
  storyEditText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  },
  flowSection: {
    borderTopColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 18,
    paddingVertical: 14
  },
  flowSectionCompact: {
    marginTop: 4
  },
  flowTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "900",
    marginBottom: 4
  },
  timelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
    paddingVertical: 7
  },
  timelineTime: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900",
    width: 44
  },
  timelineSummary: {
    color: colors.text,
    flex: 1,
    fontSize: 13,
    fontWeight: "700"
  },
  emptyCard: {
    gap: 8,
    padding: 18
  },
  emptyDate: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "700"
  },
  emptyTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  writeButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  writeButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  }
});
