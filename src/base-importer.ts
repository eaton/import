export interface BaseImportOptions extends Record<string, unknown> {
  auth?: Record<string, string>,
  dir?: Record<string, string> & {
    base?: string,
    input?: string,
    cache?: string,
    stage?: string,
    output?: string
  },
}

const defaults: BaseImportOptions = {
  dir: { base: '.', cache: 'input', input: 'input', output: 'input' }
}

export class BaseImport<O extends BaseImportOptions = BaseImportOptions> {
  constructor(public options: O) {}
  
  retrieve() {
    
  }

  load() {

  }

  prepForImport() {

  }
}