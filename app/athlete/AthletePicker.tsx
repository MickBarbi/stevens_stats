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
    <Menu as="div" className="relative inline-block w-64 text-left">
      <Menu.Button className="inline-flex w-full items-center justify-between rounded-md bg-brand px-4 py-2 text-sm font-medium text-brand-fg transition-colors hover:bg-brand-hover focus:outline-none focus-visible:ring-2 focus-visible:ring-link">
        Select an Athlete
        <ChevronDown className="ml-2 h-4 w-4" aria-hidden />
      </Menu.Button>
      <Menu.Items className="card absolute left-0 z-20 mt-2 w-full origin-top-right overflow-hidden focus:outline-none">
        <div className="p-2">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search athlete..."
            className="w-full rounded-md border border-border bg-surface px-2 py-1 text-sm text-fg outline-none focus:border-link"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((a) => (
              <Menu.Item key={a.athlete_id}>
                {({ active }) => (
                  <a
                    href={`/athlete/${a.athlete_id}`}
                    className={`block px-4 py-2 text-sm ${
                      active ? "bg-surface text-fg" : "text-fg-muted"
                    }`}
                  >
                    {label(a)}
                  </a>
                )}
              </Menu.Item>
            ))
          ) : (
            <div className="px-4 py-2 text-sm text-fg-subtle">No athletes found.</div>
          )}
        </div>
      </Menu.Items>
    </Menu>
  );
};

export default AthletePicker;
