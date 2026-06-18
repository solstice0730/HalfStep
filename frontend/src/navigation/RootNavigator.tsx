import { NavigationContainer } from "@react-navigation/native";

import { MainTabNavigator } from "@/navigation/MainTabNavigator";

export function RootNavigator() {
  return (
    <NavigationContainer>
      <MainTabNavigator />
    </NavigationContainer>
  );
}

