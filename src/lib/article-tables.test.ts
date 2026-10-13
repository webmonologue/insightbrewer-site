import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('renders each article table in a named keyboard-accessible scroll region', () => {
  const html = readFileSync(new URL('../../dist/client/blog/openai-ads-전환-api/index.html', import.meta.url), 'utf8');
  const tables = html.match(/<table>/g) ?? [];
  const regions = html.match(/<div class="table-scroll" role="region" aria-label="[^"]+" tabindex="0">\s*<table>/g) ?? [];
  expect(tables).toHaveLength(4);
  expect(regions).toHaveLength(tables.length);
  expect(html).toContain('scope="col"');
  expect(html.match(/class="table-scroll-hint"/g)).toHaveLength(tables.length);
  expect(html).toContain('표를 좌우로 밀어 전체 내용을 확인하세요.');
});

it('keeps the Jev comparison landscape with every comparison category', () => {
  const png = readFileSync(new URL('../../public/images/jev-llm-comparison.png', import.meta.url));
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1280);
  const source = readFileSync(new URL('../../docs/diagrams/jev-llm-comparison.html', import.meta.url), 'utf8');
  for (const text of ['결과 형태', '처리 방식', '광고 활용', '속도·비용', 'LLM도 구조화된 출력 가능', '실제 속도·비용·정확도는 업무별 검증 필요']) expect(source).toContain(text);
  const html = readFileSync(new URL('../../dist/client/blog/jev-온라인-광고-운영/index.html', import.meta.url), 'utf8');
  expect(html).toContain('href="/images/jev-llm-comparison.png">그림 크게 보기</a>');
});

it('keeps the CAPI diagram landscape, article-wide and available at full size', () => {
  const html = readFileSync(new URL('../../dist/client/blog/openai-ads-전환-api/index.html', import.meta.url), 'utf8');
  const png = readFileSync(new URL('../../public/images/openai-ads-capi-integration.png', import.meta.url));
  expect(png.readUInt32BE(16)).toBe(1920);
  expect(png.readUInt32BE(20)).toBe(1200);
  expect(html).toContain('href="/images/openai-ads-capi-integration.png">그림 크게 보기</a>');
  const css = readFileSync(new URL('../styles/global.css', import.meta.url), 'utf8');
  expect(css).toContain('img[src$="openai-ads-capi-integration.png"] { display: block; width: 100%; max-width: 100%;');
});
