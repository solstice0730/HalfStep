import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/constants/colors";
import { spacing } from "@/shared/constants/spacing";

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
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: spacing.xl
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.primaryDark
  },
  ghost: {
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.border,
    borderWidth: 1
  },
  icon: {
    height: 20,
    justifyContent: "center",
    width: 20
  },
  label: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22
  },
  ghostLabel: {
    color: colors.primaryDark
  }
});

