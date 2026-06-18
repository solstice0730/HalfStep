import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BookOpen, Home, MessageCircleMore, Share2 } from "lucide-react-native";

import { CommunityScreen } from "@/features/community/screens/CommunityScreen";
import { FamilyRoomScreen } from "@/features/family/screens/FamilyRoomScreen";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { RecordsScreen } from "@/features/records/screens/RecordsScreen";
import { colors } from "@/shared/constants/colors";

export type MainTabParamList = {
  Home: undefined;
  Records: undefined;
  Family: undefined;
  Community: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 72,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "700"
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
        name="Family"
        component={FamilyRoomScreen}
        options={{
          title: "공유",
          tabBarIcon: ({ color, size }) => <Share2 color={color} size={size} />
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
