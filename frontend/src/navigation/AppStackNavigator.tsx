import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { CommunityDetailScreen } from "@/features/community/screens/CommunityDetailScreen";
import { CommunityWriteScreen } from "@/features/community/screens/CommunityWriteScreen";
import { DiaryResultScreen } from "@/features/diary/screens/DiaryResultScreen";
import type { DiaryGenerationRequest, DiaryGenerationResponse } from "@/features/records/types/records";
import { MainTabNavigator } from "@/navigation/MainTabNavigator";

export type AppStackParamList = {
  Tabs: undefined;
  DiaryResult: {
    date: string;
    request: DiaryGenerationRequest;
    response: DiaryGenerationResponse;
    photoUris: string[];
    memo?: string;
  };
  CommunityDetail: { postId: string };
  CommunityWrite: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="DiaryResult" component={DiaryResultScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="CommunityWrite" component={CommunityWriteScreen} options={{ presentation: "card" }} />
    </Stack.Navigator>
  );
}
