import { StyleSheet, Text, View } from "react-native";

import { colors } from "@/shared/constants/colors";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 4,
    paddingVertical: 24
  },
  title: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center"
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    textAlign: "center"
  }
});
