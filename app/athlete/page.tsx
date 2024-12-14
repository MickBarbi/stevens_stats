"use client";

import React, { useEffect, useState } from "react";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

type Others = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  nickname: string;
}

type Athlete = {
  athlete_id: number;
  first_name: string;
  last_name: string;
  year: number;
  graduation_year: number | null;
  sex: string;
  other_athletes: Others[];
};

const AthletePage = () => {
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/athlete/7892451`); // Fetch data from the API route
        const result = await response.json();
        console.log(result); // Check the structure of the fetched data
        setAthlete(result);
      } catch (error) {
        console.log("Error fetching athlete data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <h1>Loading...</h1>;
  }

  if (!athlete) {
    return <p>Athlete not found</p>;
  }

  // Filter athletes based on search term
  const filteredAthletes = athlete.other_athletes.filter((other) =>
    `${other.first_name} ${other.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 mt-28">
      <Menu as="div" className="relative inline-block text-left w-64">
          <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
            Select an Athlete
            <ChevronDown className="ml-2 h-4 w-4" />
          </Menu.Button>
          <Menu.Items className="absolute left-0 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          {/* Search Bar */}
            <div className="p-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search athlete..."
                className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Athlete List */}
            <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
              {filteredAthletes.length > 0 ? (
                filteredAthletes.map((other) => (
                  <Menu.Item key={other.athlete_id}>
                    {({ active }) => (
                      <a
                        href={`/athlete/${other.athlete_id}`}
                        className={`${
                          active ? 'bg-blue-100 text-blue-900' : 'text-gray-700'
                        } block px-4 py-2 text-sm`}
                      >
                        {other.nickname ? other.nickname : other.first_name} {other.last_name}
                      </a>
                    )}
                  </Menu.Item>
                ))
              ) : (
                <div className="px-4 py-2 text-sm text-gray-500">
                  No athletes found.
                </div>
              )}
            </div>
          </Menu.Items>
        </Menu>
    </div>
  );
};

export default AthletePage;