import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { X } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GlassSurface } from "@/shared/components/GlassSurface";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import type { ImageSourcePropType } from "react-native";

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
      <Pressable accessibilityRole="button" accessibilityLabel="빠른 기록 열기" onPress={onToggle}>
        <LinearGradient colors={["#F2B6BF", colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.main}>
          {open ? (
            <X color="#FFFFFF" size={20} />
          ) : (
            <Image source={require("../../../../assets/images/quick-plus.png")} resizeMode="contain" style={styles.mainImage} />
          )}
        </LinearGradient>
      </Pressable>
      {open && (
        <View style={styles.menu}>
          <MenuItem icon={require("../../../../assets/images/quick-feed.png")} label="수유" onPress={onFeeding} />
          <MenuItem icon={require("../../../../assets/images/quick-sleep.png")} label="수면" onPress={onSleep} />
          <MenuItem icon={require("../../../../assets/images/quick-diaper.png")} label="배변" onPress={onDiaper} />
          <MenuItem icon={require("../../../../assets/images/quick-medicine.png")} label="약" onPress={onMedicine} />
        </View>
      )}
    </View>
  );
}

function MenuItem({ icon, label, onPress }: { icon: ImageSourcePropType; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      {({ pressed }) => (
        <GlassSurface radius={theme.radius.lg} intensity={40} style={pressed && styles.pressed} contentStyle={styles.item}>
          <Image source={icon} resizeMode="contain" style={styles.icon} />
          <Text style={styles.text}>{label}</Text>
        </GlassSurface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.72
  },
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
    gap: 3,
    height: 52,
    justifyContent: "center",
    padding: 0,
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
    borderColor: "rgba(255,255,255,0.9)",
    borderRadius: 999,
    borderWidth: 3,
    height: 46,
    justifyContent: "center",
    width: 46
  },
  mainImage: {
    height: 28,
    width: 28
  }
});
