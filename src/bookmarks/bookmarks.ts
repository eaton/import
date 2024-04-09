import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { Bookmark, BookmarkSchema } from '@eatonfyi/schema';
import { z } from 'zod';
import { Json, Csv, NdJson } from "@eatonfyi/serializers";
import { extract } from "@eatonfyi/html";
import { normalizeBookmarkUrl } from "../util.js";
import jetpack from "@eatonfyi/fs-jetpack";
import MDBReader from "mdb-reader";

export class BookmarkImport extends BaseImport {
  constructor(options: BaseImportOptions = {}) {
    super({
      name: 'bookmarks',
      ...options,
    });
  }

  bookmarks = new Map<string, Bookmark>();

  setBookmark(b?: Bookmark) {
    if (b === undefined) return;
    
    if (this.bookmarks.has(b.identifier)) {
      this.log.info(`Rejected ${b.partOf}: ${b.sharedContent}`);
    } else {
      this.bookmarks.set(b.identifier, b);
    }
  }

  override async process(): Promise<unknown> {
    jetpack.setSerializer('.csv', new Csv());
    jetpack.setSerializer('.json', new Json());
    jetpack.setSerializer('.ndjson', new NdJson());

    (await favorites(this.input.path('favorites.html'))).map(b => this.setBookmark(b));
    predicate().map(b => this.setBookmark(b));
    havana().map(b => this.setBookmark(b));
    delicious(this.input.path('delicious.json')).map(b => this.setBookmark(b));
    pinboard(this.input.path('pinboard.json')).map(b => this.setBookmark(b));
    instapaper(this.input.path('instapaper.csv')).map(b => this.setBookmark(b));
    (await pocket(this.input.path('getpocket.html'))).map(b => this.setBookmark(b));

    const deduped = [...this.bookmarks.values()];
    this.output.write('bookmarks.ndjson', deduped);

    return Promise.resolve();
  }
}

export const instapaper = (filePath: string) => {
  const raw = jetpack.read(filePath, 'auto');

  const parsed = z.array(z.object({
    URL: z.string(),
    Title: z.string().optional(),
    Timestamp: z.coerce.number().transform(t => new Date(t * 1000))
  })).parse(raw);

  return parsed.map(link => {
    const normalized = normalizeBookmarkUrl(link.URL);
    if (normalized.success) {
      return BookmarkSchema.parse({
        identifier: normalized.hash,
        partOf: 'instapaper',
        sharedContent: normalized.url.href,
        name: link.Title,
        date: { created: link.Timestamp } ,
      });
    }
  }).filter(b => b !== undefined);
}

export const pinboard = (filePath: string) => {
  const data = jetpack.read(filePath);
  const json = typeof data === 'string' ? JSON.parse(data) : data;

  const parsed = z.array(z.object({
    href: z.string(),
    description: z.string().optional(),
    extended: z.string().optional(),
    time: z.coerce.date(),
    tags: z.string().optional().transform(s => s ? s.toLocaleLowerCase().split(/\s+/): undefined)
  })).parse(json);

  return parsed.map(link => {
    const normalized = normalizeBookmarkUrl(link.href);
    if (normalized.success) {
      return BookmarkSchema.parse({
        identifier: normalized.hash,
        partOf: 'pinboard',
        sharedContent: normalized.url.href,
        name: link.description,
        description: link.extended,
        date: { created: link.time } ,
        keywords: link.tags,
      });
    }
  }).filter(b => b !== undefined);
}

export const delicious = (filePath: string) => {
  const data = jetpack.read(filePath);
  const json = typeof data === 'string' ? JSON.parse(data) : data;

  const parsed = z.array(z.object({
    href: z.string(),
    description: z.string().optional(),
    extended: z.string().optional(),
    created: z.number(),
    tags: z.array(z.string()).optional()
  })).parse(json);
  
  return parsed.map(link => {
    const normalized = normalizeBookmarkUrl(link.href);
    if (normalized.success) {
      return BookmarkSchema.parse({
        identifier: normalized.hash,
        partOf: 'delicious',
        sharedContent: normalized.url.href,
        name: link.description,
        description: link.extended,
        date: { created: new Date(link.created * 1000) } ,
        keywords: link.tags,
      });
    }
  }).filter(b => b !== undefined);
}

export const pocket = async (filePath: string) => {
  const html = jetpack.read(filePath) ?? '';

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
  
  const output = await extract(html, template, schema);

  return Promise.resolve(output.map(link => {
    const normalized = normalizeBookmarkUrl(link.url);
    if (normalized.success) {
      return BookmarkSchema.parse({
        identifier: normalized.hash,
        partOf: 'pocket',
        sharedContent: normalized.url.href,
        name: link.name,
        date: { created: link.date } ,
        keywords: link.tags,
      });
    }
  }).filter(b => b !== undefined));
}

export const favorites = async (filePath: string) => {
  const html = jetpack.read(filePath) ?? '';

  const fileDate = jetpack.inspect(filePath)?.modifyTime;

  const template = [{
    $: 'body > dl > dt > a',
    url: '$ | attr:href',
    name: '$ | text',
    date: '$ | attr:ADD_DATE',
  }];
  
  const schema = z.array(z.object({
    url: z.string(),
    name: z.string().optional().transform(n => n ? n.replace('�', '…') : undefined),
    date: z.unknown().optional(),
  }));

  const output = await extract(html, template, schema);

  return Promise.resolve(output.map(link => {
    const normalized = normalizeBookmarkUrl(link.url);
    if (normalized.success) {
      return BookmarkSchema.parse({
        identifier: normalized.hash,
        partOf: 'favorites.html',
        sharedContent: normalized.url.href,
        name: link.name,
        date: link.date ? { created: link.date ?? fileDate } : undefined,
      });
    }
  }).filter(b => b !== undefined));
}

function havana() {
  const input = jetpack.dir(process.env.INPUT_MDB ?? '');
  const reader = new MDBReader(input.read('havana.mdb', 'buffer') as Buffer);

  // In the future we could spread these between create and modification.
  let created = reader.getCreationDate() ?? undefined;
  created ??= input.inspect('havana.mdb')?.modifyTime;


  const table = reader.getTable('Link');
  const categories = reader.getTable('Category').getData();
  const linkTags = reader.getTable('LinkCategory').getData();

  const links = table.getData().map(link => {
    if (link.url) {
      const normalized = normalizeBookmarkUrl(link.url.toString());
      if (normalized.success) {
        return BookmarkSchema.parse({
          identifier: normalized.hash,
          partOf: 'havanamod',
          description: link.summary?.toString().length ? link.summary : undefined,
          sharedContent: normalized.url.href,
          name: link.title?.toString().length ? link.title : undefined,
          date: created ? { created } : undefined,
        });
      }
    }
  });
  return links.filter(l => !!l);
}

function predicate() {
  const input = jetpack.dir(process.env.INPUT_MDB ?? '');
  const reader = new MDBReader(input.read('predicate.mdb', 'buffer') as Buffer);

  // In the future we could spread these between create and modification.
  let created = reader.getCreationDate() ?? undefined;
  created ??= input.inspect('predicate.mdb')?.modifyTime;

  const table = reader.getTable('link');
  const links = table.getData().map(link => {
    if (link.url) {
      const normalized = normalizeBookmarkUrl(link.url.toString());
      if (normalized.success) {
        return BookmarkSchema.parse({
          identifier: normalized.hash,
          partOf: 'predicatenet',
          sharedContent: normalized.url.href,
          name: link.title?.toString().length ? link.title : undefined,
          date: created ? { created } : undefined,
        });
      }
    }
  });
  return links.filter(l => !!l);
}