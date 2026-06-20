import { Camera, Heart, MessageCircle, MoreHorizontal, Plus, Smile, Users } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { colors } from "@/shared/constants/colors";

const members = [
  { name: "엄마", initial: "엄", color: colors.peachSoft, active: true },
  { name: "아빠", initial: "아", color: colors.blueSoft, active: true },
  { name: "할머니", initial: "할", color: colors.greenSoft, active: false },
  { name: "이모", initial: "이", color: colors.lavenderSoft, active: true }
];

const posts = [
  {
    author: "엄마",
    time: "방금",
    title: "리몽이 낮잠 성공",
    body: "오전 낮잠이 평소보다 길었어요. 수유 후 바로 잠들어서 컨디션도 좋아 보여요.",
    color: colors.peachSoft,
    reactions: 5,
    comments: 2
  },
  {
    author: "아빠",
    time: "32분 전",
    title: "기저귀 기록 공유",
    body: "배변 상태 괜찮았고 양도 평소와 비슷했어요. 다음 수유 때 같이 확인해요.",
    color: colors.blueSoft,
    reactions: 3,
    comments: 1
  }
];

function MemberStack() {
  return (
    <View style={styles.memberStack}>
      {members.map((member, index) => (
        <View
          key={member.name}
          style={[
            styles.stackedAvatar,
            {
              backgroundColor: member.color,
              marginLeft: index === 0 ? 0 : -9,
              zIndex: members.length - index
            }
          ]}
        >
          <Text style={styles.stackedInitial}>{member.initial}</Text>
        </View>
      ))}
    </View>
  );
}

export function FamilyRoomScreen() {
  return (
    <SafeAreaView edges={["top"]} style={styles.root}>
      <View style={styles.topNav}>
        <View style={styles.titleBlock}>
          <Text style={styles.roomLabel}>가족방</Text>
          <Text style={styles.navTitle}>리몽이 공동 육아방</Text>
        </View>
        <Pressable style={styles.moreButton}>
          <MoreHorizontal color={colors.primaryDark} size={22} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.roomHero}>
          <View style={styles.heroTop}>
            <MemberStack />
            <View style={styles.memberSummary}>
              <Text numberOfLines={1} adjustsFontSizeToFit style={styles.memberTitle}>가족 {members.length}명이 함께 보는 방</Text>
              <Text numberOfLines={2} style={styles.memberText}>기록, 사진 일기, 댓글을 실시간으로 공유해요.</Text>
            </View>
          </View>

          <View style={styles.actionRow}>
            <Pressable style={styles.primaryAction}>
              <Plus color="#FFFFFF" size={16} />
              <Text style={styles.primaryActionText}>글쓰기</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction}>
              <Camera color={colors.primary} size={16} />
              <Text style={styles.secondaryActionText}>사진</Text>
            </Pressable>
            <Pressable style={styles.secondaryAction}>
              <Users color={colors.primary} size={16} />
              <Text style={styles.secondaryActionText}>초대</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.membersCard}>
          <Text style={styles.sectionTitle}>가족 프로필</Text>
          <View style={styles.memberGrid}>
            {members.map((member) => (
              <View key={member.name} style={styles.memberItem}>
                <View style={[styles.memberAvatar, { backgroundColor: member.color }]}>
                  <Text style={styles.memberInitial}>{member.initial}</Text>
                  {member.active && <View style={styles.onlineDot} />}
                </View>
                <Text numberOfLines={1} style={styles.memberName}>{member.name}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.feedHeader}>
          <Text style={styles.sectionTitle}>실시간 공동 육아 피드</Text>
        </View>

        <View style={styles.feedList}>
          {posts.map((post) => (
            <View key={`${post.author}-${post.time}`} style={styles.postCard}>
              <View style={styles.postHeader}>
                <View style={[styles.postAvatar, { backgroundColor: post.color }]}>
                  <Text style={styles.postInitial}>{post.author[0]}</Text>
                </View>
                <View style={styles.postMeta}>
                  <Text style={styles.postAuthor}>{post.author}</Text>
                  <Text style={styles.postTime}>{post.time}</Text>
                </View>
                <MoreHorizontal color={colors.textMuted} size={20} />
              </View>

              <Text style={styles.postTitle}>{post.title}</Text>
              <Text style={styles.postBody}>{post.body}</Text>

              <View style={styles.postActions}>
                <Pressable style={styles.postActionButton}>
                  <Smile color={colors.accent} size={16} />
                  <Text style={styles.postActionText}>공감 {post.reactions}</Text>
                </Pressable>
                <Pressable style={styles.postActionButton}>
                  <MessageCircle color={colors.primary} size={16} />
                  <Text style={styles.postActionText}>댓글 {post.comments}</Text>
                </Pressable>
                <Pressable style={styles.postActionButton}>
                  <Heart color={colors.textMuted} size={16} />
                  <Text style={styles.postActionText}>저장</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
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
    height: 62,
    justifyContent: "space-between",
    paddingHorizontal: 16
  },
  content: {
    gap: 20,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 12
  },
  titleBlock: {
    flex: 1,
    paddingRight: 12
  },
  roomLabel: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "900"
  },
  navTitle: {
    color: colors.primaryDark,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 2
  },
  moreButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  roomHero: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14
  },
  heroTop: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 52
  },
  memberStack: {
    flexDirection: "row",
    flexShrink: 0,
    width: 122
  },
  stackedAvatar: {
    alignItems: "center",
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 3,
    height: 38,
    justifyContent: "center",
    width: 38
  },
  stackedInitial: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "900"
  },
  memberSummary: {
    flex: 1,
    minWidth: 0
  },
  memberTitle: {
    color: colors.primaryDark,
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21
  },
  memberText: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4
  },
  actionRow: {
    flexDirection: "row",
    gap: 7,
    marginTop: 15
  },
  primaryAction: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    flex: 1.15,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8
  },
  primaryActionText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "900"
  },
  secondaryAction: {
    alignItems: "center",
    backgroundColor: colors.blueSoft,
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8
  },
  secondaryActionText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "900"
  },
  membersCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14
  },
  sectionTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900"
  },
  memberGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 14
  },
  memberItem: {
    alignItems: "center",
    flex: 1,
    minWidth: 0
  },
  memberAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 50,
    justifyContent: "center",
    width: 50
  },
  memberInitial: {
    color: colors.primaryDark,
    fontSize: 15,
    fontWeight: "900"
  },
  onlineDot: {
    backgroundColor: colors.success,
    borderColor: colors.surface,
    borderRadius: 999,
    borderWidth: 2,
    bottom: 1,
    height: 12,
    position: "absolute",
    right: 2,
    width: 12
  },
  memberName: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 6,
    maxWidth: 62
  },
  feedHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between"
  },
  feedList: {
    gap: 12
  },
  postCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 22,
    borderWidth: 1,
    padding: 15
  },
  postHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10
  },
  postAvatar: {
    alignItems: "center",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  postInitial: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  postMeta: {
    flex: 1,
    minWidth: 0
  },
  postAuthor: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: "900"
  },
  postTime: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2
  },
  postTitle: {
    color: colors.primaryDark,
    fontSize: 17,
    fontWeight: "900",
    marginTop: 14
  },
  postBody: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8
  },
  postActions: {
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingTop: 12
  },
  postActionButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    minWidth: 0
  },
  postActionText: {
    color: colors.textMuted,
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "800"
  }
});
