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
    expect(page('service')).toContain('구체적인 범위와 진행 방식은 대화를 통해 함께 정합니다.');
    expect(page('blog')).toContain('datetime="2026-09-14');
    expect(page('blog/hello-world')).toContain('property="og:type" content="article"');
    expect(page('blog/hello-world')).toContain('class="prose"');
  });
  it('introduces collaboration in a labeled, ordered three-step section with a contact link', () => {
    const section = page('service').match(/<section\b[^>]*aria-labelledby="process-heading"[^>]*>[\s\S]*?<\/section>/)?.[0];
    expect(section).toBeDefined();
    expect(section).toMatch(/<h2 id="process-heading">이렇게 시작합니다<\/h2>[\s\S]*<ol\b/);
    const steps = [...section!.matchAll(/<li\b[^>]*>([\s\S]*?)<\/li>/g)].map((match) => match[1]);
    expect(steps).toHaveLength(3);
    const approved = [
      ['01', '고민을 나눕니다', '현재 상황과 풀고 싶은 문제, 이미 시도해 본 방법을 알려주세요.'],
      ['02', '함께할 범위를 정합니다', '서로의 기대를 확인하고, 논의할 주제와 필요한 자료를 정합니다.'],
      ['03', '다음 할 일을 정리합니다', '더 확인할 내용과 실행 여부를 판단할 기준을 함께 정리합니다.'],
    ];
    approved.forEach(([number, title, description], index) => {
      expect(steps[index]).toContain(`aria-hidden="true">${number}</span>`);
      expect(steps[index]).toContain(`<h3>${title}</h3>`);
      expect(steps[index]).toContain(`<p>${description}</p>`);
    });
    expect(section).toContain('구체적인 범위와 진행 방식은 대화를 통해 함께 정합니다.');
    expect(section).toMatch(/<a\b[^>]*href="\/contact"[^>]*>협업 문의하기 <span aria-hidden="true">↗<\/span><\/a>/);
  });
  it('uses equal editorial process columns and stacks them at 760px', () => {
    const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
    expect(css).toMatch(/\.process-section \.process\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(css).toMatch(/\.process-section \.process > li\s*\{[^}]*border-top:\s*1px solid var\(--color-border\)/);
    expect(css).toMatch(/@media\s*\(max-width: 760px\)\s*\{[\s\S]*?\.process-section \.process\s*\{[^}]*grid-template-columns:\s*1fr;/);
    expect(css).not.toMatch(/\.process li::before/);
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
