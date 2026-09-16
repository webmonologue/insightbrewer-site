import { afterEach, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const cli = new URL('../../scripts/export-obsidian.mjs', import.meta.url);
const scope = '02-Areas/Personal Branding/Content Production';
const roots: string[] = [];
afterEach(() => roots.splice(0).forEach(root => rmSync(root, { recursive: true, force: true })));
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'obsidian-export-')); roots.push(root);
  const vault = join(root, 'vault'), project = join(root, 'site');
  mkdirSync(join(vault, scope), { recursive: true });
  mkdirSync(join(project, 'src/content/blog'), { recursive: true });
  mkdirSync(join(project, 'public'), { recursive: true });
  const note = `${scope}/생각을 정리하는 긴 한글 제목.md`;
  const source = join(vault, note);
  const output = join(project, 'src/content/blog/생각-기록.md');
  const run = (...args: string[]) => spawnSync(process.execPath, [cli.pathname, '--vault', vault, '--project', project, '--note', note, ...args], { encoding: 'utf8' });
  return { root, vault, project, note, source, output, run };
}
function article(extra = '', body = '공개 본문 [외부 자료](https://example.com/article).') {
  return `---\ntitle: 생각을 정리하는 긴 한글 제목\nslug: 생각-기록\ndescription: 공개 설명\ntags: [기록, AI]\nstatus: approved\npubDate: 2020-01-01\n${extra}---\n비공개 준비 메모 [[내부]]\n<!-- publish:start -->\n${body}\n<!-- publish:end -->\n%% 비공개 후속 메모 %%\n`;
}
const digest = (text: string) => createHash('sha256').update(text.replace(/\r\n?/g, '\n').replace(/^approvalHash:.*\n/m, '')).digest('hex');
function approve(text: string) { return text.replace('\n---\n', `\napprovalHash: ${digest(text)}\n---\n`); }

it('writes only the approved public block, recording ownership without leaking private fields', () => {
  const f = fixture(); const text = approve(article('internalOwner: private-person\n')); writeFileSync(f.source, text);
  const hello = readFileSync(new URL('../content/blog/신호보다-맥락.md', import.meta.url), 'utf8');
  writeFileSync(join(f.project, 'src/content/blog/신호보다-맥락.md'), hello);
  const result = f.run('--write');
  expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).mode).toBe('write');
  const output = readFileSync(f.output, 'utf8');
  expect(output).toContain('공개 본문 [외부 자료](https://example.com/article).');
  for (const secret of ['비공개', '내부', 'internalOwner', 'private-person', 'approvalHash', 'publish:start', f.vault]) expect(output).not.toContain(secret);
  const manifest = JSON.parse(readFileSync(join(f.project, '.obsidian-export/manifest.json'), 'utf8'));
  expect(manifest.entries[f.note]).toMatchObject({ slug: '생각-기록', sourceHash: digest(text), outputHash: digest(output) });
  expect(JSON.stringify(manifest)).not.toContain(f.vault);
  expect(readFileSync(join(f.project, 'src/content/blog/신호보다-맥락.md'), 'utf8')).toBe(hello);
});

it.each(['missing', 'revision', 'status', 'date'])('refuses write with invalid approval: %s', reason => {
  const f = fixture(); let text = approve(article());
  if (reason === 'missing') text = article();
  if (reason === 'revision') text += 'Changed private context';
  if (reason === 'status') text = approve(article().replace('status: approved', 'status: draft'));
  if (reason === 'date') text = approve(article().replace('pubDate: 2020-01-01\n', ''));
  writeFileSync(f.source, text);
  expect(f.run('--write').status).not.toBe(0);
  expect(existsSync(f.output)).toBe(false);
});


