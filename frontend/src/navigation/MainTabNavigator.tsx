import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { BookOpen, Home, MessageCircleMore } from "lucide-react-native";
import { StyleSheet, View } from "react-native";

import { CommunityScreen } from "@/features/community/screens/CommunityScreen";
import { FamilyRoomScreen } from "@/features/family/screens/FamilyRoomScreen";
import { HomeScreen } from "@/features/home/screens/HomeScreen";
import { RecordsScreen } from "@/features/records/screens/RecordsScreen";
import { colors } from "@/shared/constants/colors";

export type MainTabParamList = {
  Home: undefined;
  Records: { draftImageUri?: string } | undefined;
  Family: undefined;
  Community: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

function FamilyTabIcon({ color, focused }: { color: string; focused: boolean }) {
  return (
    <View style={styles.familyIconWrap}>
      <View style={[styles.chatBubble, { borderColor: color }]} />
      <View style={[styles.avatarCircle, styles.avatarOne, { backgroundColor: focused ? colors.accent : colors.surfaceSoft }]} />
      <View style={[styles.avatarCircle, styles.avatarTwo, { backgroundColor: focused ? colors.primary : colors.surfaceSoft }]} />
      <View style={[styles.avatarCircle, styles.avatarThree, { backgroundColor: focused ? colors.peachSoft : colors.surfaceSoft }]} />
    </View>
  );
}

export function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 66,
          paddingBottom: 12,
          paddingTop: 8
        },
        tabBarItemStyle: {
          borderRadius: 18,
          marginHorizontal: 8
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
          title: "가족방",
          tabBarIcon: ({ color, focused }) => <FamilyTabIcon color={color} focused={focused} />
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

const styles = StyleSheet.create({
  familyIconWrap: {
    height: 28,
    position: "relative",
    width: 32
  },
  chatBubble: {
    borderRadius: 10,
    borderWidth: 2,
    bottom: 1,
    height: 22,
    left: 1,
    position: "absolute",
    width: 29
  },
  avatarCircle: {
    borderColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    height: 14,
    position: "absolute",
    width: 14
  },
  avatarOne: {
    left: 3,
    top: 6
  },
  avatarTwo: {
    left: 10,
    top: 3
  },
  avatarThree: {
    right: 3,
    top: 8
  }
});
