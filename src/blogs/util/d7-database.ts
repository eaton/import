/* eslint-disable perfectionist/sort-objects */
import {int, longtext, mediumtext, mysqlTable, text, tinyint, varchar} from 'drizzle-orm/mysql-core';

export const users = mysqlTable('users', {
  uid: int('uid').primaryKey(),
  name: varchar('name', { length: 60 }).notNull(),
  pass: varchar('pass', { length: 128 }).notNull(),
  theme: varchar('theme', { length: 255 }).notNull(),
  signatureFormat: varchar('signature_format', { length: 255 }).notNull(),
  created: int('created').notNull(),
  access: int('access').notNull(),
  login: int('login').notNull(),
  status: int('status').notNull(),
  timezone: varchar('timezone', { length: 32 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
  picture: int('picture').notNull(),
  init: varchar('init', { length: 254 }).notNull()
});

export const node = mysqlTable('node', {
  nid: int('nid').primaryKey(),
  vid: int('vid').notNull(),
  type: varchar('type', { length: 32 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  uid: int('uid').notNull().references(() => users.uid),
  status: int('status').notNull(),
  created: int('created').notNull(),
  changed: int('changed').notNull(),
  comment: int('comment').notNull(),
  promote: int('promote').notNull(),
  sticky: int('sticky').notNull(),
  tnid: int('tnid').notNull(),
  translate: int('translate').notNull(),
});

export const filterFormat = mysqlTable('filter_format', {
  format: varchar('format', { length: 255 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  cache: int('sticky').notNull(),
  status: int('sticky').notNull(),
  weight: int('sticky').notNull(),
});

export const comment = mysqlTable('comment', {
  cid: int('cid').primaryKey(),
  pid: int('pid').notNull(),
  nid: int('nid').references(() => node.nid).notNull(),
  uid: int('uid').notNull().references(() => users.uid).notNull(),
  subject: varchar('subject', { length: 64 }).notNull(),
  hostname: varchar('hostname', { length: 128 }).notNull(),
  changed: int('changed').notNull(),
  status: int('status').notNull(),
  thread: varchar('thread', { length: 255 }).notNull(),
  name: varchar('name', { length: 60 }),
  mail: varchar('mail', { length: 64 }),
  homepage: varchar('homepage', { length: 255 }),
  language: varchar('language', { length: 12 }).notNull(),
  created: int('created').notNull(),
});

export const commentStatistics = mysqlTable('node_comment_statistics', {
  nid: int('nid').primaryKey().references(() => node.nid),
  cid: int('cid').notNull(),
  timestamp: int('last_comment_timestamp').notNull(),
  name: varchar('last_comment_name', {length: 60}).notNull(),
  uid: int('last_comment_uid').notNull(),
  commentCount: int('comment_count').notNull(),
});

export const fileManaged = mysqlTable('file_managed', {
  fid: int('fid').primaryKey(),
  uid: int('uid').notNull(),
  filename: varchar('filename', { length: 255 }).notNull(),
  uri: varchar('uri', { length: 255 }).notNull(),
  filesize: int('filesize').notNull(),
  filemime: varchar('filemime', { length: 255 }).notNull(),
  status: tinyint('status').notNull(),
  int: int('int').notNull(),
});

export const urlAlias = mysqlTable('url_alias', {
  pid: int('pid').primaryKey(),
  source: varchar('source', { length: 255 }).notNull(),
  alias: varchar('alias', { length: 255 }).notNull(),
  language: varchar('language', { length: 12 }).notNull(),
});

export function fieldApiField() {
  return {
    entityType: varchar('entity_type', { length: 128 }).notNull(),
    bundle: varchar('bundle', { length: 128 }).notNull(),
    deleted: int('deleted').notNull(),
    entityId: int('entity_id'),
    revisionId: int('revision_id'),
    language: varchar('language', { length: 32 }).notNull(),
    delta: int('delta').notNull()
  }
}

export function textSummaryField(tableName: string, fieldPrefix = '') {
  return mysqlTable(tableName, {
    ...fieldApiField(),
    value: longtext(fieldPrefix + 'value',),
    summary: longtext(fieldPrefix + 'summary'),
    format: varchar(fieldPrefix + 'format', { length: 255 }),
  });
}

export function textLongField(tableName: string, fieldPrefix = '') {
  return mysqlTable(tableName, {
    ...fieldApiField(),
    value: longtext(fieldPrefix + 'value',),
    format: varchar(fieldPrefix + 'format', { length: 255 }),
  });
}

export function fileField(tableName: string, fieldPrefix = '') {
  return mysqlTable(tableName, {
    ...fieldApiField(),
    fid: int(fieldPrefix + 'fid').references(() => fileManaged.fid),
    display: longtext(fieldPrefix + 'display'),
    description: text(fieldPrefix + 'description'),
  });
}

export function linkField(tableName: string, fieldPrefix = '') {
  return mysqlTable(tableName, {
    ...fieldApiField(),
    url: varchar(fieldPrefix + 'url', {length: 2048}),
    title: varchar(fieldPrefix + 'title', {length:255}),
    attributes: mediumtext(fieldPrefix + 'attributes'),
  });
}

export const nodeUpload = fileField('field_data_upload', 'upload_');
export const nodeBody = textSummaryField('field_data_body', 'body_');
export const commentBody = textSummaryField('field_data_comment_body', 'comment_body_');

export type DrupalNode = typeof node.$inferSelect;