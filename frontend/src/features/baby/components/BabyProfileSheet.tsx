import { Check, Pencil, Plus, Trash2, X } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useBaby } from "@/features/baby/hooks/useBaby";
import type { Baby, BabyGender } from "@/features/baby/types/baby";
import { colors } from "@/shared/constants/colors";

type Props = { visible: boolean; onClose: () => void };
const genderOptions: Array<{ value: BabyGender; label: string }> = [
  { value: "FEMALE", label: "여아" }, { value: "MALE", label: "남아" }, { value: "UNKNOWN", label: "미선택" }
];

export function BabyProfileSheet({ visible, onClose }: Props) {
  const { babies, activeBaby, activateBaby, createBaby, updateBaby, deleteBaby } = useBaby();
  const [editing, setEditing] = useState<Baby | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<BabyGender>("UNKNOWN");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) resetForm();
  }, [visible]);

  const resetForm = () => {
    setEditing(null); setIsAdding(false); setName(""); setBirthDate(""); setGender("UNKNOWN"); setError(null);
  };

  const startEdit = (baby: Baby) => {
    setEditing(baby); setIsAdding(false); setName(baby.name); setBirthDate(baby.birthDate); setGender(baby.gender); setError(null);
  };

  const save = async () => {
    if (!name.trim() || (isAdding && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate))) {
      setError("이름과 생년월일을 확인해 주세요."); return;
    }
    setIsSaving(true); setError(null);
    try {
      if (editing) await updateBaby(editing.id, { name: name.trim(), gender });
      else await createBaby({ name: name.trim(), birthDate, gender });
      resetForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "저장하지 못했습니다.");
    } finally { setIsSaving(false); }
  };

  const confirmDelete = (baby: Baby) => Alert.alert("아기 정보 삭제", `${baby.name}의 정보와 연결된 기록을 삭제할까요?`, [
    { text: "취소", style: "cancel" },
    { text: "삭제", style: "destructive", onPress: () => void deleteBaby(baby.id).catch(() => setError("삭제하지 못했습니다.")) }
  ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => undefined}>
          <View style={styles.header}>
            <Text style={styles.title}>아기 프로필</Text>
            <Pressable accessibilityLabel="닫기" onPress={onClose} style={styles.iconButton}><X color={colors.primaryDark} size={20} /></Pressable>
          </View>
          <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
            {babies.map((baby) => (
              <View key={baby.id} style={[styles.babyRow, baby.id === activeBaby?.id && styles.activeRow]}>
                <Pressable style={styles.babyMain} onPress={() => void activateBaby(baby.id)}>
                  <View><Text style={styles.babyName}>{baby.name}</Text><Text style={styles.babyMeta}>{baby.birthDate} · 생후 {baby.ageInDays}일</Text></View>
                  {baby.id === activeBaby?.id ? <Check color={colors.success} size={20} /> : null}
                </Pressable>
                <Pressable accessibilityLabel="수정" onPress={() => startEdit(baby)} style={styles.iconButton}><Pencil color={colors.textMuted} size={17} /></Pressable>
                <Pressable accessibilityLabel="삭제" onPress={() => confirmDelete(baby)} style={styles.iconButton}><Trash2 color={colors.danger} size={17} /></Pressable>
              </View>
            ))}
          </ScrollView>

          {(isAdding || editing) ? (
            <View style={styles.form}>
              <TextInput value={name} onChangeText={setName} placeholder="아기 이름" placeholderTextColor={colors.textMuted} style={styles.input} />
              {isAdding ? <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="생년월일 YYYY-MM-DD" placeholderTextColor={colors.textMuted} style={styles.input} /> : null}
              <View style={styles.genderRow}>{genderOptions.map((option) => <Pressable key={option.value} onPress={() => setGender(option.value)} style={[styles.gender, gender === option.value && styles.genderActive]}><Text style={[styles.genderText, gender === option.value && styles.genderTextActive]}>{option.label}</Text></Pressable>)}</View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <View style={styles.actions}><Pressable onPress={resetForm} style={styles.cancel}><Text style={styles.cancelText}>취소</Text></Pressable><Pressable disabled={isSaving} onPress={save} style={styles.save}>{isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>저장</Text>}</Pressable></View>
            </View>
          ) : (
            <Pressable onPress={() => { resetForm(); setIsAdding(true); }} style={styles.add}><Plus color="#FFFFFF" size={18} /><Text style={styles.addText}>아기 추가</Text></Pressable>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: "rgba(47,41,38,0.38)", flex: 1, justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "82%", padding: 18 },
  header: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: { color: colors.primaryDark, fontSize: 20, fontWeight: "900" },
  iconButton: { alignItems: "center", height: 38, justifyContent: "center", width: 38 },
  list: { marginVertical: 12 }, listContent: { gap: 8 },
  babyRow: { alignItems: "center", backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", padding: 8 },
  activeRow: { borderColor: colors.success }, babyMain: { alignItems: "center", flex: 1, flexDirection: "row", justifyContent: "space-between", paddingLeft: 6 },
  babyName: { color: colors.primaryDark, fontSize: 15, fontWeight: "800" }, babyMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  form: { borderTopColor: colors.border, borderTopWidth: 1, gap: 9, paddingTop: 14 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, minHeight: 46, paddingHorizontal: 12 },
  genderRow: { flexDirection: "row", gap: 6 }, gender: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 6, flex: 1, paddingVertical: 10 },
  genderActive: { backgroundColor: colors.primary }, genderText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" }, genderTextActive: { color: "#FFFFFF" },
  actions: { flexDirection: "row", gap: 8 }, cancel: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 8, flex: 1, paddingVertical: 13 }, cancelText: { color: colors.text, fontWeight: "800" },
  save: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 8, flex: 1, paddingVertical: 13 }, saveText: { color: "#FFFFFF", fontWeight: "800" },
  add: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 8, flexDirection: "row", gap: 7, justifyContent: "center", minHeight: 48 }, addText: { color: "#FFFFFF", fontWeight: "800" },
  error: { color: colors.danger, fontSize: 12 }
});
