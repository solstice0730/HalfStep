import { useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { TimePickerField, nowAsTimeValue, timeValueToMinutes, type TimeValue } from "@/features/records/components/TimePickerField";
import { colors } from "@/shared/constants/colors";

interface SleepRecordModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (record: { start: TimeValue; end: TimeValue }) => void;
}

export function SleepRecordModal({ visible, onClose, onSave }: SleepRecordModalProps) {
  const [start, setStart] = useState<TimeValue>(nowAsTimeValue());
  const [end, setEnd] = useState<TimeValue>(nowAsTimeValue());

  const hasBothTimes = start.hour !== "" && start.minute !== "" && end.hour !== "" && end.minute !== "";
  const endBeforeStart = hasBothTimes && timeValueToMinutes(end) <= timeValueToMinutes(start);
  const isValid = hasBothTimes && !endBeforeStart;

  const handleSave = () => {
    if (!isValid) return;
    onSave({ start, end });
    setStart(nowAsTimeValue());
    setEnd(nowAsTimeValue());
  };

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>수면 기록</Text>
            <Pressable onPress={onClose}>
              <X color={colors.primaryDark} size={22} />
            </Pressable>
          </View>

          <View style={styles.timeRow}>
            <TimePickerField label="시작 시간" value={start} onChange={setStart} />
            <TimePickerField label="종료 시간" value={end} onChange={setEnd} />
          </View>

          {endBeforeStart && <Text style={styles.errorText}>종료 시간은 시작 시간보다 늦어야 해요.</Text>}

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
  timeRow: {
    flexDirection: "row",
    gap: 20
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    marginTop: -6
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
