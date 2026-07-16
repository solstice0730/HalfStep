# 🍼 반걸음 API 명세서

**AI 기반 신생아 육아 관리 플랫폼**

| **항목** | **내용** |
| --- | --- |
| **문서 버전** | v1.0.0 |
| **작성일** | 2025년 5월 |
| **Base URL** | `https://api.bangeoleum.com/api/v1` |
| **인증 방식** | JWT Bearer Token |
| **분류** | 기밀 — 내부 배포 한정 |

---

## 목차

1. [공통 규약](#1-공통-규약)
2. [인증 (Auth)](#2-인증-auth)
3. [사용자 / 아기 프로필](#3-사용자--아기-프로필)
4. [홈 대시보드](#4-홈-대시보드)
5. [기록 (Record)](#5-기록-record)
6. [AI 일기](#6-ai-일기)
7. [캘린더](#7-캘린더)
8. [가족방 (Family Room)](#8-가족방-family-room)
9. [커뮤니티 (Community)](#9-커뮤니티-community)
10. [AI 기능](#10-ai-기능)
11. [알림 (Notification)](#11-알림-notification)
12. [파일 업로드](#12-파일-업로드)
13. [에러 코드](#13-에러-코드)

---

## 1. 공통 규약

### 1.1 요청 헤더

```
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
```

### 1.2 표준 응답 형식

**성공**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2025-05-15T10:00:00Z"
  }
}
```

**페이지네이션 응답**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "cursor": "eyJpZCI6MTIzfQ==",
    "hasNext": true,
    "total": 120,
    "timestamp": "2025-05-15T10:00:00Z"
  }
}
```

**실패**
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "인증이 필요합니다."
  },
  "meta": {
    "timestamp": "2025-05-15T10:00:00Z"
  }
}
```

### 1.3 페이지네이션

커뮤니티 피드, 기록 조회는 Cursor-based 페이지네이션 사용.

| 쿼리 파라미터 | 타입 | 설명 |
| --- | --- | --- |
| `cursor` | string | 이전 응답의 `meta.cursor` 값 |
| `limit` | number | 한 페이지 항목 수 (기본값: 20, 최대: 50) |

### 1.4 날짜 형식

모든 날짜/시각은 **ISO 8601** 형식 사용 (`YYYY-MM-DDTHH:mm:ssZ`)

---

## 2. 인증 (Auth)

### 2.1 소셜 로그인

```
POST /auth/social
```

소셜 provider(카카오·네이버·구글)의 OAuth 토큰으로 로그인 또는 회원가입 처리.

**Request Body**
```json
{
  "provider": "kakao",        // "kakao" | "naver" | "google"
  "accessToken": "string"     // provider에서 발급받은 access token
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "isNewUser": true,          // 신규 가입 여부 (true면 프로필 설정 필요)
    "user": {
      "id": "uuid",
      "nickname": null,
      "email": "user@example.com",
      "provider": "kakao"
    }
  }
}
```

---

### 2.2 이메일 로그인

```
POST /auth/email/login
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "string"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "nickname": "닉네임",
      "email": "user@example.com"
    }
  }
}
```

---

### 2.3 이메일 회원가입

```
POST /auth/email/register
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "string",       // 8자 이상, 영문+숫자 조합
  "nickname": "string"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci...",
    "user": {
      "id": "uuid",
      "nickname": "닉네임",
      "email": "user@example.com"
    }
  }
}
```

---

### 2.4 토큰 갱신

```
POST /auth/token/refresh
```

> 인증 헤더 불필요. Refresh Token으로 새 Access Token 발급 (Rotation 적용).

**Request Body**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGci...",
    "refreshToken": "eyJhbGci..."   // 새로 발급된 Refresh Token
  }
}
```

---

### 2.5 로그아웃

```
POST /auth/logout
```

> 🔒 인증 필요

**Request Body**
```json
{
  "refreshToken": "eyJhbGci..."
}
```

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 3. 사용자 / 아기 프로필

### 3.1 내 프로필 조회

```
GET /users/me
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "엄마닉네임",
    "email": "user@example.com",
    "provider": "kakao",
    "babies": [
      {
        "id": "uuid",
        "name": "아기이름",
        "birthDate": "2025-01-01",
        "gender": "MALE",            // "MALE" | "FEMALE" | "UNKNOWN"
        "isActive": true
      }
    ],
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

### 3.2 프로필 수정

```
PATCH /users/me
```

> 🔒 인증 필요

**Request Body** (변경할 필드만 포함)
```json
{
  "nickname": "새닉네임"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "nickname": "새닉네임"
  }
}
```

---

### 3.3 회원 탈퇴

```
DELETE /users/me
```

> 🔒 인증 필요  
> 즉시 개인정보 익명화, 30일 후 완전 삭제.

**Response 200**
```json
{
  "success": true,
  "data": {
    "scheduledDeleteAt": "2025-06-15T00:00:00Z"
  }
}
```

---

### 3.4 아기 프로필 등록

```
POST /babies
```

> 🔒 인증 필요

**Request Body**
```json
{
  "name": "아기이름",
  "birthDate": "2025-01-01",
  "gender": "MALE"             // "MALE" | "FEMALE" | "UNKNOWN"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "아기이름",
    "birthDate": "2025-01-01",
    "gender": "MALE",
    "ageInDays": 134
  }
}
```

---

### 3.5 아기 프로필 수정

```
PATCH /babies/{babyId}
```

> 🔒 인증 필요

**Request Body** (변경할 필드만 포함)
```json
{
  "name": "새이름",
  "gender": "FEMALE"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "새이름",
    "gender": "FEMALE"
  }
}
```

---

### 3.6 활성 아기 전환

```
PATCH /babies/{babyId}/activate
```

> 🔒 인증 필요  
> 현재 기록/홈 화면에 표시할 아기를 전환.

**Response 200**
```json
{
  "success": true,
  "data": {
    "activeBabyId": "uuid"
  }
}
```

---

### 3.7 아기 프로필 삭제

```
DELETE /babies/{babyId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 4. 홈 대시보드

### 4.1 오늘 대시보드 조회

```
GET /home/dashboard?babyId={babyId}
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `babyId` | O | 아기 ID |

**Response 200**
```json
{
  "success": true,
  "data": {
    "baby": {
      "id": "uuid",
      "name": "아기이름",
      "ageInDays": 45,
      "ageInMonths": 1
    },
    "todaySummary": {
      "feedingCount": 8,
      "sleepTotalMinutes": 960,
      "urineCount": 6,
      "stoolCount": 2,
      "lastFeedingAt": "2025-05-15T09:30:00Z",
      "lastSleepAt": "2025-05-15T11:00:00Z"
    },
    "aiSummary": "오늘 아기는 8번 수유하고 16시간 깊이 잠들었어요 🌙",
    "curationCards": [
      {
        "id": "uuid",
        "type": "TIP",              // "TIP" | "VACCINATION" | "CONTENT"
        "title": "이 시기 수면 패턴",
        "body": "생후 45일 아기는...",
        "imageUrl": "https://cdn.../image.jpg",
        "linkUrl": null
      }
    ],
    "activeTimer": {
      "type": "FEEDING",           // 현재 진행 중인 타이머, 없으면 null
      "startedAt": "2025-05-15T12:00:00Z",
      "elapsedSeconds": 342
    }
  }
}
```

---

## 5. 기록 (Record)

### 5.1 기록 목록 조회

```
GET /records?babyId={babyId}&type={type}&date={date}
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 타입 | 설명 |
| --- | --- | --- | --- |
| `babyId` | O | string | 아기 ID |
| `type` | X | string | `FEEDING` \| `SLEEP` \| `URINE` \| `STOOL` |
| `date` | X | string | 조회 날짜 (`YYYY-MM-DD`). 미입력 시 오늘 |
| `cursor` | X | string | 페이지네이션 커서 |
| `limit` | X | number | 기본 50 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "FEEDING",
      "startedAt": "2025-05-15T09:00:00Z",
      "endedAt": "2025-05-15T09:20:00Z",
      "content": {
        "feedingType": "BREAST",   // "BREAST" | "FORMULA" | "MIXED"
        "breastSide": "LEFT",      // "LEFT" | "RIGHT" | "BOTH"
        "formulaAmountMl": null
      },
      "memo": "잘 먹었음",
      "createdAt": "2025-05-15T09:20:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6...",
    "hasNext": false
  }
}
```

---

### 5.2 수유 기록 생성

```
POST /records/feeding
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "occurredAt": "2025-05-15T09:00:00Z",
  "feedingType": "BREAST",
  "amountMl": null,
  "durationMinutes": 20,
  "breastSide": "LEFT",
  "burped": true,
  "memo": "잘 먹었음"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "FEEDING",
    "occurredAt": "2025-05-15T09:00:00Z",
    "durationMinutes": 20
  }
}
```

---

### 5.3 수유 타이머 시작

```
POST /records/feeding/timer/start
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "feedingType": "BREAST",
  "breastSide": "LEFT"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "timerId": "uuid",
    "startedAt": "2025-05-15T09:00:00Z"
  }
}
```

---

### 5.4 수유 타이머 종료

```
POST /records/feeding/timer/{timerId}/stop
```

> 🔒 인증 필요

**Request Body**
```json
{
  "formulaAmountMl": null,
  "memo": "string"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "FEEDING",
    "startedAt": "2025-05-15T09:00:00Z",
    "endedAt": "2025-05-15T09:20:00Z",
    "durationMinutes": 20
  }
}
```

---

### 5.5 수면 기록 생성

```
POST /records/sleep
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "startedAt": "2025-05-15T11:00:00Z",
  "endedAt": "2025-05-15T13:30:00Z",
  "sleepType": "NAP",
  "status": "PEACEFUL"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "SLEEP",
    "startedAt": "2025-05-15T11:00:00Z",
    "endedAt": "2025-05-15T13:30:00Z",
    "durationMinutes": 150
  }
}
```

---

### 5.6 수면 타이머 시작 / 종료

```
POST /records/sleep/timer/start
POST /records/sleep/timer/{timerId}/stop
```

> 수유 타이머와 동일한 구조. `start` 시 `babyId`만 필요, `stop` 시 `memo` 선택 입력.

---

### 5.7 소변 기록 생성

```
POST /records/urine
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "occurredAt": "2025-05-15T10:00:00Z",
  "amount": "MEDIUM",
  "color": "NORMAL"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "URINE",
    "occurredAt": "2025-05-15T10:00:00Z",
    "colorWarning": false          // 색상 이상 여부
  }
}
```

---

### 5.8 대변 기록 생성

```
POST /records/stool
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "occurredAt": "2025-05-15T10:00:00Z",
  "amount": "SMALL",
  "color": "GREEN",
  "form": "SOFT",
  "photoUrl": "https://cdn.../stool.jpg"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "STOOL",
    "occurredAt": "2025-05-15T10:00:00Z",
    "colorWarning": false,
    "warningMessage": null
  }
}
```

---

### 5.9 이유식 기록 생성

```
POST /records/meal
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "occurredAt": "2025-05-15T12:00:00Z",
  "menu": "단호박 퓨레",
  "amountGram": 80,                // g 단위 (선택)
  "amountPercent": null,           // % 단위 (선택, amountGram과 택일)
  "memo": "string"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "type": "MEAL",
    "occurredAt": "2025-05-15T12:00:00Z",
    "menu": "단호박 퓨레"
  }
}
```

---

### 5.10 기록 수정

```
PATCH /records/{recordId}
```

> 🔒 인증 필요  
> 변경할 필드만 포함. 기록 타입에 따라 수정 가능한 필드 상이.

**Request Body 예시 (수유)**
```json
{
  "endedAt": "2025-05-15T09:25:00Z",
  "formulaAmountMl": 120,
  "memo": "수정된 메모"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "2025-05-15T10:00:00Z"
  }
}
```

---

### 5.11 기록 삭제

```
DELETE /records/{recordId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 6. AI 일기

### 6.1 AI 일기 생성 요청

```
POST /diary/generate
```

> 🔒 인증 필요  
> OpenAI API 호출로 최대 10초 소요. 10초 초과 시 Push 알림으로 완료 통보.

**Request Body**
```json
{
  "babyId": "uuid",
  "date": "2025-05-15",
  "imageUrls": [                   // S3 업로드 완료 후 URL, 최대 10장
    "https://cdn.../image1.jpg",
    "https://cdn.../image2.jpg"
  ],
  "keywords": ["산책", "낮잠", "목욕"]  // 최대 10개
}
```

**Response 202**
```json
{
  "success": true,
  "data": {
    "diaryId": "uuid",
    "status": "GENERATING",        // "GENERATING" | "DONE" | "FAILED"
    "estimatedSeconds": 8
  }
}
```

---

### 6.2 AI 일기 생성 결과 조회

```
GET /diary/{diaryId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2025-05-15",
    "status": "DONE",
    "content": "오늘은 아기와 함께 산책을 다녀왔어요...",  // 최대 500자
    "imageUrls": ["https://cdn.../image1.jpg"],
    "keywords": ["산책", "낮잠"],
    "isAiGenerated": true,
    "createdAt": "2025-05-15T20:00:00Z"
  }
}
```

---

### 6.3 AI 일기 재생성

```
POST /diary/{diaryId}/regenerate
```

> 🔒 인증 필요  
> 1회만 허용.

**Response 202**
```json
{
  "success": true,
  "data": {
    "diaryId": "uuid",
    "status": "GENERATING"
  }
}
```

---

### 6.4 일기 저장 (편집 후 최종 저장)

```
PUT /diary/{diaryId}
```

> 🔒 인증 필요

**Request Body**
```json
{
  "content": "편집된 일기 내용...",
  "imageUrls": ["https://cdn.../image1.jpg"]
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2025-05-15",
    "content": "편집된 일기 내용...",
    "savedAt": "2025-05-15T20:05:00Z"
  }
}
```

---

### 6.5 일기 직접 작성 (AI 미사용)

```
POST /diary
```

> 🔒 인증 필요

**Request Body**
```json
{
  "babyId": "uuid",
  "date": "2025-05-15",
  "content": "직접 작성한 일기...",
  "imageUrls": ["https://cdn.../image1.jpg"],
  "keywords": ["산책"]
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "date": "2025-05-15",
    "isAiGenerated": false,
    "createdAt": "2025-05-15T20:00:00Z"
  }
}
```

---

### 6.6 일기 삭제

```
DELETE /diary/{diaryId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 7. 캘린더

### 7.1 월간 캘린더 조회

```
GET /calendar?babyId={babyId}&year={year}&month={month}
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 타입 | 설명 |
| --- | --- | --- | --- |
| `babyId` | O | string | 아기 ID |
| `year` | O | number | 연도 (예: 2025) |
| `month` | O | number | 월 (1~12) |

**Response 200**
```json
{
  "success": true,
  "data": {
    "year": 2025,
    "month": 5,
    "days": [
      {
        "date": "2025-05-15",
        "hasDiary": false,
        "thumbnailUrl": null,
        "recordCount": 4,
        "recordTypes": ["FEEDING", "SLEEP", "URINE", "STOOL"],
        "recordCounts": {
          "feeding": 1,
          "sleep": 1,
          "urine": 1,
          "stool": 1
        }
      }
    ]
  }
}
```

---

### 7.2 일간 기록 타임라인 조회

```
GET /calendar/daily?babyId={babyId}&date={date}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "date": "2025-05-15",
    "diary": null,
    "timeline": [
      {
        "id": "uuid",
        "type": "FEEDING",
        "time": "2025-05-15T06:00:00+09:00",
        "summary": "분유 120ml"
      },
      {
        "id": "uuid",
        "type": "SLEEP",
        "time": "2025-05-15T09:30:00+09:00",
        "summary": "수면 2시간 30분"
      }
    ],
    "daySummary": {
      "feedingCount": 8,
      "sleepTotalMinutes": 900,
      "urineCount": 7,
      "stoolCount": 2
    }
  }
}
```

---

## 8. 가족방 (Family Room)

### 8.1 가족방 생성

```
POST /family-rooms
```

> 🔒 인증 필요  
> 계정당 1개 생성 가능.

**Request Body**
```json
{
  "babyId": "uuid",
  "name": "우리 가족방"              // 선택
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "우리 가족방",
    "inviteCode": "AB12CD",
    "inviteLink": "https://bangeoleum.com/join/AB12CD",
    "createdAt": "2025-05-15T00:00:00Z"
  }
}
```

---

### 8.2 초대코드로 가족방 참여

```
POST /family-rooms/join
```

> 🔒 인증 필요

**Request Body**
```json
{
  "inviteCode": "AB12CD"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "roomId": "uuid",
    "roomName": "우리 가족방",
    "role": "MEMBER",
    "memberCount": 3
  }
}
```

---

### 8.3 가족방 정보 조회

```
GET /family-rooms/{roomId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "우리 가족방",
    "inviteCode": "AB12CD",
    "members": [
      {
        "userId": "uuid",
        "nickname": "엄마",
        "role": "ADMIN",
        "joinedAt": "2025-01-01T00:00:00Z"
      },
      {
        "userId": "uuid",
        "nickname": "아빠",
        "role": "MEMBER",
        "joinedAt": "2025-01-02T00:00:00Z"
      }
    ]
  }
}
```

---

### 8.4 가족방 피드 조회

```
GET /family-rooms/{roomId}/feed
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `cursor` | X | 페이지네이션 커서 |
| `limit` | X | 기본 20 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "DIARY",             // "DIARY" | "RECORD" | "POST"
      "author": {
        "userId": "uuid",
        "nickname": "엄마"
      },
      "content": {
        "text": "오늘 아기와 산책...",
        "imageUrls": ["https://cdn.../image1.jpg"]
      },
      "likeCount": 3,
      "isLiked": false,
      "commentCount": 1,
      "createdAt": "2025-05-15T20:00:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6...",
    "hasNext": true
  }
}
```

---

### 8.5 피드 공유

```
POST /family-rooms/{roomId}/feed
```

> 🔒 인증 필요

**Request Body**
```json
{
  "type": "DIARY",                 // "DIARY" | "RECORD"
  "referenceId": "uuid"           // 공유할 일기 또는 기록 ID
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "feedId": "uuid"
  }
}
```

---

### 8.6 피드 좋아요 / 취소

```
POST /family-rooms/{roomId}/feed/{feedId}/like
DELETE /family-rooms/{roomId}/feed/{feedId}/like
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "likeCount": 4,
    "isLiked": true
  }
}
```

---

### 8.7 피드 댓글 목록 조회

```
GET /family-rooms/{roomId}/feed/{feedId}/comments
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "author": { "userId": "uuid", "nickname": "아빠" },
      "content": "귀엽다 💕",
      "createdAt": "2025-05-15T21:00:00Z"
    }
  ]
}
```

---

### 8.8 피드 댓글 작성

```
POST /family-rooms/{roomId}/feed/{feedId}/comments
```

> 🔒 인증 필요

**Request Body**
```json
{
  "content": "귀엽다 💕"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "귀엽다 💕",
    "createdAt": "2025-05-15T21:00:00Z"
  }
}
```

---

### 8.9 가족 일정 목록 조회

```
GET /family-rooms/{roomId}/schedules?year={year}&month={month}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "예방접종 (DTaP 2차)",
      "scheduledAt": "2025-05-20T10:00:00Z",
      "type": "VACCINATION",       // "VACCINATION" | "HOSPITAL" | "OTHER"
      "createdBy": { "userId": "uuid", "nickname": "엄마" }
    }
  ]
}
```

---

### 8.10 가족 일정 생성

```
POST /family-rooms/{roomId}/schedules
```

> 🔒 인증 필요

**Request Body**
```json
{
  "title": "예방접종 (DTaP 2차)",
  "scheduledAt": "2025-05-20T10:00:00Z",
  "type": "VACCINATION",
  "memo": "소아과 예약 완료"
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "예방접종 (DTaP 2차)",
    "scheduledAt": "2025-05-20T10:00:00Z"
  }
}
```

---

### 8.11 구성원 추방 (관리자 전용)

```
DELETE /family-rooms/{roomId}/members/{userId}
```

> 🔒 인증 필요 (ADMIN만 가능)

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 9. 커뮤니티 (Community)

### 9.1 게시글 목록 조회

```
GET /posts?category={category}
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `category` | X | `PREGNANCY` \| `BIRTH_STORY` \| `POSTPARTUM_CENTER` \| `NEWBORN` \| `FEEDING` \| `HEALTH` \| `SLEEP_DEVELOPMENT` \| `FREE` \| `COUNSELING` |
| `cursor` | X | 페이지네이션 커서 |
| `limit` | X | 기본 20 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "category": "NEWBORN",
      "title": "생후 45일 수면 패턴 공유해요",
      "preview": "저희 아기는 요즘...",
      "author": {
        "nickname": "익명",
        "isAnonymous": true
      },
      "likeCount": 12,
      "commentCount": 5,
      "imageCount": 2,
      "createdAt": "2025-05-15T10:00:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6...",
    "hasNext": true
  }
}
```

---

### 9.2 게시글 상세 조회

```
GET /posts/{postId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "category": "NEWBORN",
    "title": "생후 45일 수면 패턴 공유해요",
    "content": "저희 아기는 요즘...",
    "imageUrls": ["https://cdn.../image1.jpg"],
    "author": {
      "userId": "uuid",
      "nickname": "익명",
      "isAnonymous": true
    },
    "likeCount": 12,
    "isLiked": false,
    "commentCount": 5,
    "createdAt": "2025-05-15T10:00:00Z",
    "updatedAt": "2025-05-15T10:00:00Z"
  }
}
```

---

### 9.3 게시글 작성

```
POST /posts
```

> 🔒 인증 필요

**Request Body**
```json
{
  "category": "NEWBORN",
  "title": "생후 45일 수면 패턴 공유해요",
  "content": "저희 아기는 요즘...",
  "imageUrls": ["https://cdn.../image1.jpg"],  // 최대 5장
  "isAnonymous": false
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "similarPosts": [              // AI 유사글 추천 (최대 3개)
      {
        "id": "uuid",
        "title": "비슷한 게시글 제목",
        "preview": "..."
      }
    ]
  }
}
```

---

### 9.4 게시글 수정

```
PATCH /posts/{postId}
```

> 🔒 인증 필요 (본인만)

**Request Body** (변경할 필드만)
```json
{
  "title": "수정된 제목",
  "content": "수정된 내용"
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "updatedAt": "2025-05-15T11:00:00Z"
  }
}
```

---

### 9.5 게시글 삭제

```
DELETE /posts/{postId}
```

> 🔒 인증 필요 (본인만)

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 9.6 게시글 좋아요 / 취소

```
POST /posts/{postId}/like
DELETE /posts/{postId}/like
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "likeCount": 13,
    "isLiked": true
  }
}
```

---

### 9.7 댓글 목록 조회

```
GET /posts/{postId}/comments
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "공감해요!",
      "author": {
        "userId": "uuid",
        "nickname": "다른엄마",
        "isAnonymous": false
      },
      "likeCount": 2,
      "isLiked": false,
      "replies": [
        {
          "id": "uuid",
          "content": "저도요!",
          "author": { "userId": "uuid", "nickname": "또다른엄마", "isAnonymous": false },
          "likeCount": 0,
          "createdAt": "2025-05-15T11:00:00Z"
        }
      ],
      "createdAt": "2025-05-15T10:30:00Z"
    }
  ]
}
```

---

### 9.8 댓글 작성

```
POST /posts/{postId}/comments
```

> 🔒 인증 필요

**Request Body**
```json
{
  "content": "공감해요!",
  "parentId": null,              // 대댓글이면 부모 댓글 ID
  "isAnonymous": false
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "공감해요!",
    "createdAt": "2025-05-15T10:30:00Z"
  }
}
```

---

### 9.9 댓글 삭제

```
DELETE /posts/{postId}/comments/{commentId}
```

> 🔒 인증 필요 (본인만)

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 9.10 신고

```
POST /reports
```

> 🔒 인증 필요

**Request Body**
```json
{
  "targetType": "POST",          // "POST" | "COMMENT" | "USER"
  "targetId": "uuid",
  "reason": "SPAM",              // "SPAM" | "ABUSE" | "INAPPROPRIATE" | "OTHER"
  "detail": "string"             // 선택
}
```

**Response 201**
```json
{
  "success": true,
  "data": {
    "reportId": "uuid"
  }
}
```

---

### 9.11 사용자 차단

```
POST /users/{userId}/block
DELETE /users/{userId}/block
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 10. AI 기능

### 10.1 AI 챗봇 대화

```
POST /ai/chat
```

> 🔒 인증 필요  
> 의학적 진단·처방 관련 질의 시 전문의 상담 권장 메시지 반환.

**Request Body**
```json
{
  "babyId": "uuid",
  "message": "오늘 아기가 수유를 잘 안 해요. 왜 그럴까요?",
  "sessionId": "uuid"            // 대화 세션 ID (첫 메시지면 null)
}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "message": "생후 45일 아기의 경우 수유량이 일시적으로 줄어드는 경우가 있어요...",
    "disclaimer": "AI가 생성한 내용으로 의학적 조언이 아닙니다.",
    "isMedicalQuery": false,
    "relatedRecords": [          // 관련 기록 컨텍스트 (선택)
      {
        "type": "FEEDING",
        "summary": "오늘 수유 횟수: 5회 (평균 8회 대비 적음)"
      }
    ]
  }
}
```

---

### 10.2 AI 큐레이션 카드 조회

```
GET /ai/curation?babyId={babyId}
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "cards": [
      {
        "id": "uuid",
        "type": "TIP",
        "title": "이 시기 수면 패턴",
        "body": "생후 45일 아기는 하루 16~18시간 수면이 정상이에요.",
        "imageUrl": "https://cdn.../image.jpg",
        "linkUrl": null,
        "disclaimer": "AI가 생성한 내용으로 의학적 조언이 아닙니다."
      },
      {
        "id": "uuid",
        "type": "VACCINATION",
        "title": "DTaP 2차 예방접종 D-5",
        "body": "5일 후 DTaP 2차 접종 예정이에요.",
        "imageUrl": null,
        "linkUrl": null
      }
    ]
  }
}
```

---

## 11. 알림 (Notification)

### 11.1 FCM 토큰 등록

```
POST /notifications/token
```

> 🔒 인증 필요

**Request Body**
```json
{
  "fcmToken": "string",
  "platform": "IOS"              // "IOS" | "ANDROID"
}
```

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 11.2 알림 목록 조회

```
GET /notifications
```

> 🔒 인증 필요

**Query Parameters**

| 파라미터 | 필수 | 설명 |
| --- | --- | --- |
| `cursor` | X | 페이지네이션 커서 |
| `limit` | X | 기본 20 |

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "FEEDING_REMINDER",
      "title": "수유 시간이에요 🍼",
      "body": "마지막 수유 후 3시간이 지났어요.",
      "isRead": false,
      "createdAt": "2025-05-15T12:00:00Z"
    }
  ],
  "meta": {
    "cursor": "eyJpZCI6...",
    "hasNext": false,
    "unreadCount": 3
  }
}
```

