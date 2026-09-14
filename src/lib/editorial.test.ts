import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Run against the actual rendered output: npm run build && npm test.
const page = (route = '') => readFileSync(new URL(`../../dist/client/${route}${route ? '/' : ''}index.html`, import.meta.url), 'utf8');
const routes = ['', 'about', 'service', 'blog', 'blog/hello-world', 'contact'];

describe('editorial site — rendered HTML', () => {
  it('keeps the contact contract and provides labeled autofill fields, guidance, and live feedback', () => {
    const html = page('contact');
    for (const field of ['name', 'email', 'message']) {
      expect(html).toContain(`for="${field}"`);
      expect(html).toContain(`name="${field}"`);
    }
    expect(html).toContain('autocomplete="name"');
    expect(html).toContain('autocomplete="email"');
    expect(html).toContain('aria-describedby="message-hint"');
    expect(html).toContain('id="message-hint"');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('id="contact-form-submit" type="submit"');
    expect(html).toContain('기밀 정보나 민감한 개인정보는 포함하지 말아주세요.');
  });
  it('leads from a grounded personal introduction through interests, real writing, and collaboration', () => {
    const html = page();
    expect(html).toContain('AI와 애드테크 현장에서');
    expect(html).toContain('사업을 만들고,');
    const headings = ['관심을 두는 일', '신호보다 맥락을 봅니다', '함께 풀어볼 질문', '대화를 이어가고 싶다면'];
    let previous = -1;
    for (const heading of headings) {
      const index = html.indexOf(heading);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
    expect(html).toContain('정보가 많다고 저절로 이해되는 건 아닙니다.');
    expect(html.match(/href="\/blog\/hello-world\/"/g)).toHaveLength(2);
    expect(page('about')).not.toContain('일반적 접근');
    expect(page('about')).toContain('기록하는 이유');
    expect(page('service')).toContain('협업 — Insight Brewer');
    expect(page('service')).toContain('범위와 방식은 대화를 통해 함께 정합니다.');
    expect(page('blog')).toContain('datetime="2026-09-14');
    expect(page('blog/hello-world')).toContain('property="og:type" content="article"');
    expect(page('blog/hello-world')).toContain('class="prose"');
  });
  it('offers a consistent Korean, keyboard-accessible magazine shell on every route', () => {
    for (const route of routes) {
      const html = page(route);
      expect(html).toContain('lang="ko"');
      expect(html).toContain('class="wordmark"');
      expect(html).toContain('href="#main-content"');
      expect(html).toContain('id="main-content"');
      expect(html).toMatch(/href="\/service"[^>]*>협업<\/a>/);
      expect(html).toContain('aria-current="page"');
      expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
      expect(html).toContain('property="og:locale" content="ko_KR"');
    }
  });
});
