---
title: AI 비서는 어디에서, 어떤 권한으로 일할까
slug: ai-비서-비교-구조-보안
description: Dots·피클·Muse·Claude Duet·Gemini Task·Grok Bot과 OpenClaw·Hermes의 특징,
  실행 구조와 보안 통제를 비교합니다.
tags:
  - AI 비서
  - AI 에이전트
  - 보안
pubDate: 2026-11-18T10:05:41+09:00
updatedDate: 2026-11-19T09:51:03+09:00
---

AI 비서는 메일을 읽고 일정을 정리하며, 대화가 끝난 뒤에도 작업을 이어가는 방향으로 발전하고 있습니다. 다만 겉으로 비슷해 보여도 어디에서 실행되고, 무엇을 기억하며, 어떤 권한으로 행동하는지는 제품마다 다릅니다.

이 글에서는 주요 AI 비서 8종을 비교하고, 작동 구조에서 보안을 확인할 지점을 살펴봅니다. 공식 자료를 바탕으로 정리한 내용이며, 직접 사용한 성능 평가나 보안 순위는 아닙니다.

## 서비스별 차이를 한눈에 보기

Dots·피클·Muse·Claude Duet·Gemini Task·Grok Bot은 제공자가 운영하는 환경을 이용하는 방식이 중심입니다. OpenClaw와 Hermes Agent는 자신의 컴퓨터나 서버에서 모델과 도구를 구성해 운영할 수 있는 오픈소스입니다.[1][5][8]

| 서비스 | 주요 활용 방향 | 실행 환경 | 보안에서 볼 지점 |
| --- | --- | --- | --- |
| Dots[1] | 프로젝트·후속 업무 | 제공자 클라우드 · 선택적 로컬 연결 | 앱·컴퓨터 권한을 각각 확인 |
| 피클[2] | 개인 기억·생활 조율 | 제공자 서버·브라우저 | 계정 접근과 타인 공유를 구분 |
| Meta Muse[11] | 예약·양식 등 생활 업무 | 사용자별 Secure VM | Sentinel 검토와 사용자 확인 |
| Claude Duet[12] | 브리핑·업무 후속 대응 | 제공자 클라우드 VM | 주기적 점검·민감 행동 승인 |
| Gemini Task[13] | Google 앱·반복 작업 | 로컬 Chrome 또는 원격 | 개인 계정·회사 계정 조건 구분 |
| Grok Bot[14] | 여러 Bot의 역할 분담 | 계정 내 공유 클라우드 | Bot 분리는 보안 격리가 아님 |
| OpenClaw[5] | 메신저·장치·도구 연결 | 직접 운영하는 Gateway | 발신자 허용·도구 범위·격리 |
| Hermes Agent[8] | 기억·스킬·맞춤 자동화 | 직접 운영·선택적 원격 실행 | 명령 승인·도구·실행 환경 확인 |

*Gemini Task는 구 Spark의 현재 명칭입니다. 기능·제공 범위는 계정과 지역에 따라 달라집니다.*[13]

## 포지셔닝은 활용 방향과 운영 방식으로 읽을 수 있습니다

아래 지도는 제품의 공식 설명에서 강조하는 방향을 정성적으로 배치한 것입니다. 위치는 수치 평가가 아니며, 위나 오른쪽에 있다고 더 우수하다는 의미는 아닙니다. 직접 운영형도 생활 업무에 활용할 수 있습니다.

![AI 비서 8종을 생활 조율·업무 실행과 서비스 이용·직접 운영의 두 축으로 정성적으로 배치한 지도](/images/ai-assistants-positioning.svg)

[그림 크게 보기](/images/ai-assistants-positioning.svg)

생활 속 조율, 업무 후속 대응, 직접 구성하는 자동화 중 무엇이 필요한지를 먼저 정하면 비교 범위를 좁힐 수 있습니다. 사용 중인 앱과 연결되는지, 개인용 계정과 조직용 계정의 지원 조건이 다른지도 확인해야 합니다.[1][12][13]

## 요청이 실제 행동이 되는 과정

![요청부터 결과 보고까지의 처리 과정과 거부 시 중단 및 후속 작업 반복 흐름](/images/ai-assistants-process.svg)

[그림 크게 보기](/images/ai-assistants-process.svg)

채팅창은 작업의 입구입니다. 모델은 관련 정보를 확인하고 다음 행동을 선택하며, 실제 조회와 변경은 API·브라우저·파일 도구 등을 통해 이뤄집니다. 결과를 확인해 추가 작업이 필요하면 다시 판단하고, 끝났다면 사용자에게 보고하는 흐름으로 이해할 수 있습니다.[6][8][14]

