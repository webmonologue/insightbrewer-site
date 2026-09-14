# Insight Brewer Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing Astro scaffold (`insightbrewer-site`) into a 5-page personal-branding site (홈/소개/블로그/서비스/문의) with a hand-rolled CSS design system (dark-gray + lime, daleui-inspired token naming) and a Resend-backed contact form on Cloudflare Workers.

**Architecture:** Astro 7 static output (`output: 'static'`, the default) for all content pages; `@astrojs/cloudflare` adapter added so a single dynamic endpoint (`/api/contact`, `export const prerender = false`) can run on Cloudflare Workers while every other page stays prerendered. No client-side framework (no React) — all interactivity is plain HTML forms + a few lines of vanilla JS.

**Tech Stack:** Astro 7, `@astrojs/sitemap` (existing), `@astrojs/cloudflare` (new adapter), Resend REST API (via `fetch`, no SDK needed), Vitest (new, for the one piece of non-trivial logic: contact-form validation), Pretendard Variable (self-hosted woff2).

**Spec:** `docs/superpowers/specs/2026-09-14-insightbrewer-site-design.md`

## Global Constraints

- No React / Panda CSS / daleui package dependency — design-token *principles* only, implemented as plain CSS custom properties.
- Color system: neutral dark-gray base + exactly one accent color (lime). Never introduce a 4th hue.
- Copy must avoid "혁신", "압도적", "최고", "게임체인저"; prefer the brand vocabulary (신호/맥락/결/숙성/연결/관점/구조/흐름/질문/기회/단골/시간).
- Font: Pretendard Variable, self-hosted (no runtime CDN dependency), sans-serif, weight ≤ 500 for headings.
- All pages stay statically prerendered except `/api/contact`, which must declare `export const prerender = false`.
- Server-side validation of the contact form is required (trust boundary — do not skip even though the client also validates).
- `site: 'https://insightbrewer.com'` in `astro.config.mjs` must not change.
- Node engine floor stays `>=22.12.0` (existing `package.json`).

---

## File Structure

```
src/
  styles/
    tokens.css        # NEW — CSS custom properties (color/spacing/radii/typography)
    global.css         # NEW — reset + @font-face + base element styles, imports tokens.css
  lib/
    validateContact.ts       # NEW — pure validation function (unit tested)
    validateContact.test.ts  # NEW — vitest tests
  layouts/
    BaseLayout.astro   # MODIFY — import global.css, 5-link nav, footer
  pages/
    index.astro         # MODIFY — real home content
    about.astro          # NEW
    service.astro        # NEW
    contact.astro         # NEW — form UI
    api/
      contact.ts          # NEW — POST endpoint, Resend call
    blog/
      index.astro    (unchanged structure, still works as-is)
      [id].astro     (unchanged structure, still works as-is)
  content/
    blog/
      hello-world.md  # MODIFY — replace placeholder copy with real first post
  content.config.ts    # MODIFY — add optional `tags` field
public/
  fonts/
    PretendardVariable.woff2  # NEW — downloaded binary asset
astro.config.mjs        # MODIFY — add cloudflare adapter
wrangler.jsonc           # MODIFY — add `vars` placeholder + comment for RESEND_API_KEY secret
package.json              # MODIFY — add @astrojs/cloudflare, vitest deps
```

Each task below is self-contained and independently testable (build or `vitest run`).

---

### Task 1: Design tokens — CSS custom properties + self-hosted Pretendard

**Files:**
- Create: `src/styles/tokens.css`
- Create: `public/fonts/PretendardVariable.woff2`
- Test: manual build check (no unit-testable logic here — pure CSS values)

**Interfaces:**
- Produces: CSS custom properties consumed by every later styling task: `--color-bg`, `--color-bg-subtle`, `--color-fg`, `--color-fg-muted`, `--color-border`, `--color-accent`, `--color-accent-fg`, `--space-1`..`--space-8`, `--radius-sm`, `--radius-md`, `--font-sans`.

