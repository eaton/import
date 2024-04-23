/* Stubbed import for livejournal posts in XML format */

// Do a song and dance for the Semagic files

// Create an Organization for Livejournal
// Create a Blog entry for my LJ
  // Create 'raw', 'html', and 'markdown' versions of each post's entry text; html should fix LJ markup and broken/weird markup.
  // Fix image URLs for predicate.net hosted photos
// Create a SocialMediaPosting for each entry
// Create a Comment for each reply to each entry

// note for the slj files \xFF \xFE \xFF appears to be the delimiter between data fields

import { BaseImport } from "../base-importer.js";
import { extract, ExtractTemplateObject } from "@eatonfyi/html";
import { z } from 'zod';
import { parse as parseDate, isBefore} from '@eatonfyi/dates';

const xmlTemplate: ExtractTemplateObject[] = [{
  $: 'entry',
  id: '> itemid | parseAs:int',
  date: '> eventtime',
  subject: '> subject',
  body: '> event',
  mood: '> current_mood',
  music: '> current_music',
  avatar: '> avatar',
  comments: [{
    $: '> comment',
    id: '> itemid | parseAs:int',
    parent: '> parent_itemid',
    date: '> eventtime',
    body: '> event',
    name: '> author > name',
    email: '> author > email',
  }]
}];

const commentSchema = z.object({
  id: z.number(),
  entry: z.number().optional(),
  parent: z.string().optional().transform(p => p ? Number.parseInt(p) : undefined),
  date: z.string().transform(s => parseDate(s, 'yyyy-MM-dd HH:mm:ss', Date.now())),
  subject: z.string().optional(),
  body: z.string().optional(),
  name: z.string().optional(),
  email: z.string().optional(),
});

const entrySchema = z.object({
  id: z.number(),
  date: z.string().transform(s => parseDate(s, 'yyyy-MM-dd HH:mm:ss', Date.now())),
  subject: z.string().optional(),
  body: z.string().optional(),
  music: z.string().optional(),
  mood: z.string().optional(),
  avatar: z.string().optional(),
  comments: z.array(commentSchema).optional()
});

const xmlSchema = z.array(entrySchema);

export class LivejournalImport extends BaseImport {
  constructor(options = {}) {
    super({ name: 'livejournal', ...options });
  }

  override async cacheIsFilled(): Promise<boolean> {
    const flag = this.cache.exists('entries/1.json');
    return Promise.resolve(flag === 'file');
  }

  override async fillCache(): Promise<unknown> {
    const sljFiles = this.input.find({ matching: '*.slj' });
    for (const file of sljFiles) {
      const raw = this.input.read(file, 'buffer');
      if (raw) {
        const entry = this.parseSemagicFile(raw);
        this.cache.write(`${entry.id}.json`, entry);
      };
    }

    const xmlFiles = this.input.find({ matching: '*.xml' });
    for (const file of xmlFiles) {
      const xml = this.input.read(file);
      if (xml) {
        const extracted = await extract(xml, xmlTemplate, xmlSchema, { xml: true });
        for (const entry of extracted) {
          this.cache.write(`${entry.id}.json`, entry);
        }  
      };
    }

    return Promise.resolve();
  }

  protected parseSemagicFile(data: Buffer) {
    try {
      const chunks = splitBuffer(data, Buffer.from([255,254,255]));
      return {
        id:  intFromBytes(chunks[11].slice(0,2)),
        subject: chunks[15].slice(0, -24).toString('utf16le') || undefined,
        flags: chunks[15].slice(-24,-16),
        date: dateFromBytes(chunks[15].slice(-16,-12)),
        body: chunks[14].toString('utf16le').slice(1) || undefined,
        music: chunks[16].toString('utf16le') || undefined,
        mood: chunks[17].slice(-4).toString('utf16le') || undefined,
        avatar: chunks[18].toString('utf16le'),
      }
    } catch (err: unknown) {
      return {
        id: 'error',
        body: (err instanceof Error) ? err.toString() : 'Unknown error'
      };
    }
    
    function splitBuffer(b: Buffer, delimiter: Buffer) {
      const ret = [];
      let s = 0;
      let i = b.indexOf(delimiter, s);
      while (i >= 0) {
        if (i >= 0) {
          ret.push(b.slice(s + 3, i));
        }
        s = i + 1;
        i = b.indexOf(delimiter, s);
      }
      ret.push(b.slice(s + 3));
      return ret;
    }

    function dateFromBytes(input: Buffer) {
      return new Date(1000*parseInt('0x' + input.toString('hex').match(/../g)?.reverse().join('')));
    }

    function intFromBytes(input: Buffer) {
      return parseInt('0x' + input.toString('hex').match(/../g)?.reverse().join(''));
    }
  }
}


