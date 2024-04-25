import 'dotenv/config';
import { MediaFileImport } from './dispatch/media-files.js';
/**
import { LivejournalImport } from "./blogs/livejournal.js";
const lj = new LivejournalImport({ 
  input: process.env.INPUT_LIVEJOURNAL,
  ignoreBefore: new Date(2001, 1, 1)
});

await lj.runImport();
 */

const mf = new MediaFileImport({ base: process.env.GLOBAL_BASE });
await mf.finalize();