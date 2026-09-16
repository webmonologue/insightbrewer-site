# Insight Brewer

Astro 기반 개인 저널. `npm ci` 후 `npm run dev`로 로컬 미리보기, `npm run verify`로 타입 검사·빌드·테스트를 실행합니다.

## Obsidian → 승인된 글 내보내기

**Obsidian은 편집 원본, `src/content/blog/`는 생성된 발행 사본입니다.** 전체 vault 동기화, 예약 실행, 자동 배포는 하지 않습니다. 지정한 노트 한 개만 읽고, 기본 실행은 파일을 만들지 않는 dry-run입니다.

- 기본 vault: `/Users/vincent/Library/Mobile Documents/iCloud~md~obsidian/Documents/InsightBrewer` (현재 macOS 사용자의 홈 기준)
- 허용 범위: vault 안의 `02-Areas/Personal Branding/Content Production/`
- 원본 파일명: 전체 한글 제목, 예: `생각을 정리하는 긴 한글 제목.md`
- 고정 slug: `생각-기록` → `src/content/blog/생각-기록.md` → `/blog/생각-기록/`
- 레거시 첫 글만 예외: `신호보다-맥락.md`는 의미 있는 파일명을 쓰되 `slug: hello-world`로 기존 `/blog/hello-world/` URL을 유지합니다. 리디렉션은 필요하지 않으며 새 내보내기는 계속 `slug.md` 규칙을 따릅니다.
- 자세한 승인·안전 규칙: [내보내기 계약](docs/obsidian-export.md)

### 1. Obsidian에서 공개 범위와 메타데이터 확정

```markdown
---
title: 생각을 정리하는 긴 한글 제목
slug: 생각-기록
description: 이 글을 소개하는 공개 설명
tags: [기록, AI]
pubDate: 2026-09-14
status: approved
---
이곳은 비공개 준비 메모입니다.

<!-- publish:start -->
## 공개할 소제목
공개할 본문과 [외부 자료](https://example.com/).
<!-- publish:end -->

이곳은 비공개 후속 메모입니다.
```

`title`, `description`, `tags`도 공개됩니다. 공개 구간을 직접 검토한 뒤 `status: approved`로 확정하고, 아직 `approvalHash` 줄은 넣지 않습니다. `pubDate`는 쓰기 시 필수이며 미래 날짜는 거부합니다.

### 2. dry-run에서 이 원본의 승인 해시 확인

프로젝트 루트에서 실행합니다.

```sh
npm run export:obsidian -- --note "02-Areas/Personal Branding/Content Production/생각을 정리하는 긴 한글 제목.md"
```

출력 JSON의 `approvalHash` 값을 복사하여 Obsidian frontmatter에 **`approvalHash: ` 뒤에 그대로 한 줄로** 추가합니다(따옴표·주석 없이 소문자 64자리). 이 줄 외에는 아무것도 바꾸지 않습니다. 본문뿐 아니라 제목·날짜·비공개 메모 등 다른 내용이 바뀌면 dry-run을 다시 실행하고 재검토한 해시로 교체해야 합니다.

### 3. 명시적으로 로컬 사본 생성 → 검증

```sh
npm run export:obsidian -- --note "02-Areas/Personal Branding/Content Production/생각을 정리하는 긴 한글 제목.md" --write
npm run verify
```

이 명령은 원본 노트를 수정하지 않으며 Git 커밋·push·배포도 하지 않습니다. 이후 수정도 Obsidian에서 하고, 재검토 → 새 해시 → `--write` 순서를 반복합니다. 기존 `hello-world` 글은 내보내기 관리 대상이 아니며 덮어쓸 수 없습니다.
