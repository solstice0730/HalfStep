import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useBaby } from "@/features/baby/hooks/useBaby";
import type { BabyGender } from "@/features/baby/types/baby";
import { colors } from "@/shared/constants/colors";

const genders: Array<{ value: BabyGender; label: string }> = [
  { value: "FEMALE", label: "여아" },
  { value: "MALE", label: "남아" },
  { value: "UNKNOWN", label: "선택 안 함" }
];

export function BabySetupScreen() {
  const { createBaby } = useBaby();
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<BabyGender>("UNKNOWN");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setError("이름과 생년월일(YYYY-MM-DD)을 확인해 주세요.");
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await createBaby({ name: name.trim(), birthDate, gender });
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "아기 등록에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <View>
          <Text style={styles.eyebrow}>첫 설정</Text>
          <Text style={styles.title}>아기 정보를 등록해 주세요</Text>
          <Text style={styles.description}>기록과 AI 일지는 등록한 아기를 기준으로 저장됩니다.</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>이름</Text>
          <TextInput value={name} onChangeText={setName} placeholder="아기 이름" placeholderTextColor={colors.textMuted} style={styles.input} />
          <Text style={styles.label}>생년월일</Text>
          <TextInput value={birthDate} onChangeText={setBirthDate} placeholder="YYYY-MM-DD" placeholderTextColor={colors.textMuted} keyboardType="numbers-and-punctuation" style={styles.input} />
          <Text style={styles.label}>성별</Text>
          <View style={styles.segmentedControl}>
            {genders.map((item) => (
              <Pressable key={item.value} onPress={() => setGender(item.value)} style={[styles.segment, gender === item.value && styles.segmentActive]}>
                <Text style={[styles.segmentText, gender === item.value && styles.segmentTextActive]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        <Pressable disabled={isSaving} onPress={handleSubmit} style={[styles.submit, isSaving && styles.disabled]}>
          {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>등록하고 시작하기</Text>}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 28, paddingTop: 48 },
  eyebrow: { color: colors.primary, fontSize: 13, fontWeight: "800" },
  title: { color: colors.primaryDark, fontSize: 28, fontWeight: "900", marginTop: 8 },
  description: { color: colors.textMuted, fontSize: 14, lineHeight: 21, marginTop: 10 },
  form: { gap: 9 },
  label: { color: colors.primaryDark, fontSize: 13, fontWeight: "800", marginTop: 8 },
  input: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingHorizontal: 14 },
  segmentedControl: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 8, borderWidth: 1, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: 6, flex: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: "#FFFFFF" },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  submit: { alignItems: "center", backgroundColor: colors.primaryDark, borderRadius: 8, justifyContent: "center", minHeight: 52 },
  submitText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  disabled: { opacity: 0.6 }
});

