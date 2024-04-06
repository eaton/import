import { z } from 'zod';
import jetpack from '@eatonfyi/fs-jetpack';
import { Bookmark } from '@eatonfyi/schema';
import { extract } from '@eatonfyi/html';

const schema = z.array(z.object({
  url: z.string(),
  name: z.string().optional(),
  date: z.coerce.number().transform(d => new Date(d * 1000)),
  tags: z.string().transform(t => (t && t.length) ? t.split(/\s+/) : undefined)
}));

const template = [{
  $: 'li > a',
  url: '$ | attr:href',
  name: '$ | text',
  date: '$ | attr:time_added',
  tags: '$ | attr:tags',
}];

export async function parse(filePath: string) {
  const html = jetpack.read(filePath) ?? '';

  const output = await extract(html, template, schema);
  return output.map(link => ({ partOf: 'getpocket', ...link } as Partial<Bookmark>));
}