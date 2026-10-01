import { Alert, Platform } from "react-native";

interface ConfirmOptions {
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
}

/** 확인 다이얼로그를 Promise로 감싼다. 웹의 Alert.alert는 버튼 콜백을 지원하지 않아 window.confirm으로 대체한다. */
export function confirmAsync(title: string, message: string, options: ConfirmOptions = {}): Promise<boolean> {
  const { confirmText = "확인", cancelText = "취소", destructive = false } = options;
  if (Platform.OS === "web") {
    const confirmed = typeof globalThis.confirm === "function" ? globalThis.confirm(`${title}\n\n${message}`) : true;
    return Promise.resolve(confirmed);
  }
  return new Promise((resolve) => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelText, style: "cancel", onPress: () => resolve(false) },
        { text: confirmText, style: destructive ? "destructive" : "default", onPress: () => resolve(true) }
      ],
      { cancelable: true, onDismiss: () => resolve(false) }
    );
  });
}
