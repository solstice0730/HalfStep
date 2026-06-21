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

function FamilyTabIcon({ color }: { color: string }) {
  return (
    <View style={styles.familyIconWrap}>
      <View
        style={[
          styles.chatBubble,
          {
            backgroundColor: colors.blueSoft,
            borderColor: color
          }
        ]}
      />
      <View
        style={[
          styles.chatBubbleTail,
          {
            backgroundColor: colors.blueSoft,
            borderColor: color
          }
        ]}
      />
      <View style={[styles.avatarCircle, styles.avatarOne, { backgroundColor: colors.accent }]} />
      <View style={[styles.avatarCircle, styles.avatarTwo, { backgroundColor: colors.primary }]} />
      <View style={[styles.avatarCircle, styles.avatarThree, { backgroundColor: colors.peachSoft }]} />
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
        name="Family"
        component={FamilyRoomScreen}
        options={{
          title: "가족방",
          tabBarIcon: ({ color }) => <FamilyTabIcon color={color} />
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
    height: 30,
    position: "relative",
    width: 34
  },
  chatBubble: {
    borderRadius: 10,
    borderWidth: 2,
    bottom: 3,
    height: 23,
    left: 1,
    position: "absolute",
    width: 30
  },
  chatBubbleTail: {
    borderBottomWidth: 2,
    borderLeftWidth: 0,
    borderRightWidth: 2,
    borderTopWidth: 0,
    bottom: 1,
    height: 8,
    left: 8,
    position: "absolute",
    transform: [{ rotate: "35deg" }],
    width: 8
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
    left: 4,
    top: 7
  },
  avatarTwo: {
    left: 11,
    top: 4
  },
  avatarThree: {
    right: 4,
    top: 9
  }
});
