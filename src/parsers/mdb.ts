import MDBReader from "mdb-reader";
import path from 'path';
import { PathLike } from "fs";
import fs from 'fs/promises';

export async function parseMdb(filePath: PathLike) {
  const name = path.parse(filePath.toString()).name;
  const reader = new MDBReader(await fs.readFile(filePath));
  const tableNames = reader.getTableNames({ normalTables: true, systemTables: false, linkedTables: false});
  const tables = Object.fromEntries(tableNames.map(t => [ t, reader.getTable(t).getData() ]));

  const info = await fs.stat(filePath);
  const created = reader.getCreationDate() ?? info.ctime;

  return { name, created, tables };
}
