import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { extract, ExtractTemplateObject, fromLivejournal, toMarkdown, autop } from "@eatonfyi/html";
import { Frontmatter, FrontmatterInput } from "@eatonfyi/serializers";
import { z } from 'zod';
import { parse as parseDate, isBefore} from '@eatonfyi/dates';
import { parseSemagicFile } from "./util/parse-semagic.js";

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
        try {
          const entry = parseSemagicFile(raw);
          if (entry) {
            this.cache.write(`${entry.date?.getFullYear()}/${entry.id}.json`, entry);
          }  
        } catch (err: unknown) {
          this.log.error({ err, file }, 'Error parsing Semagic file');
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
        body: fromLivejournal(entry.body ?? '', { breaks: true, usernames: true }),
        teaser: fromLivejournal(entry.body ?? '', { breaks: true, usernames: true, teaser: true }),
      }
      this.queue.entries.push(formattedEntry);

      if (!this.options.ignoreComments) {
        for (const comment of comments ?? []) {
          comment.entry = entry.id;
          this.queue.comments.push(comment);
        }
      }
    }
  }

  override async finalize() {
    this.output.setSerializer('.md', new Frontmatter());
    for (const e of this.queue.entries) {
      this.output.write(`content/${e.date.getFullYear()}/lj-${e.id}.md`, this.entryToMarkdown(e));
    }
    this.input.copy('media/lj-photos', this.output.path('media/lj'), { overwrite: true });
  }

  protected entryToMarkdown(input: LivejournalEntry) {
    input.body &&= toMarkdown(autop(input.body, false));
    const md: FrontmatterInput = {
      data: {
        date: { created: input.date },
        id: { lj: input.id },
      },
      content: input.body ?? ''
    };

    if (input.subject) md.data.name = input.subject;
    if (input.mood) md.data.mood = input.mood;
    if (input.music) md.data.music = input.music;
    if (input.avatar) md.data.avatar = input.avatar;
    if (input.comments?.length) md.data.comments = input.comments.length;

    return md;
  }
}


