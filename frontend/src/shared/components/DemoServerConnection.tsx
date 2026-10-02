import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { currentDemoServerHost, saveDemoServerHost } from "@/config/demoServerStorage";
import { demoApiUrlForHost, env } from "@/config/env";
import { colors } from "@/shared/constants/colors";

export function DemoServerConnection({ onConnected }: { onConnected?: () => void }) {
  const [visible, setVisible] = useState(false);
  const [host, setHost] = useState(currentDemoServerHost);
  const [message, setMessage] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  if (!env.enableDevLogin) return null;

  const open = () => {
    setHost(currentDemoServerHost());
    setMessage(null);
    setVisible(true);
  };

  const connect = async () => {
    const url = demoApiUrlForHost(host);
    if (!url) {
      setMessage("맥북의 사설망 IPv4 주소를 입력해 주세요. 예: 172.20.10.2");
      return;
    }
    setChecking(true);
    setMessage(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${url.replace(/\/api$/, "")}/openapi.json`, { signal: controller.signal });
      if (!response.ok || (await response.json())?.info?.title !== "HalfStep API") {
        throw new Error("반걸음 서버를 확인하지 못했습니다.");
      }
      await saveDemoServerHost(host);
      setVisible(false);
      onConnected?.();
    } catch {
      setMessage("연결할 수 없습니다. 맥북 서버와 아이폰 네트워크를 확인해 주세요.");
    } finally {
      clearTimeout(timeout);
      setChecking(false);
    }
  };

  return (
    <>
      <Pressable accessibilityRole="button" onPress={open} style={styles.openButton}>
        <Text style={styles.openText}>시연 서버 연결</Text>
      </Pressable>
      <Modal animationType="fade" onRequestClose={() => setVisible(false)} transparent visible={visible}>
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>시연 서버 연결</Text>
            <Text style={styles.help}>맥북의 현재 IP 주소를 입력하세요. 연결 확인 후 저장됩니다.</Text>
            <TextInput
              accessibilityLabel="맥북 서버 IP 주소"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="numbers-and-punctuation"
              onChangeText={setHost}
              placeholder="172.20.10.2"
              selectTextOnFocus
              style={styles.input}
              value={host}
            />
            {message ? <Text accessibilityRole="alert" style={styles.error}>{message}</Text> : null}
            <View style={styles.actions}>
              <Pressable accessibilityRole="button" disabled={checking} onPress={() => setVisible(false)} style={styles.action}>
                <Text style={styles.cancelText}>취소</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={checking} onPress={() => void connect()} style={[styles.action, styles.save]}>
                {checking ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveText}>연결 확인·저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  openButton: { alignSelf: "center", minHeight: 44, justifyContent: "center", paddingHorizontal: 12 },
  openText: { color: colors.primaryDark, fontSize: 14, fontWeight: "700" },
  backdrop: { alignItems: "center", backgroundColor: "#0008", flex: 1, justifyContent: "center", padding: 24 },
  card: { backgroundColor: colors.surface, borderRadius: 22, gap: 14, padding: 22, width: "100%" },
  title: { color: colors.primaryDark, fontSize: 20, fontWeight: "700" },
  help: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  input: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.text, fontSize: 18, minHeight: 50, paddingHorizontal: 14 },
  error: { color: colors.danger, fontSize: 13 },
  actions: { flexDirection: "row", gap: 10 },
  action: { alignItems: "center", borderRadius: 12, flex: 1, justifyContent: "center", minHeight: 46 },
  cancelText: { color: colors.primaryDark, fontWeight: "700" },
  save: { backgroundColor: colors.primary },
  saveText: { color: "#FFFFFF", fontWeight: "700" }
});
