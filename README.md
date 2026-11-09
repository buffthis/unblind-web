# Unblind Frontend

[Unblind](https://unblind.kr) — 개발자들의 이력(경력, 스킬, 프로젝트, 포스트)을 한 곳에서 보여주는 멀티유저 포트폴리오 플랫폼의 프런트엔드입니다.

## Features

- 👥 **사용자 목록** — 커서 기반 무한 스크롤 (`/users`)
- 🪪 **사용자 포트폴리오** — 소개 / 경력 / 스킬 / 프로젝트 / 포스트 섹션 (`/:username`)
- 📝 **포스트 피드 & 상세** — 마크다운 렌더링, 외부 블로그 연동 (`/posts`, `/posts/:postId`)
- 🔐 **로그인** — 세션 쿠키 기반 인증 + Google 소셜 로그인 (`/login`)

## Tech Stack

- React 18, Vite
- react-router-dom v7, styled-components v6, framer-motion
- axios (세션 쿠키 인증), react-helmet-async (SEO), react-markdown
- Vitest + Testing Library

## Writing Guide

- [글 작성 가이드 (최신판)](writing-guide-latest.md) — 마크다운 문법과 글 카드 등 본문 기능의 사용법
- [글 작성 가이드 (이전판)](writing-guide.md)

## Project Structure

```plaintext
.
├── index.html            # Vite 엔트리 HTML
├── public/               # 정적 파일 (로고, manifest, sitemap 등)
├── src/
│   ├── apis/             # axios 클라이언트, 도메인별 API (auth/user/post)
│   ├── assets/           # 정적 데이터 (소셜 링크, 이미지 URL)
│   ├── components/
│   │   ├── cards/        # ProfileCard, PostCard, TechCard, HistoryCardItem
│   │   ├── common/       # 범용 컴포넌트 (Avatar, Section, Loading 등)
│   │   └── header/       # 헤더, 프로필 드롭다운, 로그인 버튼
│   ├── contexts/         # AuthContext (세션 복원/로그인/로그아웃)
│   ├── hooks/            # useUser, usePost(s), useInfiniteScroll 등
│   ├── pages/            # 라우트 단위 페이지
│   ├── styles/           # 디자인 토큰, 테마, 조합 스타일 (STYLE_GUIDE.md 참고)
│   └── utils/            # 포맷터, URL 검증, JSON-LD 직렬화 등
├── vite.config.js
└── package.json
```

## Getting Started

```bash
# 1. 의존성 설치
npm install

# 2. 환경 변수 설정 (.env.example 참고)
cp .env.example .env

# 3. 개발 서버 실행 (http://localhost:3000)
npm run dev
```

## Scripts

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드 (`build/`)
- `npm run preview` — 빌드 결과 로컬 미리보기
- `npm test` — 테스트 실행 (Vitest)
- `npm run lint` / `npm run lint:fix` — ESLint
- `npm run format` — Prettier

## Posting series

시리즈는 글 상단의 전체 회차 목록, 하단의 이전·다음 글, 시리즈 소개 페이지,
프로필의 `전체 글 / 시리즈` 전환으로 연결됩니다. 작성자는 글 편집기에서 시리즈를
만들거나 선택하고, 시리즈 관리에서 기존 글을 추가·제외하거나 읽는 순서를 바꿀 수 있습니다.

백엔드의 시리즈 API와 V6 마이그레이션을 먼저 배포한 뒤 `VITE_SERIES_ENABLED=true`로
빌드합니다. 작성·관리 화면에는 기존 `VITE_POST_EDITOR_ENABLED=true`도 필요합니다.
두 값은 빌드 시 적용되며 기본값은 꺼짐입니다.

```bash
VITE_SERIES_ENABLED=true VITE_POST_EDITOR_ENABLED=true npm run dev
```

서버와 로그인 없이 UI만 살펴보려면 개발 서버의 `/__preview/series`를 엽니다.
실제 독자용 컴포넌트를 사용하며, 예시 글의 링크로 회차 이동도 확인할 수 있습니다.
이 페이지와 예시 데이터는 프로덕션 빌드에 포함되지 않습니다.

- `/series/:seriesId`: 공개된 회차와 시리즈 소개
- `/series/new`: 시리즈 만들기 (로그인 필요)
- `/series/:seriesId/edit`: 시리즈 관리 (소유자 전용)

시리즈에서 글을 제외하거나 시리즈를 삭제해도 글은 유지됩니다. 숨긴 글은 관리 화면에만
표시되며 공개 목록·회차 번호·이전/다음 탐색에서 제외됩니다. API가 실패하면 오류와
재시도를 표시하고, 입력한 내용이나 기존 시리즈 선택을 유지합니다.

Node 26의 실험적 전역 Web Storage가 jsdom의 localStorage와 충돌하는 환경에서는
`NODE_OPTIONS=--no-experimental-webstorage npm test`로 테스트합니다.

## Deployment

`main` 브랜치 push 시 GitHub Actions가 빌드 후 인스턴스에 배포합니다
(`.github/workflows/deploy.yml`). PR에는 lint/test/build를 검증하는 CI가 실행됩니다
(`.github/workflows/ci.yml`).

## Live Demo

[https://unblind.kr](https://unblind.kr)
