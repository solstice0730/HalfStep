import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { X } from "lucide-react-native";

import { TimePickerField, nowAsTimeValue, type TimeValue } from "@/features/records/components/TimePickerField";
import { FEEDING_TYPE_LABELS, type FeedingType } from "@/features/records/types/records";
import { colors } from "@/shared/constants/colors";

interface FeedingRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (record: { time: TimeValue; feedingType: FeedingType; amountMl?: number; durationMinutes?: number }) => void;
}

const FEEDING_TYPES = Object.keys(FEEDING_TYPE_LABELS) as FeedingType[];

export function FeedingRecordModal({ visible, onClose, onSave }: FeedingRecordModalProps) {
  const [time, setTime] = useState<TimeValue>(nowAsTimeValue());
  const [feedingType, setFeedingType] = useState<FeedingType>("FORMULA");
  const [amount, setAmount] = useState("");

  // 모유는 분·breast(수유 시간), 분유/혼합은 ml(수유량) — backend/app/schemas/records.py 검증 규칙과 동일.
  const isBreast = feedingType === "BREAST";
  const amountValue = Number(amount);
  const isValid = amount.trim().length > 0 && Number.isFinite(amountValue) && amountValue > 0;

  const handleSave = () => {
    if (!isValid) return;
    onSave(
      isBreast
        ? { time, feedingType, durationMinutes: amountValue }
        : { time, feedingType, amountMl: amountValue }
    );
    setAmount("");
    setTime(nowAsTimeValue());
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>수유 기록</Text>
            <Pressable onPress={onClose}>
              <X color={colors.primaryDark} size={22} />
            </Pressable>
          </View>

          <TimePickerField label="기록 시간" value={time} onChange={setTime} />

          <Text style={styles.label}>수유 방식</Text>
          <View style={styles.segmentRow}>
            {FEEDING_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.segment, feedingType === type && styles.segmentActive]}
                onPress={() => setFeedingType(type)}
              >
                <Text style={[styles.segmentText, feedingType === type && styles.segmentTextActive]}>
                  {FEEDING_TYPE_LABELS[type]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{isBreast ? "수유 시간 (분)" : "수유량 (ml)"}</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setAmount}
            placeholder={isBreast ? "예: 15" : "예: 120"}
            placeholderTextColor={colors.textMuted}
            style={styles.input}
            value={amount}
          />

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable disabled={!isValid} style={[styles.saveButton, !isValid && styles.saveButtonDisabled]} onPress={handleSave}>
              <Text style={styles.saveButtonText}>저장</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
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
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  title: {
    color: colors.primaryDark,
    fontSize: 19,
    fontWeight: "900"
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    flex: 1,
    justifyContent: "center",
    minHeight: 44
  },
  segmentActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: "#FFFFFF"
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 14,
    minHeight: 48,
    paddingHorizontal: 14
  },
  actionRow: {
    flexDirection: "row",
    gap: 10
  },
  cancelButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 18,
    flex: 1,
    paddingVertical: 14
  },
  cancelButtonText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  saveButton: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderRadius: 18,
    flex: 1,
    paddingVertical: 14
  },
  saveButtonDisabled: {
    opacity: 0.5
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900"
  }
});
