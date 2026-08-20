import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { colors } from "@/shared/constants/colors";
import { spacing } from "@/shared/constants/spacing";

interface ScreenProps {
  edges?: Edge[];
}

export function Screen({ children, edges }: PropsWithChildren<ScreenProps>) {
  return (
    <SafeAreaView edges={edges} style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.inner}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.background,
    flex: 1
  },
  content: {
    paddingBottom: spacing.xxl
  },
  inner: {
    gap: spacing.xxl,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg
  }
});
