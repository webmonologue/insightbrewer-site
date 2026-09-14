# Insight Brewer 웹사이트 설계

- 날짜: 2026-09-14
- 상태: 승인 대기 (사용자 리뷰 전)
- 대상 저장소: `webmonologue/insightbrewer-site` (기존 Astro 스캐폴딩을 이어서 확장)

## 배경

- 목적: `vincent`의 퍼스널 브랜딩 "인사이트브루어(Insight Brewer)"를 구현하는 공식 웹사이트
- 브랜드 원본 문서: `퍼스널브랜딩_시즌3 인사이트브루어(Insight Brewer).md` (Obsidian Vault, `00-Inbox`)
- 핵심 목적: 블로그(인사이트 콘텐츠 발행) + 컨설팅 리드 획득을 동시에 수행하는 사이트
- 기존 상태:
  - GitHub `webmonologue/insightbrewer-site`: Astro 7 minimal 스타터 + 블로그 콘텐츠 컬렉션 스캐폴딩이 이미 존재 (`src/content/blog`, `src/pages/blog/[id].astro`, `@astrojs/sitemap` 통합)
  - Cloudflare Workers 배포 설정(`wrangler.jsonc`, assets 디렉터리 `./dist`) 완료, 커스텀 도메인 `insightbrewer.com` 지정됨 (canonical URL 기준)
  - 현재 배포본(`insightbrewer.webmonologue.workers.dev`)은 홈 한 줄 + `/blog` 링크뿐인 플레이스홀더
  - 로컬 저장소(`/Volumes/SSD990/00.dev/website_insightbrewer`)는 위 GitHub 저장소를 clone하여 이어서 작업 시작

## 목표 / 비목표

**목표**
- 브랜드 문서의 톤/메시지/컬러 원칙을 반영한 5페이지 구성 사이트 (홈/소개/블로그/서비스/문의) 론칭
- Cloudflare Workers에 정적 배포하면서 문의 폼만 서버 엔드포인트로 처리
- daleui의 디자인 토큰 설계 원칙(시맨틱 네이밍, 12단계 컬러 스케일, 다크모드 자동 대응, 접근성 우선)을 순수 CSS로 재구현

**비목표**
- daleui 라이브러리(React + Panda CSS) 자체를 의존성으로 설치하지 않음 — 원칙만 차용
- CMS 연동 없음 — 콘텐츠는 Markdown 파일 기반(Git 소스 오브 트루스)
- 로그인/회원 시스템, 결제, 대시보드 등 동적 기능 없음

## 아키텍처

- **프레임워크**: Astro 7 (기존 스캐폴딩 유지)
- **배포**: Cloudflare Workers, `@astrojs/cloudflare` 어댑터 추가 (현재는 순수 static assets 배포이므로 문의 폼 API 라우트를 위해 필요)
- **UI**: React/컴포넌트 라이브러리 없음. Astro 컴포넌트 + 순수 CSS(커스텀 프로퍼티 기반 디자인 토큰)
- **콘텐츠**: 기존 `src/content/blog` Content Collection 유지, `src/content.config.ts` 스키마에 제목/날짜/요약/태그 필드 보강
- **문의 폼 이메일 발송**: Resend API 연동. Astro 서버 엔드포인트(`src/pages/api/contact.ts`)에서 폼 제출을 받아 Resend REST API로 이메일 발송. Resend API 키는 Cloudflare Workers 환경 변수(시크릿)로 관리

## 디자인 시스템

- **컬러**: 무채색 베이스(다크그레이 스케일, 9단계) + 포인트 컬러 1개(라임). 시맨틱 토큰 네이밍(`--color-bg`, `--color-fg`, `--color-border`, `--color-accent` 등)으로 라이트/다크 모드(`prefers-color-scheme`) 자동 대응. daleui의 시맨틱 토큰 구조를 참고하되 실제 값은 브랜드 컬러로 직접 지정
- **타이포그래피**: Pretendard 가변 폰트 자체 호스팅. 산세리프, 중간 이하 굵기. 짧은 문장 리듬을 살리는 줄간격
- **스페이싱/라운딩**: 8pt 기준 스페이싱 스케일, 절제된 radii(`sm`~`md`). 심볼/아이콘은 최소화, 워드마크 중심
- **비주얼 금지 목록**: SF/로봇/네온, 화려한 그라디언트, 과도한 3D, 스톡 악수 사진, 대시보드 캡처 그대로 삽입, 4색 이상 사용

## 사이트 구조

| 페이지 | 경로 | 내용 |
|---|---|---|
| 홈 | `/` | 히어로(한 줄 소개 + 태그라인), 컨셉 요약, 서비스 미리보기, 최근 블로그 글 3개, CTA |
| 소개 | `/about` | 확장 소개문, "인사이트브루어가 믿는 것" 4가지, 다른 전문가와의 차이 비교표 |
| 블로그 | `/blog`, `/blog/[id]` | 기존 컬렉션 구조 유지. 샘플 글(`hello-world.md`)은 실제 콘텐츠로 교체 |
| 서비스 | `/service` | 미션, 포지셔닝, 컨설팅 방식(툴 세팅~운영 기준) |
| 문의 | `/contact` | 이름/이메일/문의 내용 폼 → `/api/contact` → Resend 발송 |

- 콘텐츠 작성 시 브랜드 언어 가이드 적용: 자주 쓸 단어(신호/맥락/결/숙성/연결/관점/구조/흐름/질문/기회/단골/시간), 피할 표현(혁신/압도적/최고/게임체인저 등 근거 없는 과장)
- 초기 텍스트는 브랜딩 문서의 소개문 예시를 기반으로 다듬어 사용

## 에러 처리 / 엣지 케이스

- 문의 폼: 필수 필드 누락 시 클라이언트 측 검증 + 서버 측 재검증. Resend API 실패 시 사용자에게 실패 메시지 표시(재시도 안내), 서버 로그에 에러 기록
- 이메일 형식 검증은 서버에서도 수행 (신뢰 경계이므로 생략 불가)
- 다크모드: `prefers-color-scheme` 미지원 환경에서는 라이트 모드 기본값

## 테스트

- 문의 폼 제출 성공/실패 경로에 대한 최소 통합 테스트(엔드포인트 단위) 1개
- 빌드(`npm run build`) 및 `wrangler dev`/`preview`로 로컬 배포 검증
- 라이트/다크 모드 전환 시 대비(contrast) 육안 확인

## 미결정 / 후속 논의 필요

- 없음 (현재까지 논의된 범위 내에서 확정)
