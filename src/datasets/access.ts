import 'dotenv/config';
import MDBReader from "mdb-reader";
import jetpack from "@eatonfyi/fs-jetpack";
import { NdJson } from "@eatonfyi/serializers";
import path from 'path';

jetpack.setSerializer('.ndjson', new NdJson());

const input = jetpack.dir(process.env.INPUT_MDB ?? '');
const cache = jetpack.dir('./cache');

for (const db of input.find({ matching: '*.mdb' })) {
  const reader = new MDBReader(input.read(db, 'buffer') as Buffer);
  const dbName = path.parse(db).name;
  for (const tableName of reader.getTableNames()) {
    const table = reader.getTable(tableName);
    if (table.rowCount) {
      cache.dir(dbName).write(`${table.name}.ndjson`, table.getData());
    }
  }
}
