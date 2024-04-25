import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { Client } from '@serguun42/tumblr.js';
import * as TumblrSchemas from './util/tumblr-schema.js';
import { BlogSchema, BookmarkSchema, SocialMediaPostingSchema } from '@eatonfyi/schema';
import { z } from 'zod';
import { Frontmatter, FrontmatterInput, Json } from "@eatonfyi/serializers";
import { makeId, normalizeBookmarkUrl } from "../util.js";

interface TumblrImportOptions extends BaseImportOptions {
  consumer_key?: string;
  consumer_secret?: string;
  token?: string;
  token_secret?: string;
  blogList?: string[]
}

interface CachedData {
  user: z.output<typeof TumblrSchemas.UserSchema>,
  blogs: z.output<typeof TumblrSchemas.BlogSchema>[],
  posts: z.output<typeof TumblrSchemas.PostSchema>[],
}

export class TumblrImport extends BaseImport {
  declare options: TumblrImportOptions;

  constructor(options: TumblrImportOptions = {}) {
    super({
      name: 'tumblr',
      consumer_key: process.env.TUMBLR_CONSUMER_KEY ?? '',
      consumer_secret: process.env.TUMBLR_CONSUMER_SECRET ?? '',
      token: process.env.TUMBLR_TOKEN ?? '',
      token_secret: process.env.TUMBLR_TOKEN_SECRET ?? '',  
      ...options
    });
  }

  override async cacheIsFilled(): Promise<boolean> {
    const flag = this.cache.exists('user-info.json');
    return Promise.resolve(flag === 'file');
  }

  override async fillCache(): Promise<unknown> {
    const t = new Client({
      consumer_key: this.options.consumer_key,
      consumer_secret: this.options.consumer_secret,
      token: this.options.token,
      token_secret: this.options.token_secret, 
    });

    const userRaw = await t.userInfo();
    const { blogs, ...user } = TumblrSchemas.UserInfoSchema.parse(userRaw).user;
    this.cache.write('user-info.json', user, { jsonIndent: 2 });

    for (const blog of blogs ?? []) {
      if (blog.admin && blog.name) {
        const blogDir = this.cache.dir(blog.name);
        blogDir.write('blog-info.json', blog);

        const rawPosts = await t.blogPosts(blog.name);
        const { posts } = TumblrSchemas.BlogSchema.parse(rawPosts);
        
        if (typeof posts === 'number') continue;

        for (const post of posts ?? []) {
          blogDir.write(`post-${post.id}.json`, post);
        }
      }
    }

    return Promise.resolve();
  }

  override async readCache(): Promise<CachedData> {
    this.cache.setSerializer('.json', new Json());
    return Promise.resolve({
      user: this.cache.read('user-info.json', 'auto') as z.output<typeof TumblrSchemas.UserSchema>,
      blogs: this.cache.find({ matching: '*/blog-info.json' }).map(b => this.cache.read(b, 'auto') as z.output<typeof TumblrSchemas.BlogSchema>),
      posts: this.cache.find({ matching: '*/post-*.json' }).map(p => this.cache.read(p, 'auto') as z.output<typeof TumblrSchemas.PostSchema>),
    })
  }

  override async finalize(): Promise<unknown> {
    const data = await this.readCache();
    this.output.setSerializer('.md', new Frontmatter());

    for (const post of data.posts) {
      if (post.blog_name === 'eaton') continue;

      const entity: FrontmatterInput = {
        data: {
          id: { tumblr: `tb-${post.id}` },
          name: post.title,
          date: {
            created: post.timestamp ? { created: new Date(post.timestamp * 1000) } : undefined,
          },
          tags: post.tags?.length ? post.tags : [],
        },
        content: post.body ?? '',
      };

      this.output.write(`content/${post.id}.md`, entity);
    }
    
    return Promise.resolve();
  }
  
  override async process(): Promise<unknown> {

    // Generate an Organization for Tumblr
    // Generate a Blog entry for each blog I maintained
    // Generate a Bookmark for every Link entry
    // Generate an a SocialMediaPosting for each entry
    
    const data = await this.readCache();

    for (const blog of data.blogs) {
      // Special-casing this one, as "eaton, elsewhere" is actually just
      // republished pieces from other sites.
      if (blog.name === 'eaton') continue;

      if (blog.total_posts) {
        const entity = BlogSchema.parse({
          identifier: blog.name,
          name: blog.title,
          url: blog.url,
          description: blog.description,
          platform: 'organization:tumblr',
          creator: 'person/me'
        });
        this.output.write(`${makeId(entity)}.json`, entity);
        this.log.info(`Staged ${entity.type} ${entity.identifier}`);
      }
    }

    for (const post of data.posts) {
      if (post.blog_name === 'eaton') continue;

      const type = post.type ?? 'unknown';
      if (type === 'photo') {
        // Currently ignoring these
        this.log.debug(`skipping ${post.id}`);

      } else if (type === 'video') {
        // Currently ignoring these
        this.log.debug(`skipping ${post.id}`);

      } else if (type === 'link') {
        const link = normalizeBookmarkUrl(post.url ?? '');
        if (link.success) {
          const entity = BookmarkSchema.parse({
            identifier: link.hash,
            name: post.title,
            description: post.description ?? post.body,
            sharedContent: link.url.href,
            date: post.timestamp ? { created: new Date(post.timestamp * 1000) } : undefined,
            partOf: post.blog_name ? 'blog/' + post.blog_name : undefined,
            keywords: post.tags?.length ? post.tags : undefined,
          });
          this.output.write(`${makeId(entity)}.json`, entity);
          this.log.info(`Staged ${entity.additionalType ?? entity.type} ${entity.identifier}`);
        }

      } else {
        const entity = SocialMediaPostingSchema.parse({
          identifier: `tb${post.id}`,
          name: post.title,
          url: post.post_url,
          description: post.description,
          text: { html: post.body },
          date: post.timestamp ? { created: new Date(post.timestamp * 1000) } : undefined,
          partOf: post.blog_name ? 'blog/' + post.blog_name : undefined,
          keywords: post.tags?.length ? post.tags : undefined,
        });
        this.output.write(`${makeId(entity)}.json`, entity);
        this.log.info(`Staged ${entity.additionalType ?? entity.type} ${entity.identifier}`);
      }
    }

    return Promise.resolve();
  }
}
