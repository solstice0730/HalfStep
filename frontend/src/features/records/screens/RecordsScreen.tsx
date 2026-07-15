import * as ImagePicker from "expo-image-picker";
import { Baby, BedDouble, Camera, Droplets, Milk, Plus, RefreshCw, X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { env } from "@/config/env";
import { useAuth } from "@/features/auth/hooks/useAuth";
import type { CareRecord, RecordCreateBody, RecordType } from "@/features/records/types/records";
import { createRecord, listRecords } from "@/services/api/recordsApi";
import { colors } from "@/shared/constants/colors";

const recordTypes: Array<{ type: RecordType; label: string }> = [
  { type: "FEEDING", label: "수유" }, { type: "SLEEP", label: "수면" },
  { type: "URINE", label: "소변" }, { type: "STOOL", label: "대변" }
];

const today = () => new Date().toISOString().slice(0, 10);
const nowIso = () => new Date().toISOString();

export function RecordsScreen() {
  const { accessToken } = useAuth();
  const [records, setRecords] = useState<CareRecord[]>([]);
  const [filter, setFilter] = useState<RecordType | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditor] = useState<RecordType | null>(null);
  const [saving, setSaving] = useState(false);
  const [amount, setAmount] = useState("");
  const [duration, setDuration] = useState("");
  const [memo, setMemo] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try { setRecords(await listRecords(accessToken, env.demoBabyId, today(), filter)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "기록을 불러오지 못했습니다."); }
    finally { setLoading(false); }
  }, [accessToken, filter]);

  useEffect(() => { load(); }, [load]);

  const summary = useMemo(() => ({
    FEEDING: records.filter((item) => item.type === "FEEDING").length,
    SLEEP: records.filter((item) => item.type === "SLEEP").length,
    URINE: records.filter((item) => item.type === "URINE").length,
    STOOL: records.filter((item) => item.type === "STOOL").length
  }), [records]);

  const save = async () => {
    if (!accessToken || !editor) return;
    setSaving(true); setError(null);
    const current = new Date();
    const base = { babyId: env.demoBabyId };
    let body: RecordCreateBody;
    if (editor === "FEEDING") {
      body = { ...base, occurredAt: nowIso(), feedingType: amount ? "FORMULA" : "BREAST",
        amountMl: amount ? Number(amount) : undefined, durationMinutes: duration ? Number(duration) : undefined,
        breastSide: amount ? undefined : "BOTH", burped: null, memo: memo || null };
    } else if (editor === "SLEEP") {
      body = { ...base, startedAt: new Date(current.getTime() - Math.max(1, Number(duration) || 60) * 60000).toISOString(),
        endedAt: current.toISOString(), sleepType: "NAP", status: null };
    } else if (editor === "URINE") {
      body = { ...base, occurredAt: nowIso(), amount: "MEDIUM", color: "NORMAL" };
    } else {
      body = { ...base, occurredAt: nowIso(), amount: "MEDIUM", color: "NORMAL", form: "NORMAL", photoUrl: null };
    }
    try {
      await createRecord(accessToken, editor, body);
      setEditor(null); setAmount(""); setDuration(""); setMemo(""); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "기록 저장에 실패했습니다."); }
    finally { setSaving(false); }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsMultipleSelection: true, selectionLimit: 5 });
    if (!result.canceled) setPhotos(result.assets.map((asset) => asset.uri).slice(0, 5));
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>{today()}</Text><Text style={styles.title}>오늘의 기록</Text></View>
          <Pressable accessibilityLabel="기록 새로고침" style={styles.iconButton} onPress={load}><RefreshCw color={colors.primary} size={20} /></Pressable>
        </View>

        <View style={styles.summaryRow}>
          {recordTypes.map(({ type, label }) => <Pressable key={type} style={[styles.summaryItem, filter === type && styles.summaryActive]} onPress={() => setFilter(filter === type ? undefined : type)}><Text style={styles.summaryCount}>{summary[type]}</Text><Text style={styles.summaryLabel}>{label}</Text></Pressable>)}
        </View>

        <View style={styles.quickRow}>
          {recordTypes.map(({ type, label }) => <Pressable key={type} style={styles.quickButton} onPress={() => setEditor(type)}>{type === "FEEDING" ? <Milk color={colors.primary} size={20} /> : type === "SLEEP" ? <BedDouble color={colors.primary} size={20} /> : type === "URINE" ? <Droplets color={colors.primary} size={20} /> : <Baby color={colors.primary} size={20} />}<Text style={styles.quickText}>{label}</Text><Plus color={colors.textMuted} size={15} /></Pressable>)}
        </View>

        <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>기록 타임라인</Text>{filter && <Text style={styles.filterText}>{recordTypes.find((item) => item.type === filter)?.label}</Text>}</View>
        {loading ? <View style={styles.state}><ActivityIndicator color={colors.primary} /><Text style={styles.stateText}>기록을 불러오는 중입니다.</Text></View> : error ? <View style={styles.state}><Text style={styles.errorText}>{error}</Text><Pressable style={styles.retry} onPress={load}><Text style={styles.retryText}>다시 시도</Text></Pressable></View> : records.length === 0 ? <View style={styles.state}><Text style={styles.emptyTitle}>아직 기록이 없습니다</Text><Text style={styles.stateText}>위 버튼으로 첫 기록을 남겨보세요.</Text></View> : <View style={styles.timeline}>{records.map((record) => <View key={record.id} style={styles.recordRow}><View style={styles.dot} /><View style={styles.recordBody}><Text style={styles.recordTitle}>{recordTypes.find((item) => item.type === record.type)?.label}</Text><Text style={styles.recordTime}>{new Date(record.occurredAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</Text><Text style={styles.recordDetail}>{formatRecord(record)}</Text></View></View>)}</View>}

        <View style={styles.photoSection}><View style={styles.sectionHeader}><Text style={styles.sectionTitle}>오늘 사진</Text><Text style={styles.filterText}>{photos.length}/5</Text></View>{photos.length === 0 ? <Pressable style={styles.photoEmpty} onPress={pickPhoto}><Camera color={colors.primary} size={28} /><Text style={styles.emptyTitle}>AI 일지에 사용할 사진을 골라보세요</Text><Text style={styles.stateText}>사진이 없어도 기록은 계속 저장됩니다.</Text></Pressable> : <><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>{photos.map((uri) => <Image key={uri} source={{ uri }} style={styles.photo} />)}</ScrollView><Pressable style={styles.changePhotos} onPress={pickPhoto}><Text style={styles.retryText}>사진 다시 선택</Text></Pressable></>}</View>
      </ScrollView>

      <Modal visible={editor !== null} transparent animationType="slide" onRequestClose={() => setEditor(null)}><View style={styles.backdrop}><View style={styles.sheet}><View style={styles.sectionHeader}><Text style={styles.sheetTitle}>{recordTypes.find((item) => item.type === editor)?.label} 기록</Text><Pressable onPress={() => setEditor(null)}><X color={colors.primaryDark} size={22} /></Pressable></View>{editor === "FEEDING" && <><TextInput value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholder="수유량 ml (수유 시간과 택일)" style={styles.input} /><TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="수유 시간 분 (수유량과 택일)" style={styles.input} /><TextInput value={memo} onChangeText={setMemo} placeholder="메모 (선택)" style={styles.input} /></>}{editor === "SLEEP" && <TextInput value={duration} onChangeText={setDuration} keyboardType="number-pad" placeholder="수면 시간 (분)" style={styles.input} />}{(editor === "URINE" || editor === "STOOL") && <Text style={styles.stateText}>현재 시각에 보통 양과 정상 색상으로 빠르게 기록합니다.</Text>}<Pressable disabled={saving || (editor === "FEEDING" && !amount && !duration)} style={[styles.saveButton, saving && styles.disabled]} onPress={save}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>저장하기</Text>}</Pressable></View></View></Modal>
    </SafeAreaView>
  );
}

