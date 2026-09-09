"use client";

import { useState } from "react";
import Image from "next/image";
import { athletePhotoUrl } from "@/lib/photo";

type A = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  nickname: string | null;
  image_path: string | null;
};

/** Roster photo with an initials fallback for athletes who haven't uploaded one.
 *  Renders `fill` — put it in a positioned, sized wrapper. */
export default function AthletePhoto({
  athlete,
  sizes,
  priority = false,
}: {
  athlete: A;
  sizes?: string;
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const name = athlete.nickname || athlete.first_name;
  const initials = ((name[0] ?? "") + (athlete.last_name[0] ?? "")).toUpperCase();

  if (failed) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center bg-surface"
        aria-label={`${name} ${athlete.last_name}`}
      >
        <span className="select-none text-3xl font-bold text-fg-subtle">{initials}</span>
      </div>
    );
  }

  return (
    <Image
      src={athletePhotoUrl(athlete)}
      alt={`${name} ${athlete.last_name}`}
      fill
      sizes={sizes}
      priority={priority}
      onError={() => setFailed(true)}
      className="object-cover"
    />
  );
}
