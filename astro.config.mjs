// @ts-check
import { defineConfig } from 'astro/config';

import sitemap from '@astrojs/sitemap';
import cloudflare from '@astrojs/cloudflare';
import { unified } from '@astrojs/markdown-remark';
import remarkCjkFriendly from 'remark-cjk-friendly/parseOnly';

// https://astro.build/config
export default defineConfig({
  site: 'https://insightbrewer.webmonologue.workers.dev',
  integrations: [sitemap()],
  adapter: cloudflare(),
  // Sätteri does not run micromark syntax extensions. Parse CJK emphasis
  // before building the AST, without rewriting approved prose or HTML.
  markdown: { processor: unified({ remarkPlugins: [remarkCjkFriendly] }) },
});