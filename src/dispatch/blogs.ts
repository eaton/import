import 'dotenv/config';
import { BaseImport, BaseImportOptions } from "../base-importer.js";

import { LivejournalImport } from "../blogs/livejournal.js";
import { MovableTypeImport } from "../blogs/positiva-mt.js";

export interface BlogImportOptions extends BaseImportOptions {
  livejournal?: boolean,
  movabletype?: boolean,
  vpDrupal?: boolean,
  altDrupal?: boolean,
  altJekyll?: boolean,
  havana?: boolean,
  tumblr?: boolean,
  goddy?: boolean,
}

export class BlogImport extends BaseImport {
  declare options: BlogImportOptions;
  imports: BaseImport[] = [];

  constructor(options: BlogImportOptions = {}) {
    super({ ...options, name: 'blogs' });

    if (options.livejournal) this.imports.push(new LivejournalImport({
      ...this.options,
      input: 'blogs/livejournal',
      ignoreBefore: new Date(2001, 1, 1)    
    }));

    if (options.movabletype) this.imports.push(new MovableTypeImport({
      input: 'blogs/movabletype',
      mysql_db: process.env.MYSQL_DB,
    }));
  }
  
  override async fillCache() {
    return Promise.all(this.imports.map(i => i.fillCache()));
  }

  override async process() {
    return Promise.all(this.imports.map(i => i.process()));
  }

  override async finalize() {
    return Promise.all(this.imports.map(i => i.finalize()));
  }
}