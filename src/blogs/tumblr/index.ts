import { BaseImport, BaseImportOptions } from "../../base-importer.js";
import { Client } from '@serguun42/tumblr.js';
import * as TumblrSchemas from './schemas.js';

interface TumblrImportOptions extends BaseImportOptions {
  consumer_key?: string;
  consumer_secret?: string;
  token?: string;
  token_secret?: string;
}

export class TumblrImport extends BaseImport {
  declare options: TumblrImportOptions;

  constructor(options: TumblrImportOptions) {
    super({
      name: 'tumblr',
      consumer_key: process.env.TUMBLR_CONSUMER_KEY ?? '',
      consumer_secret: process.env.TUMBLR_CONSUMER_SECRET ?? '',
      token: process.env.TUMBLR_TOKEN ?? '',
      token_secret: process.env.TUMBLR_TOKEN_SECRET ?? '',  
      ...options
    });
  }

  override async populate(): Promise<unknown> {
    if (this.cache.exists('user-info.json')) {
      return Promise.resolve();
    }

    const t = new Client({
      consumer_key: this.options.consumer_key,
      consumer_secret: this.options.consumer_secret,
      token: this.options.token,
      token_secret: this.options.token_secret, 
    });

    const userInfoResponse = await t.userInfo();
    const userInfo = TumblrSchemas.UserSchema.parse(userInfoResponse);

    this.cache.write('user-info.json', { ...userInfo, timestamp: Date.now() }, { jsonIndent: 2 });
    const { blogs, ...user } = userInfo.user;

    for (const blog of blogs ?? []) {
      if (blog.admin && blog.name) {
        const blogDir = this.cache.dir(blog.name);
        blogDir.write('blog-info.json', blog);

        const blogDetails = await t.blogPosts(blog.name);
        const parsed = TumblrSchemas.BlogSchema.parse(blogDetails);
        
        if (Array.isArray(parsed.posts)) {
          for (const post of parsed.posts ?? []) {
            const parsedPost = TumblrSchemas.PostSchema.safeParse(post);
            blogDir.write(`post-${post.id_string}.json`, parsedPost);
          }
        }
      }
    }
  }
}