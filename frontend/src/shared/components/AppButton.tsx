import { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { GlassSurface } from "@/shared/components/GlassSurface";
import { colors } from "@/shared/constants/colors";
import { spacing } from "@/shared/constants/spacing";
import { typography } from "@/shared/constants/typography";

type AppButtonProps = {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onPress?: () => void;
};

// iOS 버튼은 눌렀을 때 살짝 어두워지는 것으로 피드백을 주므로 Pressable의 pressed 상태를
// opacity로 반영한다 (별도 애니메이션 라이브러리 없이 HIG의 누름 피드백을 흉내).
export function AppButton({ label, icon, variant = "primary", disabled, onPress }: AppButtonProps) {
  const content = (
    <>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text style={[styles.label, variant === "ghost" && styles.ghostLabel]}>{label}</Text>
    </>
  );

  if (variant === "ghost") {
    return (
      <Pressable disabled={disabled} onPress={onPress} style={disabled && styles.disabled}>
        {({ pressed }) => (
          <GlassSurface
            radius={999}
            intensity={35}
            noShadow
            style={pressed && styles.pressed}
            contentStyle={[styles.content, styles.ghostContent]}
          >
            {content}
          </GlassSurface>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable disabled={disabled} onPress={onPress} style={disabled && styles.disabled}>
      {({ pressed }) => (
        <LinearGradient
          colors={variant === "primary" ? ["#F2B6BF", colors.primary] : ["#3B332E", colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.content, styles.solidShadow, pressed && styles.pressed]}
        >
          {content}
        </LinearGradient>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: spacing.xl
  },
  ghostContent: {
    minHeight: 50,
    paddingHorizontal: spacing.xl
  },
  solidShadow: {
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 14,
    elevation: 3
  },
  pressed: {
    opacity: 0.78
  },
  disabled: {
    opacity: 0.5
  },
  icon: {
    height: 20,
    justifyContent: "center",
    width: 20
  },
  label: {
    color: "#FFFFFF",
    ...typography.headline
  },
  ghostLabel: {
    color: colors.primaryDark
  }
});
