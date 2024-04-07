import { z } from 'zod';
import jetpack from '@eatonfyi/fs-jetpack';
import { Bookmark } from '@eatonfyi/schema';

const schema = z.array(z.object({
  href: z.string(),
  description: z.string().optional(),
  extended: z.string().optional(),
  time: z.coerce.date(),
  tags: z.array(z.string()).optional()
}));

export function parsePinboard(filePath: string) {
  const data = jetpack.read(filePath);
  const json = typeof data === 'string' ? JSON.parse(data) : data;

  const parsed = schema.safeParse(json);
  if (parsed.success) {
    return parsed.data.map(link => ({
        partOf: 'pinboard',
        url: link.href,
        name: link.description,
        description: link.extended,
        date: { created: link.time } ,
        keywords: link.tags,
      } as Partial<Bookmark> 
    ));
  }
}