- [ ] **Step 1: Download the self-hosted font file**

```bash
curl -sSL -o public/fonts/PretendardVariable.woff2 \
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/woff2/PretendardVariable.woff2"
```

- [ ] **Step 2: Verify the download succeeded**

Run: `file public/fonts/PretendardVariable.woff2 && ls -la public/fonts/PretendardVariable.woff2`
Expected: reports a `Web Open Font Format` (or similar binary) file larger than 500KB. If `file` reports "ASCII text" or the size is a few hundred bytes, the download failed (likely an HTML error page) — retry Step 1.

- [ ] **Step 3: Write the token file**

```css
/* src/styles/tokens.css */
:root {
  /* neutral scale — light mode */
  --color-bg: #ffffff;
  --color-bg-subtle: #f5f5f5;
  --color-fg: #1a1a1a;
  --color-fg-muted: #525252;
  --color-border: #e5e5e5;

  /* single accent — lime, tuned per mode for contrast */
  --color-accent: #65a30d;
  --color-accent-fg: #ffffff;

  /* spacing scale (8pt-based) */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4rem;

  /* radii */
  --radius-sm: 0.25rem;
  --radius-md: 0.5rem;

  /* typography */
  --font-sans: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-bg: #121212;
    --color-bg-subtle: #1e1e1e;
    --color-fg: #f5f5f5;
    --color-fg-muted: #a3a3a3;
    --color-border: #2e2e2e;
    --color-accent: #a3e635;
    --color-accent-fg: #121212;
  }
}
```

- [ ] **Step 4: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds (this file isn't imported yet, so this just confirms the repo still builds cleanly before the next task wires it in).

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css public/fonts/PretendardVariable.woff2
git commit -m "feat: add design token CSS variables and self-hosted Pretendard font"
```

---

### Task 2: Global stylesheet (reset, font-face, base elements)

**Files:**
- Create: `src/styles/global.css`
- Test: manual build check

**Interfaces:**
- Consumes: tokens from `src/styles/tokens.css` (Task 1) — imports it.
- Produces: `global.css` importable from `BaseLayout.astro` (Task 3).

- [ ] **Step 1: Write the stylesheet**

```css
/* src/styles/global.css */
@import './tokens.css';

@font-face {
  font-family: 'Pretendard Variable';
  src: url('/fonts/PretendardVariable.woff2') format('woff2-variations');
  font-weight: 45 920;
  font-style: normal;
  font-display: swap;
}

*, *::before, *::after {
  box-sizing: border-box;
}

html {
  color-scheme: light dark;
}

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-sans);
  font-weight: 400;
  line-height: 1.6;
}

h1, h2, h3 {
  font-weight: 500;
  line-height: 1.3;
  margin: 0 0 var(--space-4);
}

p {
  margin: 0 0 var(--space-4);
}

a {
  color: var(--color-accent);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

main {
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-6) var(--space-4);
}

header nav {
  display: flex;
  gap: var(--space-5);
  max-width: 720px;
  margin: 0 auto;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

header nav a {
  color: var(--color-fg);
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-4) 0;
}

th, td {
  text-align: left;
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
}
```

- [ ] **Step 2: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds (still unused until Task 3 imports it).

- [ ] **Step 3: Commit**

```bash
git add src/styles/global.css
git commit -m "feat: add global stylesheet with reset and base element styles"
```

---

### Task 3: BaseLayout — wire up styles, 5-page nav, footer

**Files:**
- Modify: `src/layouts/BaseLayout.astro`
- Test: manual build check + visual check via dev server

**Interfaces:**
- Consumes: `src/styles/global.css` (Task 2).
- Produces: `<BaseLayout title description>` — unchanged prop signature, so `index.astro`, `blog/index.astro`, `blog/[id].astro` keep working without edits.

- [ ] **Step 1: Update the layout**

```astro
---
// src/layouts/BaseLayout.astro
import '../styles/global.css';

