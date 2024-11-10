"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import styles from "./RosterPage.module.css"; // Import the new CSS module

interface Athlete {
  athlete_id: number;
  first_name: string;
  last_name: string;
  sex: string;
  year: number;
  image_path: string; // Assuming there's an image path in the API
}

const RosterPage = () => {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [selectedYear, setSelectedYear] = useState(""); // Event filter
  const [selectedSex, setSelectedSex] = useState(""); // Sex filter

  useEffect(() => {
    const fetchAthletes = async () => {
      try {
        const response = await fetch("/api/roster");
        const data = await response.json();
        setAthletes(data);
      } catch (error) {
        console.error("Error fetching athletes:", error);
      }
    };

    fetchAthletes();
  }, []);

  return (
    <div className={styles.rosterContainer}>
      <h1 className={styles.title}>Roster</h1>
      {/* Year Dropdown */}
      <select
        className={styles.dropdown} // Use local class for select
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
        className={styles.dropdown} // Use local class for select
        onChange={(e) => setSelectedSex(e.target.value)}
        value={selectedSex}
      >
        <option value="">All Genders</option>
        <option value="m">Men</option>
        <option value="f">Women</option>
      </select>
      <div className={styles.cardContainer}>
        {athletes
          .filter(
            (athlete) =>
              ((selectedSex === "" || athlete.sex === selectedSex) &&
                (selectedYear === "" ||
                  String(athlete.year) === selectedYear)) ||
              (String(athlete.year) === "6" && selectedYear === "5")
          )
          .map((athlete) => (
            <div className={styles.card} key={athlete.athlete_id}>
              <div className={styles.imageWrapper}>
                <Image
                  src={`https://res.cloudinary.com/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload/f_auto,q_100/${athlete.athlete_id}_${athlete.image_path}.webp`}
                  alt={`Roster photo for ${athlete.first_name}`}
                  width={300}
                  height={400}
                  className={styles.athleteImage}
                />
              </div>
              <div className={styles.cardContent}>
                <h2 className={styles.athleteName}>
                  {athlete.first_name} {athlete.last_name}
                </h2>
                <p className={styles.year}>Year: {athlete.year}</p>
                <Link
                  href={`/athlete/${athlete.athlete_id}`}
                  className={styles.viewProfile}
                >
                  View Profile
                </Link>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default RosterPage;