---

### 11.3 알림 읽음 처리

```
PATCH /notifications/{notificationId}/read
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 11.4 알림 전체 읽음 처리

```
PATCH /notifications/read-all
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

### 11.5 알림 설정 조회

```
GET /notifications/settings
```

> 🔒 인증 필요

**Response 200**
```json
{
  "success": true,
  "data": {
    "feedingReminder": {
      "enabled": true,
      "intervalMinutes": 180
    },
    "vaccinationReminder": { "enabled": true },
    "familyRoomActivity": { "enabled": true },
    "communityComment": { "enabled": true },
    "diaryGenerated": { "enabled": true }
  }
}
```

---

### 11.6 알림 설정 수정

```
PATCH /notifications/settings
```

> 🔒 인증 필요

**Request Body** (변경할 설정만)
```json
{
  "feedingReminder": {
    "enabled": true,
    "intervalMinutes": 120
  },
  "familyRoomActivity": {
    "enabled": false
  }
}
```

**Response 200**
```json
{
  "success": true,
  "data": null
}
```

---

## 12. 파일 업로드

### 12.1 Pre-Signed URL 발급

```
POST /files/presigned-url
```

> 🔒 인증 필요  
> S3 Pre-Signed URL 발급. 클라이언트가 직접 S3에 업로드 후 URL을 기록/일기 API에 사용.

