import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Globe, MessageCircle } from "lucide-react-native";
import * as WebBrowser from "expo-web-browser";

import { env } from "@/config/env";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useOAuthProvider } from "@/features/auth/hooks/useOAuthProvider";
import type { OAuthProvider } from "@/features/auth/types/auth";
import { GlassSurface } from "@/shared/components/GlassSurface";
import { GradientBackdrop } from "@/shared/components/GradientBackdrop";
import { colors } from "@/shared/constants/colors";
import { theme } from "@/shared/constants/theme";
import { typography } from "@/shared/constants/typography";

WebBrowser.maybeCompleteAuthSession();

type ProviderOption = {
  backgroundColor: string;
  icon: "chrome" | "bubble" | "n";
  label: string;
  provider: OAuthProvider;
  textColor: string;
};

const providers: ProviderOption[] = [
  {
    backgroundColor: "#FFFFFF",
    icon: "chrome",
    label: "Google로 계속하기",
    provider: "google",
    textColor: colors.primaryDark
  },
  {
    backgroundColor: "#FEE500",
    icon: "bubble",
    label: "카카오로 계속하기",
    provider: "kakao",
    textColor: "#191600"
  },
  {
    backgroundColor: "#03C75A",
    icon: "n",
    label: "네이버로 계속하기",
    provider: "naver",
    textColor: "#FFFFFF"
  }
];

export function LoginScreen() {
  return (
    <View style={styles.root}>
      <GradientBackdrop />
      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.mark}>
            <Image
              accessible={false}
              source={require("../../../../assets/images/login-icon.jpg")}
              resizeMode="cover"
              style={styles.markImage}
            />
          </View>
          <Text style={styles.title}>HalfStep</Text>
          <Text style={styles.subtitle}>아이의 하루 기록을 안전하게 이어가세요.</Text>
        </View>

        <GlassSurface radius={theme.radius.xxl} intensity={45} style={styles.panelShell} contentStyle={styles.panel}>
          <Text accessibilityRole="header" style={styles.panelTitle}>로그인</Text>
          <Text style={styles.panelText}>사용 중인 계정으로 인증하고 HalfStep 토큰을 발급받습니다.</Text>

          <View style={styles.buttonStack}>
            {providers.map((option) => (
              <OAuthLoginButton key={option.provider} option={option} />
            ))}
          </View>

          {__DEV__ && <DevLoginButton />}
        </GlassSurface>
      </ScrollView>
    </View>
  );
}

