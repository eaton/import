import 'dotenv/config';
import { BaseImport, BaseImportOptions } from "../base-importer.js";

export class MediaFileImport extends BaseImport {
  constructor(options: BaseImportOptions = {}) {
    super({ ...options, name: 'media', input: 'input', output: 'output/media' });
  }
  
  override async finalize() {
    // Copy over all the directories full of crap
    this.input.copy('blogs/livejournal/media/lj-photos', this.output.path('lj'));
    this.log.info('Copied livejournal media');

    this.input.copy('blogs/viapositiva-drupal/files', this.output.path('viapositiva'));
    const vpfiles = this.output.dir('viapositiva');
    vpfiles.find({ matching: ['**/*.(thumbnail,preview,thumb).*', '**/*(_0,_1).*'] })
      .forEach(f => vpfiles.remove(f));
    this.log.info('Copied viapositiva media');

    this.input.copy('blogs/angrylittletree-drupal/files', this.output.path('alt'));
    this.input.copy('blogs/angrylittletree-jekyll/files', this.output.path('alt'), { overwrite: true });
    this.log.info('Copied angrylittletree media');

    this.input.copy('blogs/tumblr/files', this.output.path('tumblr'));
    this.log.info('Copied tumblr media');

    this.input.copy('media/skitch', this.output.path('skitch'));
    this.log.info('Copied skitch backup');

    this.input.copy('reprints/images', this.output.path('reprint'));
    this.log.info('Copied article reprint images');
  }
}