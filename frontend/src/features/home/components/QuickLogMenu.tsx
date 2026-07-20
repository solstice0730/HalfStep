import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";

import { colors } from "@/shared/constants/colors";

interface QuickLogMenuProps {
  open: boolean;
  onToggle: () => void;
  onFeeding: () => void;
  onSleep: () => void;
  onDiaper: () => void;
  onMedicine: () => void;
}

export function QuickLogMenu({ open, onToggle, onFeeding, onSleep, onDiaper, onMedicine }: QuickLogMenuProps) {
  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="빠른 기록 열기"
        style={[styles.main, open && styles.mainActive]}
        onPress={onToggle}
      >
        {open ? (
          <X color="#FFFFFF" size={20} />
        ) : (
          <Image source={require("../../../../assets/images/quick-plus.png")} resizeMode="contain" style={styles.mainImage} />
        )}
      </Pressable>
      {open && (
        <View style={styles.menu}>
          <Pressable style={styles.item} onPress={onFeeding}>
            <Image source={require("../../../../assets/images/quick-feed.png")} resizeMode="contain" style={styles.icon} />
            <Text style={styles.text}>수유</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={onSleep}>
            <Image source={require("../../../../assets/images/quick-sleep.png")} resizeMode="contain" style={styles.icon} />
            <Text style={styles.text}>수면</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={onDiaper}>
            <Image source={require("../../../../assets/images/quick-diaper.png")} resizeMode="contain" style={styles.icon} />
            <Text style={styles.text}>배변</Text>
          </Pressable>
          <Pressable style={styles.item} onPress={onMedicine}>
            <Image source={require("../../../../assets/images/quick-medicine.png")} resizeMode="contain" style={styles.icon} />
            <Text style={styles.text}>약</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 8,
    position: "relative",
    zIndex: 30
  },
  menu: {
    alignItems: "center",
    gap: 8,
    position: "absolute",
    right: 0,
    top: 54,
    width: 92
  },
  item: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 3,
    height: 44,
    justifyContent: "center",
    width: 64
  },
  icon: {
    height: 24,
    width: 26
  },
  text: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: "900"
  },
  main: {
    alignItems: "center",
    backgroundColor: colors.accent,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 3,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  mainActive: {
    backgroundColor: colors.primary
  },
  mainImage: {
    height: 28,
    width: 28
  }
});
