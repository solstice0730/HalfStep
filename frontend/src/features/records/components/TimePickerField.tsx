import { StyleSheet, Text, TextInput, View } from "react-native";

import { colors } from "@/shared/constants/colors";

export interface TimeValue {
  hour: string;
  minute: string;
}

interface TimePickerFieldProps {
  label: string;
  value: TimeValue;
  onChange: (value: TimeValue) => void;
}

function sanitize(raw: string, max: number): string {
  const digitsOnly = raw.replace(/[^0-9]/g, "").slice(0, 2);
  if (digitsOnly === "") return "";
  const clamped = Math.min(Number(digitsOnly), max);
  return String(clamped);
}

export function timeValueToMinutes({ hour, minute }: TimeValue): number {
  return Number(hour || 0) * 60 + Number(minute || 0);
}

export function nowAsTimeValue(): TimeValue {
  const now = new Date();
  return { hour: String(now.getHours()), minute: String(now.getMinutes()) };
}

export function TimePickerField({ label, value, onChange }: TimePickerFieldProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => onChange({ ...value, hour: sanitize(text, 23) })}
          placeholder="HH"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={value.hour}
        />
        <Text style={styles.colon}>:</Text>
        <TextInput
          keyboardType="number-pad"
          maxLength={2}
          onChangeText={(text) => onChange({ ...value, minute: sanitize(text, 59) })}
          placeholder="MM"
          placeholderTextColor={colors.textMuted}
          style={styles.input}
          value={value.minute}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 6
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800"
  },
  row: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 14,
    borderWidth: 1,
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800",
    height: 46,
    textAlign: "center",
    width: 56
  },
  colon: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900"
  }
});
