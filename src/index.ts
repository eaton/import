import 'dotenv/config';
import { MediaFileImport } from './dispatch/media-files.js';


const mf = new MediaFileImport({ base: process.env.BASE_DIR, input: process.env.INPUT_DIR });
await mf.finalize();
