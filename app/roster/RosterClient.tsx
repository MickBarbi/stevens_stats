"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./RosterPage.module.css";
import type { Athlete } from "@/lib/data";
import { athletePhotoUrl } from "@/lib/photo";

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
    <div className={styles.rosterContainer}>
      <h1 className={styles.title}>Roster</h1>

      <select
        className={styles.dropdown}
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
        className={styles.dropdown}
        onChange={(e) => setSelectedSex(e.target.value)}
        value={selectedSex}
      >
        <option value="">All Genders</option>
        <option value="m">Men</option>
        <option value="f">Women</option>
      </select>

      <div className={styles.cardContainer}>
        {visible.map((athlete) => (
          <div className={styles.card} key={athlete.athlete_id}>
            <div className={styles.imageWrapper}>
              <Image
                src={athletePhotoUrl(athlete)}
                alt={`Roster photo for ${athlete.nickname ? athlete.nickname : athlete.first_name}`}
                width={300}
                height={400}
                className={styles.athleteImage}
              />
            </div>
            <div className={styles.cardContent}>
              <h2 className={styles.athleteName}>
                {athlete.nickname ? athlete.nickname : athlete.first_name} {athlete.last_name}
              </h2>
              <p className={styles.year}>Year: {athlete.year}</p>
              <Link href={`/athlete/${athlete.athlete_id}`} className={styles.viewProfile}>
                View Profile
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RosterClient;
