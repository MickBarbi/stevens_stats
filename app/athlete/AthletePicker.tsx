"use client";

import { useState } from "react";
import { Menu } from "@headlessui/react";
import { ChevronDown } from "lucide-react";
import type { PickerAthlete } from "@/lib/data";

const label = (a: PickerAthlete) =>
  `${a.nickname ? a.nickname : a.first_name} ${a.last_name}`;

const AthletePicker = ({ athletes }: { athletes: PickerAthlete[] }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = athletes.filter((a) =>
    label(a).toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Menu as="div" className="relative inline-block text-left w-64">
      <Menu.Button className="inline-flex w-full justify-between items-center rounded-md bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white">
        Select an Athlete
        <ChevronDown className="ml-2 h-4 w-4" />
      </Menu.Button>
      <Menu.Items className="absolute left-0 mt-2 w-full origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
        <div className="p-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search athlete..."
            className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100">
          {filtered.length > 0 ? (
            filtered.map((a) => (
              <Menu.Item key={a.athlete_id}>
                {({ active }) => (
                  <a
                    href={`/athlete/${a.athlete_id}`}
                    className={`${
                      active ? "bg-blue-100 text-blue-900" : "text-gray-700"
                    } block px-4 py-2 text-sm`}
                  >
                    {label(a)}
                  </a>
                )}
              </Menu.Item>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">No athletes found.</div>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default AthletePicker;
