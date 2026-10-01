import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useFocusEffect } from "@react-navigation/native";
import { ArrowLeft, Share2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { Linking, Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { FeedingLineChart } from "@/features/reports/components/FeedingLineChart";
import { getWeeklyReport, type WeeklyReport } from "@/features/reports/services/reportService";
import type { AppStackParamList } from "@/navigation/AppStackNavigator";
import { ApiRequestError } from "@/services/api/apiClient";
import { ErrorState } from "@/shared/components/ErrorState";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { LoadingState } from "@/shared/components/LoadingState";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";
import { withI } from "@/shared/utils/koreanParticle";

type Props = NativeStackScreenProps<AppStackParamList, "WeeklyReport">;

type Status = "loading" | "idle" | "error";

const periodLabel = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const sameMonth = s.getMonth() === e.getMonth();
  return sameMonth
    ? `${s.getMonth() + 1}월 ${s.getDate()}일-${e.getDate()}일`
    : `${s.getMonth() + 1}월 ${s.getDate()}일-${e.getMonth() + 1}월 ${e.getDate()}일`;
};

const signed = (value: number | null, unit: string) => {
  if (value === null) return "비교 기록 없음";
  return `${value > 0 ? "+" : ""}${value}${unit}`;
};

export function WeeklyReportScreen({ navigation }: Props) {
  const { accessToken, signOut } = useAuth();
  const { activeBaby } = useBaby();
  const [status, setStatus] = useState<Status>("loading");
  const [report, setReport] = useState<WeeklyReport | null>(null);

  const load = useCallback(async () => {
    if (!accessToken || !activeBaby) return;
    setStatus("loading");
    try {
      setReport(await getWeeklyReport(accessToken, activeBaby.id));
      setStatus("idle");
    } catch (error) {
      if (error instanceof ApiRequestError && error.kind === "auth") {
        await signOut();
        return;
      }
      setStatus("error");
    }
  }, [accessToken, activeBaby, signOut]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const share = async () => {
    if (!report) return;
    const message = [
      `${withI(report.baby.name)} 주간 리포트 (${periodLabel(report.period.start, report.period.end)})`,
      `· ${report.insight.headline}`,
      `· 수유 ${report.feeding.count}회 · ${report.feeding.totalMl}ml (지난주 대비 ${signed(report.feeding.changePercent, "%")})`,
      report.sleep.avgNapMinutes !== null ? `· 낮잠 평균 ${report.sleep.avgNapMinutes}분 (${signed(report.sleep.changeMinutes, "분")})` : null,
      `· 배변 ${report.diaper.count}회`
    ]
      .filter(Boolean)
      .join("\n");
    try {
      await Share.share({ message });
    } catch {
      // 공유 시트 취소는 무시한다.
    }
  };

  const babyName = report?.baby.name ?? activeBaby?.name ?? "아기";

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
            <Text style={styles.eyebrow}>{report ? periodLabel(report.period.start, report.period.end) : "최근 7일"}</Text>
            <Text style={styles.title}>{withI(babyName)} 주간 리포트</Text>
          </View>
          <Pressable accessibilityLabel="리포트 공유" disabled={!report} hitSlop={12} onPress={share}>
            <GlassSurface radius={theme.radius.pill} intensity={28} noShadow contentStyle={styles.iconButton}>
              <Share2 color={colors.primaryDark} size={19} />
            </GlassSurface>
          </Pressable>
        </View>

        {status === "loading" && <LoadingState />}
        {status === "error" && <ErrorState message="주간 리포트를 불러오지 못했어요." onRetry={load} />}

        {status === "idle" && report && (
          <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
            <View style={styles.insightCard}>
              <Text style={styles.insightEyebrow}>이번 주의 핵심 변화</Text>
              <Text style={styles.insightTitle}>{report.insight.headline}</Text>
              <Text style={styles.insightBody}>{report.insight.body}</Text>
            </View>

            <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.chartCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>일별 수유량</Text>
                <Text style={styles.delta}>지난주 대비 {signed(report.feeding.changePercent, "%")}</Text>
              </View>
              <FeedingLineChart points={report.feeding.daily} />
            </GlassSurface>

            <View style={styles.statRow}>
              <StatTile label="수유" value={`${report.feeding.count}회`} sub={`${report.feeding.totalMl}ml`} />
              <StatTile
                label="낮잠 평균"
                value={report.sleep.avgNapMinutes !== null ? `${report.sleep.avgNapMinutes}분` : "-"}
                sub={signed(report.sleep.changeMinutes, "분")}
              />
              <StatTile label="배변" value={`${report.diaper.count}회`} sub={`지난주 ${report.diaper.prevCount}회`} />
            </View>

            <View style={styles.curationCard}>
              <Text style={styles.curationTitle}>근거와 함께 보는 맞춤 큐레이션</Text>
              {report.curations.map((item, index) => (
                <Pressable key={item.title} style={styles.curationRow} onPress={() => void Linking.openURL(item.url)}>
                  <View style={styles.curationIndex}>
                    <Text style={styles.curationIndexText}>{index + 1}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={styles.curationItemTitle}>{item.title}</Text>
                    <Text style={styles.curationItemMeta}>{item.source} · {item.reviewedAt} 검수</Text>
                  </View>
                </Pressable>
              ))}
            </View>

            <GlassSurface radius={theme.radius.xl} intensity={32} contentStyle={styles.focusCard}>
              <View style={styles.chartHeader}>
                <Text style={styles.cardTitle}>다음 주 함께 볼 것</Text>
              </View>
              <View style={styles.chipRow}>
                {report.nextWeekFocus.map((chip) => (
                  <Text key={chip} style={styles.chip}>#{chip}</Text>
                ))}
              </View>
            </GlassSurface>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}

function StatTile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <GlassSurface radius={theme.radius.lg} intensity={28} noShadow style={styles.flex} contentStyle={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </GlassSurface>
  );
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
    gap: 14,
    paddingBottom: 32,
    paddingHorizontal: 18,
    paddingTop: 6
  },
  insightCard: {
    backgroundColor: "rgba(226,239,243,0.85)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16
  },
  insightEyebrow: {
    color: "#3E7A8C",
    fontSize: 11,
    fontWeight: "900"
  },
  insightTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  insightBody: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18
  },
  chartCard: {
    gap: 10,
    padding: 16
  },
  chartHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  cardTitle: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  delta: {
    color: "#2E8B6E",
    fontSize: 12,
    fontWeight: "900"
  },
  statRow: {
    flexDirection: "row",
    gap: 8
  },
  statTile: {
    alignItems: "center",
    gap: 2,
    paddingVertical: 12
  },
  statValue: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800"
  },
  statSub: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800"
  },
  curationCard: {
    backgroundColor: "rgba(235,228,246,0.85)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 16
  },
  curationTitle: {
    color: "#6B52A8",
    fontSize: 13,
    fontWeight: "900"
  },
  curationRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  curationIndex: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderRadius: 10,
    height: 30,
    justifyContent: "center",
    width: 30
  },
  curationIndexText: {
    color: "#6B52A8",
    fontSize: 12,
    fontWeight: "900"
  },
  curationItemTitle: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "800"
  },
  curationItemMeta: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  focusCard: {
    gap: 10,
    padding: 16
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 7
  }
});
