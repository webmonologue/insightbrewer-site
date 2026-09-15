#!/usr/bin/env node
import { readFileSync, realpathSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';
import { parseArgs } from 'node:util';
import { createHash } from 'node:crypto';
import { parseDocument, stringify } from 'yaml';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { statSync, lstatSync, existsSync, readdirSync, renameSync, unlinkSync, rmdirSync } from 'node:fs';
import { isAbsolute } from 'node:path';
import { slug as githubSlug } from 'github-slugger';

const SCOPE = '02-Areas/Personal Branding/Content Production';
const DEFAULT_VAULT = resolve(homedir(), 'Library/Mobile Documents/iCloud~md~obsidian/Documents/InsightBrewer');
const hash = text => createHash('sha256').update(text).digest('hex');
const fail = message => { throw new Error(message); };
function contained(root, target) {
  const rel = relative(root, target);
  return rel !== '' && rel !== '..' && !rel.startsWith(`..${sep}`) && !rel.startsWith(sep);
}

function validDate(value, name) {
  // Date-only publication uses midnight UTC; timestamps must explicitly name a timezone.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) fail(`${name}: use YYYY-MM-DD or ISO timestamp with timezone`);
  const calendar = value.slice(0, 10);
  if (new Date(`${calendar}T00:00:00Z`).toISOString().slice(0, 10) !== calendar || !Number.isFinite(Date.parse(value))) fail(`Invalid ${name}`);
  return Date.parse(value);
}
function validateBody(body, project) {
  if (/(?:#|\[)(?:private|internal|confidential|비공개|내부용)(?=$|[\s\]/:])|\S::|^\s*[-*+] \[[ xX]\]|(?:^|\s)\^[\w-]+\s*$/im.test(body)) fail('Remove private tags, inline fields, tasks and block IDs from public block');
  if (/\[\[|\]\]|%%|\[!|\b(?:TODO|FIXME|PRIVATE|INTERNAL|CONFIDENTIAL)\s*:|(?:비공개|내부용|개인메모)\s*:/i.test(body)) fail('Remove wiki/embed links, Obsidian comments and private annotations from public block');
  const publicRoot = realpathSync(resolve(project, 'public'));
  function link(url) {
    if (/^(https?:\/\/|mailto:)/i.test(url)) return;
    if (/^#[^\s]*$/.test(url)) return;
    const decoded = decodeURIComponent(url);
    if (!decoded.startsWith('/') || decoded.startsWith('//') || /[\\%\x00-\x20]/.test(decoded) || decoded.split(/[/?#]/).some(part => part === '.' || part === '..')) fail('Convert local links manually to an existing /public-asset URL');
    const target = realpathSync(resolve(publicRoot, decoded.slice(1).split(/[?#]/)[0]));
    if (!contained(publicRoot, target) || !statSync(target).isFile()) fail('Asset must be an existing file inside project public');
  }
  function visit(node) {
    if (node.type === 'html') fail('Raw HTML/comments are not supported in public blocks');
    if (['link', 'image', 'definition'].includes(node.type)) link(node.url);
    for (const child of node.children ?? []) visit(child);
  }
  visit(fromMarkdown(body));
}

function preview(options) {
  const project = realpathSync(options.project ?? fileURLToPath(new URL('..', import.meta.url)));
  for (const path of ['src/content/blog', 'public', '.obsidian-export/manifest.json']) noSymlinks(project, path);
  const vault = realpathSync(options.vault ?? DEFAULT_VAULT);
  if (!options.note || isAbsolute(options.note) || options.note.split(/[\\/]/).includes('..') || !options.note.endsWith('.md')) fail('--note must select one .md note relative to the vault');
  const source = realpathSync(resolve(vault, options.note));
  if (!contained(resolve(vault, SCOPE), source)) fail('Note is outside the allowed Content Production scope');
  const text = readFileSync(source, 'utf8').replace(/\r\n?/g, '\n');
  const match = /^---\n([\s\S]*?)\n---\n/.exec(text);
  if (!match) fail('YAML frontmatter required');
  const doc = parseDocument(match[1], { uniqueKeys: true });
  if (doc.errors.length) fail(`Invalid YAML: ${doc.errors[0].message}`);
  const meta = doc.toJS({ maxAliasCount: 20 });
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) fail('YAML mapping required');
  for (const key of ['title', 'slug', 'description']) if (typeof meta[key] !== 'string' || !meta[key].trim()) fail(`${key} required`);
  if (!Array.isArray(meta.tags) || meta.tags.length === 0 || meta.tags.some(tag => typeof tag !== 'string' || !tag.trim())) fail('tags must be a nonempty string list');
  meta.slug = meta.slug.normalize('NFC');
  if (!/^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u.test(meta.slug) || meta.slug.length > 80) fail('slug: only Unicode letters/numbers separated by single hyphens, max 80 characters');
  if (meta.draft !== undefined && meta.draft !== false) fail('draft must be false for export');
  if (meta.pubDate !== undefined && validDate(meta.pubDate, 'pubDate') > Date.now()) fail('Future pubDate cannot be exported');
  if (meta.updatedDate !== undefined) validDate(meta.updatedDate, 'updatedDate');
  // Only this top-level single-line approval field is omitted; all other bytes (after LF normalization) are approved.
  const approvalLines = match[1].split('\n').filter(line => /^approvalHash:/.test(line));
  if (meta.approvalHash !== undefined && (approvalLines.length !== 1 || !/^approvalHash: [a-f0-9]{64}$/.test(approvalLines[0]))) fail('approvalHash must be a plain top-level 64-character lowercase hex line');
  const canonicalFrontmatter = match[1].split('\n').filter(line => !/^approvalHash:/.test(line)).join('\n');
  const approvalHash = hash(`---\n${canonicalFrontmatter}\n---\n${text.slice(match[0].length)}`);
  const start = '<!-- publish:start -->', end = '<!-- publish:end -->';
  const content = text.slice(match[0].length);
  if (text.split(start).length !== 2 || text.split(end).length !== 2 || !content.includes(start) || content.indexOf(start) >= content.indexOf(end)) fail('Exactly one ordered pair of publish markers required');
  const body = content.slice(content.indexOf(start) + start.length, content.indexOf(end)).trim();
  validateBody(body, project);
  if (!body) fail('Public block required');
  if (options.write && (meta.status !== 'approved' || meta.approvalHash !== approvalHash)) fail('status approved and matching approvalHash required; preview again');
  if (options.write && !meta.pubDate) fail('pubDate required for write');
  const published = Object.fromEntries(['title', 'slug', 'description', 'tags', 'pubDate', 'updatedDate'].filter(key => meta[key] !== undefined).map(key => [key, meta[key]]));
  const output = `---\n${stringify(published)}---\n\n${body}\n`;
  return { project, sourceId: relative(vault, source).split(sep).join('/').normalize('NFC'), meta, output, approvalHash, destination: `src/content/blog/${meta.slug}.md` };
}
function noSymlinks(root, path) {
  let current = root;
  for (const part of path.split('/')) {
    current = resolve(current, part);
    try { if (lstatSync(current).isSymbolicLink()) fail('Symlinks are not allowed in project export paths'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
}
const slugKey = slug => slug.normalize('NFC').toLowerCase();
function checkOwnership(result) {
  const { project, sourceId, meta, destination } = result;
  noSymlinks(project, destination);
  noSymlinks(project, '.obsidian-export/manifest.json');
  const manifestPath = resolve(project, '.obsidian-export/manifest.json');
  const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, 'utf8')) : { version: 1, entries: {} };
  if (manifest.version !== 1 || !manifest.entries || typeof manifest.entries !== 'object' || Array.isArray(manifest.entries)) fail('Invalid local export manifest');
  for (const [id, entry] of Object.entries(manifest.entries)) {
    if (!entry || typeof entry.slug !== 'string' || !/^[a-f0-9]{64}$/.test(entry.sourceHash) || !/^[a-f0-9]{64}$/.test(entry.outputHash)) fail('Invalid local export manifest entry');
    if (id !== sourceId && slugKey(entry.slug) === slugKey(meta.slug)) fail('slug collision: another source owns this slug');
  }
  const previous = Object.hasOwn(manifest.entries, sourceId) ? manifest.entries[sourceId] : undefined;
  if (previous && previous.slug !== meta.slug) fail('Cannot change slug for a tracked source; migrate manually');
  const target = resolve(project, destination);
  const files = readdirSync(resolve(project, 'src/content/blog'), { recursive: true });
  for (const file of files) {
    if (!/\.mdx?$/i.test(file)) continue;
    noSymlinks(project, `src/content/blog/${file}`);
    const existing = readFileSync(resolve(project, 'src/content/blog', file), 'utf8').replace(/\r\n?/g, '\n');
    const frontmatter = /^---\n([\s\S]*?)\n---(?:\n|$)/.exec(existing);
    let claimedSlug;
    if (frontmatter) {
      const doc = parseDocument(frontmatter[1]);
      if (doc.errors.length) fail('Fix invalid YAML in existing blog content before exporting');
      claimedSlug = doc.toJS({ maxAliasCount: 20 })?.slug;
    }
    const nameCollision = slugKey(file.replace(/\.mdx?$/i, '')) === slugKey(meta.slug);
    // Match Astro's default filename route generation, including nested index files.
    const defaultRoute = file.replace(/\.mdx?$/i, '').split(sep).map(part => githubSlug(part)).join('/').replace(/\/index$/, '');
    const declaredCollision = slugKey(typeof claimedSlug === 'string' ? claimedSlug : defaultRoute) === slugKey(meta.slug);
    if (!nameCollision && !declaredCollision) continue;
    if (!previous || file.normalize('NFC') !== `${meta.slug}.md`) fail('slug collision: refusing unmanaged existing content');
  }
  if (previous && (!existsSync(target) || hash(readFileSync(target)) !== previous.outputHash)) fail('Exported file was edited or removed; reconcile manually in Obsidian before exporting');
  return { manifest, previous, target, manifestPath };
}
function writeExport(result) {
  // One local writer; recheck ownership under lock. Never adopt or repair unknown state.
  const state = resolve(result.project, '.obsidian-export');
  mkdirSync(state, { recursive: true });
  const lock = resolve(state, 'write.lock');
  mkdirSync(lock);
  const staged = resolve(state, 'manifest.next.json');
  try {
    const { manifest, previous, target, manifestPath } = checkOwnership(result);
    manifest.entries[result.sourceId] = { slug: result.meta.slug, sourceHash: result.approvalHash, outputHash: hash(result.output) };
    writeFileSync(staged, JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
    writeFileSync(target, result.output, { flag: previous ? 'w' : 'wx' });
    // A crash between these writes leaves an ownership mismatch and blocks the next export.
    renameSync(staged, manifestPath);
  } finally {
    if (existsSync(staged)) unlinkSync(staged);
    rmdirSync(lock);
  }
}
try {
  const { values } = parseArgs({ options: { note: { type: 'string' }, vault: { type: 'string' }, project: { type: 'string' }, write: { type: 'boolean', default: false } }, strict: true });
  const result = preview(values);
  checkOwnership(result);
  if (values.write) writeExport(result);
  console.log(JSON.stringify({ mode: values.write ? 'write' : 'dry-run', approvalHash: result.approvalHash, destination: result.destination }, null, 2));
} catch (error) {
  console.error(`Export refused: ${error.message}`);
  process.exitCode = 1;
}
