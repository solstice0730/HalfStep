import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BookOpen, CalendarDays, Home, MessageCircleMore } from "lucide-react-native";

import { CalendarScreen } from "@/features/calendar/screens/CalendarScreen";
import { CommunityScreen } from "@/features/community/screens/CommunityScreen";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { RecordsScreen } from "@/features/records/screens/RecordsScreen";
import { colors } from "@/shared/constants/colors";

export type MainTabParamList = {
  Home: undefined;
  Records:
    | {
        draftImageUri?: string;
        openRecordModal?: "feeding" | "sleep" | "urine" | "stool";
        selectedDate?: string;
      }
    | undefined;
  Calendar: undefined;
  Community: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 8
        },
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 66,
          paddingBottom: 12,
          paddingTop: 8
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          title: "홈",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Records"
        component={RecordsScreen}
        options={{
          title: "기록",
          tabBarIcon: ({ color, size }) => <BookOpen color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Calendar"
        component={CalendarScreen}
        options={{
          title: "캘린더",
          tabBarIcon: ({ color, size }) => <CalendarDays color={color} size={size} />
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          title: "커뮤니티",
          tabBarIcon: ({ color, size }) => <MessageCircleMore color={color} size={size} />
        }}
      />
    </Tab.Navigator>
  );
}