interface Props {
  title: string;
  description: string;
}

const { title, description } = Astro.props;
const canonicalURL = new URL(Astro.url.pathname, Astro.site);
---
<!doctype html>
<html lang="ko">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="canonical" href={canonicalURL} />
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta property="og:type" content="website" />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:url" content={canonicalURL} />
  </head>
  <body>
    <header>
      <nav>
        <a href="/">홈</a>
        <a href="/about">소개</a>
        <a href="/blog">블로그</a>
        <a href="/service">서비스</a>
        <a href="/contact">문의</a>
      </nav>
    </header>
    <main>
      <slot />
    </main>
    <footer>
      <p style="max-width: 720px; margin: 0 auto; padding: var(--space-4); color: var(--color-fg-muted); font-size: 0.875rem;">
        © {new Date().getFullYear()} Insight Brewer
      </p>
    </footer>
  </body>
</html>
```

- [ ] **Step 2: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds, `dist/index.html` and `dist/blog/index.html` contain the 5-link nav.

- [ ] **Step 3: Spot-check in the dev server**

Run: `npm run dev` (background), then open `http://localhost:4321/` in a browser or `curl -s http://localhost:4321/ | grep -o '<nav>.*</nav>'`
Expected: nav shows 홈/소개/블로그/서비스/문의 links; stop the dev server afterward.

- [ ] **Step 4: Commit**

```bash
git add src/layouts/BaseLayout.astro
git commit -m "feat: wire global styles into BaseLayout and add 5-page nav/footer"
```

---

### Task 4: Home page content

**Files:**
- Modify: `src/pages/index.astro`
- Test: manual build check

**Interfaces:**
- Consumes: `BaseLayout` (Task 3), `getCollection('blog')` from `astro:content` (existing).

- [ ] **Step 1: Rewrite the home page**

```astro
---
// src/pages/index.astro
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const recentPosts = (await getCollection('blog'))
  .sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf())
  .slice(0, 3);
---
<BaseLayout
  title="Insight Brewer"
  description="신호를 숙성해, 실행 가능한 통찰을 빚는 사람."
>
  <section>
    <h1>신호를 숙성해, 실행 가능한 통찰을 빚는 사람.</h1>
    <p>
      AI와 데이터, 시장과 사람 사이의 신호를 읽습니다.
      흩어진 정보를 맥락으로 엮고, 실행 가능한 전략으로 만들어 냅니다.
    </p>
  </section>

  <section>
    <h2>하는 일</h2>
    <p>
      광고 자동화를 도입하려는 마케터에게, 툴 세팅부터 운영 기준까지 같이 짜주는
      컨설팅 파트너입니다. 반복은 시스템에 맡기고, 판단이 필요한 일에 시간을 쓸 수
      있도록 돕습니다.
    </p>
    <p><a href="/service">서비스 자세히 보기 →</a></p>
  </section>

  {recentPosts.length > 0 && (
    <section>
      <h2>최근 글</h2>
      <ul>
        {recentPosts.map((post) => (
          <li>
            <a href={`/blog/${post.id}/`}>{post.data.title}</a>
          </li>
        ))}
      </ul>
      <p><a href="/blog">블로그 전체 보기 →</a></p>
    </section>
  )}

  <section>
    <p><a href="/contact">문의하기 →</a></p>
  </section>
</BaseLayout>
```

- [ ] **Step 2: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; `dist/index.html` contains "신호를 숙성해".

- [ ] **Step 3: Commit**

```bash
git add src/pages/index.astro
git commit -m "feat: rewrite home page with brand copy and recent posts"
```

---

### Task 5: About page

**Files:**
- Create: `src/pages/about.astro`
- Test: manual build check

**Interfaces:**
- Consumes: `BaseLayout` (Task 3).

