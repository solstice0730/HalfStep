import { CheckCircle2, ChevronLeft, MessageCircle, Wifi } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";

import { Screen } from "@/shared/components/Screen";
import { colors } from "@/shared/constants/colors";

const rooms = [
  { emoji: "🏠", title: "엄마 & 아빠방", meta: "현재 활성", active: false, members: ["👩", "👨"] },
  { emoji: "👵", title: "할머니 돌봄방", meta: "1시간 전", active: true, members: ["👩", "👨", "👵"] }
];

const family = [
  { emoji: "👩", name: "엄마", status: "온라인", active: true, color: colors.peachSoft },
  { emoji: "👨", name: "아빠", status: "온라인", active: true, color: colors.blueSoft },
  { emoji: "👵", name: "할머니", status: "자리비움", active: false, color: colors.greenSoft }
];

const feeds = [
  { emoji: "👨", text: "아빠가 배변 기록을 추가했습니다", detail: "늦 대시 보드 경우", time: "10분 전", color: colors.blueSoft },
  { emoji: "👩", text: "엄마가 새로운 사진을 등록했습니다", detail: "오늘의 성장 일기에 추가됨", time: "32분 전", color: colors.peachSoft },
  { emoji: "👨", text: "아빠가 수유를 기록했습니다", detail: "120ml · 오른쪽", time: "1시간 15분 전", color: colors.blueSoft },
  { emoji: "👩", text: "엄마가 수면을 기록했습니다", detail: "낮잠 종료 · 1시간 30분", time: "2시간 전", color: colors.peachSoft }
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
                    <Text style={styles.roomEmoji}>{room.emoji}</Text>
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
                    <View key={`${room.title}-${member}-${index}`} style={[styles.stackedAvatar, { marginLeft: index === 0 ? 0 : -8 }]}>
                      <Text style={styles.stackedEmoji}>{member}</Text>
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
                <View style={[styles.familyAvatar, { backgroundColor: member.color }]}>
                  <Text style={styles.familyEmoji}>{member.emoji}</Text>
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
              <View style={[styles.feedAvatar, { backgroundColor: feed.color }]}>
                <Text style={styles.feedEmoji}>{feed.emoji}</Text>
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
        <MessageCircle color="#FFFFFF" size={18} />
        <Text style={styles.chatText}>AI 챗봇</Text>
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
    height: 56,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  backButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  placeholder: {
    width: 36
  },
  kicker: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "800"
  },
  roomList: {
    gap: 12,
    marginTop: 12
  },
  roomCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
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
    height: 44,
    justifyContent: "center",
    width: 44
  },
  roomIconActive: {
    backgroundColor: "#FFFFFF"
  },
  roomEmoji: {
    fontSize: 22
  },
  roomTitle: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  activeText: {
    color: colors.primary
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
    backgroundColor: colors.surface,
    borderColor: colors.background,
    borderRadius: 999,
    borderWidth: 2,
    height: 28,
    justifyContent: "center",
    width: 28
  },
  stackedEmoji: {
    fontSize: 14
  },
  activeBadge: {
    backgroundColor: colors.primary,
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
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
    fontWeight: "900"
  },
  syncBadge: {
    alignItems: "center",
    backgroundColor: colors.greenSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5
  },
  syncText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900"
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
    borderRadius: 999,
    height: 56,
    justifyContent: "center",
    width: 56
  },
  familyEmoji: {
    fontSize: 28
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
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6
  },
  familyStatus: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 3
  },
  feedList: {
    gap: 12
  },
  feedCard: {
    alignItems: "center",
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16
  },
  feedAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  feedEmoji: {
    fontSize: 22
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
    fontWeight: "900"
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
    backgroundColor: colors.primary,
    borderRadius: 999,
    bottom: 18,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    position: "absolute",
    right: 16
  },
  chatText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  }
});
