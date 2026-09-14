// Everything on this site that has to be a PNG.
//
// There is no design tool in this loop and no raster file anyone edits: each
// image is an SVG in assets/ (or public/favicon.svg, for the mark itself),
// rasterised here and committed. Change the SVG, run `npm run images`, commit
// what moved. resvg is a devDependency for exactly this and ships nowhere.
//
// The outputs are committed rather than built, because they change about once a
// year and the alternative is a rasteriser in the deploy. The cost of that trade
// is drift: edit an SVG, forget to re-run this, and the served image is the old
// one with nothing to say so. src/lib/og.test.ts catches the half of that which
// can be checked from bytes — that the committed files exist and are the size
// the pages advertise.

import { Resvg } from '@resvg/resvg-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const root = new URL('../', import.meta.url)
const at = (path: string): string => fileURLToPath(new URL(path, root))

// One weight, because the card distinguishes its three lines by size and colour
// rather than by weight, and a second file would be 190 KB to avoid one of those.
const fontFiles = [at('assets/fonts/SourceSerif4-Regular.ttf')]

function render(svgPath: string, width: number): Buffer {
  const resvg = new Resvg(readFileSync(at(svgPath), 'utf8'), {
    fitTo: { mode: 'width', value: width },
    // Only the vendored font, never whatever this laptop happens to have
    // installed: the output is committed, so it must not depend on the machine
    // that produced it.
    font: {
      fontFiles,
      loadSystemFonts: false,
      defaultFontFamily: 'Source Serif 4',
    },
  })
  return resvg.render().asPng()
}

/**
 * An .ico wrapping PNGs — a 6-byte directory, one 16-byte entry per image, then
 * the images. Every browser still asking for /favicon.ico reads PNG-in-ICO;
 * the BMP form it replaced is only needed for Internet Explorer.
 */
function ico(images: Buffer[], sizes: number[]): Buffer {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon, 2 = cursor
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + 16 * images.length
  const entries = images.map((png, i) => {
    const size = sizes[i]
    if (size === undefined || size < 1 || size > 256) {
      throw new Error(`ico: ${size} is not a size an .ico entry can state`)
    }
    const entry = Buffer.alloc(16)
    // 256 is written as 0: the field is one byte and 256 does not fit in it.
    entry.writeUInt8(size === 256 ? 0 : size, 0)
    entry.writeUInt8(size === 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2) // palette size; 0 for truecolour
    entry.writeUInt8(0, 3) // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...images])
}

function write(path: string, bytes: Buffer): void {
  writeFileSync(at(path), bytes)
  console.log(`${path}  ${(bytes.length / 1024).toFixed(1)} KB`)
}

// The social card. 1200x630 is the size every unfurler states; og.test.ts holds
// the site to it, because a card that is not this size is cropped rather than
// rejected, which is the version nobody notices.
write('public/og.png', render('assets/og-card.svg', 1200))

// iOS home screen. 180 is the largest any iPhone asks for, and it downsamples.
write('public/apple-touch-icon.png', render('assets/apple-touch-icon.svg', 180))

// The legacy path. Browsers that support it prefer the SVG in the head; this is
// for the ones that ask for /favicon.ico without reading the page, and for a
// bookmark bar drawing it at 16.
const sizes = [16, 32]
write(
  'public/favicon.ico',
  ico(
    sizes.map((size) => render('public/favicon.svg', size)),
    sizes,
  ),
)
