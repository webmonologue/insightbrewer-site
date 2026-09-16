import { it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';

it('serves the old URL as an HTTP 301 with an encoded direct destination', async () => {
  expect(existsSync(new URL('../pages/blog/hello-world.ts', import.meta.url))).toBe(true);
  const route = await import('../pages/blog/hello-world');
  expect(route.prerender).toBe(false);
  const response = route.GET();
  expect(response.status).toBe(301);
  expect(response.headers.get('Location')).toBe(encodeURI('/blog/신호보다-맥락/'));
  expect(await response.text()).toBe('');
});

it('uses the reachable origin consistently and lists only the migrated article URL', () => {
  const read = (path: string) => readFileSync(new URL(`../../dist/client/${path}`, import.meta.url), 'utf8');
  const origin = 'https://insightbrewer.webmonologue.workers.dev';
  expect(read('index.html')).toContain(`href="${origin}/"`);
  const sitemap = read('sitemap-0.xml');
  expect(decodeURI(sitemap)).toContain(`${origin}/blog/신호보다-맥락/`);
  expect(sitemap).not.toContain('hello-world');
  expect(sitemap).not.toContain('insightbrewer.com');
  expect(read('robots.txt')).toContain(`${origin}/sitemap-index.xml`);
});
