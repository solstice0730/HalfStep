import type { NavigatorScreenParams } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { AiChatScreen } from "@/features/chatbot/screens/AiChatScreen";
import type { CalendarDiary } from "@/features/calendar/services/calendarApi";
import { CommunityDetailScreen } from "@/features/community/screens/CommunityDetailScreen";
import type { CommunityPostDetail } from "@/features/community/types/community";
import { DiaryEditScreen } from "@/features/diary/screens/DiaryEditScreen";
import { CommunityWriteScreen } from "@/features/community/screens/CommunityWriteScreen";
import { DiaryResultScreen } from "@/features/diary/screens/DiaryResultScreen";
import type { DiaryMaterialCounts, DiaryPhotoDraft } from "@/features/diary/types/diary";
import type { DiaryGenerationRequest } from "@/features/records/types/records";
import { WeeklyReportScreen } from "@/features/reports/screens/WeeklyReportScreen";
import { MainTabNavigator, type MainTabParamList } from "@/navigation/MainTabNavigator";

export type AppStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList> | undefined;
  // 일기 생성은 결과 화면 안에서 수행한다(체크리스트 로딩 → 초안). 재료만 넘긴다.
  DiaryResult: {
    date: string;
    request: DiaryGenerationRequest;
    photos: DiaryPhotoDraft[];
    memo?: string;
    materialCounts: DiaryMaterialCounts;
  };
  CommunityDetail: { postId: string };
  CommunityWrite: { post?: CommunityPostDetail } | undefined;
  DiaryEdit: { diary: CalendarDiary };
  AiChat: undefined;
  WeeklyReport: undefined;
};

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
      <Stack.Screen name="DiaryResult" component={DiaryResultScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="CommunityDetail" component={CommunityDetailScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="CommunityWrite" component={CommunityWriteScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="DiaryEdit" component={DiaryEditScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="AiChat" component={AiChatScreen} options={{ presentation: "card" }} />
      <Stack.Screen name="WeeklyReport" component={WeeklyReportScreen} options={{ presentation: "card" }} />
    </Stack.Navigator>
  );
}
