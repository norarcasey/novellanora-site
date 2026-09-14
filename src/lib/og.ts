// What the head advertises about this site's images, in one place, so that the
// tags, the tests and scripts/images.ts cannot disagree about them.
//
// The card is one static image for the whole site rather than one per piece.
// A per-piece card would put the title of the writing into the unfurl, and the
// mechanism exists — this site is server-rendered on Vercel, so @vercel/og could
// draw one per request — but it costs a rasteriser, a layout engine and sharp in
// the deployed function, on a site whose whole application is nine files. The
// title already travels: `og:title` carries it, beside this image. See FIND-05.

/** 1200x630 is the size every unfurler states. Off it, a card is cropped rather
 *  than refused — which is the version nobody notices. */
export const OG_IMAGE = {
  path: '/og.png',
  width: 1200,
  height: 630,
  /** Read by a screen reader in place of the card. */
  alt: 'Novella Nora — writings by Nora Casey',
} as const

/** iOS home screen. The largest size any iPhone asks for; it downsamples. */
export const APPLE_TOUCH_ICON = { path: '/apple-touch-icon.png', size: 180 } as const
