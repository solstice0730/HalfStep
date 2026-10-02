# HalfStep Frontend

Expo SDK 57 기반 React Native 앱입니다.

## 주요 화면

- 로그인과 아기 프로필 등록
- 홈과 빠른 육아 기록
- 기록과 AI 육아 일지
- 캘린더와 날짜별 히스토리
- 커뮤니티
- AI 요약·질문
- 마이페이지와 7일 체험 후 유료 구독 목업

## 설치

```bash
cp .env.example .env
npm ci
```

기본 API 주소는 `http://localhost:8000/api`입니다. 실제 기기에서는 `EXPO_PUBLIC_API_BASE_URL`을 기기에서 접근 가능한 개발 PC 주소로 설정합니다.

## 실행

백엔드와 MySQL을 먼저 실행합니다.

```bash
# iOS development build 설치·실행
npm run ios

# 설치된 development build에 Metro 연결
npm run start:dev-client

# Expo Go로 UI·개발용 로그인 확인
npm run ios:go

# Android Emulator (Expo Go)
npm run android

# Web
npm run web
```

Expo Go 또는 development client는 프로젝트의 Expo SDK와 호환되는 버전을 사용해야 합니다. iOS 27을 Xcode 27로 빌드할 때는 `expo-build-properties`의 `ios.enableSceneSupport`가 필요합니다. SDK를 바꾼 뒤에는 `npx expo prebuild --clean --platform ios`로 네이티브 프로젝트를 다시 생성하세요.

실제 기기와 PC가 같은 네트워크라면 `npm run start:lan`, 네트워크 접근이 막힌 환경에서는 `npm run start:tunnel`을 사용합니다.

실기기에서 Metro 없이 실행할 로컬 iOS Release 빌드는 `EXPO_PUBLIC_API_BASE_URL`을
기기에서 접근할 수 있는 서버 주소로 지정해 빌드합니다. 기존 시연 앱의 데이터를 유지해야
한다면 `HALFSTEP_IOS_BUNDLE_IDENTIFIER`에 그 앱 ID를 지정할 수 있습니다. 이 값은
로컬 빌드에서만 사용하고 기본 앱 ID를 바꾸지 않습니다. 테스트 로그인은
`EXPO_PUBLIC_ENABLE_DEV_LOGIN=true`로 빌드하고 백엔드의
`OAUTH_DEV_TOKENS_ENABLED=true`와 함께 사용합니다. 로컬 서버가 꺼지거나
기기와 다른 네트워크에 있으면 API 기능은 작동하지 않습니다.

## 로그인

OAuth 환경변수가 없는 제공자는 비활성화됩니다. 로컬 데모에서는 백엔드의
`OAUTH_DEV_TOKENS_ENABLED=true`와 테스트 계정 로그인을 사용합니다. 실제
네이티브 OAuth는 `halfstep://` scheme이 포함된 development build에서만
검증합니다. 제공자별 HTTPS callback과 secret 관리 방법은 루트
[README](../README.md#ios-oauth-개발-빌드)를 따릅니다.

## 검증

```bash
npm test
npm run typecheck
npx expo install --check
npx expo export --platform web
```
