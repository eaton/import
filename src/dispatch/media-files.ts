import 'dotenv/config';
import { BaseImport, BaseImportOptions } from "../base-importer.js";
import { TwitterArchive, PartialTweet } from 'twitter-archive-reader';
import jetpack from '@eatonfyi/fs-jetpack';
import path from 'path';

/**
 * Bulk copy. Generally speaking the mapping boils down to:
 * 
 * predicate.net/* => media://predicate/* 
 * predicate.org/* => media://predicate/* 
 * viapositiva.net/files/* => media://positiva/*
 * viapositiva.net/sites/default/files/* => media://positiva/*
 * skitch.com/* => media://skitch/* 
 * tumblr.com/* => media://tumblr/* 
 * (anything from a reprinted article) => media://articles/*
 * 
 * Down the line we'll do the same for Twitter, Instagram, Flickr, Facebook,
 * etc. files.
 */
export class MediaFileImport extends BaseImport {
  constructor(options: BaseImportOptions = {}) {
    super({ ...options, name: 'media', input: 'input', output: 'output/media' });
  }
  
  override async finalize() {

    /** First, grab blogs and static files from personal sites I used for image hosting. */

    this.input.copy('blogs/predicatenet/files', this.output.path('predicate'));
    this.log.info('Copied predicate.net files');

    this.input.copy('blogs/livejournal/media/lj-photos', this.output.path('predicate/users/verb/lj'));
    this.log.info('Copied livejournal media');

    this.input.copy('blogs/movabletype/files', this.output.path('positiva'));
    this.input.copy('blogs/viapositiva-drupal/files', this.output.path('positiva'), { overwrite: true });
    // Whole lotta thumbnails and previews in the directory; we'll pull them.
    this.output.find({ matching: ['positiva/**/*.{thumb,thumbnail,preview}.*', 'positiva/**/*.{_0,_1}.*' ]}).forEach(file => this.output.remove(file));
    this.log.info('Copied viapositiva media');

    // Merging the drupal and jekyll files; there are really only a handful.
    this.input.copy('blogs/angrylittletree-drupal/files', this.output.path('alt'));
    this.input.copy('blogs/angrylittletree-jekyll/files', this.output.path('alt'), { overwrite: true });
    this.log.info('Copied angrylittletree media');


    /** Manually yoined images and assets for reprinted articles, static microsites, etc. */

    this.input.copy('articles/images', this.output.path('articles'));
    this.log.info('Copied article reprint images');



    /** Social media accounts */

    this.input.copy('blogs/tumblr/files', this.output.path('tumblr'));
    this.log.info('Copied tumblr media');

    this.input.copy('media/skitch', this.output.path('skitch'));
    this.log.info('Copied skitch backup');

    const twitterInput = jetpack.dir(process.env.INPUT_TWITTER ?? 'input');
    const twitterOutput = this.output.dir('twitter');
    for (const f of twitterInput.find({ matching: 'twitter-*.zip' })) {
      const buffer = twitterInput.read(f, 'buffer');
      const archive = new TwitterArchive(buffer!, {
        ignore: ['ad', 'block', 'dm', 'moment', 'mute']
      });
      try {
        await archive.ready();
        for (const t of archive.tweets.all) {
          for (const me of t.extended_entities?.media ?? []) {
            const variant = me.video_info?.variants
              ?.filter((v) => v.content_type === 'video/mp4')
              .pop();
            const filename = path
              .parse(variant?.url ?? me.media_url_https)
              .base.split('?')[0];
            
              if (!twitterOutput.exists(filename)) {
                try {
                  const ab = await archive.medias.fromTweetMediaEntity(me, true);
                  const buffer = Buffer.from(ab as ArrayBuffer);
                  twitterOutput.write(filename, buffer);
                } catch (err: unknown) {
                  this.log.error(err, `Couldn't read ${filename} from archive`);
                }
              }
            }
        }
        this.log.info(`Copied media for ${archive.user.screen_name}`);
      } catch (err: unknown) {
        this.log.error(err, `Couldn't load archive`);
      }
    }
  }
}