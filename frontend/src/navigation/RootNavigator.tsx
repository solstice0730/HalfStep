import { NavigationContainer, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useEffect } from "react";

import { LoginScreen } from "@/features/auth/screens/LoginScreen";
import { AppStackNavigator } from "@/navigation/AppStackNavigator";
import { colors } from "@/shared/constants/colors";
import { useAuth } from "@/features/auth/hooks/useAuth";

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
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  useEffect(() => {
    if (!isBootstrapping && !isAuthenticated) {
      navigation.reset({ index: 0, routes: [{ name: "Login" }] });
    }
  }, [isAuthenticated, isBootstrapping, navigation]);

  if (isBootstrapping || !isAuthenticated) {
    return <BootScreen />;
  }

  return <AppStackNavigator />;
}

function BootScreen() {
  return (
    <View style={styles.boot}>
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
  }
});