**Request Body**
```json
{
  "files": [
    {
      "fileName": "image1.jpg",
      "contentType": "image/jpeg",  // "image/jpeg" | "image/png" | "image/webp"
      "fileSize": 2048000           // bytes (최대 10MB)
    }
  ]
}
```

**Response 200**
```json
{
  "success": true,
  "data": [
    {
      "uploadUrl": "https://s3.amazonaws.com/...?X-Amz-Signature=...",
      "fileUrl": "https://cdn.bangeoleum.com/uploads/uuid/image1.jpg",
      "expiresIn": 3600            // Pre-Signed URL 유효시간 (초)
    }
  ]
}
```

---

## 13. 에러 코드

### HTTP 상태 코드

| 상태 코드 | 의미 |
| --- | --- |
| 200 | 성공 |
| 201 | 생성 성공 |
| 202 | 요청 수락 (비동기 처리) |
| 400 | 잘못된 요청 (유효성 검사 실패) |
| 401 | 인증 실패 (토큰 없음 또는 만료) |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 409 | 충돌 (중복 생성 등) |
| 422 | 처리 불가 (비즈니스 로직 위반) |
| 429 | 요청 한도 초과 |
| 500 | 서버 내부 오류 |
| 503 | 서비스 일시 불가 (AI API 장애 등) |

