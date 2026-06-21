import { X } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  ImageBackground,
  PanResponder,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";

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

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");
const cardWidth = screenWidth * 0.82;
const cardHeight = Math.min(screenHeight * 0.68, cardWidth * 1.55);
const cardStep = screenWidth * 0.76;

export function StoryCarousel({ stories, dates, initialDate, onClose }: StoryCarouselProps) {
  const initialIndex = Math.max(0, dates.indexOf(initialDate));
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const offsetX = useRef(new Animated.Value(-initialIndex * cardStep)).current;
  const dragY = useRef(new Animated.Value(0)).current;
  const baseOffset = useRef(-initialIndex * cardStep);

  useEffect(() => {
    const index = Math.max(0, dates.indexOf(initialDate));
    const target = -index * cardStep;
    offsetX.setValue(target);
    baseOffset.current = target;
    dragY.setValue(0);
    setActiveIndex(index);
  }, [dates, dragY, initialDate, offsetX]);

  const snapTo = useCallback(
    (index: number) => {
      const clamped = Math.max(0, Math.min(dates.length - 1, index));
      const target = -clamped * cardStep;
      baseOffset.current = target;
      setActiveIndex(clamped);
      Animated.spring(offsetX, {
        friction: 9,
        tension: 58,
        toValue: target,
        useNativeDriver: true
      }).start();
    },
    [dates.length, offsetX]
  );

  const dismiss = useCallback(() => {
    Animated.timing(dragY, {
      duration: 180,
      toValue: screenHeight,
      useNativeDriver: true
    }).start(onClose);
  }, [dragY, onClose]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 || Math.abs(gesture.dy) > 8,
        onPanResponderGrant: () => {
          offsetX.stopAnimation();
          dragY.stopAnimation();
        },
        onPanResponderMove: (_, gesture) => {
          if (Math.abs(gesture.dy) > Math.abs(gesture.dx) && gesture.dy > 0) {
            dragY.setValue(gesture.dy);
            return;
          }

          const minOffset = -(dates.length - 1) * cardStep;
          const raw = baseOffset.current + gesture.dx;
          if (raw > 0) {
            offsetX.setValue(raw * 0.22);
          } else if (raw < minOffset) {
            offsetX.setValue(minOffset + (raw - minOffset) * 0.22);
          } else {
            offsetX.setValue(raw);
          }
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dy > 90 && Math.abs(gesture.dy) > Math.abs(gesture.dx)) {
            dismiss();
            return;
          }

          Animated.spring(dragY, {
            friction: 9,
            tension: 70,
            toValue: 0,
            useNativeDriver: true
          }).start();

          const threshold = cardStep * 0.24;
          if (Math.abs(gesture.vx) > 0.55 || Math.abs(gesture.dx) > threshold) {
            snapTo(activeIndex + (gesture.dx < 0 ? 1 : -1));
          } else {
            snapTo(activeIndex);
          }
        },
        onPanResponderTerminate: () => {
          Animated.spring(dragY, {
            toValue: 0,
            useNativeDriver: true
          }).start();
          snapTo(activeIndex);
        }
      }),
    [activeIndex, dates.length, dismiss, dragY, offsetX, snapTo]
  );

  const activeStory = stories[dates[activeIndex]];
  const backdropOpacity = dragY.interpolate({
    inputRange: [0, 180],
    outputRange: [1, 0.15],
    extrapolate: "clamp"
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} />
      <View style={styles.topBar}>
        <Text style={styles.topTitle}>6월 {dates[activeIndex]}일</Text>
        <Pressable hitSlop={14} style={styles.closeButton} onPress={onClose}>
          <X color="#FFFFFF" size={22} />
        </Pressable>
      </View>

      <Animated.View
        style={[styles.stage, { transform: [{ translateY: dragY }] }]}
        {...panResponder.panHandlers}
      >
        {dates.map((date, index) => {
          const story = stories[date];
          const center = -index * cardStep;
          const relative = Animated.add(offsetX, -center);
          const scale = relative.interpolate({
            inputRange: [-cardStep, 0, cardStep],
            outputRange: [0.84, 1, 0.84],
            extrapolate: "clamp"
          });
          const opacity = relative.interpolate({
            inputRange: [-cardStep * 1.5, -cardStep, 0, cardStep, cardStep * 1.5],
            outputRange: [0, 0.55, 1, 0.55, 0],
            extrapolate: "clamp"
          });
          const translateX = Animated.add(new Animated.Value(index * cardStep + (screenWidth - cardWidth) / 2), offsetX);

          return (
            <Animated.View
              key={date}
              style={[
                styles.cardShell,
                {
                  opacity,
                  transform: [{ translateX }, { scale }],
                  zIndex: index === activeIndex ? 10 : 3
                }
              ]}
            >
              <ImageBackground imageStyle={styles.cardImage} source={{ uri: story.image }} style={styles.card}>
                <View style={styles.imageShade} />
                <View style={styles.textPanel}>
                  <Text style={styles.storyTitle}>{story.title}</Text>
                  <ScrollView style={styles.storyTextScroll}>
                    <Text style={styles.storyText}>{story.text}</Text>
                  </ScrollView>
                  <View style={styles.tagRow}>
                    {story.summary.map((tag) => (
                      <View key={tag} style={styles.tag}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </ImageBackground>
            </Animated.View>
          );
        })}
      </Animated.View>

      {activeStory && (
        <View style={styles.pagination}>
          {dates.map((date, index) => (
            <View key={date} style={[styles.dot, index === activeIndex && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#111827"
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingTop: 58,
    zIndex: 20
  },
  topTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800"
  },
  closeButton: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42
  },
  stage: {
    flex: 1,
    justifyContent: "center",
    overflow: "visible"
  },
  cardShell: {
    height: cardHeight,
    position: "absolute",
    top: "50%",
    marginTop: -(cardHeight / 2),
    width: cardWidth
  },
  card: {
    borderRadius: 30,
    flex: 1,
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  cardImage: {
    borderRadius: 30
  },
  imageShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.18)"
  },
  textPanel: {
    backgroundColor: "rgba(17,24,39,0.56)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: cardHeight * 0.46,
    padding: 18
  },
  storyTitle: {
    color: "#FFFFFF",
    fontSize: 23,
    fontWeight: "900",
    lineHeight: 30
  },
  storyTextScroll: {
    marginTop: 8,
    maxHeight: cardHeight * 0.2
  },
  storyText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 15,
    lineHeight: 23
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
    marginTop: 12
  },
  tag: {
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 5
  },
  tagText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800"
  },
  pagination: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
    justifyContent: "center",
    paddingBottom: 36
  },
  dot: {
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 999,
    height: 5,
    width: 5
  },
  dotActive: {
    backgroundColor: "#FFFFFF",
    width: 18
  }
});
