import { LivejournalImport } from "./blogs/livejournal.js";
import 'dotenv/config';

const lj = new LivejournalImport({ 
  input: process.env.INPUT_LIVEJOURNAL,
  ignoreBefore: new Date(2001, 1, 1)
});

await lj.runImport();