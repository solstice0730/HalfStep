import { createBottomTabNavigator, type BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { BookOpen, CalendarDays, Home, MessageCircleMore } from "lucide-react-native";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";

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

// iOS 스타일 플로팅 프로스티드 글래스 탭바 배경. 탭바 전체를 감싸는 pill 모양 블러 레이어이며,
// tabBarStyle에서 실제 위치/크기(둥근 pill, 화면 하단에서 띄운 위치)를 잡는다.
function TabBarBackground() {
  return (
    <BlurView intensity={65} tint="light" style={styles.tabBarBlur}>
      <View style={styles.tabBarTint} />
    </BlurView>
  );
}

// React Navigation's default tab button (BottomTabItem's internal "tabVerticalUiKit" style)
// hardcodes justifyContent: 'flex-start', on the assumption a label sits below the icon. With
// labels hidden it leaves the icon pinned near the top of the pill instead of centered, and that
// style lives on the button itself (not tabBarItemStyle, which wraps it and can't override it —
// the button fills the wrapper via its own flex:1). Re-centering has to happen here.
function CenteredTabBarButton(props: BottomTabBarButtonProps) {
  return <PlatformPressable {...props} style={[props.style, styles.tabBarButton]} />;
}

export function MainTabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarBackground: () => <TabBarBackground />,
        tabBarButton: (props) => <CenteredTabBarButton {...props} />,
        tabBarItemStyle: {
          borderRadius: 999,
          marginHorizontal: 4
        },
        tabBarStyle: {
          position: "absolute",
          left: 22,
          right: 22,
          bottom: Math.max(insets.bottom, 14) + 8,
          height: 64,
          // React Navigation always adds paddingBottom: insets.bottom inside the tab bar's own
          // box (see BottomTabBar.js), on top of whatever offset we already gave it via `bottom`
          // above. Left alone, that padding eats into our fixed 64px pill and pushes the icon
          // row off-center. We handle the safe-area clearance ourselves via `bottom`, so zero
          // both out here.
          paddingBottom: 0,
          paddingTop: 0,
          borderRadius: 999,
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          shadowColor: colors.primaryDark,
          shadowOffset: { width: 0, height: 14 },
          shadowOpacity: 0.16,
          shadowRadius: 28
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

const styles = StyleSheet.create({
  tabBarButton: {
    justifyContent: "center",
    alignItems: "center"
  },
  tabBarBlur: {
    flex: 1,
    borderRadius: 999,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth * 1.5,
    borderColor: colors.glassBorder
  },
  tabBarTint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.glassStrong
  }
});
