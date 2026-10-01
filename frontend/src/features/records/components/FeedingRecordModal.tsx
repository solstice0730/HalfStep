import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Minus, Plus, X } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import { TimePickerField, nowAsTimeValue, type TimeValue } from "@/features/records/components/TimePickerField";
import { FEEDING_TYPE_LABELS, QUICK_FEEDING_TYPES, type FeedingType } from "@/features/records/types/records";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";

interface FeedingRecordModalProps {
  visible: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (record: { time: TimeValue; feedingType: FeedingType; amountMl?: number; durationMinutes?: number }) => Promise<boolean>;
}

// 모유는 분(수유 시간), 분유·이유식은 ml(수유량) — backend/app/schemas/records.py 검증 규칙과 동일.
const STEP_BY_TYPE: Record<FeedingType, number> = { BREAST: 5, FORMULA: 10, MIXED: 10, SOLID: 10 };
const DEFAULT_BY_TYPE: Record<FeedingType, number> = { BREAST: 15, FORMULA: 140, MIXED: 140, SOLID: 80 };
const MAX_BY_TYPE: Record<FeedingType, number> = { BREAST: 180, FORMULA: 500, MIXED: 500, SOLID: 500 };

const formatKoreanTime = ({ hour, minute }: TimeValue) => {
  const h = Number(hour || 0);
  const m = String(Number(minute || 0)).padStart(2, "0");
  const period = h < 12 ? "오전" : "오후";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${displayHour}:${m}`;
};

export function FeedingRecordModal({ visible, isSaving, onClose, onSave }: FeedingRecordModalProps) {
  const [time, setTime] = useState<TimeValue>(nowAsTimeValue());
  const [feedingType, setFeedingType] = useState<FeedingType>("FORMULA");
  const [amount, setAmount] = useState<number>(DEFAULT_BY_TYPE.FORMULA);
  const [editingTime, setEditingTime] = useState(false);

  const isBreast = feedingType === "BREAST";
  const step = STEP_BY_TYPE[feedingType];
  const isValid = amount > 0 && time.hour !== "" && time.minute !== "";

  const selectType = (type: FeedingType) => {
    setFeedingType(type);
    setAmount(DEFAULT_BY_TYPE[type]);
  };

  const adjust = (delta: number) => {
    setAmount((current) => Math.min(MAX_BY_TYPE[feedingType], Math.max(0, current + delta)));
  };

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    const saved = await onSave(
      isBreast
        ? { time, feedingType, durationMinutes: amount }
        : { time, feedingType, amountMl: amount }
    );
    if (saved) {
      setAmount(DEFAULT_BY_TYPE[feedingType]);
      setTime(nowAsTimeValue());
      setEditingTime(false);
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose}>
          <BlurView intensity={24} tint="dark" style={StyleSheet.absoluteFill} />
        </Pressable>
        <GlassSurface radius={theme.radius.xxl} intensity={60} contentStyle={styles.sheet}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>수유 기록</Text>
            <Pressable accessibilityLabel="닫기" hitSlop={10} onPress={onClose}>
              <X color={colors.primaryDark} size={22} />
            </Pressable>
          </View>

          <View style={styles.segmentRow}>
            {QUICK_FEEDING_TYPES.map((type) => (
              <Pressable
                key={type}
                accessibilityRole="button"
                accessibilityState={{ selected: feedingType === type }}
                style={[styles.segment, feedingType === type && styles.segmentActive]}
                onPress={() => selectType(type)}
              >
                <Text style={[styles.segmentText, feedingType === type && styles.segmentTextActive]}>
                  {FEEDING_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{isBreast ? "수유 시간" : "수유량"}</Text>
          <View style={styles.stepperCard}>
            <Pressable accessibilityLabel="줄이기" disabled={amount <= 0} hitSlop={8} style={styles.stepButton} onPress={() => adjust(-step)}>
              <Minus color={colors.primary} size={22} strokeWidth={3} />
            </Pressable>
            <View style={styles.amountWrap}>
              <Text style={styles.amountValue}>{amount}</Text>
              <Text style={styles.amountUnit}>{isBreast ? "분" : "ml"}</Text>
            </View>
            <Pressable accessibilityLabel="늘리기" hitSlop={8} style={styles.stepButton} onPress={() => adjust(step)}>
              <Plus color={colors.primary} size={22} strokeWidth={3} />
            </Pressable>
          </View>

          <Text style={styles.label}>기록 시간</Text>
          <Pressable style={styles.timeRow} onPress={() => setEditingTime((value) => !value)}>
            <Text style={styles.timeDay}>오늘</Text>
            <Text style={styles.timeValue}>{formatKoreanTime(time)}</Text>
          </Pressable>
          {editingTime && <TimePickerField label="시간 직접 입력" value={time} onChange={setTime} />}

          <Pressable disabled={!isValid || isSaving} style={(!isValid || isSaving) && styles.saveDisabled} onPress={handleSave}>
            <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.saveButton}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>기록 저장하기</Text>}
            </LinearGradient>
          </Pressable>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 12
  },
  sheet: {
    gap: 12,
    padding: 20,
    paddingTop: 10
  },
  grabber: {
    alignSelf: "center",
    backgroundColor: "rgba(47,41,38,0.22)",
    borderRadius: theme.radius.pill,
    height: 4,
    width: 36
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.primaryDark,
    fontSize: 20,
    fontWeight: "900"
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8
  },
  segment: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 46
  },
  segmentActive: {
    backgroundColor: "#F6D7DC",
    borderColor: colors.primary
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.primary
  },
  stepperCard: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  stepButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  amountWrap: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 4
  },
  amountValue: {
    color: colors.primaryDark,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 40
  },
  amountUnit: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 6
  },
  timeRow: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderColor: "rgba(255,255,255,0.95)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  timeDay: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  timeValue: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "800"
  },
  saveButton: {
    alignItems: "center",
    borderRadius: 18,
    marginTop: 4,
    paddingVertical: 15
  },
  saveDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900"
  }
});
