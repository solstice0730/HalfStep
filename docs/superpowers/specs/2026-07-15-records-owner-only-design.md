# 기록 소유자 전용 권한 설계

## 목표

가족 공유방이 제외된 현재 MVP에 맞춰 기록 권한을 아기 소유자 한 명으로 단순화한다.

## 데이터 모델

- `baby_caregivers` 테이블과 SQLAlchemy 모델을 제거한다.
- 아기 소유권은 `babies.owner_user_id`로만 판단한다.
- 기존 기록 데이터와 `care_logs.user_id` 작성자 정보는 유지한다.
- 새 Alembic migration에서 `baby_caregivers` 테이블을 삭제한다.

## 접근 권한

- 기록 생성과 조회는 로그인 사용자 ID가 `babies.owner_user_id`와 일치할 때만 허용한다.
- 다른 사용자의 아기 ID로 요청하면 기존과 동일하게 `404 Baby not found`를 반환한다.
- 작성자 ID는 인증 사용자 ID를 사용한다.

## 데모 데이터

- 실제 소셜 로그인 사용자가 존재하면 가장 최근 사용자를 데모 아기 소유자로 지정한다.
- 실제 사용자가 없으면 `records-demo` 사용자를 생성해 소유자로 사용한다.
- 프론트의 `EXPO_PUBLIC_DEMO_BABY_ID=1` 방식은 아기 프로필 API 연결 전까지 유지한다.
- 새로운 사용자가 로그인한 뒤 데모 seed를 다시 실행하면 해당 사용자가 데모 아기를 소유하게 된다.

## 검증

- 소유자는 네 기록 유형을 생성하고 조회할 수 있어야 한다.
- 소유자가 아닌 사용자는 `404`를 받아야 한다.
- migration 후 `baby_caregivers` 테이블이 없어야 한다.
- Docker MySQL에서 실제 로그인 사용자로 생성 후 재조회해야 한다.
