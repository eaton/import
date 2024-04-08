import { TumblrImport } from "./blogs/tumblr/index.js";

const tb = new TumblrImport();
tb.output.remove();
await tb.runImport();