/* eslint-disable perfectionist/sort-objects */
import {int, longtext, mysqlTable, varchar} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  uid: int('uid').primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  pass: varchar('pass', { length: 32 }).notNull(),
  mail: varchar('mail', { length: 64 }).notNull(),
  signature: varchar('signature', { length: 255 }).notNull(),
  theme: varchar('theme', { length: 255 }).notNull(),
  created: int('created').notNull(),
  access: int('access').notNull(),
  mode: int('mode').notNull(),
  login: int('login').notNull(),
  status: int('status').notNull(),
  timezone: varchar('timezone', { length: 8 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
  picture: int('picture').notNull(),
  init: varchar('init', { length: 254 }).notNull(),
  data: longtext('data'),
});

export const node = mysqlTable('node', {
  nid: int('nid').primaryKey(),
  vid: int('vid').references(() => revision.vid).notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  uid: int('uid').notNull().references(() => users.uid),
  status: int('status').notNull(),
  created: int('created').notNull(),
  changed: int('changed').notNull(),
  comment: int('comment').notNull(),
  promote: int('promote').notNull(),
  moderate: int('moderate').notNull(),
  sticky: int('sticky').notNull(),
  tnid: int('tnid').notNull(),
  translate: int('translate').notNull(),
});

export const revision = mysqlTable('node_revisions', {
  nid: int('nid').notNull(),
  vid: int('vid').primaryKey(),
  uid: int('uid').notNull().references(() => users.uid),
  title: varchar('title', { length: 255 }).notNull(),
  body: longtext('body').notNull(),
  teaser: longtext('teaser').notNull(),
  log: longtext('log').notNull(),
  format: int('format').notNull(),
  timestamp: int('timestamp').notNull(),
});

export const filterFormat = mysqlTable('filter_formats', {
  format: varchar('format', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  roles: varchar('roles', { length: 255 }).notNull(),
  cache: int('sticky').notNull()
});

export const comment = mysqlTable('comments', {
  cid: int('cid').primaryKey(),
  pid: int('pid').notNull(),
  nid: int('nid').references(() => node.nid).notNull(),
  uid: int('uid').notNull().references(() => users.uid).notNull(),
  subject: varchar('subject', { length: 64 }).notNull(),
  comment: longtext('comment').notNull(),
  hostname: varchar('hostname', { length: 128 }).notNull(),
  timestamp: int('timestamp').notNull(),
  status: int('status').notNull(),
  thread: varchar('thread', { length: 255 }).notNull(),
  name: varchar('name', { length: 60 }),
  mail: varchar('mail', { length: 64 }),
  homepage: varchar('homepage', { length: 255 }),
});

export const upload = mysqlTable('upload', {
  fid: int('fid').references(() => files.fid).notNull(),
  nid: int('nid').notNull(),
  vid: int('vid').references(() => node.vid).notNull(),
  description: varchar('subject', { length: 255 }).notNull(),
  weight: int('weight').notNull(),
});

export const files = mysqlTable('files', {
  fid: int('fid').notNull(),
  uid: int('uid').notNull(),
  status: int('status').notNull(),
  path: varchar('filepath', { length: 255 }).notNull(),
  mime: varchar('filemime', { length: 255 }).notNull(),
  name: varchar('filename', { length: 255 }).notNull(),
  size: int('filesize').notNull(),
  timestamp: int('timestamp').notNull(),
});

export const urlAlias = mysqlTable('url_alias', {
  pid: int('pid').primaryKey(),
  source: varchar('src', { length: 128 }).notNull(),
  alias: varchar('dst', { length: 128 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
});


export type DrupalNode = typeof node.$inferSelect;