/* eslint-disable perfectionist/sort-objects */
import {int, mysqlTable, text, timestamp, tinyint, varchar, mediumtext} from 'drizzle-orm/mysql-core';

export const author = mysqlTable('mt_author', {
  id: int('author_id').primaryKey(),
  name: varchar('author_name', { length: 50 }).notNull(),
  type: tinyint('author_type').notNull(),
  nickname: varchar('author_nickname', { length: 50 }),
  email: varchar('author_email', { length: 60 }),
  url: varchar('author_url', { length: 255 }),
});

export const blog = mysqlTable('mt_blog', {
  id: int('blog_id').primaryKey(),
  name: varchar('blog_name', { length: 255 }).notNull(),
  description: text('blog_description'),
  path: varchar('blog_site_path', { length: 255 }),
  url: varchar('blog_site_url', { length: 255 }),
  archive: varchar('blog_archive_url', { length: 255 }),
  extension: varchar('blog_file_extension', { length: 10 }),
  welcome: text('blog_welcome_msg'),
});

export const category = mysqlTable('mt_category', {
  id: int('category_id').primaryKey(),
  blogId: int('category_blog_id').references(() => blog.id),
  authorId: int('category_author_id').references(() => author.id),
  label: varchar('category_label', { length: 100 }).notNull(),
  description: text('category_description'),
  parentId: int('category_parent'),
});

export const entry = mysqlTable('mt_entry', {
  id: int('entry_id').primaryKey(),
  blogId: int('entry_blog_id').references(() => blog.id).notNull(),
  status: int('entry_status').notNull(),
  authorId: int('entry_author_id').references(() => author.id).notNull(),
  categoryId: int('entry_category_id').references(() => category.id).notNull(),
  title: varchar('entry_title', { length: 255 }),
  format: varchar('entry_convert_breaks', { length: 30 }),
  excerpt: text('entry_excerpt'),
  text: text('entry_text'),
  keywords: text('entry_keywords'),
  more: text('entry_text_more'),
  basename: varchar('entry_basename', { length: 50 }),
  created: timestamp('entry_created_on').notNull(),
  modified: timestamp('entry_modified_on').notNull()
});

export const comment = mysqlTable('mt_comment', {
  id: int('comment_id').primaryKey(),
  blogId: int('comment_blog_id').references(() => blog.id).notNull(),
  entryId: int('comment_entry_id').references(() => entry.id).notNull(),
  ip: varchar('comment_ip', { length: 16 }),
  author: varchar('comment_author', { length: 100 }),
  authorId: int('comment_commenter_id').references(() => author.id),
  email: varchar('comment_email', { length: 75 }),
  url: varchar('comment_url', { length: 255 }),
  visible: int('comment_visible'),
  text: text('comment_text'),
  created: timestamp('comment_created_on').notNull(),
  modified: timestamp('comment_modified_on')
});

export const pluginData = mysqlTable('mt_plugindata', {
  id: int('plugindata_id').primaryKey(),
  plugin: varchar('plugindata_plugin', { length: 50 }).notNull(),
  key: varchar('plugindata_key', { length: 255 }).notNull(),
  data: mediumtext('plugindata_data'),
});
