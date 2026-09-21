import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

const page = (route: string) => readFileSync(new URL(`../../dist/client/${route ? `${route}/` : ''}index.html`, import.meta.url), 'utf8');

it('renders punctuation-adjacent Korean strong text in actual published articles', () => {
  expect(page('blog/광고-데이터-파이프라인')).toContain('<strong>데이터 파이프라인(Data Pipeline)</strong>이라고');
  expect(page('blog/광고-ai-에이전트의-진화')).toContain('<strong>오케스트레이션(Orchestration)</strong>이라고');
});

it.each(['', 'blog'])('renders plain-text opening excerpts on /%s without Markdown link/emphasis syntax', (route) => {
  const excerpt = page(route).match(/<article class="featured-post">[\s\S]*?<div class="post-details">[\s\S]*?<p>([\s\S]*?)<\/p>/)?.[1];
  expect(excerpt).toBeDefined();
  expect(excerpt).toContain('TypeSafe AI가 공개한 Jev입니다.');
  expect(excerpt).not.toContain('**');
  expect(excerpt).not.toMatch(/\[[^\]]+\]\(/);
});
