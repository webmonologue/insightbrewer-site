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
