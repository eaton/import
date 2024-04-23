import { LivejournalImport } from "./blogs/livejournal.js";
import 'dotenv/config';

const lj = new LivejournalImport({ 
  input: process.env.INPUT_LIVEJOURNAL,
});

await lj.runImport();