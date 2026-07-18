import { StyleSheet, Text, View } from "react-native";

import { RetryButton } from "@/shared/components/RetryButton";
import { colors } from "@/shared/constants/colors";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{message}</Text>
      {onRetry && <RetryButton onPress={onRetry} />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 16
  },
  text: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  }
});
