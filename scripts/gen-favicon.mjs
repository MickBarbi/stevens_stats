// Regenerate the raster icons from app/icon.svg.
//   node scripts/gen-favicon.mjs
// Produces:
//   public/favicon.ico   16 / 32 / 48 px, PNG-in-ICO
//   app/apple-icon.png   180 px, full-bleed (iOS masks the corners itself)

import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svg = readFileSync(join(root, "app", "icon.svg"));

const SIZES = [16, 32, 48];
const pngs = await Promise.all(
  SIZES.map((s) => sharp(svg).resize(s, s).png().toBuffer())
);

// ICO container: 6-byte header, 16-byte dir entry per image, then the PNGs.
const header = Buffer.alloc(6);
header.writeUInt16LE(1, 2); // type = icon
header.writeUInt16LE(SIZES.length, 4);

let offset = 6 + SIZES.length * 16;
const entries = pngs.map((png, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(SIZES[i] % 256, 0); // width  (0 => 256)
  e.writeUInt8(SIZES[i] % 256, 1); // height
  e.writeUInt16LE(1, 4); // colour planes
  e.writeUInt16LE(32, 6); // bits per pixel
  e.writeUInt32LE(png.length, 8);
  e.writeUInt32LE(offset, 12);
  offset += png.length;
  return e;
});

writeFileSync(
  join(root, "public", "favicon.ico"),
  Buffer.concat([header, ...entries, ...pngs])
);

// apple-icon: strip the corner radius so iOS's own mask isn't doubled up
const appleSvg = readFileSync(join(root, "app", "icon.svg"), "utf8").replace(
  / rx="\d+"/,
  ""
);
await sharp(Buffer.from(appleSvg))
  .resize(180, 180)
  .png()
  .toFile(join(root, "app", "apple-icon.png"));

console.log("wrote public/favicon.ico (16/32/48) + app/apple-icon.png (180)");
