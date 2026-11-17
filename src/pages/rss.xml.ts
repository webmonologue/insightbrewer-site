import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getCollection } from 'astro:content';
import { isPublished, comparePublicationDate } from '../lib/publication';

export async function GET(context: APIContext) {
  const posts = (await getCollection('blog', isPublished)).sort(comparePublicationDate);
  return rss({
    title: 'Insight Brewer',
    description: 'AI와 애드테크, 데이터와 사업의 접점에서 떠오른 질문을 기록합니다.',
    site: context.site!,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `/blog/${post.id}/`,
    })),
    customData: '<language>ko-kr</language>',
  });
}
