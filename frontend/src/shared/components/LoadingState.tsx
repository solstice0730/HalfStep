import { ActivityIndicator, StyleSheet, View, type ViewStyle } from "react-native";

import { colors } from "@/shared/constants/colors";

interface LoadingStateProps {
  style?: ViewStyle;
}

export function LoadingState({ style }: LoadingStateProps) {
  return (
    <View style={[styles.wrap, style]}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 24
  }
});
