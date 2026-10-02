import { NavigationContainer, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { useEffect } from "react";

import { LoginScreen } from "@/features/auth/screens/LoginScreen";
import { AppStackNavigator } from "@/navigation/AppStackNavigator";
import { colors } from "@/shared/constants/colors";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBaby } from "@/features/baby/hooks/useBaby";
import { BabySetupScreen } from "@/features/baby/screens/BabySetupScreen";
import { ErrorState } from "@/shared/components/ErrorState";
import { DemoServerConnection } from "@/shared/components/DemoServerConnection";

type RootStackParamList = {
  Login: undefined;
  Main: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const linking = {
  prefixes: ["http://localhost:8081", "halfstep://"],
  config: {
    screens: {
      Login: "login",
      Main: {
        path: "",
        screens: {
          Tabs: {
            path: "",
            screens: {
              Home: "",
              Records: "records",
              Calendar: "calendar",
              Community: "community"
            }
          }
        }
      }
    }
  }
};

export function RootNavigator() {
  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginRoute} />
        <Stack.Screen name="Main" component={MainRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function LoginRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!isBootstrapping && isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: "Main" }] });
    }
  }, [isAuthenticated, isBootstrapping, navigation]);

  if (isBootstrapping || isAuthenticated) {
    return <BootScreen />;
  }

  return <LoginScreen />;
}

function MainRoute() {
  const { isAuthenticated, isBootstrapping } = useAuth();
  const { babies, error, isLoading, refresh } = useBaby();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [isAuthenticated, isBootstrapping, navigation]);

  if (isBootstrapping || !isAuthenticated || isLoading) {
    return <BootScreen />;
  }

  if (error) {
    return <View style={styles.center}><ErrorState message={error} onRetry={() => void refresh()} /><DemoServerConnection onConnected={() => void refresh()} /></View>;
  }

  if (babies.length === 0) return <BabySetupScreen />;

  return <AppStackNavigator />;
}

function BootScreen() {
  return (
    <View style={styles.boot}>
      <Image
        source={require("../../assets/images/app-icon.png")}
        accessibilityLabel="반걸음 앱 로고"
        style={styles.bootIcon}
      />
      <Text style={styles.bootTitle}>반걸음</Text>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: "center"
  },
  bootIcon: { borderRadius: 24, height: 96, marginBottom: 14, width: 96 },
  bootTitle: { color: colors.text, fontSize: 22, fontWeight: "700", marginBottom: 20 },
  center: { backgroundColor: colors.background, flex: 1, justifyContent: "center", padding: 24 }
});
