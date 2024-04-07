import MDBReader from "mdb-reader";
import path from 'path';
import { PathLike } from "fs";
import fs from 'fs/promises';

export async function parseMdb(filePath: PathLike) {
  const name = path.parse(filePath.toString()).name;
  const reader = new MDBReader(await fs.readFile(filePath));
  const tables = reader.getTableNames({ normalTables: true, systemTables: false, linkedTables: false});
  const tableData = tables.map(t => [t, reader.getTable(t).getData()]);

  return {
    name,
    created: reader.getCreationDate() ?? undefined,
    tables: Object.fromEntries(tableData)
  };
}
