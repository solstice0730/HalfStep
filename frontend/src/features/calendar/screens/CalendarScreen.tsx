import { useFocusEffect } from "@react-navigation/native";
import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { getCalendarDay, getCalendarMonth, type CalendarDiary, type CalendarTimelineItem } from "@/features/calendar/services/calendarApi";
import type { MainTabParamList } from "@/navigation/MainTabNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { colors } from "@/shared/constants/colors";

type CalendarScreenProps = BottomTabScreenProps<MainTabParamList, "Calendar">;

type AsyncStatus = "idle" | "loading" | "error";

const pad2 = (value: number) => String(value).padStart(2, "0");
const dateKey = (year: number, month: number, day: number) => `${year}-${pad2(month)}-${pad2(day)}`;
const daysInMonth = (year: number, month: number) => new Date(year, month, 0).getDate();
const firstWeekday = (year: number, month: number) => new Date(year, month - 1, 1).getDay();

const now = new Date();
const todayIso = dateKey(now.getFullYear(), now.getMonth() + 1, now.getDate());

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

export function CalendarScreen(_props: CalendarScreenProps) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [markedDates, setMarkedDates] = useState<Set<string>>(new Set());
  const [monthStatus, setMonthStatus] = useState<AsyncStatus>("idle");

  const [selectedDate, setSelectedDate] = useState(todayIso);
  const [timeline, setTimeline] = useState<CalendarTimelineItem[]>([]);
  const [dayDiary, setDayDiary] = useState<CalendarDiary | null>(null);
  const [dayStatus, setDayStatus] = useState<AsyncStatus>("idle");

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

  const gridCells = useMemo(() => {
    const total = daysInMonth(year, month);
    const leadingBlanks = firstWeekday(year, month);
    const cells: (number | null)[] = Array.from({ length: leadingBlanks }, () => null);
    for (let day = 1; day <= total; day += 1) {
      cells.push(day);
    }
    return cells;
  }, [year, month]);

  const hasDayContent = timeline.length > 0 || dayDiary !== null;

  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>캘린더</Text>
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.monthCard}>
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
                const isToday = date === todayIso;
                const isSelected = date === selectedDate;

                return (
                  <Pressable
                    key={date}
                    style={[styles.cell, isSelected && styles.cellSelected, isToday && !isSelected && styles.cellToday]}
                    onPress={() => selectDate(date)}
                  >
                    <Text style={[styles.cellText, isSelected && styles.cellTextSelected]}>{day}</Text>
                    {marked && <View style={[styles.cellDot, isSelected && styles.cellDotSelected]} />}
                  </Pressable>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{selectedDate} 기록</Text>

          {dayStatus === "loading" && <ActivityIndicator color={colors.primary} />}

          {dayStatus === "error" && (
            <View style={styles.monthError}>
              <Text style={styles.monthErrorText}>기록을 불러오지 못했어요.</Text>
              <Pressable onPress={() => loadDay(selectedDate)}>
                <Text style={styles.retryText}>다시 시도</Text>
              </Pressable>
            </View>
          )}

          {dayStatus === "idle" && !hasDayContent && (
            <Text style={styles.emptyText}>이 날짜에는 저장된 기록이 없습니다.</Text>
          )}

          {dayStatus === "idle" && hasDayContent && (
            <>
              {timeline.length > 0 ? (
                <View style={styles.timelineList}>
                  {timeline.map((item) => (
                    <Text key={item.id} style={styles.timelineRow}>
                      {item.time.slice(11, 16)} {item.summary}
                    </Text>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>이 날짜에는 저장된 기록이 없습니다.</Text>
              )}

              {dayDiary && (
                <View style={styles.diaryCard}>
                  <View style={styles.diaryHeader}>
                    <Sparkles color={colors.accent} size={16} />
                    <Text style={styles.diaryTitle}>{dayDiary.title}</Text>
                  </View>
                  <Text style={styles.diaryContent}>{dayDiary.content}</Text>
                  {dayDiary.highlights.length > 0 && (
                    <Text style={styles.diaryHighlights}>{dayDiary.highlights.join(" · ")}</Text>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 26,
    fontWeight: "800"
  },
  body: {
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 20,
    paddingTop: 14
  },
  monthCard: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
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
    width: "12.78%"
  },
  cellSelected: {
    backgroundColor: colors.blueSoft
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
  monthSpinner: {
    paddingVertical: 20
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
  detailCard: {
    backgroundColor: "#FFFFFF",
    borderColor: colors.border,
    borderRadius: 26,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  detailTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 8
  },
  timelineList: {
    gap: 6
  },
  timelineRow: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  diaryCard: {
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    gap: 6,
    padding: 14
  },
  diaryHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  diaryTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  diaryContent: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 20
  },
  diaryHighlights: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800"
  }
});
