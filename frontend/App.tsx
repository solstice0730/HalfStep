import "react-native-gesture-handler";

import { StatusBar } from "expo-status-bar";

import { RootNavigator } from "@/navigation/RootNavigator";
import { AppProviders } from "@/providers/AppProviders";

export default function App() {
  return (
    <AppProviders>
      <StatusBar style="dark" />
      <RootNavigator />
    </AppProviders>
  );
}
