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

## Deployment

`main` 브랜치 push 시 GitHub Actions가 빌드 후 인스턴스에 배포합니다
(`.github/workflows/deploy.yml`). PR에는 lint/test/build를 검증하는 CI가 실행됩니다
(`.github/workflows/ci.yml`).

## Live Demo

[https://unblind.kr](https://unblind.kr)
