// Cloudinary roster photo URL. The public_id is the athlete's TFRRS id (the
// number at the end of their profile URL), e.g.
//   https://res.cloudinary.com/<cloud>/image/upload/8327859.webp
// `image_path`, when set, overrides that with an explicit public_id.
// next/image handles resizing/format, so no Cloudinary transform is applied.

export const athletePhotoUrl = (a: {
  athlete_id: number;
  image_path: string | null;
}): string =>
  `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}` +
  `/image/upload/${a.image_path ?? a.athlete_id}.webp`;
