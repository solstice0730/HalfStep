import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useBaby } from "@/features/baby/hooks/useBaby";
import type { BabyGender } from "@/features/baby/types/baby";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";

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
    <View style={styles.root}>
      <GradientBackdrop />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          <View>
            <Text style={styles.eyebrow}>첫 설정</Text>
            <Text style={styles.title}>아기 정보를 등록해 주세요</Text>
            <Text style={styles.description}>기록과 AI 일지는 등록한 아기를 기준으로 저장됩니다.</Text>
          </View>

          <GlassSurface radius={theme.radius.xl} intensity={34} contentStyle={styles.form}>
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
          </GlassSurface>

          <Pressable disabled={isSaving} onPress={handleSubmit} style={isSaving && styles.disabled}>
            <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.submit}>
              {isSaving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>등록하고 시작하기</Text>}
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { flex: 1, justifyContent: "space-between", paddingHorizontal: 24, paddingBottom: 28, paddingTop: 48 },
  eyebrow: { color: colors.primary, ...typography.footnote, fontWeight: "800" },
  title: { color: colors.primaryDark, ...typography.title1, marginTop: 8 },
  description: { color: colors.textMuted, ...typography.subhead, marginTop: 10 },
  form: { gap: 9 },
  label: { color: colors.primaryDark, ...typography.footnote, fontWeight: "700", marginTop: 8 },
  input: { backgroundColor: "rgba(255,255,255,0.75)", borderColor: colors.border, borderRadius: theme.radius.md, borderWidth: 1, color: colors.text, fontSize: 15, minHeight: 50, paddingHorizontal: 14 },
  segmentedControl: { backgroundColor: "rgba(255,241,236,0.8)", borderRadius: theme.radius.md, flexDirection: "row", padding: 4 },
  segment: { alignItems: "center", borderRadius: theme.radius.sm, flex: 1, minHeight: 40, justifyContent: "center", paddingHorizontal: 4 },
  segmentActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textMuted, fontSize: 12, fontWeight: "700" },
  segmentTextActive: { color: "#FFFFFF" },
  error: { color: colors.danger, fontSize: 13, marginTop: 6 },
  submit: { alignItems: "center", borderRadius: theme.radius.pill, justifyContent: "center", minHeight: 52 },
  submitText: { color: "#FFFFFF", ...typography.headline },
  disabled: { opacity: 0.6 }
});
