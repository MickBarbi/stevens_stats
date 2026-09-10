// Cloudinary roster photo URL. The public_id is the athlete's TFRRS id (the
// number at the end of their profile URL), e.g.
//   https://res.cloudinary.com/<cloud>/image/upload/8327859.webp?v=<rev>
// `image_path`, when set, overrides that with an explicit public_id.
// next/image handles resizing/format, so no Cloudinary transform is applied.
//
// The `?v=<rev>` is a cache-buster. Cloudinary serves overwritten photos under
// the SAME url and with a 30-day `Cache-Control`, so next/image (and browsers)
// would keep showing the old picture for weeks after a re-upload. `rev` is
// bumped by scraper/photos_upload.py on every batch, which changes the url and
// forces a refetch. Cloudinary ignores the unknown query param.

import photoRev from "@/data/photo_rev.json";

const REV = (photoRev as { rev: number }).rev;

export const athletePhotoUrl = (a: {
  athlete_id: number;
  image_path: string | null;
}): string =>
  `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}` +
  `/image/upload/${a.image_path ?? a.athlete_id}.webp?v=${REV}`;