- [ ] **Step 1: Create the page**

```astro
---
// src/pages/about.astro
import BaseLayout from '../layouts/BaseLayout.astro';

const beliefs = [
  { title: '정보보다 맥락', body: '숫자 뒤의 맥락과 현상 뒤의 사람을 함께 봅니다.' },
  { title: '속도보다 밀도', body: '유행을 쫓기보다 흐름의 방향을 읽고, 오래 작동할 구조를 찾습니다.' },
  { title: '발견보다 조합', body: '흩어진 데이터와 경험, 관점 사이의 관계를 찾아 전략적인 그림으로 엮습니다.' },
  { title: '전략은 사람을 향해야 한다', body: '기술과 데이터는 사람을 더 잘 이해하고 더 나은 선택을 돕기 위한 도구입니다.' },
];

const comparisons = [
  { topic: '데이터', general: '수치를 보고 결과를 설명한다', insightbrewer: '수치 뒤의 맥락과 다음 가능성을 읽는다' },
  { topic: '트렌드', general: '유행을 빠르게 따라간다', insightbrewer: '흐름의 원인과 지속 가능성을 해석한다' },
  { topic: '전략', general: '정답을 제시하는 문서에 집중한다', insightbrewer: '실행과 관계까지 이어지는 방향을 설계한다' },
  { topic: '네트워크', general: '많은 연결을 만든다', insightbrewer: '결이 맞는 관계를 오래 유지한다' },
  { topic: 'AI', general: '자동화와 효율의 도구로 본다', insightbrewer: '사람과 시장을 더 깊이 이해하는 증폭기로 활용한다' },
];
---
<BaseLayout
  title="소개 — Insight Brewer"
  description="인사이트브루어는 AI 기반 애드테크와 사업개발의 현장에서 데이터와 현상, 사람의 욕구가 만나는 지점을 탐색합니다."
>
  <h1>소개</h1>
  <p>
    인사이트브루어는 AI 기반 애드테크와 사업개발의 현장에서 데이터와 현상, 사람의
    욕구가 만나는 지점을 탐색합니다. 빠른 답보다 깊은 질문을, 많은 연결보다
    오래가는 관계를 믿습니다. 작은 신호를 충분히 숙성해 브랜드와 사업의 다음
    선택을 바꾸는 통찰을 만듭니다.
  </p>

  <h2>인사이트브루어가 믿는 것</h2>
  {beliefs.map((b) => (
    <div>
      <h3>{b.title}</h3>
      <p>{b.body}</p>
    </div>
  ))}

  <h2>다른 전문가와의 차이</h2>
  <table>
    <thead>
      <tr><th>구분</th><th>일반적 접근</th><th>인사이트브루어의 접근</th></tr>
    </thead>
    <tbody>
      {comparisons.map((c) => (
        <tr><td>{c.topic}</td><td>{c.general}</td><td>{c.insightbrewer}</td></tr>
      ))}
    </tbody>
  </table>
</BaseLayout>
```

- [ ] **Step 2: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; `dist/about/index.html` exists and contains "다른 전문가와의 차이".

- [ ] **Step 3: Commit**

```bash
git add src/pages/about.astro
git commit -m "feat: add about page with beliefs and comparison table"
```

---

### Task 6: Service page

**Files:**
- Create: `src/pages/service.astro`
- Test: manual build check

**Interfaces:**
- Consumes: `BaseLayout` (Task 3).

- [ ] **Step 1: Create the page**