도해는 권한 검토와 필요한 승인을 실행 전에 두는 개념도입니다. 제품별 구현은 다르며 모든 제품이 같은 승인 절차를 보장한다는 뜻은 아닙니다.

## 보안에서 구분해야 할 네 가지

### 1. 읽을 권한과 실행할 권한

메일을 요약하는 데 발송·삭제 권한까지 필요한 것은 아닙니다. 외부 문서의 악성 지시를 사용자 요청으로 오인하는 프롬프트 인젝션을 고려하면, 불필요한 도구와 권한을 줄이는 것이 중요합니다. 읽기 전용이어도 다른 도구로 정보를 외부에 보낼 수 있다면 유출 위험은 남습니다.[3][4]

### 2. 인증정보 보호와 내용 보호

피클은 계정 토큰을 격리해 사용하면서도 읽어온 내용과 기억은 서버에서 처리한다고 설명합니다. 비밀번호를 모델에 노출하지 않는다는 것과 메일 내용이 외부에서 처리되지 않는다는 것은 다릅니다.[2] 직접 설치하는 OpenClaw·Hermes도 외부 모델과 도구를 연결하면 데이터가 외부로 전달될 수 있습니다.[5][8]

### 3. 역할 분리와 보안 격리

Grok Bot은 같은 계정의 Bot들이 실행 환경을 공유하며, Bot 구분을 보안 경계로 삼지 말라고 안내합니다. OpenClaw도 신뢰 수준이 다른 사용자는 별도 Gateway·운영체제 사용자·호스트로 분리하는 접근을 설명합니다. 대화방이나 이름을 나누는 것만으로 접근 권한까지 분리되지는 않습니다.[7][15]

### 4. 중단과 연결 해제, 기억 삭제

현재 작업을 멈추는 것과 예약 작업을 취소하는 것은 다를 수 있습니다. 계정 연결을 해제해도 과거에 읽어온 정보와 기억은 남을 수 있습니다. Dots·피클·Claude Duet의 안내에서도 이 구분을 확인할 수 있습니다.[1][2][12]

## 어떤 일을 어디까지 맡길지부터 정해야 합니다

관리형 서비스는 준비된 기능을 이용하기 편하지만 제공자의 처리 정책을 검토해야 합니다. 직접 운영하면 조정할 여지가 커지는 대신 업데이트와 접근 통제까지 관리해야 합니다.

처음에는 자동 발송보다 답장 초안, 일정 변경보다 가능한 시간 정리처럼 좁은 업무부터 시작할 수 있습니다. 결과가 정확한지와 함께, 허용한 범위 안에서 실행하고 필요할 때 멈출 수 있는지를 확인하는 방식입니다.

### 출처

[1] [OpenAI — Meet dots](https://learn.chatgpt.com/docs/dots)

[2] [Pickle — How your Pickle protects your privacy](https://www.pickle.com/how-your-pickle-protects-your-privacy)

[3] [OWASP — Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/2_0_vulns/LLM06_ExcessiveAgency.html)

[4] [OpenAI — Designing AI agents to resist prompt injection](https://openai.com/index/designing-agents-to-resist-prompt-injection)

[5] [OpenClaw — 공식 문서](https://docs.openclaw.ai)

[6] [OpenClaw — Gateway architecture](https://docs.openclaw.ai/architecture)

[7] [OpenClaw — Security trust model](https://docs.openclaw.ai/gateway/security/trust-model)

[8] [Nous Research — Hermes Agent 공식 문서](https://hermes-agent.nousresearch.com/docs)

[9] [Hermes Agent — Security](https://hermes-agent.nousresearch.com/docs/user-guide/security)

[10] [Hermes Agent — Skills System](https://hermes-agent.nousresearch.com/docs/user-guide/features/skills)

[11] [Meta — Introducing Muse](https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent)

[12] [Anthropic — Get started with Claude Duet](https://support.claude.com/en/articles/17631495-get-started-with-claude-duet)

[13] [Google — Gemini Task 공식 도움말](https://support.google.com/gemini/answer/17094507?hl=en)

[14] [xAI — Grok Bot overview](https://docs.x.ai/grok-bot/overview.md)

[15] [xAI — Approvals, security and privacy](https://docs.x.ai/grok-bot/approvals-security-and-privacy.md)
