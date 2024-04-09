import { MovableTypeImport } from "./blogs/movabletype.js";
import { TumblrImport } from "./blogs/tumblr.js";
import { BookmarkImport } from "./bookmarks/bookmarks.js";

const tb = new TumblrImport({
  blogList: ['govertainment', 'plf', 'cmswhoops'],
});
//tb.output.remove();

const mt = new MovableTypeImport({
  mysql_db: 'mt2005',
  userList: [4],
  blogList: [3, 4]
});
//mt.output.remove();

const bm = new BookmarkImport({ 
  base: "/Volumes/home/migration",
});
bm.output.remove();

//await tb.runImport();
//await mt.runImport();
await bm.runImport();