```astro
---
// src/pages/service.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="서비스 — Insight Brewer"
  description="광고 운영에 들어가는 반복 작업을 줄이고, 마케터가 판단이 필요한 일에 시간을 쓸 수 있게 돕습니다."
>
  <h1>서비스</h1>

  <h2>미션</h2>
  <p>
    광고 운영에 들어가는 반복 작업을 줄이고, 마케터가 판단이 필요한 일에 시간을
    쓸 수 있게 돕습니다.
  </p>

  <h2>포지셔닝</h2>
  <p>
    광고 자동화를 도입하려는 마케터에게, 인사이트브루어는 툴 세팅부터 운영
    기준까지 같이 짜주는 컨설팅 파트너입니다. 큰 에이전시처럼 형식적이지 않고,
    실무자 입장에서 바로 쓸 수 있는 조언을 드립니다.
  </p>

  <h2>이렇게 일합니다</h2>
  <ul>
    <li>시장과 소비자, 미디어, 기술 환경의 미세한 변화를 포착합니다.</li>
    <li>정량 데이터와 정성적 관찰을 함께 해석합니다.</li>
    <li>복잡한 현상을 이해하기 쉬운 프레임과 이야기로 정리합니다.</li>
    <li>통찰을 사업 기회, 브랜드 전략, 제품 방향, 캠페인 실행으로 연결합니다.</li>
    <li>단기 성과와 장기 관계가 함께 성장할 수 있는 방식을 설계합니다.</li>
  </ul>

  <p><a href="/contact">문의하기 →</a></p>
</BaseLayout>
```

- [ ] **Step 2: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; `dist/service/index.html` exists and contains "포지셔닝".

- [ ] **Step 3: Commit**

```bash
git add src/pages/service.astro
git commit -m "feat: add service page with mission, positioning, and working style"
```

---

### Task 7: Contact-form validation logic (unit tested)

