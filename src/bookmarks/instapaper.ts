import { z } from 'zod';
import jetpack from '@eatonfyi/fs-jetpack';
import { Bookmark } from '@eatonfyi/schema';
import { Csv } from '@eatonfyi/serializers';

const schema = z.array(z.object({
  URL: z.string(),
  Title: z.string().optional(),
  Timestamp: z.coerce.number().transform(t => new Date(t * 1000))
}));

export async function parseInstapaper(filePath: string) {
  jetpack.setSerializer('.csv', Csv);
  const raw = jetpack.read(filePath, 'auto');
  const parsed = schema.parse(raw);

  return parsed.map(link => ({ 
      partOf: 'instapaper',
      url: link.URL,
      name: link.Title,
      date: { created: link.Timestamp }
    } as Partial<Bookmark>
  ));
}