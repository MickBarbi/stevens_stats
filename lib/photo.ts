// Cloudinary roster photo URL. The public_id is the athlete's TFRRS id (the
// number at the end of their profile URL). `image_path`, when set, overrides
// that with an explicit public_id for a one-off.

export const athletePhotoUrl = (a: {
  athlete_id: number;
  image_path: string | null;
}): string =>
  `https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}` +
  `/image/upload/f_auto,q_100/${a.image_path ?? a.athlete_id}.webp`;