// ponytail: dev-only bypass so QA on a physical device (Expo Go) can log in without real
// OAuth keys configured. __DEV__ is false in production builds, so this never ships.
function DevLoginButton() {
  const { signInWithProviderToken } = useAuth();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePress = async () => {
    setIsSigningIn(true);
    setErrorMessage(null);
    try {
      await signInWithProviderToken("google", `dev:google:tester-${Date.now()}`);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "테스트 로그인에 실패했습니다.");
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <View style={styles.devLoginWrap}>
      <Pressable
        accessibilityLabel="테스트 계정으로 로그인"
        accessibilityRole="button"
        accessibilityState={{ busy: isSigningIn, disabled: isSigningIn }}
        disabled={isSigningIn}
        onPress={handlePress}
        style={[styles.devButton, isSigningIn && styles.disabledButton]}
      >
        {isSigningIn ? <ActivityIndicator color={colors.primaryDark} /> : <Text style={styles.devButtonText}>테스트 계정으로 로그인 (dev)</Text>}
      </Pressable>
      {errorMessage ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function OAuthLoginButton({ option }: { option: ProviderOption }) {
  const { signInWithProviderCode } = useAuth();
  const {
    canStart,
    getAuthorizationCode,
    promptAsync,
    response,
    unavailableReason
  } = useOAuthProvider(option.provider);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (response?.type !== "success") return;

    setIsSigningIn(true);
    setErrorMessage(null);

    Promise.resolve(getAuthorizationCode())
      .then((authorization) => {
        if (!authorization) {
          throw new Error("OAuth 인가 코드를 받을 수 없습니다.");
        }
        return signInWithProviderCode(
          option.provider,
          authorization.code,
          authorization.redirectUri,
          authorization.codeVerifier
        );
      })
      .catch((error) => {
        setErrorMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
      })
      .finally(() => setIsSigningIn(false));
  }, [getAuthorizationCode, option.provider, response, signInWithProviderCode]);

  const handlePress = async () => {
    setErrorMessage(null);
    await promptAsync();
  };

  const helperText = unavailableReason ?? getProviderHelper(option.provider);

  return (
    <View>
      <Pressable
        accessibilityLabel={option.label}
        accessibilityRole="button"
        accessibilityState={{ busy: isSigningIn, disabled: !canStart || isSigningIn }}
        disabled={!canStart || isSigningIn}
        style={[
          styles.oauthButton,
          { backgroundColor: option.backgroundColor },
          (!canStart || isSigningIn) && styles.disabledButton
        ]}
        onPress={handlePress}
      >
        {isSigningIn ? (
          <ActivityIndicator color={option.textColor} />
        ) : (
          <>
            <ProviderIcon icon={option.icon} color={option.textColor} />
            <Text style={[styles.oauthButtonText, { color: option.textColor }]}>{option.label}</Text>
          </>
        )}
      </Pressable>
      {!canStart && helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      {errorMessage ? <Text accessibilityLiveRegion="assertive" style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function ProviderIcon({ icon, color }: { icon: ProviderOption["icon"]; color: string }) {
  if (icon === "chrome") {
    return <Globe color={color} size={22} />;
  }

  if (icon === "bubble") {
    return <MessageCircle color={color} size={22} />;
  }

  return <Text style={[styles.naverIcon, { color }]}>N</Text>;
}

function getProviderHelper(provider: OAuthProvider) {
  if (provider === "google" && !env.googleClientId) {
    return "Google 로그인 설정이 필요합니다.";
  }
  if (provider === "kakao" && !env.kakaoRestApiKey) {
    return "카카오 로그인 설정이 필요합니다.";
  }
  if (provider === "naver" && !env.naverClientId) {
    return "네이버 로그인 설정이 필요합니다.";
  }
  return null;
}

const styles = StyleSheet.create({
  root: {
    flex: 1
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 22,
    paddingBottom: 30
  },
  header: {
    alignItems: "center",
    marginBottom: 34
  },
  mark: {
    borderRadius: 24,
    height: 88,
    marginBottom: 18,
    overflow: "hidden",
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 4,
    width: 88
  },
  markImage: {
    height: "100%",
    transform: [{ scale: 1.06 }],
    width: "100%"
  },
  title: {
    color: colors.primaryDark,
    ...typography.largeTitle
  },
  subtitle: {
    color: colors.textMuted,
    ...typography.subheadEmphasized,
    marginTop: 8,
    textAlign: "center"
  },
  panelShell: {
    alignSelf: "center",
    maxWidth: 720,
    width: "100%"
  },
  panel: {
    padding: 22
  },
  panelTitle: {
    color: colors.primaryDark,
    ...typography.title2
  },
  panelText: {
    color: colors.textMuted,
    ...typography.subhead,
    marginTop: 8
  },
  buttonStack: {
    gap: 12,
    marginTop: 20
  },
  oauthButton: {
    alignItems: "center",
    borderColor: colors.border,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 16,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 1
  },
  disabledButton: {
    opacity: 0.55
  },
  oauthButtonText: {
    ...typography.headline
  },
  naverIcon: {
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 22
  },
  helperText: {
    color: colors.warning,
    ...typography.caption1,
    fontWeight: "700",
    marginTop: 8
  },
  errorText: {
    color: colors.danger,
    ...typography.caption1,
    fontWeight: "700",
    marginTop: 8
  },
  devLoginWrap: {
    borderColor: colors.border,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 18,
    paddingTop: 18
  },
  devButton: {
    alignItems: "center",
    backgroundColor: colors.surfaceSoft,
    borderRadius: theme.radius.pill,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 16
  },
  devButtonText: {
    color: colors.primaryDark,
    ...typography.subheadEmphasized
  }
});
