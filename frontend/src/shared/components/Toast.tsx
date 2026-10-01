import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text } from "react-native";

import { theme } from "@/shared/constants/theme";

interface ToastProps {
  message: string | null;
  /** 탭바 등 하단 요소 위에 띄우기 위한 오프셋. */
  bottom?: number;
}

// 소개 영상의 저장 토스트: 화면 하단에 떠오르는 어두운 pill. 부모가 message를 바꾸면 다시 나타난다.
export function Toast({ message, bottom = 24 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(12)).current;

  useEffect(() => {
    if (!message) return;
    opacity.setValue(0);
    translateY.setValue(12);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 180, useNativeDriver: true })
    ]).start();
  }, [message, opacity, translateY]);

  if (!message) return null;

  return (
    <Animated.View pointerEvents="none" style={[styles.toast, { bottom, opacity, transform: [{ translateY }] }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

/** message를 잠시 보여주고 자동으로 지운다. `toast`를 화면 트리 끝에 렌더링한다. */
export function useToast(durationMs = 2200) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (text: string) => {
      if (timer.current) clearTimeout(timer.current);
      setMessage(text);
      timer.current = setTimeout(() => setMessage(null), durationMs);
    },
    [durationMs]
  );

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, showToast };
}

const styles = StyleSheet.create({
  toast: {
    alignSelf: "center",
    backgroundColor: "rgba(63,55,52,0.92)",
    borderRadius: theme.radius.lg,
    left: 24,
    paddingHorizontal: 18,
    paddingVertical: 13,
    position: "absolute",
    right: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
    zIndex: 100
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    textAlign: "center"
  }
});
