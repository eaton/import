import 'dotenv/config';
import { Client } from '@serguun42/tumblr.js';
import * as TumblrSchemas from './schemas.js';
import jetpack from '@eatonfyi/fs-jetpack';

export interface TumblrImportOptions {
  consumer_key: string;
  consumer_secret: string;
  token: string;
  token_secret: string;
}

await retrieve();

export async function retrieve(options?: TumblrImportOptions) {
  const input = jetpack.dir(process.env.INPUT_DIR ?? 'input').dir('tumblr');
  const cache = jetpack.dir(process.env.CACHE_DIR ?? 'cache').dir('tumblr');
  const output = jetpack.dir(process.env.OUTPUT_DIR ?? 'output').dir('tumblr');

  const auth = {
    consumer_key: process.env.TUMBLR_CONSUMER_KEY ?? '',
    consumer_secret: process.env.TUMBLR_CONSUMER_SECRET ?? '',
    token: process.env.TUMBLR_TOKEN ?? '',
    token_secret: process.env.TUMBLR_TOKEN_SECRET ?? '',
    ...options ?? {}
  }

  const t = new Client(auth);

  const userInfoResponse = await t.userInfo();
  cache.remove();

  cache.write('user-raw.json', userInfoResponse as Record<string, unknown>, { jsonIndent: 2 });

  const userInfo = TumblrSchemas.UserSchema.safeParse(userInfoResponse);
  if (userInfo.success) {
    const { blogs, ...user } = userInfo.data.user;
    cache.write(`user-${user.name ?? 'parsed'}.json`, user, { jsonIndent: 2 });

    for (const blog of blogs ?? []) {
      if (blog.admin && blog.name) {
        const blogDir = cache.dir(blog.name);
        blogDir.write('blog-info.json', blog);

        const blogDetails = await t.blogPosts(blog.name);
        const parsed = TumblrSchemas.BlogSchema.safeParse(blogDetails);
        
        if (parsed.success) {
          if (Array.isArray(parsed.data.posts)) {
            for (const post of parsed.data.posts ?? []) {
              const parsedPost = TumblrSchemas.PostSchema.safeParse(post);
              if (parsedPost.success) {
                blogDir.write(`post-${post.id_string}.json`, parsedPost);
              } else {
                console.log(parsedPost.error);
              }
            }
          }
        } else {
          console.log(parsed.error);
        }
      }
    }
  } else {
    console.log(userInfo.error);
  }
}