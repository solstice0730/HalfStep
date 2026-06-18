# 디렉토리 구조

프로젝트는 React Native 프론트엔드, FastAPI 백엔드, 인프라 설정, 협업 문서로 나눈다.

```txt
project-root/
│
├── frontend/                         # React Native 앱
│   ├── src/                          # 앱 소스 코드
│   │   ├── providers/                # 전역 Provider
│   │   ├── config/                   # 앱 설정값
│   │   │
│   │   ├── navigation/               # 화면 이동 구조
│   │   │
│   │   ├── features/                 # 기능별 개발 폴더
│   │   │   ├── auth/                 # 로그인, 로그아웃
│   │   │   ├── home/                 # 홈 화면
│   │   │   ├── records/              # 기록 기능
│   │   │   ├── diary/                # AI 일기 생성
│   │   │   ├── calendar/             # 캘린더
│   │   │   ├── family/               # 가족방
│   │   │   ├── community/            # 커뮤니티
│   │   │   └── chatbot/              # AI 챗봇
│   │   │
│   │   ├── shared/                   # 공통 UI, 훅, 유틸
│   │   │   ├── components/           # 공통 컴포넌트
│   │   │   ├── hooks/                # 공통 훅
│   │   │   ├── utils/                # 공통 유틸 함수
│   │   │   └── constants/            # 색상, 간격, 테마 상수
│   │   │
│   │   ├── services/                 # 외부 API, 저장소 연결
│   │   │   ├── api/                  # API 클라이언트
│   │   │   └── storage/              # 토큰, 로컬 저장소
│   │   │
│   │   ├── store/                    # 전역 상태 관리
│   │   └── types/                    # 전역 타입
│   │
│   ├── App.tsx                       # Expo 앱 진입점
│   └── assets/                       # 이미지, 아이콘 리소스
│       ├── images/                   # 이미지 파일
│       └── icons/                    # 아이콘 파일
│
├── backend/                          # FastAPI 서버
│   ├── app/                          # 백엔드 앱 소스 코드
│   │   ├── main.py                   # FastAPI 시작점
│   │   │
│   │   ├── api/                      # API 라우터
│   │   │   ├── router.py             # 전체 라우터 연결
│   │   │   ├── deps.py               # 공통 의존성 주입
│   │   │   └── endpoints/            # 기능별 endpoint
│   │   │
│   │   ├── core/                     # 설정, 보안, 공통 값
│   │   ├── db/                       # DB 연결, 세션
│   │   ├── models/                   # SQLAlchemy 모델
│   │   ├── schemas/                  # Pydantic 요청/응답 스키마
│   │   ├── services/                 # 비즈니스 로직
│   │   ├── repositories/             # DB 접근 로직
│   │   └── utils/                    # 백엔드 공통 유틸
│   │
│   ├── alembic/                      # DB migration
│   └── tests/                        # 백엔드 테스트
│
├── infra/                            # 인프라 관련 파일
│   ├── docker/                       # Dockerfile 관리
│   │   ├── backend/                  # 백엔드 Dockerfile
│   │   └── frontend/                 # 프론트엔드 Dockerfile
│   ├── mysql/                        # MySQL 초기화 설정
│   ├── nginx/                        # Nginx 배포 설정
│   └── scripts/                      # 실행, 배포 보조 스크립트
│
├── docs/                             # 협업 문서
│   └── architecture.md               # 디렉토리 구조 설명
│
└── .github/                          # GitHub 템플릿
    └── ISSUE_TEMPLATE/               # 이슈 템플릿
```

## 기본 원칙

- Expo Router와 충돌하지 않도록 `frontend/src/app` 폴더는 사용하지 않는다.
- 앱 전역 Provider는 `frontend/src/providers`, 설정값은 `frontend/src/config`에 둔다.
- 화면과 기능 코드는 `frontend/src/features` 아래에 기능별로 둔다.
- 공통 컴포넌트와 유틸은 `frontend/src/shared`에 둔다.
- 백엔드는 `endpoint -> service -> repository` 흐름을 기준으로 나눈다.
- Dockerfile은 `infra/docker` 아래에서 관리한다.
- DB 모델은 `models`, 요청/응답 타입은 `schemas`에 둔다.
