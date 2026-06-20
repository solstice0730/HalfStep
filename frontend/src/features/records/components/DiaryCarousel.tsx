import { X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type Story = {
  title: string;
  text: string;
  image: string;
  summary: string[];
};

export interface StoryCarouselProps {
  stories: Record<number, Story>;
  dates: number[];
  initialDate: number;
  onClose: () => void;
}

// ─────────────────────────────────────────────
// Layout
// ─────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");

/** 중앙 카드 너비 — 화면의 70% 차지 */
const CARD_W = SW * 0.70;
/** 중앙 카드 높이 */
const CARD_H = CARD_W * 1.30;
/**
 * 카드 간 중심-중심 거리.
 * 이 값이 CARD_W 보다 작으면 좌우 카드가 중앙 뒤에 겹쳐 보이고,
 * 약간 크면 양 옆에서 "삐져나와" 보입니다.
 * SW * 0.60 ≈ 카드 폭보다 조금 작아서 좌우 카드가 ~40% 만 노출됩니다.
 */
const CARD_STEP = SW * 0.58;

const SIDE_SCALE = 0.75;
const SIDE_ROTATE = 18;
const SIDE_OPACITY = 0.65;

/** 렌더링할 카드 범위 (activeIndex ± RENDER_WINDOW) */
const RENDER_WINDOW = 3;

// ─────────────────────────────────────────────
// StoryCarousel
// ─────────────────────────────────────────────
export function StoryCarousel({
  stories,
  dates,
  initialDate,
  onClose
}: StoryCarouselProps) {
  const initialIndex = Math.max(0, dates.indexOf(initialDate));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const offsetX = useRef(new Animated.Value(-initialIndex * CARD_STEP)).current;
  const baseOffset = useRef(-initialIndex * CARD_STEP);

  // Re-sync when modal opens with a different date
  useEffect(() => {
    const idx = Math.max(0, dates.indexOf(initialDate));
    const target = -idx * CARD_STEP;
    offsetX.setValue(target);
    baseOffset.current = target;
    setActiveIndex(idx);
  }, [initialDate]);

  // ── snap ──
  const snapTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(dates.length - 1, index));
      const target = -clamped * CARD_STEP;
      baseOffset.current = target;
      Animated.spring(offsetX, {
        toValue: target,
        useNativeDriver: true,
        friction: 9,
        tension: 52
      }).start();
      setActiveIndex(clamped);
    },
    [dates.length, offsetX]
  );

  // ── gesture ──
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, { dx, dy }) =>
          Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy),
        onPanResponderGrant: () => {
          offsetX.stopAnimation();
        },
        onPanResponderMove: (_, { dx }) => {
          const raw = baseOffset.current + dx;
          const minOff = -(dates.length - 1) * CARD_STEP;
          let value = raw;
          if (raw > 0) value = raw * 0.22;
          else if (raw < minOff) value = minOff + (raw - minOff) * 0.22;
          offsetX.setValue(value);
        },
        onPanResponderRelease: (_, { dx, vx }) => {
          const threshold = CARD_STEP * 0.25;
          if (Math.abs(vx) > 0.5 || Math.abs(dx) > threshold) {
            snapTo(activeIndex + (dx < 0 ? 1 : -1));
          } else {
            snapTo(activeIndex);
          }
        },
        onPanResponderTerminate: () => snapTo(activeIndex)
      }),
    [dates.length, activeIndex, snapTo, offsetX]
  );

  // ── per-card interpolations (only built once per dates.length) ──
  const cardAnimations = useMemo(
    () =>
      dates.map((_, cardIdx) => {
        // relative = 0 이면 이 카드가 정 중앙
        const center = -cardIdx * CARD_STEP;

        const relative = Animated.add(offsetX, -center);

        const scale = relative.interpolate({
          inputRange: [-CARD_STEP, 0, CARD_STEP],
          outputRange: [SIDE_SCALE, 1, SIDE_SCALE],
          extrapolate: "clamp"
        });

        const rotateY = relative.interpolate({
          inputRange: [-CARD_STEP, 0, CARD_STEP],
          outputRange: [`${SIDE_ROTATE}deg`, "0deg", `-${SIDE_ROTATE}deg`],
          extrapolate: "clamp"
        });

        const opacity = relative.interpolate({
          inputRange: [-CARD_STEP * 2, -CARD_STEP, 0, CARD_STEP, CARD_STEP * 2],
          outputRange: [0, SIDE_OPACITY, 1, SIDE_OPACITY, 0],
          extrapolate: "clamp"
        });

        // translateX: 카드의 절대 위치를 offsetX 에 따라 이동
        const baseX = cardIdx * CARD_STEP + (SW - CARD_W) / 2;
        const translateX = Animated.add(new Animated.Value(baseX), offsetX);

        // zIndex 느낌을 위한 elevation interpolation (가운데 높, 양 옆 낮)
        // RN 에서 동적 elevation 은 비용이 크므로, translateY 로 시각적 깊이감 보완
        const translateY = relative.interpolate({
          inputRange: [-CARD_STEP, 0, CARD_STEP],
          outputRange: [18, 0, 18],
          extrapolate: "clamp"
        });

        return { scale, rotateY, opacity, translateX, translateY };
      }),
    [dates.length, offsetX]
  );

  const story = stories[dates[activeIndex]];

  // 렌더링할 카드 범위 (성능 최적화)
  const renderStart = Math.max(0, activeIndex - RENDER_WINDOW);
  const renderEnd = Math.min(dates.length - 1, activeIndex + RENDER_WINDOW);

  return (
    <View style={styles.container}>
      <View style={styles.backdrop} />

      {/* ─ Close ─ */}
      <View style={styles.topBar}>
        <Pressable hitSlop={14} style={styles.closeBtn} onPress={onClose}>
          <X color="#FFFFFF" size={22} />
        </Pressable>
      </View>

      {/* ─ Carousel cards ─ */}
      <View style={styles.trackArea} {...panResponder.panHandlers}>
        {dates.map((date, idx) => {
          // 범위 밖이면 렌더링 스킵
          if (idx < renderStart || idx > renderEnd) return null;

          const anim = cardAnimations[idx];
          const s = stories[date];
          const isCenter = idx === activeIndex;

          return (
            <Animated.View
              key={date}
              style={[
                styles.cardShell,
                {
                  // 중앙 카드가 위에 오도록 zIndex 부여
                  zIndex: isCenter ? 10 : 5 - Math.abs(idx - activeIndex),
                  opacity: anim.opacity,
                  transform: [
                    { translateX: anim.translateX } as any,
                    { translateY: anim.translateY },
                    { perspective: 1000 },
                    { scale: anim.scale },
                    { rotateY: anim.rotateY }
                  ]
                }
              ]}
              pointerEvents="box-none"
            >
              <Pressable
                style={styles.card}
                onPress={() => {
                  if (idx !== activeIndex) snapTo(idx);
                }}
              >
                <Image
                  source={{ uri: s.image }}
                  style={styles.cardImage}
                  resizeMode="cover"
                />
                {/* 하단 그래디언트 + 날짜 라벨 */}
                <View style={styles.cardBottom}>
                  <Text style={styles.cardDateLabel}>{date}일</Text>
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>

      {/* ─ Story info ─ */}
      <View style={styles.infoArea}>
        <Text style={styles.infoDate}>6월 {dates[activeIndex]}일</Text>
        <Text style={styles.infoTitle}>{story?.title}</Text>
        <Text style={styles.infoBody} numberOfLines={2}>
          {story?.text}
        </Text>
        {story?.summary && (
          <View style={styles.tagRow}>
            {story.summary.map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>#{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─ Pagination ─ */}
      <View style={styles.pagination}>
        {dates.map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827"
  },
  topBar: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 56,
    zIndex: 20
  },
  closeBtn: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 999,
    height: 40,
    justifyContent: "center",
    width: 40
  },
  trackArea: {
    flex: 1,
    justifyContent: "center",
    overflow: "visible",
    position: "relative"
  },
  cardShell: {
    height: CARD_H,
    position: "absolute",
    top: "50%",
    marginTop: -(CARD_H / 2) - 20,
    width: CARD_W,
    // shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.4,
    shadowRadius: 28,
    elevation: 16
  },
  card: {
    borderRadius: 20,
    flex: 1,
    overflow: "hidden"
  },
  cardImage: {
    height: "100%",
    width: "100%"
  },
  cardBottom: {
    alignItems: "flex-start",
    backgroundColor: "rgba(0,0,0,0.38)",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    bottom: 0,
    left: 0,
    paddingBottom: 12,
    paddingTop: 10,
    paddingLeft: 16,
    position: "absolute",
    right: 0
  },
  cardDateLabel: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.5
  },
  infoArea: {
    paddingBottom: 6,
    paddingHorizontal: 28
  },
  infoDate: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18
  },
  infoTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    lineHeight: 30,
    marginTop: 3
  },
  infoBody: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 14,
    lineHeight: 21,
    marginTop: 5
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5
  },
  tagText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 12,
    fontWeight: "600"
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 4,
    justifyContent: "center",
    paddingBottom: 34,
    paddingTop: 12
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.25)",
    borderRadius: 999,
    height: 5,
    width: 5
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 16
  }
});
