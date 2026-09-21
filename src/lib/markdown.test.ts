import { expect, it } from 'vitest';
import config from '../../astro.config.mjs';
import { markdownExcerpt } from './markdown-excerpt';

// Exercise the configured production processor, not a second test-only parser.
const renderer = await config.markdown!.processor!.createRenderer({ syntaxHighlight: false });

it.each([
  ['**데이터 파이프라인(Data Pipeline)**이라고', '<strong>데이터 파이프라인(Data Pipeline)</strong>이라고'],
  ['**SQL**은', '<strong>SQL</strong>은'],
  ['**오케스트레이션(Orchestration)**이라고', '<strong>오케스트레이션(Orchestration)</strong>이라고'],
  ['**AAMP(Advertising Agent Management Platform)**입니다', '<strong>AAMP(Advertising Agent Management Platform)</strong>입니다'],
  ['**“어떤 일을 맡길 수 있는가”**입니다', '<strong>“어떤 일을 맡길 수 있는가”</strong>입니다'],
  ['A **regular strong** word.', 'A <strong>regular strong</strong> word.'],
  ['**한글 *중첩* (English)**조사', '<strong>한글 <em>중첩</em> (English)</strong>조사'],
])('renders emphasis without introducing spaces or changing prose: %s', async (markdown, html) => {
  expect((await renderer.render(markdown)).code).toBe(`<p>${html}</p>`);
});

it('preserves real links and nested emphasis, without parsing their URLs as prose', async () => {
  const markdown = '[**데이터(Data)**](https://example.com/a_(b)?q=**literal**)입니다';
  expect((await renderer.render(markdown)).code).toBe('<p><a href="https://example.com/a_(b)?q=**literal**"><strong>데이터(Data)</strong></a>입니다</p>');
  expect(markdownExcerpt(markdown)).toBe('데이터(Data)입니다');
});

it('leaves escaped and code delimiters literal in article output', async () => {
  const escaped = String.raw`\*\*데이터(Data)\*\*라고`;
  expect((await renderer.render(escaped)).code).toBe('<p>**데이터(Data)**라고</p>');
  expect((await renderer.render('`**데이터(Data)**라고`')).code).toBe('<p><code>**데이터(Data)**라고</code></p>');
  expect((await renderer.render('```text\n**데이터(Data)**라고\n```')).code).toBe('<pre><code class="language-text">**데이터(Data)**라고\n</code></pre>');
});

it('extracts text from CJK emphasis and reference links using the full document', () => {
  const markdown = '# Heading\n\n**데이터(Data)**와 [**SQL**][query]은\n*도구*입니다.\n\nSecond paragraph.\n\n[query]: https://example.com';
  expect(markdownExcerpt(markdown)).toBe('데이터(Data)와 SQL은 도구입니다.');
});

it('preserves deliberate literal asterisks, inline code, citations and entities in excerpts', () => {
  expect(markdownExcerpt(String.raw`\*\*literal\*\* and ` + '`**code**` &amp; [7]')).toBe('**literal** and **code** & [7]');
});

it('skips non-prose blocks and keeps unsafe-looking text as text, never generated HTML', () => {
  expect(markdownExcerpt('![cover](cover.png)\n\n```text\ncode\n```\n\n[&lt;script&gt;](https://example.com) &amp; **text**')).toBe('<script> & text');
  expect(markdownExcerpt(undefined, 'Fallback')).toBe('Fallback');
  expect(markdownExcerpt(' \n# Title\n\n---\n', 'Fallback')).toBe('Fallback');
});
