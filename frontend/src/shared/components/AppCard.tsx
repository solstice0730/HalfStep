import { PropsWithChildren } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { colors } from "@/shared/constants/colors";

type AppCardProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

export function AppCard({ children, style }: AppCardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    elevation: 2
  }
});

