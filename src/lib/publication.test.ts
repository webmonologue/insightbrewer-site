import { expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, existsSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

it('uses one predicate to omit drafts and future dates while preserving published entries', async () => {
  const { isPublished } = await import('./publication');
  const now = new Date('2026-09-15T00:00:00Z');
  const entry = (date: string, draft = false) => ({ data: { pubDate: new Date(date), draft } });
  expect(isPublished(entry('2026-09-14'), now)).toBe(true);
  expect(isPublished(entry(now.toISOString()), now)).toBe(true);
  expect(isPublished(entry('2026-09-14', true), now)).toBe(false);
  expect(isPublished(entry('2999-01-01'), now)).toBe(false);
  expect(isPublished(entry('invalid'), now)).toBe(false);
});

it('orders equal publication dates by ID regardless of input order or update date', async () => {
  const { comparePublicationDate } = await import('./publication');
  expect(comparePublicationDate).toBeTypeOf('function');
  const entry = (id: string, date: string) => ({ id, data: { pubDate: new Date(date), updatedDate: new Date('2099-01-01') } });
  const a = entry('a', '2020-01-02');
  const z = entry('z', '2020-01-02');
  const old = entry('old', '2020-01-01');
  expect([z, old, a].sort(comparePublicationDate).map(post => post.id)).toEqual(['a', 'z', 'old']);
  expect([a, old, z].sort(comparePublicationDate).map(post => post.id)).toEqual(['a', 'z', 'old']);
  expect(comparePublicationDate(a, a)).toBe(0);
});

it('actual home, archive and static article build never expose drafts/future fixtures; hello-world remains', () => {
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'publication-build-'));
  try {
    mkdirSync(join(root, 'src/pages/blog'), { recursive: true });
    for (const name of ['components', 'layouts', 'styles', 'lib', 'content']) cpSync(join(repo, 'src', name), join(root, 'src', name), { recursive: true });
    cpSync(join(repo, 'src/content.config.ts'), join(root, 'src/content.config.ts'));
    cpSync(join(repo, 'src/pages/index.astro'), join(root, 'src/pages/index.astro'));
    cpSync(join(repo, 'src/pages/blog'), join(root, 'src/pages/blog'), { recursive: true });
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(join(root, 'astro.config.mjs'), 'export default { site: "https://example.com" };');
    symlinkSync(join(repo, 'node_modules'), join(root, 'node_modules'));
    for (const [id, meta] of [['hidden-draft', 'draft: true\npubDate: 2020-01-01'], ['hidden-future', 'pubDate: 2999-01-01']]) {
      writeFileSync(join(root, `src/content/blog/${id}.md`), `---\ntitle: ${id}\ndescription: ${id}\n${meta}\n---\nSECRET-${id}\n`);
    }
    // Exercise the real exporter into this disposable site, never the real vault/site content.
    const vault = join(root, 'vault');
    const note = '02-Areas/Personal Branding/Content Production/긴 한글 원본 제목.md';
    mkdirSync(join(vault, note, '..'), { recursive: true }); mkdirSync(join(root, 'public'));
    const source = '---\ntitle: Unicode export\nslug: AI-생각\ndescription: Public description\ntags: [AI]\npubDate: 2020-01-01\nstatus: approved\n---\nPRIVATE-OUTSIDE\n<!-- publish:start -->\nPUBLIC-EXPORTED-BODY\n<!-- publish:end -->\nPRIVATE-AFTER\n';
    const approval = createHash('sha256').update(source).digest('hex');
    writeFileSync(join(vault, note), source.replace('\n---\n', `\napprovalHash: ${approval}\n---\n`));
    const exported = spawnSync(process.execPath, [join(repo, 'scripts/export-obsidian.mjs'), '--vault', vault, '--project', root, '--note', note, '--write'], { encoding: 'utf8' });
    expect(exported.status, exported.stderr).toBe(0);
    const build = spawnSync(process.execPath, [join(repo, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], { cwd: root, encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, timeout: 120000 });
    expect(build.status, build.stdout + build.stderr).toBe(0);
    for (const path of ['index.html', 'blog/index.html']) {
      const html = readFileSync(join(root, 'dist', path), 'utf8');
      expect(html).not.toContain('hidden-draft'); expect(html).not.toContain('hidden-future');
    }
    expect(readFileSync(join(root, 'dist/blog/index.html'), 'utf8')).toContain('/blog/hello-world/');
    expect(existsSync(join(root, 'dist/blog/신호보다-맥락/index.html'))).toBe(false);
    const published = readFileSync(join(root, 'dist/blog/AI-생각/index.html'), 'utf8');
    expect(published).toContain('PUBLIC-EXPORTED-BODY');
    expect(published).not.toContain('PRIVATE-OUTSIDE');
    expect(published).not.toContain('PRIVATE-AFTER');
    expect(published).not.toContain(vault);
    expect(existsSync(join(root, 'dist/blog/hello-world/index.html'))).toBe(true);
    expect(existsSync(join(root, 'dist/blog/hidden-draft/index.html'))).toBe(false);
    expect(existsSync(join(root, 'dist/blog/hidden-future/index.html'))).toBe(false);
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 120000);

it.each([0, 1, 2, 5])('home renders only actual recent posts (%i published), ordered by pubDate then stable ID', (count) => {
  const repo = fileURLToPath(new URL('../../', import.meta.url));
  const root = mkdtempSync(join(tmpdir(), 'recent-build-'));
  try {
    mkdirSync(join(root, 'src/pages'), { recursive: true });
    mkdirSync(join(root, 'src/content/blog'), { recursive: true });
    for (const name of ['components', 'layouts', 'styles', 'lib']) cpSync(join(repo, 'src', name), join(root, 'src', name), { recursive: true });
    cpSync(join(repo, 'src/content.config.ts'), join(root, 'src/content.config.ts'));
    cpSync(join(repo, 'src/pages/index.astro'), join(root, 'src/pages/index.astro'));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    writeFileSync(join(root, 'astro.config.mjs'), 'export default { site: "https://example.com" };');
    symlinkSync(join(repo, 'node_modules'), join(root, 'node_modules'));
    // Reverse filenames deliberately decouple glob insertion order from route IDs.
    const entries = [
      ['z-file', 'a-latest', '2020-01-03'],
      ['a-file', 'z-tie', '2020-01-03'],
      ['middle', 'middle', '2020-01-02'],
      ['old-updated', 'old-updated', '2020-01-01', 'updatedDate: 2099-01-01'],
      ['oldest', 'oldest', '2019-01-01'],
    ];
    for (const [file, id, date, extra = ''] of [...entries.slice(0, count), ['draft', 'hidden-draft', '2020-02-01', 'draft: true'], ['future', 'hidden-future', '2999-01-01']]) {
      writeFileSync(join(root, `src/content/blog/${file}.md`), `---\ntitle: ${id}\nslug: ${id}\ndescription: Summary ${id}\npubDate: ${date}\n${extra}\n---\nBody ${id}\n`);
    }
    const build = spawnSync(process.execPath, [join(repo, 'node_modules/astro/bin/astro.mjs'), 'build', '--root', root], { cwd: root, encoding: 'utf8', env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }, timeout: 120000 });
    expect(build.status, build.stdout + build.stderr).toBe(0);
    const html = readFileSync(join(root, 'dist/index.html'), 'utf8');
    expect(html).not.toContain('hidden-draft');
    expect(html).not.toContain('hidden-future');
    const articles = [...html.matchAll(/<article class="(?:featured-post|compact-post)"[\s\S]*?<\/article>/g)].map(match => match[0]);
    expect(articles).toHaveLength(Math.min(count, 3));
    articles.forEach((article, index) => {
      expect(article).toContain(`href="/blog/${entries[index][1]}/"`);
      expect(article).toContain(index === 0 ? 'class="featured-post"' : 'class="compact-post"');
      expect(article).toContain(`datetime="${entries[index][2]}T00:00:00.000Z"`);
      if (index > 0) expect(article).toContain(`Summary ${entries[index][1]}`);
    });
    if (count <= 1) expect(html).not.toContain('class="recent-posts"');
    if (count === 0) expect(html).not.toContain('class="writing-section"');
    else expect(html).toContain('모든 글 보기');
    expect(html).not.toContain('/blog/old-updated/');
    expect(html).not.toContain('/blog/oldest/');
  } finally { rmSync(root, { recursive: true, force: true }); }
}, 120000);
