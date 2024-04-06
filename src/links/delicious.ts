import { z } from 'zod';
import jetpack from '@eatonfyi/fs-jetpack';
import { Bookmark } from '@eatonfyi/schema';

const schema = z.array(z.object({
  href: z.string(),
  description: z.string().optional(),
  extended: z.string().optional(),
  created: z.number(),
  tags: z.array(z.string()).optional()
}));

export function parse(filePath: string) {
  const data = jetpack.read(filePath);
  const json = typeof data === 'string' ? JSON.parse(data) : data;

  const parsed = schema.safeParse(json);
  if (parsed.success) {
    return parsed.data.map(link => ({
        partOf: 'delicious',
        url: link.href,
        name: link.description,
        description: link.extended,
        date: { created: new Date(link.created * 1000) } ,
        keywords: link.tags,
      } as Partial<Bookmark> 
    ));
  }
}