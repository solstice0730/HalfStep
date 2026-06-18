# Frontend

Expo 기반 React Native 앱입니다.

## Screens

- 홈
- 기록
- 가족방
- 커뮤니티

## Setup

```bash
npm install
npm start
```

## Preview

React Native 앱은 브라우저 주소창에서 바로 보는 웹 앱이 아니다. Expo Go 또는 Android Emulator로 확인한다.

### iPhone + Expo Go

PC와 iPhone이 같은 Wi-Fi에 있으면 LAN 모드로 실행한다.

```bash
npm run start:lan
```

Expo Go에서 QR 코드를 스캔한다.

LAN 접속이 타임아웃되면 터널 모드로 실행한다. VPN, 회사/학교 Wi-Fi, Windows 방화벽 때문에 폰이 PC의 LAN 주소에 접근하지 못할 때 사용한다.

```bash
npm run start:tunnel
```

### Android Emulator

Android Studio 에뮬레이터를 실행한 뒤:

```bash
npm run android
```

## Type Check

```bash
npm run typecheck
```
