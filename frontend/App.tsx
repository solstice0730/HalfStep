import "react-native-gesture-handler";

import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { StatusBar } from "expo-status-bar";

import { restoreDemoServerHost } from "@/config/demoServerStorage";
import { env } from "@/config/env";
import { RootNavigator } from "@/navigation/RootNavigator";
import { AppProviders } from "@/providers/AppProviders";
import { colors } from "@/shared/constants/colors";

export default function App() {
  const [ready, setReady] = useState(!env.enableDevLogin);
  useEffect(() => {
    if (env.enableDevLogin) void restoreDemoServerHost().finally(() => setReady(true));
  }, []);
  if (!ready) return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProviders>
  );
}

const styles = StyleSheet.create({ loading: { alignItems: "center", backgroundColor: colors.background, flex: 1, justifyContent: "center" } });
