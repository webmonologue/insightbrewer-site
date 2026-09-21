import { fromMarkdown } from 'mdast-util-from-markdown';
import { cjkFriendlyExtension } from 'micromark-extension-cjk-friendly';
import type { Nodes } from 'mdast';

/** Extract text, never HTML; escaped delimiters and inline code remain literal. */
function inlineText(node: Nodes): string {
  if (node.type === 'text' || node.type === 'inlineCode') return node.value;
  if (node.type === 'break') return ' ';
  if ('children' in node) return node.children.map(inlineText).join('');
  return '';
}

/** Use the first prose paragraph, with the same CJK emphasis rules as articles. */
export function markdownExcerpt(body: string | undefined, fallback = ''): string {
  const tree = fromMarkdown(body ?? '', { extensions: [cjkFriendlyExtension()] });
  for (const node of tree.children) {
    if (node.type !== 'paragraph') continue;
    const text = inlineText(node).replace(/\r?\n/g, ' ').trim();
    if (text) return text;
  }
  return fallback;
}
