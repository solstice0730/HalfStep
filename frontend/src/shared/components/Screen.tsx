import { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";

import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { spacing } from "@/shared/constants/spacing";

interface ScreenProps {
  edges?: Edge[];
}

export function Screen({ children, edges }: PropsWithChildren<ScreenProps>) {
  return (
    <View style={styles.root}>
      <GradientBackdrop />
      <SafeAreaView edges={edges} style={styles.safeArea}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  safeArea: {
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
