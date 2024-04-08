/* eslint-disable perfectionist/sort-objects */
import {bigint, datetime, int, longtext, mediumtext, mysqlTable, text, tinytext, varchar} from 'drizzle-orm/mysql-core';

// Blog posts
export const posts = mysqlTable('wp_posts', {
  id: bigint('ID', { mode: 'bigint'}).primaryKey(),
  author: bigint('post_author', { mode: 'bigint'}).references(() => users.id).notNull(),
  date: datetime('post_date').notNull(),
  dateGmt: datetime('post_date_gmt').notNull(),
  content: longtext('post_content').notNull(),
  title: text('post_content').notNull(),
  excerpt: longtext('post_excerpt').notNull(),
  status: varchar('post_status', { length: 20 }).notNull(),
  commentStatus: varchar('comment_status', { length: 20 }).notNull(),
  ping: varchar('ping_status', { length: 20 }).notNull(),
  password: varchar('post_password', { length: 255 }).notNull(),
  slug: varchar('post_name', { length: 200 }).notNull(),
  toPing: text('to_ping').notNull(),
  pinged: text('pinged').notNull(),
  modified: datetime('post_modified').notNull(),
  modifiedGmt: datetime('post_modified_gmt').notNull(),
  contentFiltered: longtext('post_content_filtered').notNull(),
  parent: bigint('post_parent', { mode: 'bigint'}).notNull(),
  guid: varchar('guid', { length: 255 }).notNull(),
  menuOrder: int('menu_order').notNull(),
  type: varchar('post_type', { length: 20 }).notNull(),
  mime: varchar('post_mime_type', { length: 100 }).notNull(),
  commentCount: bigint('comment_count', { mode: 'bigint'}).notNull(),
});

// Site users
export const users = mysqlTable('wp_users', {
  id: bigint('ID', { mode: 'bigint'}).primaryKey(),
  login: varchar('user_login', { length: 60 }).notNull(),
  password: varchar('user_pass', { length: 255 }).notNull(),
  niceName: varchar('user_nicename', { length: 50 }).notNull(),
  displayName: varchar('user_nicename', { length: 250 }).notNull(),
  email: varchar('user_email', { length: 50 }).notNull(),
  url: varchar('user_url', { length: 50 }).notNull(),
  registered: datetime('user_registered').notNull(),
  activationKey: varchar('user_actiation_key', { length: 255 }).notNull(),
  status: int('user_status').notNull(),
});

// Indiviual taxonomy terms.
export const terms = mysqlTable('wp_terms', {
  id: bigint('term_id', { mode: 'bigint'}).primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  slug: varchar('slug', { length: 200 }).notNull(),
  group: int('term_group').notNull(),
  order: int('term_order').notNull(),
});

// Taxonomy name and description per term
export const termTaxonomy = mysqlTable('wp_term_taxonomy', {
  termId: bigint('term_taxonomy_id', { mode: 'bigint'}).references(() => terms.id).notNull(),
  taxonomy: varchar('name', { length: 32 }).notNull(),
  description: longtext('description').notNull(),
  parentId: bigint('parent', { mode: 'bigint'}).notNull(),
  count: int('count').notNull(),
});

// Connects Term to Post, User, Link, etc.
export const termRelationships = mysqlTable('wp_term_relationships', {
  termId: bigint('term_taxonomy_id', { mode: 'bigint'}).references(() => terms.id).notNull(),
  objectId: bigint('object_id', { mode: 'bigint'}).notNull(),
  order: int('term_order').notNull(),
});

export const comments = mysqlTable('wp_comments', {
  id: bigint('comment_ID', { mode: 'bigint'}).primaryKey(),
  postId: bigint('comment_post_ID', { mode: 'bigint'}).notNull(),
  author: tinytext('comment_author').notNull(),
  authorEmail: varchar('comment_author_email', { length: 100 }).notNull(),
  authorUrl: varchar('comment_author_url', { length: 200 }).notNull(),
  authorIp: varchar('comment_author_ip', { length: 100 }).notNull(),
  date: datetime('comment_date').notNull(),
  dateGmt: datetime('comment_date_gmt').notNull(),
  content: longtext('comment_content').notNull(),
  karma: int('comment_karma').notNull(),
  approved: varchar('comment_approved', { length: 20 }).notNull(),
  agent: varchar('comment_agent', { length: 255 }).notNull(),
  type: varchar('comment_type', { length: 20 }).notNull(),
  parent: bigint('comment_parent', { mode: 'bigint'}).notNull(),
  userId: bigint('user_id', { mode: 'bigint'}).notNull(),
});

// Sitewide configuration options
export const options = mysqlTable('wp_options', {
  id: bigint('option_id', { mode: 'bigint'}).primaryKey(),
  name: varchar('option_name', { length: 191 }).notNull(),
  value: longtext('option_value').notNull(),
  autoload: varchar('slug', { length: 20 }).notNull(),
});

// Sitewide configuration options
export const links = mysqlTable('wp_links', {
  id: bigint('link_id', { mode: 'bigint'}).primaryKey(),
  url: varchar('link_url', { length: 255 }).notNull(),
  name: varchar('link_name', { length: 255 }).notNull(),
  image: varchar('link_image', { length: 255 }).notNull(),
  target: varchar('link_target', { length: 25 }).notNull(),
  category: bigint('link_category', { mode: 'bigint'}).notNull(),
  description: varchar('link_description', { length: 255 }).notNull(),
  visible: varchar('link_visible', { length: 20 }).notNull(),
  owner: bigint('link_owner', { mode: 'bigint'}).references(() => users.id).notNull(),
  rating: int('link_rating').notNull(),
  updated: datetime('link_updated').notNull(),
  rel: varchar('link_rel', { length: 255 }).notNull(),
  notes: mediumtext('link_notes').notNull(),
  rss: varchar('link_rss', { length: 255 }).notNull(),
  order: int('link_owner'),
});

export function wpMetaTable(entity: string) {
  return mysqlTable(`${entity}meta`, {
    id: int('meta_id').primaryKey(),
    itemId: int(`${entity}_id`).notNull(),
    key: varchar('meta_key', {length: 255}),
    value: longtext('meta_value'),
  });
}

export const postMeta = wpMetaTable('post');
export const termMeta = wpMetaTable('term');
export const userMeta = wpMetaTable('user');
export const commentMeta = wpMetaTable('comment');
