# OpenAI Ads 전환 연동 구조 — 로컬 검토본

- 편집 원본: `openai-ads-capi-integration.html` (CSS + inline SVG, 외부 의존성 없음)
- 벡터: `openai-ads-capi-integration.svg`
- 래스터: `openai-ads-capi-integration.png` (1120 × 2320, 2× 브라우저 렌더)
- 공개용 준비 파일: `../../public/images/openai-ads-capi-integration.png`
- 구조: Architecture, 6 nodes / 4 connectors. 이벤트 전송과 Ads Manager / Ads API 설정을 별도 영역으로 구분.
- 크기: 모바일 본문 가독성을 위해 가로형 doc-inline 대신 `fit` 세로형 560 × 1160. 필드 명세, 선택 픽셀, 수신과 기여도 차이는 인접 본문에 유지.

## 브랜드 적용 기록

실제 참고 페이지: https://insightbrewer.com/blog/openai-ads-%EC%A0%84%ED%99%98-api/

사이트 `src/styles/tokens.css`와 실제 렌더링에서 확인한 색상:

| 역할 | 값 |
| --- | --- |
| 배경 | `#f5f2ea` |
| 본문 | `#252b26` |
| 보조문구 | `#62665e` |
| 강조 | `#526047` |
| 헤더/표면 | `#ebe7dc` |
| 테두리 | `#cccfc2` |

사이트 본문은 자체 호스팅 Pretendard Variable. 독립 편집 HTML/SVG에는 해당 폰트를 재배포하지 않고 Apple SD Gothic Neo를 명시적 대체 글꼴로 사용했다. Chrome CSS.getPlatformFontsForNode에서 AppleSDGothicNeo-SemiBold 실제 사용을 확인했다. PNG는 렌더링된 글꼴을 그대로 유지한다. SVG는 Apple 글꼴이 없는 환경에서 대체 글꼴을 사용할 수 있다.

## 확인 결과

- diagram-design self_check.py 통과. SVG XML 파싱 통과.
- 모든 SVG 텍스트가 안전 영역 안에 있는지 브라우저 getBBox 검사 통과.
- 원본 / public / Obsidian PNG 바이트 해시 일치.
- 본 프로젝트 및 수정 원고를 넣은 별도 Astro 미리보기 모두 `npm run verify` 통과: 8 files / 85 tests, Astro 오류·경고·힌트 0.
- 브라우저 검사: 대상 글 1280 / 390 / 320px, 전체 15개 정적 경로 1280 / 390px. 총 33개 경로·화면폭 검사 통과. 가로 페이지 넘침 없음. 4개 표 키보드 가로 스크롤, 모바일 안내 문구, 그림 로딩 확인.
- 서버 없는 단일 HTML 미리보기도 1280 / 390px에서 오프라인 검증.

## 배포 경계

위 검토는 승인 전 로컬 미리보기에서 수행했다. 이후 사용자가 표 디자인과 구조도 검토본을 확인하고 배포를 명시 승인했다. 승인된 디자인은 변경하지 않고 원고의 이미지 경로만 `/images/openai-ads-capi-integration.png`로 변환한 뒤, `status: approved`와 현재 원본 전체의 승인 해시를 사용해 정규 exporter dry-run 및 `--write`를 수행했다. 내보낸 사본은 `npm run verify` 8 files / 85 tests를 통과했다. 발행 확인 후 Obsidian 원본은 볼트 상대 이미지 경로와 `published` 상태로 복원하고 오래된 승인 해시는 제거한다. 내보내기 원본·출력 해시는 비공개 manifest에 유지한다.
