import { StyleSheet, Text, View } from "react-native";

import {
  DIAPER_AMOUNT_LABELS,
  FEEDING_TYPE_LABELS,
  STOOL_COLOR_LABELS,
  STOOL_FORM_LABELS,
  URINE_COLOR_LABELS,
  type TodayRecords
} from "@/features/records/types/records";
import { colors } from "@/shared/constants/colors";

interface TodayRecordsListProps {
  records: TodayRecords;
}

const timeOf = (iso: string) => iso.slice(11, 16);

export function TodayRecordsList({ records }: TodayRecordsListProps) {
  const rows = [
    ...records.feeding.map((record) => ({
      key: `feeding-${record.id}`,
      sortKey: record.recordedAt,
      text: `${timeOf(record.recordedAt)} ${FEEDING_TYPE_LABELS[record.feedingType]} ${
        record.amountMl != null ? `${record.amountMl}ml` : record.durationMinutes != null ? `${record.durationMinutes}분` : ""
      }`.trim()
    })),
    ...records.sleep.map((record) => ({
      key: `sleep-${record.id}`,
      sortKey: record.startedAt,
      text: `${timeOf(record.startedAt)} ~ ${timeOf(record.endedAt)} 수면`
    })),
    ...records.urine.map((record) => ({
      key: `urine-${record.id}`,
      sortKey: record.recordedAt,
      text: `${timeOf(record.recordedAt)} 소변${record.amount ? ` · ${DIAPER_AMOUNT_LABELS[record.amount]}` : ""}${
        record.color ? ` · ${URINE_COLOR_LABELS[record.color]}` : ""
      }`
    })),
    ...records.stool.map((record) => ({
      key: `stool-${record.id}`,
      sortKey: record.recordedAt,
      text: `${timeOf(record.recordedAt)} 대변${record.amount ? ` · ${DIAPER_AMOUNT_LABELS[record.amount]}` : ""}${
        record.form ? ` · ${STOOL_FORM_LABELS[record.form]}` : ""
      }${record.color ? ` · ${STOOL_COLOR_LABELS[record.color]}` : ""}`
    }))
  ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

  if (rows.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>오늘 기록된 내용이 없어요.</Text>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <Text key={row.key} style={styles.row}>
          {row.text}
        </Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 6
  },
  row: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700"
  },
  empty: {
    paddingVertical: 8
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13
  }
});
