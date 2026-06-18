# 브랜치 전략

이 프로젝트는 `main`, `develop`, `feature/*`, `fix/*` 중심의 브랜치 전략을 사용한다.

## 1. 브랜치 역할

```txt
main
└── develop
    └── feature/*
    └── fix/*
```

### main

- 배포 가능한 안정 브랜치다.
- 직접 커밋하지 않는다.
- `develop`에서 충분히 검증된 변경만 PR로 병합한다.

### develop

- 개발 통합 브랜치다.
- 기능 개발 브랜치의 merge 대상이다.
- 다음 배포 후보 상태를 유지한다.

### feature/*

- 기능 개발 브랜치다.
- 항상 `develop`에서 분기한다.
- 작업 완료 후 PR을 만들어 `develop`으로 병합한다.

예시:

```txt
feature/auth-login
feature/baby-profile
feature/care-log
feature/ai-diary
```

### fix/*

- 버그 수정 브랜치다.
- 항상 `develop`에서 분기한다.
- 수정 완료 후 PR을 만들어 `develop`으로 병합한다.

예시:

```txt
fix/login-token-refresh
fix/care-log-validation
fix/calendar-date-filter
```

## 2. 작업 흐름

### 기능 개발 시작

```bash
git switch develop
git pull origin develop
git switch -c feature/auth-login
```

### 버그 수정 시작

```bash
git switch develop
git pull origin develop
git switch -c fix/login-token-refresh
```

### 작업 후 push

```bash
git add .
git commit -m "feat: add auth login"
git push origin feature/auth-login
```

### PR 생성

- `feature/*` -> `develop` 방향으로 PR을 만든다.
- 최소 1명 승인 후 merge한다.

### 배포 반영

```txt
develop -> main
```

- 배포 가능한 상태가 되면 `develop`에서 `main`으로 PR을 만든다.
- 최소 1명 승인 후 merge한다.

## 3. 보호 규칙

- `main` 직접 push 금지
- `develop` 직접 push 금지
- PR 최소 승인 1명
- merge 전 충돌 해결 필수

## 4. 브랜치 삭제

PR merge 후 작업 브랜치는 삭제한다.

```bash
git branch -d feature/auth-login
git push origin --delete feature/auth-login

git branch -d fix/login-token-refresh
git push origin --delete fix/login-token-refresh
```
