/* Stubbed import for livejournal posts in XML format */

// Do a song and dance for the Semagic files

// Create an Organization for Livejournal
// Create a Blog entry for my LJ
  // Create 'raw', 'html', and 'markdown' versions of each post's entry text; html should fix LJ markup and broken/weird markup.
  // Fix image URLs for predicate.net hosted photos
// Create a SocialMediaPosting for each entry
// Create a Comment for each reply to each entry

// note for the slj files \xFF \xFE \xFF appears to be the delimiter between data fields

import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { extract, ExtractTemplateObject, fromLivejournal, toMarkdown } from "@eatonfyi/html";
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
  teaser: z.string().optional(),
  music: z.string().optional(),
  mood: z.string().optional(),
  avatar: z.string().optional(),
  comments: z.array(commentSchema).optional().transform(c => c?.length ? c : undefined )
});

const xmlSchema = z.array(entrySchema);

export type LivejournalEntry = z.infer<typeof entrySchema>;
export type LivejournalComment = z.infer<typeof commentSchema>;

export interface LivejournalImportOptions extends BaseImportOptions {
  ignoreBefore?: Date,
  ignoreAfter?: Date,
  ignoreComments?: boolean,
}

export class LivejournalImport extends BaseImport {
  declare options: LivejournalImportOptions;

  protected queue = {
    entries: [] as LivejournalEntry[],
    comments: [] as LivejournalComment[],
  };

  constructor(options: LivejournalImportOptions = {}) {
    super({ name: 'livejournal', ...options });
  }

  override async cacheIsFilled(): Promise<boolean> {
    return this.cache.find({ matching: '*/*.json' }).length > 0;
  }

  override async fillCache(): Promise<unknown> {
    const sljFiles = this.input.find({ matching: '*.slj' });
    for (const file of sljFiles) {
      const raw = this.input.read(file, 'buffer');
      if (raw) {
        const entry = this.parseSemagicFile(raw);
        if (entry) {
          this.cache.write(`${entry.date?.getFullYear()}/${entry.id}.json`, entry);
        }
      };
    }

    const xmlFiles = this.input.find({ matching: '*.xml' });
    for (const file of xmlFiles) {
      const xml = this.input.read(file);
      if (xml) {
        const extracted = await extract(xml, xmlTemplate, xmlSchema, { xml: true });
        for (const entry of extracted) {
          this.cache.write(`${entry.date.getFullYear()}/${entry.id}.json`, entry);
        }  
      };
    }

    return Promise.resolve();
  }

  override async readCache(): Promise<LivejournalEntry[]> {
    const entries: LivejournalEntry[] = [];
    const files = this.cache.find({ matching: '*/*.json' });
    for (const file of files) {
      entries.push(this.cache.read(file, 'jsonWithDates') as LivejournalEntry);
    }
    return Promise.resolve(entries);
  }

  override async process() {
    this.queue = { entries: [], comments: [] };

    const data = await this.readCache();
    for (const e of data) {
      const { comments, ...entry } = e;

      // Ignore anything outside the optional dates, they're backdated duplicates from other sources
      if (this.options.ignoreBefore && isBefore(entry.date, this.options.ignoreBefore)) continue;
      if (this.options.ignoreAfter && isBefore(entry.date, this.options.ignoreAfter)) continue;

      const formattedEntry = {
        ...entry,
        body: fromLivejournal(entry.body ?? ''),
        teaser: fromLivejournal(entry.body ?? '', { teaser: true }),
      }
      this.queue.entries.push(entry);

      if (!this.options.ignoreComments) {
        for (const comment of comments ?? []) {
          comment.entry = entry.id;
          this.queue.comments.push(comment);
        }
      }
    }
  }

  override async finalize() {
    for (const e of this.queue.entries) {
      this.output.write(`entries/${e.id}.json`, e);
    }
    for (const c of this.queue.comments) {
      this.output.write(`comments/${c.entry}-${c.id}.json`, c);
    }
    this.input.copy('media/lj-photos', this.output.path('media'), { overwrite: true });
  }

  /**
   * Semagic was an early-aughts LJ client for windows. Among other things it saved local
   * copies of posts after you'd sent them; this made it handy for recovering lost journal
   * data.
   * 
   * The format consists of a few fixed-length data fields, and a large number of variable
   * length text fields. All text fields start with a \xFF\xFE\xFF delimiter, followed by the
   * length of the text. \x00 indicates an empty field, \xFF indicates the FOLLOWING two bytes 
   * contain the field length, and anything else is just the field length. The actual text is
   * utf16le encoded.
   * 
   * Fields:
   * 
   *  0. 16 bytes of header data. Always appears to be the same, might be app version/signature.
   *  1. Text, always empty
   *  2. Text, always empty
   *  3. Text, always empty
   *  4. Text, always empty
   *  5. Text, always empty
   *  6. Text, always empty
   *  7. Text, always empty
   *  8. Text, always empty
   *  9. Text, always empty
   * 10. Text, always empty
   * 11. Text, always empty
   * 12. Little-endian UInt32 containing the post ID
   * 13. Text, LJ handle
   * 14. Text, LJ display name
   * 15. Text, Post body
   * 16. Text, Post subject
   * 17: UInt32, always empty
   * 18: UInt32, always empty
   * 19. Little-endian UInt32 containing post's creation timestamp.
   * 20: UInt32, always empty.
   * 21: UInt32, always empty.
   * 22: UInt32, always empty.
   * 23: Text, Current Music
   * 24: Text, Current Mood
   * 25: UInt32, always empty.
   * 26: Text, Avatar
   * 
   * One of the 'always empty/unknown' fields probably contains things like post visibility settings,
   * but without te docs it's a bit of a shot in the dark.
   */
  protected parseSemagicFile(data: Buffer) {
    try {
      // This is a really crude way of ding it, and frankly we shouldn't.
      const chunks = splitBuffer(data, Buffer.from([255,254,255]));
      return {
        id:  chunks[11].slice(0,2).readUInt16LE(),
        subject: chunks[15].slice(0, -24).toString('utf16le') || undefined,
        flags: chunks[15].slice(-24,-16),
        date: new Date(chunks[15].slice(-16,-12).readUInt32LE()),
        body: chunks[14].toString('utf16le').slice(1) || undefined,
        music: chunks[16].toString('utf16le') || undefined,
        mood: chunks[17].slice(-4).toString('utf16le') || undefined,
        avatar: chunks[18].toString('utf16le'),
      }
    } catch (err: unknown) {
      this.log.error(err, 'Error parsing Semagic file');
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
  }
}


