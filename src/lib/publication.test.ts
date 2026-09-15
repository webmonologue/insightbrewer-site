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
      expect(html).toContain('/blog/hello-world/');
    }
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