This is the one piece of genuinely non-trivial logic in the site (per the project's coding principle: non-trivial logic needs a minimal executable check), so it gets its own task with real tests before the endpoint that consumes it.

**Files:**
- Create: `src/lib/validateContact.ts`
- Create: `src/lib/validateContact.test.ts`
- Modify: `package.json` (add `vitest` devDependency + `test` script)

**Interfaces:**
- Produces: `validateContact(input: { name: FormDataEntryValue | null; email: FormDataEntryValue | null; message: FormDataEntryValue | null }): { ok: true; data: { name: string; email: string; message: string } } | { ok: false; error: string }` — consumed by `src/pages/api/contact.ts` (Task 8).

- [ ] **Step 1: Install vitest**

```bash
npm install -D vitest
```

- [ ] **Step 2: Add the test script to `package.json`**

Modify the `scripts` block:

```json
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "astro": "astro",
    "test": "vitest run"
  },
```

- [ ] **Step 3: Write the failing tests**

```ts
// src/lib/validateContact.test.ts
import { describe, expect, it } from 'vitest';
import { validateContact } from './validateContact';

describe('validateContact', () => {
  it('accepts a well-formed submission', () => {
    const result = validateContact({
      name: '홍길동',
      email: 'hong@example.com',
      message: '안녕하세요, 문의드립니다.',
    });
    expect(result).toEqual({
      ok: true,
      data: {
        name: '홍길동',
        email: 'hong@example.com',
        message: '안녕하세요, 문의드립니다.',
      },
    });
  });

  it('rejects a missing name', () => {
    const result = validateContact({ name: null, email: 'hong@example.com', message: '문의' });
    expect(result).toEqual({ ok: false, error: '이름을 입력해 주세요.' });
  });

  it('rejects a missing message', () => {
    const result = validateContact({ name: '홍길동', email: 'hong@example.com', message: '' });
    expect(result).toEqual({ ok: false, error: '문의 내용을 입력해 주세요.' });
  });

  it('rejects a malformed email', () => {
    const result = validateContact({ name: '홍길동', email: 'not-an-email', message: '문의' });
    expect(result).toEqual({ ok: false, error: '올바른 이메일 주소를 입력해 주세요.' });
  });

  it('trims whitespace from all fields', () => {
    const result = validateContact({
      name: '  홍길동  ',
      email: '  hong@example.com  ',
      message: '  문의  ',
    });
    expect(result).toEqual({
      ok: true,
      data: { name: '홍길동', email: 'hong@example.com', message: '문의' },
    });
  });
});
```

- [ ] **Step 4: Run the tests to verify they fail**

Run: `npm run test`
Expected: FAIL — `Cannot find module './validateContact'` (the module doesn't exist yet).

- [ ] **Step 5: Implement `validateContact`**

```ts
// src/lib/validateContact.ts
type FieldInput = FormDataEntryValue | null;

export type ContactInput = {
  name: FieldInput;
  email: FieldInput;
  message: FieldInput;
};

export type ContactData = {
  name: string;
  email: string;
  message: string;
};

export type ValidateContactResult =
  | { ok: true; data: ContactData }
  | { ok: false; error: string };

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function asString(value: FieldInput): string {
  return typeof value === 'string' ? value.trim() : '';
}

export function validateContact(input: ContactInput): ValidateContactResult {
  const name = asString(input.name);
  const email = asString(input.email);
  const message = asString(input.message);

  if (!name) {
    return { ok: false, error: '이름을 입력해 주세요.' };
  }
  if (!email) {
    return { ok: false, error: '이메일을 입력해 주세요.' };
  }
  if (!EMAIL_PATTERN.test(email)) {
    return { ok: false, error: '올바른 이메일 주소를 입력해 주세요.' };
  }
  if (!message) {
    return { ok: false, error: '문의 내용을 입력해 주세요.' };
  }

  return { ok: true, data: { name, email, message } };
}
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm run test`
Expected: PASS — all 5 tests green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/validateContact.ts src/lib/validateContact.test.ts package.json package-lock.json
git commit -m "feat: add contact-form validation with unit tests"
```

---

### Task 8: Cloudflare adapter + `/api/contact` endpoint (Resend)

**Files:**
- Modify: `astro.config.mjs`
- Modify: `package.json` (add `@astrojs/cloudflare`)
- Modify: `wrangler.jsonc` (document the `RESEND_API_KEY` secret)
- Create: `src/pages/api/contact.ts`
- Create: `src/env.d.ts` (Cloudflare runtime types for `Astro.locals`)

**Interfaces:**
- Consumes: `validateContact` from `src/lib/validateContact.ts` (Task 7).
- Produces: `POST /api/contact` returning `{ message: string }` JSON with status 200/400/500 — consumed by the contact page's fetch call (Task 9).

- [ ] **Step 1: Install the adapter**

```bash
npm install @astrojs/cloudflare
```

- [ ] **Step 2: Add the adapter to `astro.config.mjs`**

```js
// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';

// https://astro.build/config
export default defineConfig({
  site: 'https://insightbrewer.com',
  integrations: [sitemap()],
  adapter: cloudflare(),
});
```

- [ ] **Step 3: Add Cloudflare runtime types**

```ts
// src/env.d.ts
/// <reference types="astro/client" />

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
```

- [ ] **Step 4: Document the required secret in `wrangler.jsonc`**

```jsonc
{
  "name": "insightbrewer",
  "compatibility_date": "2026-08-22",
  "assets": {
    "directory": "./dist"
  }
  // RESEND_API_KEY is required at runtime for /api/contact and must be set
  // as a secret, not committed here:
  //   npx wrangler secret put RESEND_API_KEY
  // For local dev, put it in a git-ignored `.dev.vars` file:
  //   RESEND_API_KEY=re_xxx
}
```

- [ ] **Step 5: Add `.dev.vars` to `.gitignore`**

Modify `.gitignore` to append:

```
.dev.vars
```

- [ ] **Step 6: Write the endpoint**

```ts
// src/pages/api/contact.ts
export const prerender = false;

import type { APIRoute } from 'astro';
import { validateContact } from '../../lib/validateContact';

export const POST: APIRoute = async ({ request, locals }) => {
  const formData = await request.formData();
  const result = validateContact({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  });

  if (!result.ok) {
    return new Response(JSON.stringify({ message: result.error }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = (locals as { runtime?: { env?: { RESEND_API_KEY?: string } } })
    .runtime?.env?.RESEND_API_KEY;

  if (!apiKey) {
    console.error('RESEND_API_KEY is not configured');
    return new Response(
      JSON.stringify({ message: '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const { name, email, message } = result.data;

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Insight Brewer 문의 <contact@insightbrewer.com>',
      to: ['contact@insightbrewer.com'],
      reply_to: email,
      subject: `[문의] ${name}님으로부터`,
      text: `이름: ${name}\n이메일: ${email}\n\n${message}`,
    }),
  });

  if (!resendResponse.ok) {
    console.error('Resend API error', resendResponse.status, await resendResponse.text());
    return new Response(
      JSON.stringify({ message: '문의 접수 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ message: '문의가 접수되었습니다. 감사합니다.' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
```

- [ ] **Step 7: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; build output shows `/api/contact` as a server-rendered route (not in the static `dist/` HTML tree), while all other pages remain prerendered.

- [ ] **Step 8: Commit**

```bash
git add astro.config.mjs package.json package-lock.json wrangler.jsonc .gitignore src/pages/api/contact.ts src/env.d.ts
git commit -m "feat: add Cloudflare adapter and /api/contact endpoint using Resend"
```

---

### Task 9: Contact page (form UI)

**Files:**
- Create: `src/pages/contact.astro`
- Test: manual build check + manual dev-server submission check

**Interfaces:**
- Consumes: `BaseLayout` (Task 3), `POST /api/contact` (Task 8).

- [ ] **Step 1: Create the page**

```astro
---
// src/pages/contact.astro
import BaseLayout from '../layouts/BaseLayout.astro';
---
<BaseLayout
  title="문의 — Insight Brewer"
  description="컨설팅 문의는 아래 폼으로 보내 주세요."
>
  <h1>문의</h1>
  <p>궁금한 점이나 협업 제안을 아래 폼으로 보내 주세요. 확인 후 이메일로 답변드립니다.</p>

  <form id="contact-form">
    <div>
      <label for="name">이름</label><br />
      <input id="name" name="name" type="text" required />
    </div>
    <div style="margin-top: var(--space-3);">
      <label for="email">이메일</label><br />
      <input id="email" name="email" type="email" required />
    </div>
    <div style="margin-top: var(--space-3);">
      <label for="message">문의 내용</label><br />
      <textarea id="message" name="message" rows="6" required></textarea>
    </div>
    <button type="submit" style="margin-top: var(--space-4);">보내기</button>
    <p id="contact-form-status" role="status" aria-live="polite"></p>
  </form>

  <script>
    const form = document.getElementById('contact-form') as HTMLFormElement;
    const status = document.getElementById('contact-form-status') as HTMLParagraphElement;

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      status.textContent = '전송 중...';

      const response = await fetch('/api/contact', {
        method: 'POST',
        body: new FormData(form),
      });
      const body = await response.json();
      status.textContent = body.message;

      if (response.ok) {
        form.reset();
      }
    });
  </script>
</BaseLayout>
```

- [ ] **Step 2: Style the form controls in `src/styles/global.css`**

Append to the file created in Task 2:

```css
input, textarea, button {
  font-family: inherit;
  font-size: 1rem;
}

input, textarea {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-bg);
  color: var(--color-fg);
}

button {
  padding: var(--space-2) var(--space-5);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-accent);
  color: var(--color-accent-fg);
  cursor: pointer;
}

button:hover {
  opacity: 0.9;
}
```

- [ ] **Step 3: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; `dist/contact/index.html` exists and contains `id="contact-form"`.

- [ ] **Step 4: Manual submission check with wrangler dev**

Run: `npx wrangler dev` (background, requires `.dev.vars` with a real or dummy `RESEND_API_KEY`), then in another terminal:

```bash
curl -s -X POST http://localhost:8787/api/contact \
  -F "name=테스트" -F "email=test@example.com" -F "message=테스트 문의입니다"
```

Expected: JSON response with status 200 and `{"message":"문의가 접수되었습니다. 감사합니다."}` if `RESEND_API_KEY` is valid, or a clear error message otherwise (not a raw 500 stack trace). Stop `wrangler dev` afterward.

- [ ] **Step 5: Commit**

```bash
git add src/pages/contact.astro src/styles/global.css
git commit -m "feat: add contact page with client-side form submission"
```

---

### Task 10: Blog schema tags + replace placeholder post

**Files:**
- Modify: `src/content.config.ts`
- Modify: `src/content/blog/hello-world.md`
- Test: manual build check

**Interfaces:**
- Modifies the existing `blog` collection schema — `tags` is optional, so no other file needs to change to keep working.

- [ ] **Step 1: Add the `tags` field to the schema**

```ts
// src/content.config.ts
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
```

- [ ] **Step 2: Replace the placeholder post content**

```md
---
title: "신호를 숙성한다는 것"
description: "인사이트브루어가 이 블로그를 시작하는 이유."
pubDate: 2026-09-14
tags: ["소개"]
---

정보는 넘치지만 이해는 저절로 따라오지 않습니다. 이 블로그는 광고 자동화와
데이터, 시장의 신호를 관찰하면서 발견한 것들을 맥락과 함께 정리하는 공간입니다.

빠른 결론보다 좋은 질문을, 유행보다 흐름의 방향을 다루려고 합니다.
```

- [ ] **Step 3: Run the build to confirm no errors**

Run: `npm run build`
Expected: build succeeds; `dist/blog/index.html` and `dist/blog/hello-world/index.html` render the new title "신호를 숙성한다는 것".

- [ ] **Step 4: Commit**

```bash
git add src/content.config.ts src/content/blog/hello-world.md
git commit -m "feat: add tags to blog schema and replace placeholder post"
```

---

### Task 11: End-to-end verification

**Files:** none created/modified — verification only.

- [ ] **Step 1: Full test suite**

Run: `npm run test`
Expected: all vitest tests pass.

- [ ] **Step 2: Full production build**

Run: `npm run build`
Expected: no errors; `dist/` contains `index.html`, `about/index.html`, `service/index.html`, `contact/index.html`, `blog/index.html`, `blog/hello-world/index.html`, `sitemap-index.xml`.

- [ ] **Step 3: Preview the static output**

Run: `npm run preview` (background), then `curl -s http://localhost:4321/ | grep -c '<nav>'` and check each of the 5 nav links resolves with `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:4321/<path>` for `/`, `/about/`, `/blog/`, `/service/`, `/contact/`.
Expected: all return `200`. Stop the preview server afterward.

- [ ] **Step 4: Type-check**

Run: `npm run astro -- check`
Expected: no type errors.

No commit for this task — it's verification only. If any step fails, return to the relevant earlier task and fix it there (with its own commit).

---

## Self-Review Notes

- **Spec coverage:** architecture (Task 8), design tokens/typography (Tasks 1–2), 5-page site structure (Tasks 3–6, 9), contact form + Resend (Tasks 7–9), blog content collection (Task 10), error handling for the contact form (Task 7 validation + Task 8 500 path), build/preview verification (Task 11). No spec section is unaddressed.
- **Placeholder scan:** no TBD/TODO; every step has runnable code or an exact shell command.
- **Type consistency:** `validateContact` signature (Task 7) matches its usage in `src/pages/api/contact.ts` (Task 8) exactly (`ContactInput` fields `name`/`email`/`message` as `FormDataEntryValue | null`, `ValidateContactResult` discriminated on `ok`). `BaseLayout` props (`title`, `description`) are unchanged from the existing file, so Tasks 4–6 and 9 use them consistently.
