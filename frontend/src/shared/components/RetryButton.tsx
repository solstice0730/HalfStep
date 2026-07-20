import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "@/shared/constants/colors";

interface RetryButtonProps {
  onPress: () => void;
  label?: string;
}

export function RetryButton({ onPress, label = "다시 시도" }: RetryButtonProps) {
  return (
    <Pressable onPress={onPress}>
      <Text style={styles.text}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  text: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800"
  }
});
