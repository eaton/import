import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { Json, Csv } from '@eatonfyi/serializers';
import { NormalizedUrl } from '@eatonfyi/urls';
import { nanohash } from "@eatonfyi/ids";

export class LibraryImporter extends BaseImport {
  constructor(options: BaseImportOptions) {
    super(options);
  }

  override async populate(): Promise<unknown> {
    if (this.input.exists('delicious.json')) {
      
    }

    if (this.input.exists('pinboard.json')) {
      
    }

    if (this.input.exists('instapaper.csv')) {
      
    }

    if (this.input.exists('getpocket.html')) {
      
    }

    if (this.input.exists('favorites.html')) {
      
    }

    return Promise.resolve();
  }
}
