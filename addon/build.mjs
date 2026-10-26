// Packs the add-on into deeprecall.ankiaddon (a zip with the files at its root), which Anki installs
// from Tools > Add-ons > Install from file. The zip is written here so no other tool is needed.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { crc32, deflateRawSync } from 'node:zlib';

const here = fileURLToPath(new URL('.', import.meta.url));
const FILES = ['__init__.py', 'manifest.json', 'config.json', 'config.md'];
const OUT = 'deeprecall.ankiaddon';

// A fixed date keeps the output the same every time it is built.
const DOS_TIME = 0;
const DOS_DATE = ((2026 - 1980) << 9) | (1 << 5) | 1;

const locals = [];
const centrals = [];
let offset = 0;

for (const name of FILES) {
  const data = readFileSync(here + name);
  const packed = deflateRawSync(data);
  const nameBytes = Buffer.from(name);
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(20, 4); // version needed
  local.writeUInt16LE(0x0800, 6); // file names are UTF-8
  local.writeUInt16LE(8, 8); // deflate
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(packed.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  locals.push(local, nameBytes, packed);

  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0);
  central.writeUInt16LE(20, 4); // version made by
  central.writeUInt16LE(20, 6); // version needed
  central.writeUInt16LE(0x0800, 8);
  central.writeUInt16LE(8, 10);
  central.writeUInt16LE(DOS_TIME, 12);
  central.writeUInt16LE(DOS_DATE, 14);
  central.writeUInt32LE(crc, 16);
  central.writeUInt32LE(packed.length, 20);
  central.writeUInt32LE(data.length, 24);
  central.writeUInt16LE(nameBytes.length, 28);
  central.writeUInt32LE(offset, 42);
  centrals.push(central, nameBytes);

  offset += local.length + nameBytes.length + packed.length;
}

const centralSize = centrals.reduce((sum, part) => sum + part.length, 0);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054b50, 0);
end.writeUInt16LE(FILES.length, 8);
end.writeUInt16LE(FILES.length, 10);
end.writeUInt32LE(centralSize, 12);
end.writeUInt32LE(offset, 16);

writeFileSync(here + OUT, Buffer.concat([...locals, ...centrals, end]));
console.log('built', OUT);
