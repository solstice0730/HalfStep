import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { TimePickerField, nowAsTimeValue, type TimeValue } from "@/features/records/components/TimePickerField";
import { DIAPER_AMOUNT_LABELS, URINE_COLOR_LABELS, type DiaperAmount, type UrineColor } from "@/features/records/types/records";
import { colors } from "@/shared/constants/colors";

interface UrineRecordModalProps {
  visible: boolean;
  isSaving: boolean;
  onClose: () => void;
  onSave: (record: { time: TimeValue; amount: DiaperAmount; color: UrineColor }) => Promise<boolean>;
}

const AMOUNTS = Object.keys(DIAPER_AMOUNT_LABELS) as DiaperAmount[];
const COLORS = Object.keys(URINE_COLOR_LABELS) as UrineColor[];

export function UrineRecordModal({ visible, isSaving, onClose, onSave }: UrineRecordModalProps) {
  const [time, setTime] = useState<TimeValue>(nowAsTimeValue());
  const [amount, setAmount] = useState<DiaperAmount>("MEDIUM");
  const [color, setColor] = useState<UrineColor>("NORMAL");

  const isValid = time.hour !== "" && time.minute !== "";

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    if (await onSave({ time, amount, color })) {
      setTime(nowAsTimeValue());
    }
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>소변 기록</Text>
            <Pressable onPress={onClose}>
              <X color={colors.primaryDark} size={22} />
            </Pressable>
          </View>

          <TimePickerField label="기록 시간" value={time} onChange={setTime} />

          <Text style={styles.label}>양</Text>
          <View style={styles.segmentRow}>
            {AMOUNTS.map((option) => (
              <Pressable
                key={option}
                style={[styles.segment, amount === option && styles.segmentActive]}
                onPress={() => setAmount(option)}
              >
                <Text style={[styles.segmentText, amount === option && styles.segmentTextActive]}>
                  {DIAPER_AMOUNT_LABELS[option]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>색깔</Text>
          <View style={styles.segmentRow}>
            {COLORS.map((option) => (
              <Pressable
                key={option}
                style={[styles.segment, color === option && styles.segmentActive]}
                onPress={() => setColor(option)}
              >
                <Text style={[styles.segmentText, color === option && styles.segmentTextActive]}>
                  {URINE_COLOR_LABELS[option]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>취소</Text>
            </Pressable>
            <Pressable disabled={!isValid || isSaving} style={[styles.saveButton, (!isValid || isSaving) && styles.saveButtonDisabled]} onPress={handleSave}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveButtonText}>저장</Text>}
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
    flexWrap: "wrap",
    gap: 8
  },
  segment: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 12
  },
  segmentActive: {
    backgroundColor: colors.primary
  },
  segmentText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "900"
  },
  segmentTextActive: {
    color: "#FFFFFF"
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
