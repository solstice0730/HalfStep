import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Baby,
  Bell,
  ChevronRight,
  CreditCard,
  FileText,
  LogOut,
  ShieldCheck,
  User as UserIcon
} from "lucide-react-native";

import { useAuth } from "@/features/auth/hooks/useAuth";
import { getMyProfile, updateBabyName } from "@/features/mypage/services/mypageService";
import type { MyPageBaby, MyPageProfile } from "@/features/mypage/types/mypage";
import { SubscriptionScreen } from "@/features/subscription/screens/SubscriptionScreen";
import { colors } from "@/shared/constants/colors";

interface MyPageScreenProps {
  onClose: () => void;
}

type LoadStatus = "loading" | "ready" | "error";

// Alert.alert is a no-op on react-native-web (it never shows anything or fires
// button callbacks there), so plain notices fall back to window.alert on web.
function notify(title: string, message: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}\n${message}`);
    }
    return;
  }
  Alert.alert(title, message);
}

export function MyPageScreen({ onClose }: MyPageScreenProps) {
  const { accessToken, user, signOut } = useAuth();
  const [profile, setProfile] = useState<MyPageProfile | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [editingBaby, setEditingBaby] = useState<MyPageBaby | null>(null);
  const [draftName, setDraftName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [subscriptionOpen, setSubscriptionOpen] = useState(false);

  const load = async () => {
    if (!accessToken) return;
    setStatus("loading");
    try {
      const data = await getMyProfile(accessToken);
      setProfile(data);
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  const openBabyEdit = (baby: MyPageBaby) => {
    setEditingBaby(baby);
    setDraftName(baby.name);
  };

  const saveBabyName = async () => {
    if (!accessToken || !editingBaby || !draftName.trim()) return;
    setIsSaving(true);
    try {
      await updateBabyName(accessToken, editingBaby.id, draftName.trim());
      setEditingBaby(null);
      await load();
    } catch {
      notify("저장 실패", "잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  };

  const showComingSoon = (label: string) => {
    notify(label, "준비 중인 기능이에요.");
  };

  const handleLogout = () => {
    const doLogout = () => {
      onClose();
      void signOut();
    };

    // window.confirm needed on web since Alert.alert can't show a real confirm dialog there.
    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm("로그아웃 하시겠어요?")) {
        doLogout();
      }
      return;
    }

    Alert.alert("로그아웃", "로그아웃 하시겠어요?", [
      { text: "취소", style: "cancel" },
      { text: "로그아웃", style: "destructive", onPress: doLogout }
    ]);
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} style={styles.root}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="닫기" accessibilityRole="button" hitSlop={12} onPress={onClose} style={styles.headerButton}>
          <ArrowLeft color={colors.primaryDark} size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>마이페이지</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>내 프로필</Text>
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <UserIcon color={colors.primary} size={26} />
          </View>
          <View style={styles.profileText}>
            <Text style={styles.profileName}>{user?.nickname ?? "이름 없음"}</Text>
            <Text style={styles.profileEmail}>{user?.email ?? "이메일 정보 없음"}</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>아이 프로필</Text>
        {status === "loading" && <ActivityIndicator color={colors.primary} style={styles.spinner} />}
        {status === "error" && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>불러오지 못했어요.</Text>
            <Pressable onPress={load}>
              <Text style={styles.retryText}>다시 시도</Text>
            </Pressable>
          </View>
        )}
        {status === "ready" && profile?.babies.length === 0 && <Text style={styles.emptyText}>등록된 아이 프로필이 없어요.</Text>}
        {status === "ready" &&
          profile?.babies.map((baby) => (
            <Pressable key={baby.id} onPress={() => openBabyEdit(baby)} style={styles.row}>
              <View style={styles.rowIcon}>
                <Baby color={colors.primary} size={18} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{baby.name}</Text>
                <Text style={styles.rowSubtitle}>생후 {baby.ageInDays}일</Text>
              </View>
              <ChevronRight color={colors.textMuted} size={18} />
            </Pressable>
          ))}

        <Text style={styles.sectionLabel}>설정</Text>
        <Pressable onPress={() => showComingSoon("알림 설정")} style={styles.row}>
          <View style={styles.rowIcon}>
            <Bell color={colors.primary} size={18} />
          </View>
          <Text style={styles.rowTitle}>알림 설정</Text>
          <ChevronRight color={colors.textMuted} size={18} />
        </Pressable>
        <Pressable onPress={() => setSubscriptionOpen(true)} style={styles.row}>
          <View style={styles.rowIcon}>
            <CreditCard color={colors.primary} size={18} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>구독 상태</Text>
            <Text style={styles.rowSubtitle}>구독 기능 준비 중</Text>
          </View>
          <ChevronRight color={colors.textMuted} size={18} />
        </Pressable>

        <Text style={styles.sectionLabel}>이용 안내</Text>
        <Pressable onPress={() => showComingSoon("서비스 이용약관")} style={styles.row}>
          <View style={styles.rowIcon}>
            <FileText color={colors.primary} size={18} />
          </View>
          <Text style={styles.rowTitle}>서비스 이용약관</Text>
          <ChevronRight color={colors.textMuted} size={18} />
        </Pressable>
        <Pressable onPress={() => showComingSoon("개인정보 처리방침")} style={styles.row}>
          <View style={styles.rowIcon}>
            <ShieldCheck color={colors.primary} size={18} />
          </View>
          <Text style={styles.rowTitle}>개인정보 처리방침</Text>
          <ChevronRight color={colors.textMuted} size={18} />
        </Pressable>

        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <LogOut color={colors.danger} size={18} />
          <Text style={styles.logoutText}>로그아웃</Text>
        </Pressable>
      </ScrollView>

      <Modal animationType="fade" onRequestClose={() => setEditingBaby(null)} transparent visible={editingBaby !== null}>
        <View style={styles.editBackdrop}>
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>아이 이름 수정</Text>
            <TextInput
              onChangeText={setDraftName}
              placeholder="아이 이름"
              placeholderTextColor={colors.textMuted}
              style={styles.editInput}
              value={draftName}
            />
            <View style={styles.editActions}>
              <Pressable onPress={() => setEditingBaby(null)} style={styles.editCancelButton}>
                <Text style={styles.editCancelText}>취소</Text>
              </Pressable>
              <Pressable
                disabled={isSaving || !draftName.trim()}
                onPress={saveBabyName}
                style={[styles.editSaveButton, (isSaving || !draftName.trim()) && styles.editSaveButtonDisabled]}
              >
                {isSaving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.editSaveText}>저장</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="slide" onRequestClose={() => setSubscriptionOpen(false)} visible={subscriptionOpen}>
        <SubscriptionScreen onClose={() => setSubscriptionOpen(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingBottom: 8,
    paddingTop: 8
  },
  headerButton: {
    alignItems: "center",
    height: 40,
    justifyContent: "center",
    width: 40
  },
  headerTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800"
  },
  body: {
    gap: 10,
    paddingBottom: 40,
    paddingHorizontal: 18
  },
  sectionLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 14
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16
  },
  avatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  profileText: {
    flex: 1,
    gap: 2
  },
  profileName: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "800"
  },
  profileEmail: {
    color: colors.textMuted,
    fontSize: 13
  },
  spinner: {
    marginVertical: 8
  },
  errorBox: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 8
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 13
  },
  retryText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 4
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13
  },
  rowIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34
  },
  rowText: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    color: colors.primaryDark,
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12
  },
  logoutButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    marginTop: 22,
    paddingVertical: 14
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "800"
  },
  editBackdrop: {
    alignItems: "center",
    backgroundColor: "rgba(47,41,38,0.45)",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  editCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    gap: 14,
    padding: 20,
    width: "100%"
  },
  editTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "800"
  },
  editInput: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.text,
    fontSize: 14,
    paddingHorizontal: 14,
    paddingVertical: 12
  },
  editActions: {
    flexDirection: "row",
    gap: 10
  },
  editCancelButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12
  },
  editCancelText: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "700"
  },
  editSaveButton: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flex: 1,
    paddingVertical: 12
  },
  editSaveButtonDisabled: {
    opacity: 0.5
  },
  editSaveText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800"
  }
});