### 에러 코드 목록

| 에러 코드 | HTTP | 설명 |
| --- | --- | --- |
| `UNAUTHORIZED` | 401 | 인증 토큰 없음 또는 만료 |
| `TOKEN_EXPIRED` | 401 | Access Token 만료 |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh Token 무효 또는 만료 |
| `FORBIDDEN` | 403 | 해당 리소스에 접근 권한 없음 |
| `NOT_FOUND` | 404 | 리소스를 찾을 수 없음 |
| `VALIDATION_ERROR` | 400 | 요청 파라미터 유효성 오류 |
| `DUPLICATE_FAMILY_ROOM` | 409 | 이미 가족방이 존재함 |
| `FAMILY_ROOM_FULL` | 422 | 가족방 최대 인원(10명) 초과 |
| `INVALID_INVITE_CODE` | 422 | 유효하지 않은 초대 코드 |
| `BABY_LIMIT_EXCEEDED` | 422 | 아기 프로필 최대 등록 수 초과 |
| `DIARY_REGENERATE_LIMIT` | 422 | 일기 재생성 횟수 초과 (1회 한정) |
| `TIMER_ALREADY_RUNNING` | 422 | 동일 유형의 타이머가 이미 실행 중 |
| `TIMER_NOT_FOUND` | 404 | 진행 중인 타이머 없음 |
| `AI_SERVICE_UNAVAILABLE` | 503 | AI 서비스 일시 장애 |
| `FILE_TOO_LARGE` | 400 | 파일 크기 초과 (최대 10MB) |
| `UNSUPPORTED_FILE_TYPE` | 400 | 지원하지 않는 파일 형식 |
| `REPORT_ALREADY_SUBMITTED` | 409 | 이미 신고한 대상 |
| `SELF_REPORT_NOT_ALLOWED` | 422 | 본인 게시글/댓글 신고 불가 |
| `RATE_LIMIT_EXCEEDED` | 429 | API 호출 한도 초과 |

---

*— 문서 끝 —*

> 기밀 — 내부 배포 한정
