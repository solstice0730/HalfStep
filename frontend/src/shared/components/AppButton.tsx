import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/constants/colors";

type AppButtonProps = {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  onPress?: () => void;
};

export function AppButton({ label, icon, variant = "primary", onPress }: AppButtonProps) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles[variant]]}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.secondary
  },
  ghost: {
    backgroundColor: colors.surfaceSoft
  },
  icon: {
    height: 20,
    justifyContent: "center",
    width: 20
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "800"
  },
  ghostLabel: {
    color: colors.primaryDark
  }
});

