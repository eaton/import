import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { type InferSelectModel } from 'drizzle-orm';
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { Frontmatter, FrontmatterInput, Json } from "@eatonfyi/serializers";
import { BlogSchema, BookmarkSchema, SocialMediaPostingSchema, Thing } from '@eatonfyi/schema';
import { autop, fromText, fromTextile, toMarkdown } from "@eatonfyi/html";

import {
  author,
  blog,
  category,
  comment,
  entry,
  pluginData
} from './util/mt-database.js'
import jetpack from "@eatonfyi/fs-jetpack";

interface MovableTypeImortOptions extends BaseImportOptions {
  mysql_host?: string;
  mysql_port?: number;
  mysql_user?: string;
  mysql_pass?: string;
  mysql_db?: string;
  blogList?: number[],
  userList?: number[],
}

interface CachedData {
  authors: InferSelectModel<typeof author>[],
  blogs: InferSelectModel<typeof blog>[],
  categories: InferSelectModel<typeof category>[],
  entries: InferSelectModel<typeof entry>[],
  comments: InferSelectModel<typeof comment>[],
  plugins: InferSelectModel<typeof pluginData>[],
}

export class MovableTypeImport extends BaseImport {
  declare options: MovableTypeImortOptions;

  constructor(options: MovableTypeImortOptions = {}) {
    super({
      name: 'movabletype',
      mysql_host: process.env.MYSQL_HOST ?? '192.168.88.119',
      mysql_port: process.env.MYSQL_PORT ?? 3306,
      mysql_user: process.env.MYSQL_USER ?? 'root',
      mysql_pass: process.env.MYSQL_PASS,
      mysql_db: process.env.MYSQL_DB,
      ...options
    });
  }

  override async cacheIsFilled(): Promise<boolean> {
    const flag = this.cache.exists('plugin-data.json');
    return Promise.resolve(flag === 'file');
  }

  override async fillCache(): Promise<unknown> {
    const connection = await mysql.createConnection({
      database: this.options.mysql_db,
      host: this.options.mysql_host,
      password: this.options.mysql_pass,
      user: this.options.mysql_user,
    });
    const db = drizzle(connection);
  
    this.cache.write('plugin-data.json', await db.select().from(pluginData));
    this.cache.write('authors.json', await db.select().from(author));
    this.cache.write('categories.json', await db.select().from(category));
    this.cache.write('blogs.json', await db.select().from(blog));
    this.cache.write('entries.json', await db.select().from(entry));
    this.cache.write('comments.json', await db.select().from(comment));

    connection.destroy();

    return Promise.resolve();
  }

  override async readCache(): Promise<CachedData> {
    return Promise.resolve({
      authors: this.cache.read('authors.json', 'jsonWithDates'),
      blogs: this.cache.read('blogs.json', 'jsonWithDates'),
      categories: this.cache.read('categories.json', 'jsonWithDates'),
      entries: this.cache.read('entries.json', 'jsonWithDates'),
      comments:this.cache.read('comments.json', 'jsonWithDates'),
      plugins: this.cache.read('plugins.json', 'jsonWithDates')
    });
  }

  override async finalize(): Promise<unknown> {
    const data = await this.readCache();
    this.output.setSerializer(".md", new Frontmatter());
    
    for (const entry of data.entries) {
      if (this.options.userList && !this.options.userList.includes(entry.authorId)) continue;
      if (entry.text === null) continue;

      const md = this.entryToMarkdown(entry);
      this.output.dir('content').write(`${entry.created.getFullYear()}/mt-${entry.id}.md`, md);
    }
    
    jetpack.copy(this.input.path('files'), this.output.path('media/mt'));
    return Promise.resolve();
  }


  protected entryToMarkdown(input: InferSelectModel<typeof entry>) {
    let body = input.text ?? '';

    if (input.more && input.more.trim().length > 0) {
      body += entry.more;
    }

    if (input.format === 'textile_2') {
      body = toMarkdown(fromTextile(body));
    } else {
      body = toMarkdown(autop(body, false));
    }

    const md: FrontmatterInput = {
      data: {
        date: {
          created: input.created,
          modified: input.modified,
        },
        id: { mt: input.id },
      },
      content: body
    };

    if (input.title) md.data.name = input.title;
    if (input.basename) md.data.slug = input.basename;
    if (input.keywords && input.keywords.length) md.data.tags = input.keywords;

    return md;
  }

  async oldProcess(): Promise<unknown> {
    const data = await this.readCache();

    // Generate an Organization for SixApart
    // Generate a SoftwareProduct for MovableType
    // Generate a Blog entry for each blog I maintained
    // Generate an a SocialMediaPosting for each entry
    // Generate a Comment for each reply to one of my posts
    // Generate a Bookmark for every blogroll entry

    for (const entry of data.entries) {
      if (this.options.userList && !this.options.userList.includes(entry.authorId)) continue;
      if (entry.text === null) continue;

      let body = entry.text;
      let summary: string | undefined;

      if (entry.excerpt && entry.excerpt.trim().length > 0) {
        summary = entry.excerpt;
      }

      if (entry.more && entry.more.trim().length > 0) {
        if (summary) {
          body += entry.more;
        } else {
          summary = entry.text;
          body += entry.more;
        }
      }

      if (entry.format === 'textile_2') {
        // body = fromTextile(body);
        this.log.debug('Borked textile parsing');
      }

      const entity = SocialMediaPostingSchema.parse({
        identifier: `mt${entry.id}`,
        name: entry.title,
        description: summary,
        text: { html: body },
        date: {
          created: new Date(entry.created),
          modified: new Date(entry.modified),
        },
        partOf: 'blog/mt-' + entry.blogId,
      });

      this.output.dir(entity.additionalType ?? entity.type).write(`${entity.identifier}.json`, entity);
      this.log.info(`Staged ${entity.additionalType ?? entity.type} ${entity.identifier}`);
    }

    return Promise.resolve();
  }
}