function formatRecord(record: CareRecord) {
  if (record.type === "FEEDING") return record.content.formulaAmountMl ? `${record.content.formulaAmountMl}ml` : `${record.content.durationMinutes ?? "-"}분`;
  if (record.type === "SLEEP" && record.startedAt && record.endedAt) return `${Math.round((new Date(record.endedAt).getTime() - new Date(record.startedAt).getTime()) / 60000)}분`;
  return [record.content.amount, record.content.color, record.content.form].filter(Boolean).join(" · ") || "기록 완료";
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, content: { gap: 18, padding: 18, paddingBottom: 36 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, eyebrow: { color: colors.textMuted, fontSize: 12 }, title: { color: colors.primaryDark, fontSize: 26, fontWeight: "900" },
  iconButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 6, height: 42, justifyContent: "center", width: 42 },
  summaryRow: { flexDirection: "row", gap: 8 }, summaryItem: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 6, borderWidth: 1, flex: 1, paddingVertical: 10 }, summaryActive: { backgroundColor: colors.blueSoft, borderColor: colors.primary }, summaryCount: { color: colors.primaryDark, fontSize: 20, fontWeight: "900" }, summaryLabel: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  quickRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, quickButton: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 6, flexDirection: "row", gap: 8, minHeight: 48, paddingHorizontal: 12, width: "48.7%" }, quickText: { color: colors.primaryDark, flex: 1, fontSize: 14, fontWeight: "800" },
  sectionHeader: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" }, sectionTitle: { color: colors.primaryDark, fontSize: 18, fontWeight: "900" }, filterText: { color: colors.primary, fontSize: 12, fontWeight: "800" },
  state: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 6, gap: 8, minHeight: 140, justifyContent: "center", padding: 20 }, stateText: { color: colors.textMuted, fontSize: 13, lineHeight: 19, textAlign: "center" }, emptyTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: "900", textAlign: "center" }, errorText: { color: colors.danger, fontSize: 13, textAlign: "center" }, retry: { backgroundColor: colors.blueSoft, borderRadius: 6, paddingHorizontal: 14, paddingVertical: 9 }, retryText: { color: colors.primary, fontSize: 13, fontWeight: "900" },
  timeline: { gap: 8 }, recordRow: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 6, borderWidth: 1, flexDirection: "row", gap: 12, padding: 14 }, dot: { backgroundColor: colors.accent, borderRadius: 999, height: 10, marginTop: 5, width: 10 }, recordBody: { flex: 1 }, recordTitle: { color: colors.primaryDark, fontSize: 15, fontWeight: "900" }, recordTime: { color: colors.textMuted, fontSize: 12, marginTop: 2 }, recordDetail: { color: colors.text, fontSize: 13, marginTop: 7 },
  photoSection: { gap: 10 }, photoEmpty: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 6, borderStyle: "dashed", borderWidth: 1, gap: 7, minHeight: 150, justifyContent: "center", padding: 18 }, photoRow: { gap: 8 }, photo: { borderRadius: 6, height: 120, width: 96 }, changePhotos: { alignItems: "center", padding: 8 },
  backdrop: { backgroundColor: "rgba(45,37,32,0.38)", flex: 1, justifyContent: "flex-end" }, sheet: { backgroundColor: colors.background, borderTopLeftRadius: 8, borderTopRightRadius: 8, gap: 12, padding: 20, paddingBottom: 32 }, sheetTitle: { color: colors.primaryDark, fontSize: 20, fontWeight: "900" }, input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 6, borderWidth: 1, color: colors.text, minHeight: 48, paddingHorizontal: 14 }, saveButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: 6, minHeight: 50, justifyContent: "center" }, disabled: { opacity: 0.5 }, saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" }
});
