import 'dotenv/config';
import jetpack from '@eatonfyi/fs-jetpack';
import path from 'path';
import { pino, LoggerOptions, Logger } from 'pino';

export interface BaseImportOptions extends Record<string, unknown> {
  label?: string,
  name?: string,
  description?: string,

  base?: string,
  input?: string,
  cache?: string,
  output?: string,

  logger?: LoggerOptions,
}

export class BaseImport {
  options: BaseImportOptions;

  // We lazy-init these to avoid creating directories or other resources unecessarily.
  // Probably overkill, but easy enough to follow the pattern.
  private _input?: typeof jetpack;
  private _cache?: typeof jetpack;
  private _output?: typeof jetpack;
  private _shared?: typeof jetpack;
  private _logger?: Logger;

  /**
   * By overriding the constructor, subclasses have an opportunity to
   * merge in their own defaults.
   */
  constructor(options?: BaseImportOptions) {
    this.options = options ?? {};
  }
 
  get name() {
    this.options.name ??= this.constructor.name;
    return this.options.name;
  }
  get label() {
    return this.options.label ??= this.name;
  }
  get description() {
    return this.options.description ??= this.name;
  }

  get input() {
    this._input ??= jetpack.dir(this.options.base ?? '.').dir(this.options.input ?? path.join('input', this.name));
    return this._input;
  }

  get cache() {
    this._cache ??= jetpack.dir(this.options.base ?? '.').dir(this.options.cache ?? path.join('cache', this.name));
    return this._cache;
  }

  get output() {
    this._output ??= jetpack.dir(this.options.base ?? '.').dir(this.options.output ?? 'output');
    return this._output;
  }

  get log() {
    this._logger ??= pino({ name: this.name, ...this.options.logger });
    return this._logger;
  }

  /**
   * Description placeholder
   */
  async runImport(): Promise<unknown> {
    await this.populate();
    await this.process();
    await this.finalize();
    return Promise.resolve();
  }

  /**
   * Based on information from the import settings, populate the cache. This may consist of
   * coping and organizing input files, retrieving data from a remote API, etc.
   * 
   * This stage is meant to avoid unecessarily thrashing remote APIs, slow database lookups,
   * and so on. As such, it should cache the retieved data in as 'raw' a form as possible to
   * avoid re-fetching if needs change.
   * 
   * The cache should be UPDATED whenever possible rather than REPLACED.
   */
  async populate(): Promise<unknown> {
    const full = await this.cacheIsFilled()
    if (!full) await this.fillCache();
    return Promise.resolve();
  }
  
  async cacheIsFilled(): Promise<boolean> {
    return Promise.resolve(false);
  }

  async fillCache(): Promise<unknown> {
    return Promise.resolve();
  }

  async readCache(): Promise<unknown> {
    return Promise.resolve();
  }

  /**
   * Performs internal processing steps necessary to scrub, reformat, etc. any of the cached data.
   */
  async process(): Promise<unknown> {
    return Promise.resolve();
  }

  /**
   * Generates final data in the output directory, including merging data from multiple sources.
   */
  async finalize(): Promise<unknown> {
    return Promise.resolve();
  }
}