it.each([
  ['missing marker', (s: string) => s.replace('<!-- publish:end -->', '')],
  ['duplicate marker', (s: string) => s + '<!-- publish:start -->'],
  ['wiki link', (s: string) => s.replace('공개 본문', '[[비밀]]')],
  ['embed', (s: string) => s.replace('공개 본문', '![[비밀.png]]')],
  ['comment', (s: string) => s.replace('공개 본문', '%% 비밀 %%')],
  ['private annotation', (s: string) => s.replace('공개 본문', '> [!private] 비밀')],
  ['todo', (s: string) => s.replace('공개 본문', 'TODO: 비밀')],
  ['html', (s: string) => s.replace('공개 본문', '<img src="private.png">')],
  ['local image', (s: string) => s.replace('공개 본문', '![alt](assets/private.png)')],
  ['reference link', (s: string) => s.replace('공개 본문', '[비밀][ref]\n\n[ref]: private.md\n')],
  ['encoded traversal', (s: string) => s.replace('공개 본문', '[비밀](/%2e%2e/private.md)')],
  ['missing public asset', (s: string) => s.replace('공개 본문', '![alt](/missing.png)')],
  ['unsafe scheme', (s: string) => s.replace('공개 본문', '[비밀](file:///secret.md)')],
  ['future date', (s: string) => s.replace('2020-01-01', '2999-01-01')],
  ['invalid date', (s: string) => s.replace('2020-01-01', '2020-02-31')],
  ['missing title', (s: string) => s.replace('title: 생각을 정리하는 긴 한글 제목\n', '')],
  ['missing description', (s: string) => s.replace('description: 공개 설명\n', '')],
  ['invalid tags', (s: string) => s.replace('tags: [기록, AI]', 'tags: nope')],
  ['traversal slug', (s: string) => s.replace('slug: 생각-기록', 'slug: ../escape')],
  ['separator slug', (s: string) => s.replace('slug: 생각-기록', 'slug: a\\b')],
  ['unsafe slug', (s: string) => s.replace('slug: 생각-기록', 'slug: "bad?slug"')],
  ['draft metadata', (s: string) => s.replace('status: approved', 'draft: true\nstatus: approved')],
] as const)('fails closed before export: %s', (_label, change) => {
  const f = fixture(); writeFileSync(f.source, approve(change(article())));
  expect(f.run('--write').status).not.toBe(0);
  expect(existsSync(f.output)).toBe(false);
  expect(existsSync(join(f.project, '.obsidian-export'))).toBe(false);
});
it('allows only existing project public assets and normal external Markdown links', () => {
  const f = fixture(); writeFileSync(join(f.project, 'public/photo.png'), 'fixture');
  writeFileSync(f.source, approve(article('', '![alt](/photo.png) [page](https://example.com) [mail](mailto:hi@example.com)')));
  const result = f.run('--write'); expect(result.status, result.stderr).toBe(0);
  expect(readFileSync(f.output, 'utf8')).toContain('![alt](/photo.png)');
});


it('updates managed copies but refuses edited outputs, slug changes, and another source claiming a slug', () => {
  const f = fixture(); writeFileSync(f.source, approve(article()));
  expect(f.run('--write').status).toBe(0);
  const updated = approve(article('updatedDate: 2020-01-02\n', '수정 공개 본문'));
  writeFileSync(f.source, updated);
  const update = f.run('--write'); expect(update.status, update.stderr).toBe(0);
  expect(readFileSync(f.output, 'utf8')).toContain('수정 공개 본문');
  writeFileSync(f.source, approve(article().replace('slug: 생각-기록', 'slug: 다른-주소')));
  expect(f.run('--write').stderr).toContain('slug');
  expect(existsSync(join(f.project, 'src/content/blog/다른-주소.md'))).toBe(false);
  writeFileSync(join(f.vault, scope, '다른 제목.md'), updated);
  const collision = spawnSync(process.execPath, [cli.pathname, '--vault', f.vault, '--project', f.project, '--note', `${scope}/다른 제목.md`, '--write'], { encoding: 'utf8' });
  expect(collision.status).not.toBe(0);
  writeFileSync(f.source, updated); writeFileSync(f.output, 'manually edited');
  expect(f.run('--write').stderr).toContain('edited');
  expect(readFileSync(f.output, 'utf8')).toBe('manually edited');
});
it('refuses unmanaged content even during preview, including case and extension collisions', () => {
  const f = fixture(); writeFileSync(f.source, approve(article().replace('slug: 생각-기록', 'slug: HELLO-WORLD')));
  const existing = join(f.project, 'src/content/blog/hello-world.mdx'); writeFileSync(existing, 'preserve');
  expect(f.run().status).not.toBe(0);
  expect(f.run('--write').status).not.toBe(0);
  expect(readFileSync(existing, 'utf8')).toBe('preserve');
});
it('normalizes Unicode slugs to NFC', () => {
  const f = fixture(); writeFileSync(f.source, approve(article().replace('slug: 생각-기록', `slug: ${'생각-기록'.normalize('NFD')}`)));
  expect(f.run('--write').status).toBe(0); expect(existsSync(f.output)).toBe(true);
});
it.each(['source', 'destination', 'asset', 'manifest'])('refuses symlink escape: %s', kind => {
  const f = fixture(); writeFileSync(f.source, approve(article()));
  const outside = join(f.root, 'outside'); mkdirSync(outside);
  if (kind === 'source') { writeFileSync(join(outside, 'note.md'), approve(article())); rmSync(f.source); symlinkSync(join(outside, 'note.md'), f.source); }
  if (kind === 'destination') { rmSync(join(f.project, 'src/content/blog'), { recursive: true }); symlinkSync(outside, join(f.project, 'src/content/blog')); }
  if (kind === 'asset') { writeFileSync(join(outside, 'secret'), 'private'); symlinkSync(join(outside, 'secret'), join(f.project, 'public/photo.png')); writeFileSync(f.source, approve(article('', '![alt](/photo.png)'))); }
  if (kind === 'manifest') symlinkSync(outside, join(f.project, '.obsidian-export'));
  expect(f.run('--write').status).not.toBe(0);
  expect(existsSync(join(outside, '생각-기록.md'))).toBe(false);
  expect(existsSync(join(outside, 'manifest.json'))).toBe(false);
});
it('requires a relative scoped explicit note and rejects malformed YAML', () => {
  const f = fixture(); writeFileSync(f.source, article('title: duplicate\n'));
  expect(f.run().status).not.toBe(0);
  writeFileSync(f.source, article());
  const run = (note?: string) => spawnSync(process.execPath, [cli.pathname, '--vault', f.vault, '--project', f.project, ...(note ? ['--note', note] : [])], { encoding: 'utf8' });
  expect(run().status).not.toBe(0);
  expect(run(f.source).status).not.toBe(0);
});


