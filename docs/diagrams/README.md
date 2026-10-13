# PC 본문용 이미지

사용자 요청에 따라 게시된 CAPI 구조도와 Jev 비교 이미지를 가로형으로 교체했다. 제목·slug·본문·표 디자인은 유지하고 그림 크게 보기 링크와 updatedDate만 추가/갱신했다.

| 파일 stem | 편집 프레임 | PNG (2×) | PC 760px 본문 표시 |
| --- | --- | --- | --- |
| `openai-ads-capi-integration` | 960 × 600 | 1920 × 1200 | 760 × 475 |
| `jev-llm-comparison` | 960 × 640 | 1920 × 1280 | 760 × 약 507 |

각 이미지의 `.html`은 CSS + inline SVG 편집 원본, `.svg`는 독립 벡터, `.png`는 Chrome 브라우저 렌더다. 공개 PNG는 `../../public/images/`에, Obsidian 첨부파일은 볼트 `Assets/diagrams/`에 동기화한다.

## 구성과 정보 보존

- CAPI: Architecture/doc-wide, 6 nodes / 4 connectors. 위쪽 왼쪽→오른쪽은 광고주 시스템 → 이벤트 변환 + oppref 연결 → Conversions API → OpenAI 데이터 소스. 아래쪽 Ads Manager / Ads API 설정은 전환 정의 → 캠페인 연결. 설정 경로가 이벤트 처리의 순차 단계처럼 이어지지 않는다. 정렬된 포트의 직선 연결이며 교차·중첩·대각선이 없다.
- Jev: 비교표 형식을 유지한다. 결과 형태·처리 방식·광고 활용·속도와 비용의 모든 기존 내용, LLM 구조화 출력 가능성, 업무별 검증 필요 문구, 출처 표시를 그대로 보존하고 줄바꿈과 열 배치만 변경했다.
- 모바일은 가로 넘침 없이 축소하고 두 글 모두 ‘그림 크게 보기’ 링크로 원본 PNG를 연다.

## 기존 브랜드 유지

사이트 토큰과 이전 승인본의 `paper #f5f2ea`, `ink #252b26`, `muted #62665e`, `accent #526047`, `surface #ebe7dc`, `rule #cccfc2`를 재사용했다. 프로젝트 `.diagram-design` marker와 InsightBrewer named profile은 없으므로 다른 브랜드 profile이나 공유 skill 설정은 변경하지 않았다.

사이트 자체 호스팅 Pretendard Variable을 편집 파일에 재배포하지 않고 기존과 동일한 Apple SD Gothic Neo 대체 글꼴을 사용한다. PNG는 렌더링된 글꼴을 유지하며 SVG는 실행 환경에 따라 폰트가 대체될 수 있다.

## 검증

- 두 HTML 모두 diagram-design `self_check.py` 통과. 브라우저 getBBox로 텍스트 프레임 내부 배치 확인.
- 로컬 실제 본문 1280px / 390px에서 두 글 4개 화면 캡처 및 시각 검사. 이미지 겹침·잘림·페이지 가로 넘침 없음.
- PNG의 원본·공개용·Obsidian 사본 바이트 일치.
- `npm run verify`: Astro 28 files 오류·경고·힌트 0, 8개 테스트 파일 / 87개 테스트 통과. 기존 표 회귀 테스트 유지, 두 가로 이미지 해상도와 확대 링크 회귀 추가.
- PNG SHA-256: CAPI `a8a007cf59c02cc35149407e2ed4c4d130fc5b1b8cdced82ecdac9c0bbe3522e`, Jev `09d74d12923fae4d5df6199266ef04bf0dcedcd72cc5fc36defd2bac6b5b3e5c`.

## 발행 계약

사용자의 이미지 재작성·공개 업데이트 요청으로 승인된 범위다. Obsidian 원본의 이미지 경로를 공개 root URL로 잠시 변환하고 전체 원본 approvalHash를 정규 exporter dry-run / --write에 바인딩했다. 발행 확인 후 원본의 vault-relative 이미지 경로와 published 상태를 복원하고 무효화된 approvalHash는 제거한다. 실제 내보내기 sourceHash/outputHash는 비공개 manifest에 보존한다.

Jev의 기존 manifest outputHash는 도메인 이전 전 `62dd9cf` 출력과 일치했다. `cd95339`에서 이미지 URL만 root-relative로 바뀐 것을 git diff와 원본·출력 해시로 확인한 뒤, 현 출력의 소유권 hash를 수동 대조·복구하고 정규 exporter를 실행했다. manifest를 삭제하거나 다른 글의 기록을 변경하지 않았다.
