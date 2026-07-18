import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { BabyAge, BabyProfile } from "@/features/home/services/babyProfileService";
import type { TodayRecords } from "@/features/records/types/records";
import { colors } from "@/shared/constants/colors";

type ProfileStatus = "idle" | "loading" | "success" | "error";

interface TodaySummaryProps {
  todayDate: string;
  profileStatus: ProfileStatus;
  babyProfile: BabyProfile | null;
  babyAge: BabyAge | null;
  onRetryProfile: () => void;
  todayRecords: TodayRecords;
  diarySaved: boolean;
  lastQuickRecord: string | null;
}

export function TodaySummary({
  todayDate,
  profileStatus,
  babyProfile,
  babyAge,
  onRetryProfile,
  todayRecords,
  diarySaved,
  lastQuickRecord
}: TodaySummaryProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.todayDateText}>{todayDate}</Text>

      {profileStatus === "loading" && <ActivityIndicator color={colors.primary} style={styles.profileSpinner} />}

      {profileStatus === "error" && (
        <View style={styles.profileGuidance}>
          <Text style={styles.profileGuidanceText}>아기 정보를 불러오지 못했어요.</Text>
          <Pressable onPress={onRetryProfile}>
            <Text style={styles.profileRetryText}>다시 시도</Text>
          </Pressable>
        </View>
      )}

      {profileStatus === "success" && !babyProfile && (
        <View style={styles.profileGuidance}>
          <Text style={styles.profileGuidanceTitle}>등록된 아기 정보가 없습니다.</Text>
          <Text style={styles.profileGuidanceText}>아기 프로필을 등록하면 맞춤 기록과 AI 일기를 사용할 수 있어요.</Text>
        </View>
      )}

      {profileStatus === "success" && babyProfile && (
        <>
          <Text style={styles.babyName}>{babyProfile.name}와 만난 지</Text>
          <Text style={styles.dayText}>{babyAge ? `${babyAge.ageDays}일째` : "생년월일 확인 필요"}</Text>
        </>
      )}

      <Text style={styles.quickStatusText}>
        오늘 기록 · 수유 {todayRecords.feeding.length}회 · 수면 {todayRecords.sleep.length}회 · 배변{" "}
        {todayRecords.urine.length + todayRecords.stool.length}회 · AI 일지 {diarySaved ? "저장됨" : "미저장"}
      </Text>
      {lastQuickRecord && <Text style={styles.quickStatusText}>{lastQuickRecord}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: -2
  },
  todayDateText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  profileSpinner: {
    alignSelf: "flex-start",
    marginTop: 6
  },
  profileGuidance: {
    marginTop: 4
  },
  profileGuidanceTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900"
  },
  profileGuidanceText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2
  },
  profileRetryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 4
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
  }
});