it('preserves the exact approved slug in generated frontmatter for Astro routing', () => {
  const f = fixture(); writeFileSync(f.source, approve(article().replace('slug: 생각-기록', 'slug: AI-생각')));
  expect(f.run('--write').status).toBe(0);
  expect(readFileSync(join(f.project, 'src/content/blog/AI-생각.md'), 'utf8')).toContain('slug: AI-생각');
});
it.each(['생각 기록.md', '생각-기록/index.md'])('refuses Astro normalized route collision: %s', file => {
  const f = fixture(); writeFileSync(f.source, approve(article()));
  const target = join(f.project, 'src/content/blog', file);
  mkdirSync(join(target, '..'), { recursive: true }); writeFileSync(target, 'Existing article');
  expect(f.run().status).not.toBe(0);
});
it('refuses a slug already claimed by existing article frontmatter', () => {
  const f = fixture(); writeFileSync(f.source, approve(article()));
  writeFileSync(join(f.project, 'src/content/blog/other.md'), '---\nslug: 생각-기록\n---\nExisting');
  expect(f.run().status).not.toBe(0);
});
it.each(['#private secret', '#비공개 메모', '[비공개] 메모', '[private] secret', 'owner:: secret', '- [ ] private task', 'secret ^block-id'])('rejects private/Obsidian annotation %s', body => {
  const f = fixture(); writeFileSync(f.source, approve(article('', body)));
  expect(f.run('--write').status).not.toBe(0);
});
it('approval omission applies only to frontmatter, and CRLF is canonicalized', () => {
  const f = fixture(); const text = article('', 'approvalHash: public prose');
  writeFileSync(f.source, text.replace(/\n/g, '\r\n'));
  const result = f.run(); expect(result.status, result.stderr).toBe(0);
  expect(JSON.parse(result.stdout).approvalHash).toBe(createHash('sha256').update(text).digest('hex'));
});

it('previews one explicit note by default without writing, returning the revision digest', () => {
  const f = fixture(); const text = article(); writeFileSync(f.source, text);
  const result = f.run();
  expect(result.status, result.stderr).toBe(0);
  const preview = JSON.parse(result.stdout);
  expect(preview.approvalHash).toBe(digest(text));
  expect(preview.destination).toBe('src/content/blog/생각-기록.md');
  expect(preview.mode).toBe('dry-run');
  expect(existsSync(f.output)).toBe(false);
  expect(existsSync(join(f.project, '.obsidian-export'))).toBe(false);
});
