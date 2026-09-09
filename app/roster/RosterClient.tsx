"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Athlete } from "@/lib/data";
import { athletePhotoUrl } from "@/lib/photo";
import Card from "@/components/ui/Card";

const RosterClient = ({ athletes }: { athletes: Athlete[] }) => {
  const [selectedYear, setSelectedYear] = useState("");
  const [selectedSex, setSelectedSex] = useState("");

  const visible = athletes.filter(
    (athlete) =>
      ((selectedSex === "" || athlete.sex === selectedSex) &&
        (selectedYear === "" || String(athlete.year) === selectedYear)) ||
      (String(athlete.year) === "6" && selectedYear === "5")
  );

  return (
    <div>
      <h1 className="mb-6 text-center text-3xl font-bold text-fg">Roster</h1>

      <div className="mb-6 flex flex-wrap justify-center gap-3">
        <select
          className="field-select"
          onChange={(e) => setSelectedYear(e.target.value)}
          value={selectedYear}
        >
          <option value="">All Grades</option>
          <option value="1">First-Years</option>
          <option value="2">Sophomores</option>
          <option value="3">Juniors</option>
          <option value="4">Seniors</option>
          <option value="5">Grad Students</option>
        </select>

        <select
          className="field-select"
          onChange={(e) => setSelectedSex(e.target.value)}
          value={selectedSex}
        >
          <option value="">All Genders</option>
          <option value="m">Men</option>
          <option value="f">Women</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((athlete) => (
          <Link key={athlete.athlete_id} href={`/athlete/${athlete.athlete_id}`} className="block">
            <Card interactive className="h-full overflow-hidden">
              <div className="relative aspect-[3/4] bg-surface">
                <Image
                  src={athletePhotoUrl(athlete)}
                  alt={`Roster photo for ${athlete.nickname ? athlete.nickname : athlete.first_name}`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3 text-center">
                <h2 className="font-semibold text-fg">
                  {athlete.nickname ? athlete.nickname : athlete.first_name} {athlete.last_name}
                </h2>
                <p className="mt-0.5 text-sm text-fg-muted">Year {athlete.year}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default RosterClient;
