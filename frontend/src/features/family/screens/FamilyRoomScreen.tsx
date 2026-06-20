import { CheckCircle2, ChevronLeft, Wifi } from "lucide-react-native";
import { Image, ImageSourcePropType, StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

const familyIcons = {
  defaultAvatar: require("../../../../assets/icons/family/avatar-default.png"),
  mom: require("../../../../assets/icons/family/mom.png"),
  dad: require("../../../../assets/icons/family/dad.png"),
  grandma: require("../../../../assets/icons/family/grandma.png"),
  grandpa: require("../../../../assets/icons/family/grandpa.png"),
  baby: require("../../../../assets/icons/family/baby.png"),
  familyRoom: require("../../../../assets/icons/family/family-room.png"),
  largeFamilyRoom: require("../../../../assets/icons/family/large-family-room.png")
} satisfies Record<string, ImageSourcePropType>;

const chatbotShareImage = require("../../../../assets/images/chatbot-share.png");

const rooms = [
  { icon: familyIcons.familyRoom, title: "엄마 & 아빠방", meta: "현재 활성", active: false, members: [familyIcons.mom, familyIcons.dad] },
  { icon: familyIcons.largeFamilyRoom, title: "할머니 돌봄방", meta: "1시간 전", active: true, members: [familyIcons.mom, familyIcons.dad, familyIcons.grandma] }
];

const family = [
  { icon: familyIcons.mom, name: "엄마", status: "온라인", active: true },
  { icon: familyIcons.dad, name: "아빠", status: "온라인", active: true },
  { icon: familyIcons.grandma, name: "할머니", status: "자리비움", active: false }
];

const feeds = [
  { icon: familyIcons.dad, text: "아빠가 배변 기록을 추가했습니다", detail: "늦 대시 보드 경우", time: "10분 전" },
  { icon: familyIcons.mom, text: "엄마가 새로운 사진을 등록했습니다", detail: "오늘의 성장 일기에 추가됨", time: "32분 전" },
  { icon: familyIcons.dad, text: "아빠가 수유를 기록했습니다", detail: "120ml · 오른쪽", time: "1시간 15분 전" },
  { icon: familyIcons.mom, text: "엄마가 수면을 기록했습니다", detail: "낮잠 종료 · 1시간 30분", time: "2시간 전" }
];

export function FamilyRoomScreen() {
  return (
    <View style={styles.root}>
      <View style={styles.topNav}>
        <View style={styles.backButton}>
          <ChevronLeft color={colors.primaryDark} size={20} />
        </View>
        <Text style={styles.navTitle}>공유방</Text>
        <View style={styles.placeholder} />
      </View>
      <Screen>
        <View>
          <Text style={styles.kicker}>공유 돌봄방</Text>
          <View style={styles.roomList}>
            {rooms.map((room) => (
              <View key={room.title} style={[styles.roomCard, room.active && styles.roomCardActive]}>
                <View style={styles.roomLeft}>
                  <View style={[styles.roomIcon, room.active && styles.roomIconActive]}>
                    <Image source={room.icon} style={styles.roomIconImage} />
                  </View>
                  <View>
                    <Text style={[styles.roomTitle, room.active && styles.activeText]}>{room.title}</Text>
                    <View style={styles.roomMetaRow}>
                      {room.active && <View style={styles.onlineDot} />}
                      <Text style={[styles.roomMeta, room.active && styles.onlineText]}>{room.meta}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.memberStack}>
                  {room.members.map((member, index) => (
                    <View key={`${room.title}-${index}`} style={[styles.stackedAvatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                      <Image source={member} style={styles.stackedAvatarImage} />
                    </View>
                  ))}
                  {room.active && <Text style={styles.activeBadge}>활성</Text>}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>실시간 공동 육아 피드</Text>
            <View style={styles.syncBadge}>
              <Wifi color={colors.success} size={12} />
              <Text style={styles.syncText}>동기화됨</Text>
            </View>
          </View>
          <View style={styles.familyRow}>
            {family.map((member) => (
              <View key={member.name} style={styles.familyMember}>
                <View style={styles.familyAvatar}>
                  <Image source={member.icon} style={styles.familyAvatarImage} />
                  {member.active && <View style={styles.statusDot} />}
                </View>
                <Text style={styles.familyName}>{member.name}</Text>
                <Text style={[styles.familyStatus, member.active && styles.onlineText]}>{member.status}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.feedList}>
          {feeds.map((feed) => (
            <View key={`${feed.text}-${feed.time}`} style={styles.feedCard}>
              <View style={styles.feedAvatar}>
                <Image source={feed.icon} style={styles.feedAvatarImage} />
              </View>
              <View style={styles.feedTextBox}>
                <Text style={styles.feedText}>
                  <Text style={styles.feedStrong}>{feed.text}</Text> {feed.detail}
                </Text>
                <Text style={styles.feedTime}>{feed.time}</Text>
              </View>
              <View style={styles.feedAction}>
                <CheckCircle2 color={colors.primary} size={16} />
              </View>
            </View>
          ))}
        </View>
      </Screen>
      <View style={styles.chatButton}>
        <Image source={chatbotShareImage} resizeMode="contain" style={styles.chatButtonImage} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.background,
    flex: 1
  },
  topNav: {
    alignItems: "center",
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: "row",
    height: 60,
    justifyContent: "space-between",
    paddingHorizontal: 20
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "600",
    lineHeight: 24
  },
  placeholder: {
    width: 44
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  roomList: {
    gap: 12,
    marginTop: 12
  },
  roomCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16
  },
  roomCardActive: {
    backgroundColor: colors.blueSoft,
    borderColor: colors.primary,
    borderWidth: 1.5
  },
  roomLeft: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12
  },
  roomIcon: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 16,
    height: 48,
    justifyContent: "center",
    overflow: "hidden",
    width: 48
  },
  roomIconActive: {
    backgroundColor: colors.surfaceSoft
  },
  roomIconImage: {
    height: 40,
    opacity: 0.82,
    width: 40
  },
  roomTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24
  },
  activeText: {
    color: colors.primary,
    fontWeight: "600"
  },
  roomMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
    marginTop: 4
  },
  roomMeta: {
    color: colors.textMuted,
    fontSize: 12
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderRadius: 999,
    height: 6,
    width: 6
  },
  onlineText: {
    color: colors.success
  },
  memberStack: {
    alignItems: "center",
    flexDirection: "row"
  },
  stackedAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    height: 30,
    justifyContent: "center",
    overflow: "hidden",
    width: 30
  },
  stackedAvatarImage: {
    height: 24,
    opacity: 0.82,
    width: 24
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18,
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 6
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26
  },
  syncBadge: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  syncText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 18
  },
  familyRow: {
    flexDirection: "row",
    gap: 18,
    marginTop: 16
  },
  familyMember: {
    alignItems: "center"
  },
  familyAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    overflow: "hidden",
    width: 56
  },
  familyAvatarImage: {
    height: 46,
    opacity: 0.82,
    width: 46
  },
  statusDot: {
    backgroundColor: colors.success,
    borderColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    bottom: 0,
    height: 12,
    position: "absolute",
    right: 2,
    width: 12
  },
  familyName: {
    color: colors.primaryDark,
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6
  },
  familyStatus: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 3
  },
  feedList: {
    gap: 12
  },
  feedCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16
  },
  feedAvatar: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    overflow: "hidden",
    width: 44
  },
  feedAvatarImage: {
    height: 36,
    opacity: 0.82,
    width: 36
  },
  feedTextBox: {
    flex: 1
  },
  feedText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21
  },
  feedStrong: {
    color: colors.primaryDark,
    fontWeight: "600"
  },
  feedTime: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4
  },
  feedAction: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    height: 32,
    justifyContent: "center",
    width: 32
  },
  chatButton: {
    alignItems: "center",
    backgroundColor: "transparent",
    borderRadius: 999,
    bottom: 16,
    height: 64,
    position: "absolute",
    right: 20,
    width: 64
  },
  chatButtonImage: {
    height: 72,
    transform: [{ scaleX: -1 }],
    width: 52
  }
});
