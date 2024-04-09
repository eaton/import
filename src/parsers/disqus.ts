import { extract, ExtractTemplateObject } from '@eatonfyi/html';
import { z } from 'zod';
import { PathLike } from 'fs';
import fs from 'fs/promises';

const authorTemplate: ExtractTemplateObject = {
  $: '> author',
  name: '> name | text',
  isAnonymous: '> isAnonymous',
  username: '> username | text',
}

const template: ExtractTemplateObject = {
  categories: [{
    $: 'disqus > category',
    did: '| attr:dsq\:id',
    title: '> title',
    isDefault: '> isDefault'
  }],

  threads: [{
    $: 'disqus > thread',
    did: '| attr:dsq\:id',
    id: '> id',
    forum: '> forum',
    category: '> category | attr:dsq\:id',
    link: '> link',
    title: '> title',
    message: '> message',
    createdAt: '> createdAt',
    author: authorTemplate,
    isClosed: '> isClosed',
    isDeleted: '> isDeleted',
  }],

  posts: [{
    $: 'disqus > post',
    did: '| attr:dsq\:id',
    id: '> id',
    message: '> message',
    createdAt: '> createdAt',
    isDeleted: '> isDeleted',
    isSpam: '> isSpam',
    author: authorTemplate,
    thread: '> thread | attr:dsq\:id',
    parent: '> parent | attr:dsq\:id',
  }]
}

const optionalString = z.string().nullable().optional().transform(s => {
  if (s === null || s === undefined || s.trim().length === 0) return undefined;
  return s;
});

const optionalNumber =  z.string().optional().transform(s => {
  if (s === undefined || s.trim().length === 0) return undefined;
  return Number.parseInt(s);
});

const optionalDate =  z.string().optional().transform(s => {
  if (s === undefined || s.trim().length === 0) return undefined;
  return new Date(s);
});

const cDataMessage = z.string().nullable().optional().transform(s => {
  if (s === null || s === undefined || s.trim().length === 0) return undefined;
  return s.replace('<message>', '').replace('</message>', '').trim();
});

const authorSchema = z.object({
  name: z.string().optional(),
  isAnonymous: z.string().transform(a => a === 'true'),
  username: z.string().optional(),
});

const schema = z.object({
  categories: z.array(z.object({
    did: z.coerce.number(),
    title: z.string(),
    isDefault: z.coerce.boolean()
  })),

  threads: z.array(z.object({
    did: z.coerce.number(),
    id: optionalString,
    forum: optionalString,
    category: optionalNumber,
    link: optionalString,
    title: optionalString,
    message: cDataMessage,
    createdAt: optionalDate,
    author: authorSchema.optional(),
    isClosed: z.coerce.boolean(),
    isDeleted: z.coerce.boolean(),
  })),

  posts: z.array(z.object({
    did: z.coerce.number(),
    id: optionalString,
    message: cDataMessage,
    createdAt: optionalDate,
    isDeleted: z.coerce.boolean(),
    isSpam: z.coerce.boolean(),
    author: authorSchema,
    thread: optionalNumber,
    parent: optionalNumber,
  })),
});

/**
 * Given the filepath of a Disqus comment export, returns an array of thread objects
 * with comments for each thread.
 *
 * In theory {@link https://help.disqus.com/en/articles/1717222-custom-xml-import-format}
 * has the specs on their export format, but newer exports have a completely different
 * structure. Womp womp.
 */
export async function parseDisqus(input: PathLike) {
  // This is an extremely gnarly hack that shouldn't exist, and will be removed soon.
  // Our 'extract' function needs to be told that it's in XML mode rather than HMTL mode,
  const xml = (await fs.readFile(input)).toString();
  const parsed = await extract(xml, template, schema, { xml: true });

  // Also sick. Our fancy all-singing all-dancing return type inference can't tell if the ouput
  // is one or several of the incoming schema. Probably the special handling for 'they didn't
  // pass in a schema'

  return Promise.resolve(groupDisqus(parsed));
}

function groupDisqus(input: z.output<typeof schema>) {
  return input.threads.map(t => {
    return {
      ...t,
      category: input.categories.find(c => c.did === t.category)?.title,
      comments: input.posts.filter(p => p.thread === t.did)
    }
  }).filter(t => t.comments.length > 0);
}