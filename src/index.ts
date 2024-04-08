import { MovableTypeImport } from "./blogs/movabletype.js";
import { TumblrImport } from "./blogs/tumblr.js";

const tb = new TumblrImport();
tb.output.remove();
await tb.runImport();

const mt = new MovableTypeImport({ mysql_db: 'mt2005' });
mt.output.remove();
await mt.runImport();